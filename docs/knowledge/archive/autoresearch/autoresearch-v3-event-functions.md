---
type: note
project: tvplotlines
status: active
---

# Autoresearch v3: Event Functions Redesign

## Цель

Внедрить новый набор event functions (7 функций вместо текущих 7) в промпт Pass 2 без деградации существующих метрик storyline quality.

**Было:** setup, escalation, turning_point, climax, resolution, cliffhanger, seed
**Стало:** setup, catalyst, escalation, turning_point, crisis, climax, resolution

Полное описание изменений: `todo/event-functions-redesign.md`

## Отличие от v1/v2

| | v1 | v2 | v3 |
|---|---|---|---|
| Цель | Улучши метрику | Улучши метрику | Внедри изменения, не сломай метрику |
| Свобода | Любые изменения | Любые изменения | Конкретные изменения, свобода в формулировках |
| Метрика | ARI (consistency) | coh_sep (quality) | coh_sep (constraint) + function_score (goal) |
| Датасет | 1 шоу | 12 шоу | 12 шоу (те же) |

Ключевое отличие: v1/v2 = "делай что хочешь, улучши X". v3 = "внедри Y при условии что X не упадёт".

## Новая метрика: function_score

Автоматическая, без ground truth. Три компоненты:

### 1. Arc completeness

Для каждой storyline: сколько из 7 фаз присутствует.

```python
def arc_completeness(storyline_events):
    functions = {e.function for e in storyline_events}
    return len(functions) / 7
```

Ожидания по рангу (из `todo/event-functions-redesign.md`):
- A: ≥ 6/7
- B: ≥ 5/7
- C: ≥ 3/7
- runner: ≥ 1/7[^1]

Метрика: доля storylines, достигших ожидаемого минимума.

### 2. Arc order (monotonicity)

Проверяем что арка не возвращается через milestone.[^2] Milestones: catalyst, turning_point, crisis, climax.

```python
WEIGHT = {"setup": 1, "catalyst": 2, "escalation": 3, "turning_point": 4, "crisis": 5, "climax": 6, "resolution": 1}
MILESTONES = {"catalyst", "turning_point", "crisis", "climax"}

def arc_order_score(storyline_events_sorted):
    """1.0 if no return past milestone, penalty for each violation."""
    max_milestone_weight = 0
    violations = 0
    for e in storyline_events_sorted:
        w = WEIGHT[e.function]
        if e.function in MILESTONES:
            max_milestone_weight = max(max_milestone_weight, w)
        elif w < max_milestone_weight - 1:  # return past milestone
            violations += 1
    return max(0, 1.0 - violations * 0.1)
```

### 3. Function distribution

Каждый эпизод должен иметь разнообразие функций, не все escalation. [^3]

```python
def distribution_score(episode_events):
    """Penalize episodes where >80% events have the same function."""
    from collections import Counter
    counts = Counter(e.function for e in episode_events)
    max_pct = max(counts.values()) / len(episode_events)
    return 1.0 if max_pct <= 0.8 else 0.5
```

### Комбинированная метрика[^4]
```python
function_score = mean(arc_completeness) * mean(arc_order_score) * mean(distribution_score)
```

## Constraint: существующие метрики

```
coh_sep >= baseline_coh_sep * 0.95  # не больше 5% деградации
coverage >= 0.95                     # покрытие событий
```

Если constraint нарушен — revert, как в v1/v2.  [^5]

## Что оптимизирует autoresearch

### Обязательные изменения (внедрить в первом эксперименте) [^6]

1. Заменить таблицу функций в Pass 2 промпте (EN + RU)
2. Обновить `_VALID_FUNCTIONS` в `pass2.py`
3. Обновить описания функций

### Свободные варианты (autoresearch пробует)

- Как описать catalyst — "trigger event", "inciting incident", "the thing that starts the storyline"?
- Как описать crisis — "lowest point", "all is lost", "whiff of death"?
- Сколько примеров давать для каждой функции?
- Нужно ли добавить правило про порядок функций в арке?
- Как описать отличие escalation от catalyst (оба "что-то происходит")?
- Нужно ли упоминать Act 1/2/3 или оставить абстрактно? [^7]

## Протокол

### Фаза 0: Baseline

1. Прогнать текущий pipeline на fast set (BB, SP, House, Lost)[^8] с текущими функциями [^9]
2. Вычислить coh_sep и function_score (с маппингом старых функций на новые для сравнимости):[^10]
   - cliffhanger → climax (ближайший аналог)
   - seed → setup (ближайший аналог)
