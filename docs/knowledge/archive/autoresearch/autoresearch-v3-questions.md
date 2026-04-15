---
title: "Autoresearch v3: все вопросы и задачи"
type: note
status: active
project: tvplotlines
---

# Autoresearch v3: вопросы и задачи

Сводный документ. Каждая задача — из конкретного источника (статья или ревью промптов). Ссылки на заметки где идея обоснована.

Статус: `[ ]` — не начато, `[?]` — нужно обсудить, `[x]` — решено.

---

## 1. Pipeline architecture

Источник: [Blueprint First](blueprint-first-qiu-2025.md) — tool consolidation, DC > всё остальное.

- [ ] **Merge Pass 0 → Pass 1**: нужен ли Pass 0 отдельно? Экономия 1 LLM call. Уже пробовали (pass1_merged), откатили — но причины отката неясны, нужно перепроверить.
- [ ] **Pass 3: LLM или код?** Какие verdicts можно вычислить детерминированно (MERGE по совпадению driver+goal, PROMOTE/DEMOTE по весам), какие требуют LLM суждения (REASSIGN, CREATE)?
- [ ] **Длина промптов в tokens**: если >4K — "lost in the middle" реальна (Qiu, p.7), DC критичен.

## 2. Code validation (Double Check)

Источник: [Blueprint First](blueprint-first-qiu-2025.md) — DC даёт +11.7pp, мощнее структуры промпта.

- [ ] **Список дублирующихся constraints**: что сейчас и в промпте, и в коде? Составить полный список, убрать из промптов.
- [ ] **Усилить DC**: какие проверки код сейчас НЕ делает, но мог бы? (arc order, Story DNA completeness, naming convention)
- [ ] **Re-request формат**: как сейчас выглядит сообщение об ошибке при re-request? Достаточно ли конкретное?

## 3. Prompt structure (Blueprint First)

Источник: [Blueprint First](blueprint-first-qiu-2025.md) — WHAT vs HOW; [ревью промптов](../../notes%20for%203rd%20autoresearch.md) — 60 замечаний.

- [ ] **Единый скелет**: ROLE → DEFINITIONS → INPUT → TASK → OUTPUT → EXAMPLE. Применить ко всем 4 промптам.
- [ ] **Убрать meta-комментарии**: "compiled from reference.md", "recompile from ADR-005", "result shown to human", цитаты с номерами страниц.
- [ ] **Убрать HOW из промптов**: "If code detects an error — re-request" — это для кода, не для LLM.
- [ ] **Одно определение — одно место**: не повторять, не противоречить. Contract и Input — объединить.

## 4. Definitions (глоссарий → промпты)

Источник: [ревью промптов](../../notes%20for%203rd%20autoresearch.md) — проблема 2 (глоссарий ≠ промпты); ожидается [GoLLIE](gollie-sainz-2024.md) — как форматировать определения.

- [ ] **Глоссарий = ground truth**: franchise types, plotline, Story DNA, plot-led/character-led — брать из глоссария дословно.
- [ ] **Цепочка Franchise Type → Story Engine → Story DNA**: есть в глоссарии, нет в промптах. Включить.
- [ ] **Терминология**: `plotline` везде (не `storyline`). Проверить что не ломает extraction.
- [ ] **Story DNA**: либо использовать везде как шортхэнд (с определением один раз), либо выкинуть. Сейчас — ни то ни другое.
- [ ] **Logline test vs Story DNA**: test = 3 части (hero+goal+obstacle), DNA = 4 (+ stakes). Привести в соответствие.

## 5. Мусорные поля и концепции

Источник: [ревью промптов](../../notes%20for%203rd%20autoresearch.md) — проблема 3; нужна ablation чтобы решить.

- [?] **format** (ongoing/limited/anthology): зачем? franchise type достаточно? Ablation: убрать → метрики изменились?
- [?] **narrative devices**: зачем собираем? на что влияют? используются ли downstream? Ablation: убрать → ?
- [?] **confidence**: где объясняется? как работает?
- [?] **interactions**: зачем? где используются? Ablation: убрать → ?
- [?] **patches**: что делают? нужны ли если усилить DC?
- [?] **weight** (primary/background/glimpse): определение есть только в глоссарии, не в промпте.
- [?] **episodic как тип**: не общепринятый термин. Замена?
- [?] **"Seed and wraparound — not storyline types"**: зачем constraint на несуществующую проблему?

## 6. Event functions

Источник: [autoresearch-v3-event-functions.md](autoresearch-v3-event-functions.md), [event-functions-redesign.md](event-functions-redesign.md), глоссарий.

- [ ] **Заменить таблицу функций в Pass 2**: cliffhanger/seed → catalyst/crisis. Глоссарий уже содержит правильные 7 функций.
- [ ] **Описания функций**: как описать catalyst vs escalation? crisis vs climax? Нужны точные формулировки.
- [ ] **Constraints по порядку**: какие функции после каких не могут быть? Какие могут повторяться? В код или в промпт?
- [ ] **Все ли events имеют функцию?** Должны — но бывает всякое.

