---
type: plan
project: tvplotlines
status: active
---

# TODO: Pipeline Resilience

## Контекст

Autoresearch-эксперименты потеряны из-за OAuth-аутажа API (2026-03-14). Пайплайн all-in-memory, all-or-nothing — краш в любой точке = перезапуск всех LLM-вызовов. Pass 2 (N episode calls) — самый дорогой шаг. Batch mode теряет batch ID при падении процесса. Сетевые ошибки и rate limits мгновенно крашат пайплайн.

**Цель:** Пайплайн переживает API brownouts, не нарушая контракт библиотеки (без disk I/O, backward compatible, opt-in сложность).

**Принцип:** Библиотека не крашится без нужды (retry, timeout, partial success). Библиотека никогда не пишет файлы. Персистенция — выбор вызывающего через callbacks или передачу промежуточных результатов.

---

## Step 1: Network resilience (`llm.py` — internal, no API change)

### 1a. Transient error retry with backoff

- [x] Добавить константы `_MAX_NETWORK_RETRIES = 3`, `_BACKOFF_BASE = 2.0`
- [x] Добавить `_transient_exceptions() -> tuple` — lazy-cached, собирает retryable exceptions из установленных SDK
- [x] Обернуть `_araw_call` в `_araw_call_with_retry()` с exponential backoff
- [x] Заменить вызов `_araw_call` внутри `acall_llm` на `_araw_call_with_retry`
- [x] Существующий ValueError retry loop остаётся нетронутым

### 1b. Request timeout

- [x] Добавить поле `timeout: float = 120.0` в `LLMConfig`
- [x] Передавать в SDK клиенты (anthropic: `httpx.Timeout`, openai: `timeout=`)

### 1c. Partial success in parallel mode

- [x] `acall_llm_parallel`: `asyncio.gather(*tasks, return_exceptions=True)`
- [x] Retry failed tasks individually, preserve successful results

---

## Step 2: Callbacks (new file + `pipeline.py`)

### 2a. PipelineCallback base class

- [x] Создать `src/tvplotlines/callbacks.py` с 6 callback-методами (all no-op by default)

### 2b. Wire callbacks into pipeline

- [x] `callback: PipelineCallback | None = None` в `get_plotlines()`
- [x] `_fire()` helper — try/except обёртка для callback-вызовов
- [x] Sequential mode: `on_episode_complete` после каждого эпизода
- [x] All modes: `on_pass2_complete` после всех эпизодов

### 2c. Export

- [x] `PipelineCallback` добавлен в `__all__`

---

## Step 3: Resume from pre-computed inputs (`pipeline.py`)

- [x] Optional параметры `cast`, `plotlines`, `breakdowns` в `get_plotlines()`
- [x] Валидация: cast/plotlines вместе, breakdowns length match
- [x] Post-processing всегда запускается (даже с пре-supplied breakdowns)

---

## Step 4: Batch resilience (`llm.py` + `pass2.py` + `pipeline.py`)

### 4a. Batch ID callback

- [x] `on_batch_submitted` param в `acall_llm_batch` и sync wrapper `call_llm_batch`
- [x] Fire сразу после `client.messages.batches.create()`

### 4b. Resume from batch ID

- [x] `batch_id` param в `acall_llm_batch` и sync wrapper
- [x] Skip batch creation when provided

### 4c. Batch polling timeout

- [x] `_BATCH_TIMEOUT = 3600`, raises `TimeoutError`

### 4d. Pass through from pipeline

- [x] `pass2.py`: `assign_events_batch` passes through `batch_id`, `on_batch_submitted`
- [x] `pipeline.py`: batch mode wires `callback.on_batch_submitted`

---

## Верификация

- [x] 54 existing tests pass (zero regressions)
- [x] Network retry — 3 tests: retries on transient, raises after max, backoff delays
- [x] Partial gather — 1 test: preserves successful, retries failed
- [x] Callbacks — 2 tests: default no-op, subclass receives events
- [x] Resume validation — 3 tests: cast/plotlines together, breakdowns length
- [x] Batch timeout — 1 test: TimeoutError after short timeout
- [x] Batch callback — 1 test: on_batch_submitted fires with batch ID
- [x] Integration — full run + resume with RecordingCallback (3 episodes, sequential, $0.09)

**Total: 65 unit + 2 integration tests, all green.**

---

# Code Audit (2026-03-15)

## Critical (fix now)

- [x] **`text` uninitialized in retry loop** (`llm.py`) — initialized `text = ""` before loop, removed broken `dir()` check
- [x] **`pass2_mode` silent fallthrough** (`pipeline.py`) — explicit `elif "sequential"`, else `raise ValueError`
- [x] **`KeyError` bypasses LLM retry** (`pass1.py`, `pass2.py`, `pass3.py`) — wrapped `_parse_*` in `KeyError` → `ValueError` conversion; added explicit check for `v["action"]` in pass3
- [x] **`TVPlotlinesResult.usage` undeclared** (`models.py`) — added `usage: str = ""` field

