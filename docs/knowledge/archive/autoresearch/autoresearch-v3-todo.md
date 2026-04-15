---
type: plan
project: tvplotlines
status: active
date: 2026-03-23
---

# Autoresearch v3: план работы

Рецензия: [[tvplotlines-autoresearch-v3-engineering-review]]
Эвристики: [[tvplotlines-heuristics-from-theory]]

---

## Фаза 1: Подготовка (чтение + решения)

Бриф для чтения учебников: [[tvplotlines-screenwriting-theory-reading-prompt]]

- [x] Прочитать GoLLIE (формат определений в промпте) → [[read-sainz-2024-gollie]]
- [x] Прочитать Blueprint First (что вынести в код) → [[read-qiu-2025-blueprint-first]]
- [x] Прочитать ExtractBench (метрики для JSON extraction) → [[read-ferguson-2026-extractbench]]
- [ ] Верифицировать event functions по каноническим источникам
	- [x] Сравнить наши 7 с Nash, McKee, Netflix/Kessler — маппинги записаны в заметках (read-nash, read-mckee, read-oberg, read-freytag)
	- [ ] **Зафиксировать решение:** сколько функций (5? 7?), какие именно, на основе какого источника. Предыдущий кандидат в [[tvplotlines-event-functions-redesign]]: 7 (setup, catalyst, escalation, turning_point, crisis, climax, resolution). Seed/cliffhanger → модификаторы. Нужно подтвердить или пересмотреть
	- [ ] Записать маппинг в глоссарий
- [x] Набрать эвристики порядка функций из учебников → Nash: строгий порядок, гибкий тайминг. Escalation после turning_point нормально (Bad Guys Close In). Catalyst не повторяется. Серия escalation в середине = нормально (Fun & Games). McKee: Act Rhythm — два последних climax чередуют заряд +/-. См. заметки Nash, McKee
- [x] Набрать эвристики episode completeness → два уровня арки (эпизод vs сезон). В serial resolution арки не в каждом эпизоде, но resolution событий эпизода — да. В procedural case = полная арка per episode. В Wire-style serial эпизод может не иметь episodic closure вообще. См. заметки Nash, Douglas, Mittell
- [x] Решить: A-rank = всегда plot-led? → **Нет.** Douglas: A может быть character-led (NYPD Blue). Oberg: story-type = атрибут plotline, не rank. Landau: A = franchise (episode level), Douglas: A = most resonant (series level) — разные уровни, не противоречие
- [x] Решить: "episodic" как тип линии → заменить на `procedural_scope: episode | season | none` как атрибут plotline. Franchise type вычисляемый из plotlines
- [x] Решить: narrative devices → **убрать `devices` как поле** (и на plotline, и на event). Mystery = goal, suspense = discourse (не извлекаем), callback = seed (function), twist = turning_point (function), unreliable = discourse. Dramatic irony остаётся как interaction type. Flashback/flashforward → отдельное поле event (temporal), посмотрим где срабатывает
- [x] Решить: interactions → оставить convergence, dramatic_irony, thematic_rhyme. **Убрать meta** (расплывчатое). Задача для app: визуализация interactions в аналитике
- [x] Решить: hybrid vs procedural → `procedural_scope` на plotline определяет franchise type. Episode-scope = procedural/hybrid, season-scope = serial с сезонным procedural element, none = pure serial. В hybrid case-of-the-week = B по умолчанию (гипотеза на проверку)
- [ ] Объединить [[tvplotlines-event-functions-redesign]] и [[tvplotlines-autoresearch-v3-event-functions]] в один документ, архивировать оригиналы

### Новые решения из чтения книг (2026-03-23)

Чтение: Nash, McKee, Douglas, Oberg, Landau (оба), Mittell. Заметки: `read-nash-2022-*`, `read-mckee-1997-*`, `read-douglas-2011-*`, `read-oberg-2023-*`, `read-landau-2018-*`, `read-mittell-2015-*`.