## 7. Few-shot examples

Источник: [CoT — Wei et al.](cot-wei-2022.md) — reasoning trace в примерах; ожидаются [DSPy](dspy-khattab-2024.md), [MIPRO](mipro-opsahl-ong-2024.md) — автоматический подбор примеров.

- [ ] **Добавить reasoning trace в BB пример**: почему эти линии, почему такие ранги. Reasoning ДО JSON, не после.
- [ ] **1 прогон с CoT vs 3 прогона без (voting)**: что стабильнее? что дешевле?
- [ ] **Релевантные примеры по franchise type**: hybrid → пример из House, ensemble → из GoT. Сейчас везде BB (serial).
- [ ] **Сколько примеров**: 1 (сейчас) vs 2-3 (three-shot). Стоимость vs качество.
- [ ] **Bootstrapping примеров из собственных ошибок** (GoLLIE + DSPy): прогнать pipeline → код (DC) ловит ошибки (линии без obstacle, дубликаты, неправильные ранги) → ошибки становятся негативными примерами в определениях, удачные результаты → положительными. Скрипт, не фреймворк.

## 8. Prior season continuity

Источник: [ревью промптов](../../notes%20for%203rd%20autoresearch.md) — P1 замечания по prior_season.

- [?] **TRANSFORMED**: бывает ли в реальности? Есть ли в теории (Nash, Douglas)?
- [?] **ENDED**: что помечаем если линии нет? Логика непонятна.
- [ ] **Откуда берётся prior_season**: объяснить в промпте или убрать из промпта (код инжектирует).

## 9. Metrics и evaluation

Источник: ожидается [ExtractBench](extractbench-ferguson-2026.md) — метрики для nested JSON.

- [ ] **Baseline по существующим 13 результатам**: coverage, ARI, + что ещё?
- [ ] **Как сравнивать два JSON** (старый промпт vs новый): per-field? semantic matching для массивов?
- [ ] **LLM-as-judge**: чеклист для оценки результата (Story DNA complete? ранги соответствуют весам? дубликатов нет?)
- [ ] **function_score** (arc completeness + order + distribution): формулу нужно пересмотреть с учётом фрактальной арки.

## 10. Autoresearch method

Источник: ожидаются [OPRO](opro-yang-2023.md), [TextGrad](textgrad-yuksekgonul-2024.md), [MIPRO](mipro-opsahl-ong-2024.md).

- [ ] **Метод оптимизации**: OPRO vs TextGrad vs ручной A/B — что подходит для наших промптов?
- [ ] **Train/test split**: 8 шоу train, 4 test? Или иначе? По franchise type?
- [ ] **Новые сериалы**: нужны ли для test set шоу которых pipeline никогда не видел?
- [ ] **Бюджет**: сколько прогонов, сколько стоит каждый, общий лимит.
- [ ] **Ablation study**: убирать компоненты по одному (format, devices, interactions, Pass 0, Pass 3) и замерять.

## 11. Structured reasoning (CoT/ToT/GoT)

Источник: [CoT — Wei et al.](cot-wei-2022.md), [ToT — Yao et al.](tot-yao-2023.md), [GoT — Besta et al.](got-besta-2024.md).

### Что применимо без натяжек

**CoT → reasoning trace в few-shot примерах** (конкретная задача):
- [ ] Добавить reasoning ДО JSON в BB пример для всех промптов. Wei доказал: reasoning до ответа улучшает, после — нет.
- [ ] Сравнить: 1 прогон с CoT-примером vs 3 прогона без (voting/CoT-SC). Если 1 с CoT ≥ 3 без — экономия 3x.

**GoT → формализация pipeline для preprint** (не код, а описание):
- [ ] Наш pipeline = GoT pattern: Generate (Pass 1) → Decompose per episode (Pass 2) → Aggregate + Refine (Pass 3). Нарисовать GoO diagram.
- [ ] Сослаться на GoT framework (Besta) и Blueprint First (Qiu) как формальные основания архитектуры.

### Что снято (не обосновано)

- ~~ToT для замены 3x voting~~ — наша задача extraction, не search. ToT решает задачи с backtracking (Game of 24, кроссворды), у нас нет дерева вариантов.
- ~~ToT generate plans → vote → fill~~ — спекуляция, нет оснований что это лучше текущего подхода.
- ~~GoT decomposition для Pass 1 (по персонажам)~~ — усложнение без доказанной пользы.

### Полезно для понимания

Yao (Figure 1) формализовал наш 3x voting как CoT-SC. Это даёт точный язык: мы знаем что делаем, знаем ограничения (CoT-SC не помогает если ошибка систематическая, а не случайная).

---

## Порядок работы (черновик, уточнится после чтения статей)

1. Baseline по 13 существующим результатам
2. Ablation: убирать мусорные поля по одному, замерять
3. Структурный рефакторинг промптов (Blueprint First скелет)
4. Определения из глоссария
5. Терминология (plotline)
6. Event functions
7. CoT в примерах
8. Autoresearch loop по формулировкам
9. Валидация на test set