## Important (fix soon)

- [x] **Client not closed on error** (`llm.py`) — wrapped all 3 client functions (`_acall_anthropic`, `_acall_openai`, `acall_llm_batch`) in `try/finally: await client.close()`
- [x] **`batch_id` silently ignored** (`pipeline.py`) — added `ValueError` if `batch_id` set with `pass2_mode != "batch"`
- [x] **Parallel retry unprotected** (`llm.py`) — wrapped individual retry in `try/except`, raises `RuntimeError` with context instead of losing successful results
- [x] **`validators[i]` no bounds check** (`llm.py`) — added length validation at entry of both `acall_llm_parallel` and `acall_llm_batch`
- [x] **`validate_ranks` mutate-then-flag order** (`postprocess.py`) — separated flag collection from rank mutation; demotions applied after all rules evaluated
- [x] **`""` vs `None` for unassigned events** (`metrics.py`) — normalized to truthy check in `compute_coverage` and `compute_consistency_ari`, consistent with `assign_orphan_events` and `compute_weight`

## Low priority (document or defer)

- [x] **Global `usage` singleton** (`llm.py`) — added TODO comment documenting the limitation. Fix deferred: requires threading UsageStats through LLMConfig or call chain. Not a problem in current single-threaded usage.
- [x] **`on_episode_complete` dead in parallel mode** — documented in callbacks.py docstring, architecture.md table, and code example. Explicit "sequential mode only" everywhere.
- [x] **`compute_consistency_ari` first-wins bias** (`metrics.py`) — replaced first-wins with Counter-based most-frequent storyline per character per episode
- [x] **`rank="runner"` overlaps `type="runner"`** (`models.py`) — documented: type=continuity mode, rank=screen time. Usually co-occur but can diverge (e.g. runner-type promoted to rank B).

---

## Review

**Backward compatibility:** полная. Все новые параметры optional, 54 старых теста без регрессий.

**Library contract:** соблюдён. Без disk I/O, персистенция через callbacks.

**Tradeoffs:**
- `_transient_cache` — module-level mutable global. Допустимо, альтернативы не проще.
- `_fire()` глотает все исключения — правильно для resilience, компенсировано `logger.exception`.

**Не покрыто тестами:** batch resume e2e, parallel callback order, buggy callback survival. Низкий риск.

**Процесс:** нарушен workflow (без plan mode, без верификации). Урок записан в lessons.md.

---

# TODO: PARA + Knowledge Base

## PARA-реструктуризация

- [x] Создать PARA-папки (1-projects, 2-areas, 3-resources, 4-archive)
- [x] Переместить проекты в PARA-структуру
- [x] Мигрировать Claude memory на новый путь (16 файлов)
- [x] Проверить CLAUDE.md в проектах (tvplotlines, books2series — OK, устаревшие пути только в deprecated/archive)
- [x] Проверить git status во всех репозиториях — OK

## Knowledge Base — Фаза 0: Инфраструктура

- [x] `git init` в `3-resources/knowledge/`, branch main
- [x] Структура: maps/, notes/, templates/, scripts/, _sources/
- [x] .gitignore (_sources/, .obsidian/, .DS_Store)
- [x] setup.sh — симлинки на 6 источников (readings, concepts, preprint, style, app-research, prompting)
- [x] CLAUDE.md и README.md
- [x] Шаблоны: paper.md, concept.md, style-analysis.md

## Knowledge Base — Фаза 1: Индексирование

- [x] Написать scripts/build_registry.py (скан папок → registry.yaml)
- [x] Запустить — 161 файл проиндексирован (67 readings + 48 concepts + 35 app-research + 6 style + 3 preprint + 2 prompting)
- [x] Создать 6 MOC файлов в maps/ (narrative-theory, screenwriting-craft, llm-prompting, writing-style, tvplotlines-research, bibliography)

## Knowledge Base — Фаза 2: YAML в tvplotlines файлах

- [x] 3 файла в preprint-sources/ (brown, kojima, zhang) — type, title, authors, year, venue, tags, zotero, relevance
- [x] 6 файлов style-notes/style-phrases — type, author, work, year, tags
- [x] Обновить preprint-sources/index.md — добавлен MOC frontmatter
- [x] Пересобрать registry.yaml — frontmatter подхвачен

## Чтение статей для препринта

- [x] Brown et al. 2020 — GPT-3
- [x] Kojima et al. 2022 — Zero-Shot-CoT
- [x] Zhang et al. 2025 — SeriesBench
- [ ] Wei et al. 2022 — Chain-of-Thought Prompting
- [ ] Zhou et al. 2022 — Least-to-Most Prompting
- [ ] Eric Jang — Generalization in Deep Learning (blog)
- [ ] Пост Карпатого про autoresearch

---

# TODO: Stability Benchmark

**Цель:** Доказать что pipeline выдаёт стабильные, воспроизводимые результаты. Ключевая метрика для препринта: "one run is representative".

