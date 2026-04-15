---
type: note
project: tvplotlines
status: active
---

# Autoresearch v3: инженерная рецензия планов

Рецензия на документы: [[tvplotlines-autoresearch-v3-plan|v3-plan]], [[tvplotlines-autoresearch-v3-engineering|v3-engineering]], [[tvplotlines-autoresearch-v3-event-functions|v3-event-functions]], [[tvplotlines-autoresearch-v3-brainstorm-notes|v3-brainstorm-notes]], [[tvplotlines-autoresearch-v3-questions|v3-questions]], [[tvplotlines-autoresearch-v3-reading-plan|v3-reading-plan]], [[tvplotlines-autoresearch-v3-hybrid-vs-procedural|v3-hybrid-vs-procedural]], [[notes for 3rd autoresearch]], [[tvplotlines-architecture|architecture]], [[tvplotlines-event-functions-redesign|event-functions-redesign]], [[tvplotlines-stability-benchmark|stability-benchmark]], [[tvplotlines-autoresearch-summary-v2|autoresearch-summary-v2]], [[tvplotlines-metrics-survey|metrics-survey]], [[tvplotlines-design-decisions|design-decisions]], [[tvplotlines-decision-001-context-before-extraction|ADR-001]], [[tvplotlines-decision-005-pass3-narratologist-review|ADR-005]], [[tvplotlines-naive-vs-tvplotlines|naive-vs-tvplotlines]], [[tvplotlines-enculturation-core-idea|enculturation-core-idea]]. Также промпты (`pass0.md` — `pass3.md`) и код (`pass0.py` — `postprocess.py`).

---

## Общая оценка

В документах два проекта под одним именем "v3":

1. **Исследовательский** ([[tvplotlines-autoresearch-v3-plan|v3-plan]]): ablation study — доказать что scaffold важен. Цель — препринт.
2. **Инженерный** ([[tvplotlines-autoresearch-v3-engineering|v3-engineering]], [[tvplotlines-autoresearch-v3-event-functions|v3-event-functions]], [[tvplotlines-autoresearch-v3-questions|v3-questions]], [[notes for 3rd autoresearch|60 замечаний]]): переписать промпты, заменить event functions, вычистить мусор. Цель — качество продукта.

Порядок в документах перевёрнут. Ablation study на текущих промптах будет измерять качество бардака, а не scaffold'а.

---

## 1. Сначала чистка, потом исследование

Инженерная чистка **до** ablation study — детерминированная работа, не требует autoresearch:

1. `storyline → plotline` везде
2. Глоссарий = ground truth для определений в промптах
3. Blueprint First скелет промпта: ROLE → DEFINITIONS → INPUT → TASK → OUTPUT → EXAMPLE
4. Constraints из промптов → в код (Qiu 2025: +11.7pp vs +1.1pp)
5. Event functions: заменить `cliffhanger/seed` на `catalyst/crisis` в промптах и в коде. **Сначала верифицировать набор по учебникам** (см. п.6)
6. Неиспользуемые поля (`format`, `narrative devices`, `patches`, `interactions`): сейчас собираются но нигде не применяются. Для `format` и `patches` — скорее всего убрать. Для `narrative devices` — возможно оставить: после чтения Zwaan (когнитивный контроль при понимании нарратива) и работ по AI enculturation есть основание думать что выделение devices может быть частью того как scaffold помогает LLM "понимать" нарратив. Нужно: уточнить список devices по теории, определить где они применяются downstream, и только тогда решить — убрать или формализовать
7. Merge Pass 0 → Pass 1 (ablation `pass1_merged.py` показала что можно)

После чистки — прогон на 12 шоу, сравнить с v2-10 baseline (mean 0.0588). Деградация > 5% → найти причину, откатить.

---

## 2. Метрики

### Что работает

| Метрика | Что измеряет | Откуда |
|---------|-------------|--------|
| `coverage` | Полнота — все события привязаны? | Здравый смысл |
| `ARI` | Стабильность — воспроизводим между прогонами? | Hubert & Arabie 1985 |
| `coh_sep` | Различимость — линии не слипаются? | Наша, из идей Silhouette Coefficient |

### Что проверяет что

| Что                    | Кто создаёт         | Кто проверяет    | Метрика               |
| ---------------------- | ------------------- | ---------------- | --------------------- |
| Арка эпизода           | LLM (Pass 2)        | Код после Pass 2 | episode completeness  |
| Разнесение по линиям   | LLM (Pass 2)        | Код              | `coh_sep`, `coverage` |
| Арка линии через сезон | Код (постобработка) | Pass 3 + код     | arc completeness      |

### Позиция: не accuracy, а reliability + validity

tvplotlines работает с текстом синопсиса и ищет **воспроизводимую нарратологическую интерпретацию текста**. 

Три метрики это и измеряют: стабильно (ARI), различимо (coh_sep), полно (coverage). **Оговорить в препринте и README** почему мы не проверяем ground truth 

### `function_score` — снять

Произвольные пороги, некалиброванная формула. Episode completeness и arc completeness — реализовать в коде на этапе чистки как факт (5/7, 7/7), без оценок "хорошо/плохо". Пороги калибровать post-hoc.