3. Записать baseline

### Фаза 1: Внедрение (1 эксперимент)

1. Заменить функции в промптах + код
2. Прогнать на fast set
3. Проверить constraint (coh_sep ≥ baseline * 0.95)
4. Если ок — keep. Если нет — начать фазу 2 с минимальных изменений.

### Фаза 2: Оптимизация формулировок

Стандартный autoresearch loop:
1. Одно изменение в описании функции
2. Прогон на fast set
3. function_score улучшился И constraint не нарушен → keep
4. Иначе → revert
5. Повторять

### Фаза 3: Валидация

1. Прогнать лучший вариант на full set (12 шоу)
2. Проверить что coh_sep не упал
3. Проверить function_score на всех шоу
4. Ручная проверка BB S01 — функции выглядят правильно?

## Бюджет

Fast set: ~$2-3 за прогон
Фаза 0: 1 прогон = ~$3
Фаза 1: 1 прогон = ~$3
Фаза 2: ~20 экспериментов = ~$50-60
Фаза 3: 1 прогон full set = ~$5
**Итого: ~$65-70**

## Что НЕ входит в v3

- Модификаторы (cliffhanger, seed как модификаторы) — отдельная задача после v3
- Post-processing фаз (группировка событий в фазы) — код, не autoresearch
- Pass 3 обновление (arc validation) — после v3 стабилизируется
- Визуализация — tvplotlines-app, не autoresearch
- Фрактальная структура (3 уровня арок) — после v3

## Файлы

| Файл | Что менять |
|------|-----------|
| `src/tvplotlines/prompts_en/pass2.md` | Таблица функций + описания |
| `src/tvplotlines/prompts/pass2.md` | То же, русский |
| `src/tvplotlines/pass2.py` | `_VALID_FUNCTIONS` |
| `src/tvplotlines/metrics.py` | Добавить `function_score` |
| `src/tvplotlines/prompts_en/pass3.md` | Step 2 (arc checking) — после v3 |
| `src/tvplotlines/prompts/pass3.md` | То же, русский — после v3 |

## Связи

- `todo/event-functions-redesign.md` — полное описание новых функций
- `experiments/autoresearch/program-v2.md` — протокол v2 (template)
- `experiments/bibliography-narrative-and-autoresearch.md` — литература
- Papalampidi et al. (2019) — ближайшая академическая работа по turning point detection

[^1]: what these are based on? any data? comon sense? if commonsense no good 
	

[^2]: and if it returns what it means? how do we know that it means that? is it bad or good? why would we need it 

[^3]:  здесь я не понимаю это ты написал до того как мы выяснили что у нас фрактальная структура и у нас есть арка внутри эпизода и это не арка сезона и даже не арка линии а самый эпизод устроен ровный тех же семи шагов и ровно это арку эпизода и получаем в проте NOM паст точнее получаем мы в результате второго Пасса. Соответственно то что ты здесь пишешь для меня не имеет смысла. Объясни пожалуйста

[^4]: я не понимаю что она меряет зачем меряет можешь каушика перечитать чтобы адекватнные придумывать решения а не декорации городить

[^5]:  слушай по сути это черновик прото почему же ты его пишешь на таком годовом языке если LLM хорошо понимает разговорный язык и я человек тоже хорошо понимаю разговорный язык почему же ты не пишешь сразу черновик так как будет лучше понято и мною и моделью а пишешь вот это вот всё я понимаю если бы это был человек которым надо сначала представить структуру а потом только сочинение писать но ты-то можешь писать тексты которые читаются по-человечески а сохраняют все логические ну входы выходы формулы ну как вообще
	 

[^6]: 5 А куда делись эти все инструкции которые мы писали по 1 000 000 раз писать так чтобы человек без контекста мог писать как маме объяснять смысл ничто делать зачем где это всё ты как будто манкурт какой-то это невозможно читать просто вот что это ты написал

[^7]: подробнее об этом о роли этих вопросоа? от роли зависит как они должны быть сформуоированы 

[^8]:  А как определить минимальный набор с точки зрения стоимости каждого прогона чтобы получить максимальный результат это как ты мне можешь помочь определить
	 

[^9]:  А зачем мы будем это ещё раз сделать? Мы же уже прогнали с текущими функциями вот у нас есть результаты зачем нам ещё раз это делать объясни ну разве ты деньги мои потратить хочешь

[^10]:  откуда эти показатели где мы взяли это тук-тук-тук тут существует это такое
	 
