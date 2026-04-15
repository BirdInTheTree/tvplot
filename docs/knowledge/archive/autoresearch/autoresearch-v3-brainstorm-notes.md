---
type: note
project: tvplotlines
status: active
---

# Autoresearch v3: рабочие заметки из брейншторма

Дата: 2026-03-18. Это сырьё для плана, не план. План пишем после прочтения статей.

## Что происходит

Наташа прошлась по всем 4 промптам tvplotlines и написала 60 замечаний (`notes for 3rd autoresearch.md` в Projects root). Вердикт: промпты — хаос. Не системно, не основано на теории, избыточно, неточно, не соответствует заявлению что это "программа для LLM".

Нужно: переписать все 4 промпта + настроить autoresearch чтобы проверить что переписанные промпты не ухудшили качество извлечения.

## 6 системных проблем (из 60 замечаний)

### 1. Промпты ≠ программы
Структура хаотичная: контракт говорит одно, Input — другое. Определения используются до того как объяснены. Meta-комментарии для разработчиков ("compiled from reference.md", "recompile from ADR-005") торчат в промпте который идёт в LLM. "After validation, result shown to human" — неправда. Цитаты с номерами страниц ("Nash, p.34") — зачем в промпте для машины?

### 2. Глоссарий ≠ промпты
В глоссарии определения точнее и полнее: franchise types, plotline, Story DNA, plot-led/character-led. В промптах — огрызки тех же определений, часто неточные. Глоссарий объясняет цепочку Franchise Type → Story Engine → Story DNA — в промптах этого нет. Нужно: глоссарий = ground truth, промпты берут определения оттуда.

### 3. Мусорные поля и концепции
Собираем но не используем (или непонятно зачем): `format` (ongoing/limited/anthology), `narrative devices`, `confidence`, `interactions` между линиями, `patches`, `weight` (primary/background/glimpse). Для каждого нужно решить: нужно → оставить с объяснением. Не нужно → убрать.

### 4. Терминологическая каша
`storyline` vs `plotline` — непоследовательно, даже внутри одного промпта (Pass 3 вдруг переключается на plotlines). `episodic` как тип линии — не общепринятый термин. Story DNA используется один раз, потом забывается. Logline test = 3 части, Story DNA = 4 части — противоречие.

### 5. Код vs LLM — граница размыта
Правила валидации дублируются в промпте и коде ("exactly one episodic storyline"). Constraints которые код уже проверяет — зачем повторять в промпте? Re-request on error — как сейчас выглядит? Ранжирование по весам — код считает, но промпт тоже пытается объяснить.

### 6. Непроверенные утверждения
TRANSFORMED storyline — бывает ли? A-rank всегда plot-led — правда ли? "Emotional counterpoint" — что? Pass 0 вообще нужен отдельно?

## Подход к autoresearch

Решили: **Подход C — "Программа промптов + incremental autoresearch"**.

Но с важными уточнениями после обсуждения:
- Event functions — НЕ отдельный шаг. Это часть той же работы (глоссарий уже содержит правильные 7 функций, промпт Pass 2 — старые).
- Baseline считаем по **существующим** результатам 13 шоу, не прогоняем заново.
- Autoresearch = **тестовый стенд** (ты вносишь изменение → прогон → метрики → принять/откатить), а не автоматическая генерация промптов.
- Определения из теории (Nash, Douglas) — не подлежат авто-оптимизации. Авто-оптимизация — для формулировок инструкций и few-shot примеров.

## Blueprint First: структура промпта

Каждый Pass должен иметь одинаковый скелет:

```
1. ROLE        — кто ты (одно предложение)
2. DEFINITIONS — термины из глоссария, ровно те что нужны этому pass
3. INPUT       — что получаешь (schema, один раз)
4. TASK        — что делаешь (пронумерованные шаги)
5. OUTPUT      — JSON schema с типами полей
6. EXAMPLE     — few-shot примеры
```

Принцип: определи перед использованием, используй после определения, не повторяй. Никаких meta-комментариев, цитат, validation rules (это в коде), двойных описаний, негативных constraints на несуществующие проблемы.

## Что отдать коду, что — LLM

| Задача | Кто | Почему |
|--------|-----|--------|
| Franchise type → constraints (сколько линий, нужна ли episodic) | Код | Детерминированные правила |
| Валидация Story DNA completeness | Код | Проверка наличия 4 полей |
| Ранжирование A/B/C по весам | Код | Арифметика по event counts |
| Arc completeness / order | Код | Проверка последовательности функций |
| Извлечение линий из синопсисов | LLM | Fuzzy, нарративное понимание |
| Присвоение событий линиям | LLM | Понимание целей персонажей |
| Определение function (setup/catalyst/...) | LLM | Нарративное суждение |

Ключевой инсайт: чем больше constraints переносим из промпта в код, тем проще промпт и стабильнее результат.

## Few-shot примеры

Сейчас: один hardcoded пример (Breaking Bad) во всех промптах. BB — serial, 4 линии, чистая драма. Если на входе hybrid (House), пример BB может сбивать.

Идея: подбирать релевантный пример по franchise type. Или давать 2-3 примера разных типов. У нас уже есть 13 результатов — можно взять лучшие как кандидаты в few-shot. Это можно автоматизировать (DSPy/MIPRO-подобный подход).

Но это оптимизация второго порядка. Сначала промпты должны быть чистыми.

## Метрики

Текущие метрики в коде: coverage (доля событий привязанных к линии), consistency/ARI (стабильность между прогонами).

Проблема: нет ground truth. Варианты оценки:
- Стабильность + structural checks (код) — дёшево, но слепое пятно на качество
- LLM-as-judge по чеклисту — автоматизируемо, нужно калибровать
- Экспертная оценка на 2-3 шоу — дорого, но объективно

Нужно решить после чтения ExtractBench — как они сравнивают extracted JSON.

## Research findings

### Статьи для чтения (план в отдельном файле)
1. GoLLIE — annotation guidelines для IE
2. Blueprint First — code controls workflow, LLM for bounded subtasks
3. DSPy — prompts as compilable signatures
4. MIPRO — optimizer for multi-stage LM pipelines
5. OPRO — LLM generates improved prompts from history + scores
6. TextGrad — textual gradients for component optimization
7. ExtractBench — metrics for nested JSON extraction

### Ключевые инсайты из research
- Чистый few-shot GPT-4 обычно не бьёт fine-tuned BERT на NER. Но гибрид (LLM extraction + code validation) — бьёт.
- Ширина JSON схемы (количество полей) — главный предиктор провала extraction (ExtractBench). У tvplotlines ~15 полей на storyline — умеренно.
- OPRO/TextGrad/MIPRO — для оптимизации формулировок и примеров, не для оптимизации онтологии.
- Riedl 2016 — нарративы оставляют многое implicit, LLM должна собирать из разрозненных упоминаний. Релевантно для Pass 1 (Story DNA reconstruction).

## Данные

- 13 шоу с результатами в `/Users/nvashko/Projects/1-projects/tvplotlines-app/data/results/`
- Метрики считаются через `compute_all_metrics.py` там же
- Глоссарий (ground truth): `3-resources/plotter_docs/preprint/paper/glossary 1.md` (domain terms) + `glossary.md` (pipeline terms)
- 60 замечаний: `/Users/nvashko/Projects/notes for 3rd autoresearch.md`

## Что дальше

1. Прочитать 7 статей (план в `autoresearch-v3-reading-plan.md`)
2. Вернуться, написать план autoresearch v3 с учётом прочитанного
3. Старый `autoresearch-v3-event-functions.md` — устарел, будет заменён