- [ ] **Story-type** (plot-led / character-led / theme-led) — новый атрибут plotline. Эвристика: "откуда приходит проблема?" Задаёт ожидания для проверки DNA. Story-type у линии и у события — разные вещи (событие = plot-led action внутри character-led арки). Pass 3 может уточнить. Источник: Oberg
- [ ] **Переименовать driver → hero** в Story DNA. Совпадает с Nash ("Story DNA: Hero, Goal, Obstacle, Stakes"). Hero = hero данной plotline, не сериала. Источник: Nash
- [ ] **Kernel/satellite** — потенциальный вычисляемый атрибут события (weight). Kernel = убрать → plot ломается. Satellite = убрать → plot выживет. Приблизительно: also_affects + function catalyst/turning_point/climax → kernel. Escalation без also_affects → satellite. Для визуализации в app. Источник: Mittell/Chatman, books2series compute_landmarks()
- [ ] **Oberg: конкретные пропорции A/B/C** для procedural: A=50%, B=33%, C=17%. Max 4-5 plotlines per episode. Runners = 3-5 beats. ~27-30 scenes per hour episode. Использовать как baseline для валидации
- [ ] **Landau: Central Question (future) vs Central Mystery (past)** — два типа goal. Goal может быть forward-looking или backward-looking. Для промпта: подсказать LLM что goal формулируется через глагол

## Фаза 2: Инженерная чистка (код + промпты, без autoresearch)

**Prerequisite — до начала фазы 2 должны быть готовы:**
1. [ ] Глоссарий — ground truth для всех определений (franchise types, plotline, Story DNA, event functions, типы линий)
2. [ ] Эвристики из учебников — заполненные таблицы в [[tvplotlines-heuristics-from-theory]] (порядок функций, episode completeness, количество линий по franchise type)
3. [ ] Верифицированные event functions — какие, на основе какого источника, с маппингом
4. [ ] Решения по спорным полям — narrative devices, interactions, episodic, A-rank = plot-led?, format, patches, confidence
5. [ ] Список constraints для переноса в код — полный перечень того что сейчас в промптах как текст, а должно быть проверкой в коде

Стратегия: одно изменение → прогон → сравнить с baseline → если упало → откатить.

- [ ] `storyline → plotline` везде
- [ ] Глоссарий = ground truth для определений в промптах
- [ ] Blueprint First скелет промпта: ROLE → DEFINITIONS → INPUT → TASK → OUTPUT → EXAMPLE
- [ ] Убрать meta-комментарии, цитаты с номерами страниц, двойные описания input/contract
- [ ] Убрать HOW-инструкции из промптов ("If code detects an error — re-request")
- [ ] Constraints из промптов → в код (составить полный список, перенести)
- [ ] Event functions: заменить `cliffhanger/seed` на `catalyst/crisis` (верифицированные в фазе 1)
- [ ] Merge Pass 0 → Pass 1
- [ ] `format`, `patches` — убрать из промптов
- [ ] `narrative devices` — по решению из фазы 1
- [ ] `interactions` — по решению из фазы 1
- [ ] Реализовать в коде: episode completeness (факт, без порогов)
- [ ] Реализовать в коде: arc completeness (факт, без порогов)
- [ ] Реализовать в коде: валидация порядка функций (по эвристикам из фазы 1)
- [ ] Реализовать в коде: Story DNA completeness (non-runner + solid → все поля непустые)
- [ ] Реализовать в коде: количество линий в диапазоне по franchise type

## Фаза 3: Проверка чистки

- [ ] Прогон на 12 шоу [$10-15]
- [ ] Сравнить с v2-10 baseline (mean 0.0588)
- [ ] Если деградация > 5%: найти какое изменение сломало, откатить, тестировать отдельно
- [ ] Визуальная проверка BB S01 + 1-2 других шоу

## Фаза 4: Ablation study (autoresearch) [$30-40]

- [ ] Подготовить 3 условия: A (naive) / B (минимальный scaffold) / C (полный scaffold)
- [ ] Прогнать на 5 шоу × 3 условия × 1-3 прогона
- [ ] Измерить: `coh_sep`, `coverage`, `ARI`, episode/arc completeness
- [ ] Показать: C > B > A
- [ ] Объединить с [[tvplotlines-naive-vs-tvplotlines]] (naive = условие A)

## Фаза 5: Оптимизация (autoresearch) [$20-30]

- [ ] CoT reasoning trace в few-shot примерах (1 прогон с CoT vs 3 без)
- [ ] Формулировки описаний event functions (catalyst vs escalation и т.д.)
- [ ] Подбор примеров по franchise type (BB для serial, House для procedural)

## Фаза 6: Валидация

- [ ] Прогнать лучший вариант на held-out set (шоу, которых pipeline не видел при оптимизации)
- [ ] Калибровать пороги episode/arc completeness post-hoc по результатам 12 шоу

---

Бюджет: ~$60-85. Каждая фаза — checkpoint.