**Метрика:** Adjusted Rand Index (ARI) — сравнивает кластеризацию (character → storyline) между парами запусков. ARI=1.0 — идентично, ARI>0.7 — хорошо, ARI<0.5 — проблема.

**Критерии успеха:**
- Mean ARI ≥ 0.70 по каждому шоу
- Coverage ≥ 0.90 по каждому шоу (≤10% unassigned events)
- Ни одно шоу не ниже ARI 0.50

**При провале:** ARI < 0.50 → исследовать промпты (Pass 1 voting нестабилен? Pass 2 assignment diverges?). ARI 0.50–0.70 → допустимо, но нужна оговорка в препринте.

## Benchmark set: 5 шоу

Выбраны по разнообразию franchise_type и размеру:

| Show | Episodes | Franchise type | Почему |
|------|----------|---------------|--------|
| TD (True Detective) | 8 | serial | Маленький, чистый serial narrative |
| BB (Breaking Bad) | 7 | serial | Классика, сложные арки |
| HOUSE | 22 | procedural | Длинный, case-of-week + serialized B/C |
| GOT (Game of Thrones) | 10 | ensemble | Много равноправных линий |
| TIU (This Is Us) | 18 | hybrid | Эпизодические + сквозные линии |

**Оценка стоимости:** ~73 эпизодов × 5 runs = 365 LLM calls (Pass 2) + 5×5 Pass 1 + 5×5 Pass 0 + 5×5 Pass 3. При $0.013/episode (Sonnet, cached) ≈ **$6–8 total**. Batch mode = 50% дешевле ≈ **$3–4**.

---

## Task 0: Написать спеку

- [ ] Создать `3-resources/knowledge/specs/stability-benchmark.md` — что измеряем, почему ARI, критерии, бюджет, шоу
- [ ] Commit в knowledge

## Task 1: Написать benchmark script

- [ ] Создать `tvplotlines-app/data/scripts/benchmark_stability.py`:
  - CLI: `python benchmark_stability.py --show TD --runs 5 --mode batch`
  - Для каждого run: `get_plotlines()` → сохранить result JSON
  - После всех runs: `compute_consistency_ari()` + `compute_coverage()` для каждого run
  - Вывод: таблица (show, run, coverage, storyline_count) + mean ARI + per-pair ARI matrix
  - Сохранить результаты в `tvplotlines-app/data/results/benchmark/`
- [ ] Commit

## Task 2: Dry-run (1 шоу, 2 runs)

- [ ] Запустить `benchmark_stability.py --show TD --runs 2 --mode sequential`
- [ ] Проверить что скрипт работает, результаты сохраняются, ARI вычисляется
- [ ] Проверить стоимость одного run (из usage output)
- [ ] Записать фактическую стоимость в спеку

## Task 3: Полный benchmark (5 шоу × 5 runs)

- [ ] Запустить batch mode для каждого шоу: TD, BB, GOT, TIU, HOUSE
- [ ] Между шоу: проверять что batch завершился, результаты валидны
- [ ] Если какой-то run упал — использовать resume (batch_id или pre-computed inputs)

## Task 4: Анализ результатов

- [ ] Собрать таблицу: show × (mean ARI, min ARI, mean coverage, storyline count range)
- [ ] Проверить критерии успеха (ARI ≥ 0.70, coverage ≥ 0.90)
- [ ] Если ARI < 0.70: исследовать — какие storylines diverge? Pass 1 voting нестабилен?
- [ ] Записать результаты в спеку
- [ ] Commit всех результатов

---

# TODO: APO Experiments — systematic prompt optimization

**Контекст:** Survey Ramnath et al. 2025 описывает 21 метод автоматической оптимизации промптов. Наш autoresearch loop — кустарный аналог. Нужно проверить: дают ли systematic methods лучший результат.

**Два эксперимента:**

## Experiment 1: SCULPT — оптимизация длинных промптов

SCULPT (Kumar et al., 2024) оптимизирует длинные structured промпты через hierarchical tree. Наши промпты (8-11KB, role→rules→format→examples) — natural fit.

- [ ] Прочитать оригинальную статью SCULPT
- [ ] Проверить есть ли open-source реализация
- [ ] Применить к Pass 2 промпту (самый дорогой, самый длинный) — оценить по coverage × ARI
- [ ] Сравнить результат с текущим промптом и autoresearch-оптимизированным
- [ ] Записать результаты

## Experiment 2: DSPy/MIPRO — pipeline как program

DSPy (Khattab et al., 2024) + MIPRO: Bayesian optimization для multi-stage LLM pipelines. Нужен refactoring — описать Pass 0→1→2→3 как DSPy modules.

- [ ] Описать pipeline как DSPy program (Pass0 → Pass1 → Pass2 → Pass3)
- [ ] Определить signatures для каждого module (input/output types)
- [ ] Запустить MIPRO optimizer с нашей метрикой (coverage × ARI)
- [ ] Сравнить оптимизированные промпты с текущими
- [ ] Оценить: стоит ли переходить на DSPy или оставить текущую архитектуру
