---
type: plan
project: preprint
status: active
---

# Эксперимент: Story DNA как когнитивный scaffold

## Гипотеза

Story DNA template (driver / goal / obstacle / stakes) — не просто формат вывода, а **когнитивный scaffold**, который переключает LLM с textbase-уровня (что произошло) на situation model-уровень (зачем персонаж так поступил). Без scaffold LLM сам не выходит на уровень intentional states (Bruner 1991).

## Дизайн

Три условия. Один и тот же вход (синопсисы сезона). Разные промпты.

### Условие A: без scaffold

Промпт: «Перечисли основные сюжетные линии этого сезона. Для каждой укажи название и краткое описание.»

LLM отвечает в свободной форме. Никакой структуры не навязано.

### Условие B: свободный анализ

Промпт: «Проанализируй нарративную структуру этого сезона. Определи сюжетные линии, их взаимосвязи и развитие.»

LLM получает задачу «глубже», но без конкретного scaffold. Проверяет: выйдет ли LLM на уровень intentional states сам, если попросить «анализировать».

### Условие C: со Story DNA scaffold

Промпт: «Для каждой сюжетной линии определи: driver (кто движет), goal (чего хочет), obstacle (что мешает), stakes (что на кону). Классифицируй тип (episodic / serialized / runner), ранг (A / B / C).»

LLM вынужден отвечать на вопросы о намерениях, препятствиях и ценностях — scaffold заставляет перейти на situation model.

## Метрики

### Количественные
- **Intentional state coverage:** сколько линий содержат эксплицитную информацию о мотивации персонажа (goal/desire/belief)? Считаем вручную или LLM-judge.
- **Causal depth:** сколько причинно-следственных связей между событиями выявлено?
- **Character differentiation:** различаются ли персонажи по мотивациям, или описаны как «участники событий»?
- **Breach detection:** сколько моментов «нарушения ожиданий» (turning points, twists) идентифицировано?

### Качественные (expert evaluation)
- Насколько результат полезен для development executive / сценариста?
- Видна ли структура сезона или только пересказ?
- Есть ли понимание «зачем авторы так построили» (pragmatic model)?

## Данные

Минимум 5 сериалов разных franchise types:
- 1 procedural (House / Law & Order)
- 1 serial (Breaking Bad / The Wire)
- 1 hybrid (X-Files / Buffy)
- 1 ensemble (Game of Thrones / This Is Us)
- 1 limited (Chernobyl / The Queen's Gambit)

По одному сезону каждого. Синопсисы берём одинаковые для всех условий.

## Ожидаемый результат

- **A** (без scaffold): список линий-пересказов, мало intentional states, мало causal depth. Textbase-уровень.
- **B** (свободный анализ): чуть глубже, но хаотично. LLM иногда выходит на intentional states, иногда нет. Нестабильно.
- **C** (Story DNA scaffold): систематическое покрытие intentional states для каждой линии. Более высокий causal depth. Чёткая дифференциация персонажей по мотивациям.

Разница B→C покажет, что scaffold — не просто формат, а когнитивный инструмент: LLM «знает» про intentional states (они есть в training data), но без явного запроса не активирует это знание. Scaffold — это активация, аналог cognitive control system (Zwaan 1993).

## Теоретическая рамка

| Что тестируем | Теоретический источник |
|---|---|
| Story DNA scaffold переключает LLM с textbase на situation model | Kintsch & Van Dijk 1978, Zwaan 1993 |
| Scaffold заставляет моделировать intentional states | Bruner 1991 (intentional state entailment) |
| Scaffold работает как cognitive control system | Zwaan 1993 (CCS) |
| Franchise type detection меняет стратегию анализа | Zwaan 1993 (LCCS / NCCS) |
| LLM без scaffold не выходит на situation model | Mitchell 2024 (LLMs lack world models), Park et al. 2023 (simulation без comprehension) |

## Distributed intelligence как архитектурный принцип

tvplotlines реализует distributed intelligence (Bruner 1991, Vygotsky): три типа интеллекта в одной системе, каждый со своей функцией.

**Детерминированный код** (pipeline, validators, post-processing) — гарантирует структуру и consistency. JSON schema, rank-span checks, orphan assignment. Не думает — но без него LLM наделает ошибок. Как таблица Менделеева: сама не решает, но без неё химик не работает.

**Промпты со знанием** (Story DNA template, franchise types, event functions) — накопленное нарратологическое знание, зашитое в scaffold. Не генерирует ответы, но задаёт правильные вопросы. Как опытный редактор: не пишет сам, но спрашивает «зачем твой герой так поступил?».

**LLM** (Claude / GPT) — гибкий решатель, способный к inference, но без scaffold остаётся на уровне textbase. Как талантливый стажёр: может увидеть глубоко, но только если правильно направить.

Multi-pass pipeline — распределение задач между тремя типами: LLM генерирует, промпт направляет, код валидирует. Ни один не справится в одиночку. Вместе — вычислительная реализация cognitive control system.