---

## 3. v2 урок

Из 12 экспериментов v2: 2 успеха, 10 провалов. Добавление/убирание фраз в промпт ломало баланс. Главный вывод: **"The procedural problem is structural, not prompt-based."**

**Это главный риск v3** — мы хотим радикально переписать промпты, а v2 показал что промпты хрупкие.

Но есть важное отличие. v2 менял текст в работающем промпте — добавлял/убирал фразы, надеясь улучшить. v3 чистка — это не "менять формулировки", а рефакторинг: убрать мусор (meta-комментарии, дубликаты, цитаты), привести к единой структуре (Blueprint First), перенести проверки в код, заменить определения на точные из глоссария. Промпт должен сказать **то же самое**, но чище. Как переписать функцию без изменения поведения.

**Стратегия снижения риска:** одно изменение → прогон → сравнить с baseline → если упало → откатить конкретное изменение. Не всё разом.

Для v3 это также значит: из 17 шагов v3-plan минимум 8 — эксперименты с формулировками. При hit rate 17% (как в v2) → 1-2 успеха из 8. Бюджет может не хватить. Приоритет — структурные изменения (код), а не формулировки.

---

## 4. Event functions: два документа противоречат

[[tvplotlines-event-functions-redesign|event-functions-redesign]] — зрелый документ с фрактальной структурой, теоретическим обоснованием. [[tvplotlines-autoresearch-v3-event-functions|v3-event-functions]] — черновик с необоснованным function_score.

Использовать первый. Из второго взять только протокол (baseline → замена → coh_sep ≥ baseline × 0.95).

---

## 5. Эвристики из теории

Много правил в промптах как расплывчатый текст, которые можно формализовать в код. Но сначала — набрать из учебников. Подробный каталог: [[tvplotlines-heuristics-from-theory]].

Ключевые:
- **Порядок функций в арке** — уточнить какие жёсткие, какие гибкие
- **Episode completeness** — какие функции must be в каждом эпизоде
- **Story DNA** — код-валидация полноты полей
- **Количество линий по franchise type** — код-валидация диапазонов
- **A-rank = plot-led?** — проверить в теории
- **Narrative devices, interactions, emotional counterpoint** — нужны ли? формализовать или убрать?

---

## 6. Event functions: верифицировать набор

Текущие 7 функций — микс Nash + Netflix + McKee + Oberg. Ни один практик не узнает "свою" систему.

| Наша          | Nash                | Netflix           | McKee                     | Harmon    |
| ------------- | ------------------- | ----------------- | ------------------------- | --------- |
| setup         | Set-Up              | Setup             | —                         | YOU, NEED |
| catalyst      | Catalyst            | Inciting Incident | Inciting Incident         | GO        |
| escalation    | Fun & Games + Bad Guys Close In | Escalation | Progressive Complications | SEARCH |
| turning_point | Midpoint                        | Midpoint   | —                         | FIND   |
| crisis        | All Is Lost + Dark Night of the Soul | Crisis | Crisis                    | TAKE   |
| climax        | Finale              | Climax            | Climax                    | RETURN    |
| resolution    | Final Image         | Resolution        | Resolution                | CHANGE    |

**До внедрения:** выбрать каноническую основу, проверить конспект Netflix workshop, записать маппинг в глоссарий.

---

## 7. Мелкие замечания

**Reading plan ([[tvplotlines-autoresearch-v3-reading-plan|v3-reading-plan]])** предлагает прочитать 7 статей. Из них для v3 реально нужны 3: GoLLIE (как писать определения в промпте), Blueprint First (что перенести в код), ExtractBench (как сравнивать JSON результаты). Остальные 4 (DSPy, MIPRO, OPRO, TextGrad) — про автоматическую оптимизацию промптов. При нашем бюджете ($60-85) и масштабе (12 шоу) ручной A/B тест (как в v1/v2) дешевле и проще чем фреймворк.

**Naive vs tvplotlines ([[tvplotlines-naive-vs-tvplotlines|naive-vs-tvplotlines]])** — эксперимент "наивный промпт vs pipeline". Это то же самое что условие A в ablation study из [[tvplotlines-autoresearch-v3-plan|v3-plan]]. Не делать два раза — объединить в один эксперимент.

**Hybrid vs procedural ([[tvplotlines-autoresearch-v3-hybrid-vs-procedural|v3-hybrid-vs-procedural]])** — вопрос "где граница между procedural и hybrid". Хорошо поставлен (конкретная проблема, конкретная гипотеза). Решить на фазе 1 (подготовка) — прочитать Nash/Douglas/Mittell, уточнить определение.

---

## Что через autoresearch, а что нет

**НЕ через autoresearch:** переименование, глоссарий→промпты, Blueprint First, constraints→код, enum functions, merge Pass 0→1, мусорные поля, пост-обработка арок.

**Через autoresearch:** ablation study, формулировки event functions, CoT в примерах, подбор примеров по franchise type.

---

## Порядок работы

Детальный план с чекбоксами: [[tvplotlines-autoresearch-v3-todo]]

Бюджет: ~$60-85. Каждая фаза — checkpoint.
