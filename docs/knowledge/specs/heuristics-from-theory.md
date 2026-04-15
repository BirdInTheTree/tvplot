---
type: note
project: tvplotlines
status: active
---

# Эвристики из теории: что набрать из учебников перед написанием промптов и кода

Источник: ревью промптов (`pass0.md` — `pass3.md`) и кода (`pass0.py` — `postprocess.py`). Много правил сидят в промптах как расплывчатый текст, хотя их можно формализовать в код. Но прежде чем формализовать — нужно набрать эвристик из учебников (Nash, Douglas, Oberg, Landau, Mittell, McKee, Netflix workshop).

Общий принцип:

```
Теория (учебники) → Эвристики (таблица правил) → Код (валидация)
                                                → Промпт (только то, что код не может проверить)
```

Каждое правило из промпта: **можно проверить кодом?** Если да → убрать из промпта, написать проверку. Qiu 2025: код-проверка даёт +11.7pp, правила в промпте — +1.1pp.

---

## 1. Порядок функций в арке (→ `postprocess.py`)

**Сейчас:** в промпте Pass 3 одна строка: "A healthy storyline has an arc: setup → escalation → turning_point → climax → resolution". Код ничего не проверяет.

**Набрать из учебников:** таблицу правил — какие функции имеют строгий порядок между собой, какие могут меняться местами, какие могут повторяться. Источники: Nash (beat sheet order), McKee (5 elements), Netflix Season Map.

**Куда:** код-валидация в `postprocess.py` после Pass 2, до Pass 3. Жёсткие нарушения → флаг для Pass 3. Мягкие → диагностика.

## 2. Ожидания по структуре сезона (→ `postprocess.py` + `pass3.py`)

**Сейчас:** в промпте Pass 3 — "storyline structure should match the type", расплывчато. В коде: только "procedural/hybrid = 1 episodic" и "serial = 1 A-rank".

**Набрать из учебников:**

| Правило | Источник | Где проверять |
|---------|----------|--------------|
| Первый эпизод: setup для A-линии | Nash: "Set-Up" | Код после Pass 2 |
| Последний эпизод limited: resolution для A/B | Nash, Netflix | Код после Pass 2 |
| Последний эпизод ongoing: cliffhanger/seed ок | Landau | Код после Pass 2 |
| Episodic линия: в каждом эпизоде | Douglas | Код: `compute_span` |
| Serialized: span ≥ 2 эпизодов | По определению | Код: `compute_span` |
| A-rank: не "glimpse" > 1-2 эпизодов | Nash | Код: `validate_ranks` |
| Procedural: episodic = больше всего событий | Douglas | Код: `validate_ranks` |

## 3. Story DNA completeness (→ `pass1.py`)

**Сейчас:** промпт говорит "Missing any component — not a storyline". Код не проверяет.

**Набрать:** Nash p.34 — "Story DNA has four parts." Но runner может не иметь obstacle, "partial" confidence допускает неполную DNA.

**Куда:** код-валидация: non-runner + solid → все поля непустые. Runner → goal непустая. Пустые поля при solid → re-request или понизить confidence.

## 4. Количество линий по типу (→ `pass1.py`)

**Сейчас:** в промпте числа, в коде не проверяются.

**Набрать:**

| Franchise type | Min | Max | Источник |
|---------------|-----|-----|----------|
| Procedural | 2 | 5 | Douglas |
| Serial | 3 | 8 | Nash |
| Hybrid | 3 | 6 | Douglas |
| Ensemble | 4 | 8 | Mittell |

**Куда:** код-валидация в `pass1.py`.

## 5. A-rank = всегда plot-led? (→ проверить)

Промпт утверждает. Nash/Douglas подтверждают? В ensemble возможна A-линия character-led. Если теория не подтверждает — убрать.

## 6. Episodic как тип линии (→ глоссарий)

Douglas/Mittell используют "case-of-the-week", не "episodic storyline". Nash не использует. Либо заменить, либо дать формальное определение со ссылкой.

## 7. Narrative devices — нужны ли?

Список из 6 devices в Pass 1 И Pass 2. Downstream не используются. Если нигде → убрать (~200 tokens экономия). Если для визуализации → только в Pass 2.

## 8. Interactions — формализовать или убрать

- **Convergence** уже покрывается через `also_affects` → дублирование?
- **Thematic rhyme** — Nash: "B-story reflects A-story theme." Оставить если используется.
- **Dramatic irony** — полезно для визуализации.
- **Meta** — расплывчатая категория → убрать.

## 9. "Emotional counterpoint"

Промпт Pass 2: "if all storylines rising or falling — something is missed." Основание есть (Nash, Douglas), но это не правило для LLM — это диагностический флаг. Перенести в код: все функции в эпизоде = escalation → флаг "monotone episode".

## 10. Weight — откалибровать пороги

Код: primary ≥ 50% max, background ≥ 2, glimpse = 1. Произвольные. Nash/Douglas: "A = 60-70%, B = 20-30%". Можно откалибровать.

## 11. Pass 3: какие verdicts вычислить кодом

| Verdict | Кодом? | Как |
|---------|--------|-----|
| PROMOTE/DEMOTE | Да | Уже частично в `validate_ranks` |
| MERGE | Частично | Один driver + cosine similarity goals > 0.9 |
| RERANK | Да | Rank ≠ event count |
| REASSIGN | Нет | Нарративное суждение |
| CREATE | Нет | Нарративное суждение |

Детерминированные verdicts применять до Pass 3.
