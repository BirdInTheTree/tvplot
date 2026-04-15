---
type: plan
project: tvplotlines
status: active
---

# Аудит документации tvplotlines v0.1.0

Дата: 2026-03-26

## 1. Документация библиотеки (в репозитории)

### 1.1 Обязательные файлы

| Файл | Статус | Комментарий |
|------|--------|-------------|
| README.md | OK | Импорты, CLI, примеры — всё соответствует коду |
| LICENSE (MIT) | OK | |
| CHANGELOG.md | OK | Одна запись v0.1.0, для первого релиза достаточно |
| CONTRIBUTING.md | OK | Setup, тесты, стиль — корректно |
| pyproject.toml | OK | Метаданные, зависимости, classifiers — на месте |
| .gitignore | OK | |
| .github/workflows/test.yml | OK | Python 3.11-3.13, pytest |

### 1.2 Документация для пользователей

| Файл | Статус | Комментарий |
|------|--------|-------------|
| docs/index.md | OK | Минимальный хаб, ссылки на quickstart и api |
| docs/quickstart.md | OK | Импорты и вызовы корректны |
| docs/api.md | **ОШИБКА** | Список event functions не совпадает с models.py (см. ниже) |
| docs/images/app-grid.png | OK | Скриншот для README |

### 1.3 Примеры

| Файл | Статус | Комментарий |
|------|--------|-------------|
| examples/run_pipeline.py | OK | Актуальный API |
| examples/synopses/ | OK | Breaking Bad + GoT |
| examples/results/ | OK | Готовые JSON-результаты |

### 1.4 Промпты (runtime-зависимость)

| Файл | Статус |
|------|--------|
| src/tvplotlines/prompts_en/pass0.md | OK |
| src/tvplotlines/prompts_en/pass1.md | OK |
| src/tvplotlines/prompts_en/pass2.md | OK |
| src/tvplotlines/prompts_en/pass3.md | OK |
| src/tvplotlines/prompts_en/synopses_writer.md | OK |
| src/tvplotlines/prompts_en/__init__.py | OK (importlib.resources) |

---

## 2. Найденные проблемы

### КРИТИЧЕСКИЕ

**2.1 Промпты не попадут в pip-пакет**

Hatchling по умолчанию включает только `.py` файлы. Промпты `.md` из `prompts_en/` не будут упакованы в wheel. При `pip install tvplotlines` вызов `load_prompt()` упадёт с FileNotFoundError.

Нужно добавить в pyproject.toml:

```toml
[tool.hatch.build.targets.wheel]
packages = ["src/tvplotlines"]
artifacts = ["src/tvplotlines/prompts_en/*.md"]
```

Или использовать `[tool.hatch.build]` с `include`.

### ЗНАЧИМЫЕ

**2.2 api.md: event functions расходятся с models.py**

- api.md перечисляет: `setup, escalation, turning_point, climax, resolution, cliffhanger, seed`
- models.py определяет: `setup, inciting_incident, escalation, turning_point, crisis, climax, resolution`

Расхождение: `cliffhanger` и `seed` не существуют в коде; `inciting_incident` и `crisis` не описаны в api.md.

**2.3 Бенчмарк 87% не подтверждён в коде**

README заявляет "87% usable narrative structure". Эта цифра не воспроизводима из кода или тестов — нет ни скрипта бенчмарка, ни fixture с результатами. Для open-source проекта это рискованно: любой может спросить "как воспроизвести?".

### РЕКОМЕНДАЦИИ (не блокируют релиз)

**2.4 Нет py.typed**

Без `py.typed` маркера type checkers (mypy, pyright) не будут использовать типы из пакета. Стоит добавить пустой файл `src/tvplotlines/py.typed`.

**2.5 Нет системы сборки документации**

Нет mkdocs.yml или readthedocs.yml. Документация читается только через GitHub. Для v0.1.0 допустимо, но для роста аудитории нужен hosted docs site.

**2.6 MANIFEST.in отсутствует**

При использовании hatchling не критично (sdist конфигурируется через pyproject.toml), но стоит проверить, что `hatch build` включает промпты в sdist тоже.

---

## 3. Ресурсные файлы (3-resources/tvplotlines/)

### 3.1 Ядро — актуальные справочные документы

Эти файлы — живые справочники, необходимы для работы над проектом:

| Файл | Назначение |
|------|------------|
| architecture.md | Спецификация архитектуры pipeline |
| design-decisions.md | Реестр решений с обоснованиями |
| glossary.md | Глоссарий терминов (Story DNA и т.д.) |
| open-source-strategy.md | Стратегия: что публичное, что приватное |
| career-plan.md | Четырёхфазный план (repo → preprint → site → expand) |
| inventory.md | Что своё vs заимствованное, IP-границы |
| open-source-release-checklist.md | QA-чеклист перед PyPI |

### 3.2 Autoresearch — история экспериментов

Большой блок из 15 файлов. Документирует три поколения автоисследования (v1 → v2 → v3):

| Поколение | Файлы | Статус |
|-----------|-------|--------|
| v1 | autoresearch-program.md, autoresearch-experiment-log.md | v1 **устарел** (заменён v2), лог актуален как история |
| v2 | autoresearch-program-v2.md, autoresearch-run-v2.md, autoresearch-summary-v2.md | Актуальны |
| v3 | autoresearch-v3-plan.md, -brainstorm-notes, -engineering, -engineering-review, -event-functions, -hybrid-vs-procedural, -questions, -reading-plan, -todo | Актуальны — текущий фронт работы |
| Идеи | autoresearcher-competence-idea.md, notes-for-3rd-autoresearch.md | Актуальны как контекст для v3 |

**Рекомендация:** `autoresearch-program.md` (v1) → в archive/.

### 3.3 Промпт-инженерия

| Файл | Статус | Комментарий |
|------|--------|-------------|
| how-to-prompt.md | Актуален | 10 принципов промптинга |
| prompt-template.md | Актуален | Шаблон 7 секций для всех passes |
| prompt-writing-rules.md | Актуален | Чеклист для переписывания промптов |
| synopsis-authoring-protocol.md | Актуален | Протокол написания синопсисов |

### 3.4 Теория и исследования

| Файл | Статус | Комментарий |
|------|--------|-------------|
| heuristics-from-theory.md | Актуален | Правила из книг для валидации кодом |
| metrics-survey.md | Актуален | Обзор метрик narrative extraction |
| event-functions-redesign.md | Актуален | Редизайн функций (связан с 2.2 выше) |
| enculturation-core-idea.md | Актуален | Ядро теоретической позиции |
| narrative-intelligence-theory.md | Концепт | Идея, не реализована |
| bibliography-narrative-and-autoresearch.md | Актуален | Литобзор |
| preprint-citations-map.md | Актуален | Какие papers подтверждают какие компоненты |
| screenwriting-theory-reading-prompt.md | Актуален | Промпт для чтения книг по сценаристике |

### 3.5 Препринт

| Файл | Статус | Комментарий |
|------|--------|-------------|
| abstract.md | Актуален | Абстракт препринта |
| one-page.md | Актуален | Elevator pitch |
| preprint-experiment-scaffold.md | Planned | Эксперимент с Story DNA как scaffold |
| preprint-idea-meta-situation-model.md | Концепт | Идея для будущего |

### 3.6 Планы и задачи

| Файл | Статус | Комментарий |
|------|--------|-------------|
| publication-plan.md | Актуален | План write-synopses CLI |
| write-synopses-plan.md | Актуален | Дизайн CLI для генерации синопсисов |
| input-parser-plan.md | Актуален | Дизайн парсера входных файлов |
| plan-restructure.md | Актуален | Разделение на 3 репозитория |
| tasks-todo.md | Актуален | Текущие задачи (resilience) |
| stability-benchmark.md | Актуален | Спецификация бенчмарка |
| 2026-03-16-prior-season-continuity-design.md | Актуален | Дизайн multi-season |

### 3.7 Разное

| Файл | Статус | Комментарий |
|------|--------|-------------|
| blog-post-guide.md | Справочный | Шаблон блог-постов |
| mas4bw-library-audit.md | Актуален | Технический аудит извлечения из монолита |
| naive-vs-plotter.md | Planned | Эксперимент |
| experiment-ru-vs-en-prompts.md | Planned | Эксперимент |
| breakdown-gdr-s01.md | Актуален | Ground truth для валидации |
| breakdown-sp-s01.md | Актуален | Ground truth |
| breakdown-td-s01.md | Актуален | Ground truth |
| resources-migration-plan.md | Актуален | Миграция 3-resources |
| resources-restructure-design.md | Актуален | Спецификация миграции |
| bibliography-cleanup.md | **Завершён** | Можно в archive/ |

### 3.8 Устаревшие / кандидаты в archive/

| Файл | Причина |
|------|---------|
| what-to-change.md | Черновик без решений, 35 строк, неструктурирован |
| autoresearch-program.md | Заменён v2 |
| bibliography-cleanup.md | Задача завершена (535 items в Zotero) |

### 3.9 Данные и артефакты

| Файл | Назначение |
|------|------------|
| autoresearch-results.tsv | Результаты v1 |
| autoresearch-results-v2.tsv | Результаты v2 |
| bb-s01..s05-result.json | Результаты pipeline для Breaking Bad |
| run-bb-all-seasons.py | Скрипт запуска всех сезонов |
| awesome-shortlist.bib | BibTeX для awesome list |
| screenshot-2026-03-16.png | Скриншот приложения |

### 3.10 Дубликат

| Файл | Проблема |
|------|----------|
| superpowers/plans/2026-03-16-prior-season-continuity.md | Дубликат файла 2026-03-16-prior-season-continuity-design.md из основной папки |

---

## 4. Сводка

### Библиотека (репозиторий)

| Категория | Итог |
|-----------|------|
| Обязательные файлы | Всё на месте |
| Документация | 1 ошибка в api.md (event functions) |
| Упаковка | **КРИТИЧНО**: промпты не попадут в pip install |
| Типизация | Нет py.typed |
| CI/CD | Работает |
| Примеры | Актуальны |

### Ресурсы (3-resources/tvplotlines/)

| Категория | Файлов | Итог |
|-----------|--------|------|
| Актуальные справочники | 7 | Ядро проекта |
| Autoresearch | 15 | 1 устарел (v1 program) |
| Промпт-инженерия | 4 | Все актуальны |
| Теория | 8 | Все нужны |
| Препринт | 4 | Все актуальны |
| Планы и задачи | 7 | Все актуальны |
| Ground truth breakdowns | 3 | Нужны для валидации |
| Данные/артефакты | 6 | Результаты экспериментов |
| В archive/ | 3 | what-to-change, autoresearch-program v1, bibliography-cleanup |
| Дубликат | 1 | superpowers/plans/ |
| **Итого** | ~60 | |

### Действия (приоритет)

1. **Критично**: добавить промпты в wheel (pyproject.toml)
2. **Значимо**: исправить event functions в api.md
3. **Желательно**: добавить py.typed
4. **Порядок**: переместить 3 файла в archive/, удалить дубликат в superpowers/

---

## 5. Аудит тестов

### 5.1 Проблема с промптами и тестами

**Почему тесты проходили, если промпты не упакованы?**

Потому что тесты запускались через `pip install -e ".[dev]"` (editable install). В этом режиме Python читает файлы прямо из исходников на диске — все `.md` промпты доступны по своим оригинальным путям. Баг проявится только при обычном `pip install tvplotlines` из wheel/PyPI.

### 5.2 Текущее состояние fixtures/

Папка `tests/fixtures/` **пустая** (только `.DS_Store`). Два тестовых файла ссылаются на отсутствующие fixture:

| Тест | Отсутствующий fixture | Последствие |
|------|-----------------------|-------------|
| test_consistency.py | SP_S01E01..08.txt (8 файлов) | FileNotFoundError |
| test_synopses_writer.py | wikipedia_house_s01.html (1 файл) | FileNotFoundError в 1 тесте из 15 |

### 5.3 Какие тесты НУЖНЫ библиотеке

Исходя из архитектуры (4 pass + postprocess + verdicts + metrics + synopses_writer + CLI + input):

| Что тестируем | Зачем | Какой файл покрывает | Статус |
|---------------|-------|---------------------|--------|
| **Валидация LLM-ответов** (Pass 0/1/2) | Ядро надёжности: LLM возвращает мусор → валидация отсеивает | test_validation.py (16 тестов) | **НУЖЕН, OK** |
| **Применение вердиктов** (Pass 3) | MERGE/REASSIGN/PROMOTE/DEMOTE/CREATE/DROP — вся логика мутации данных | test_verdicts.py (10 тестов) | **НУЖЕН, OK** |
| **Постобработка** (span, weight, rank demotion) | Бизнес-логика после всех passes | test_postprocess.py (9 тестов) | **НУЖЕН, OK** |
| **Метрики** (coverage, ARI, score) | Оценка качества результатов | test_metrics.py (9 тестов) | **НУЖЕН, OK** |
| **Устойчивость** (retry, timeout, callbacks, resume) | Сеть падает, batch зависает, пользователь resume | test_resilience.py (11 тестов) | **НУЖЕН, OK** |
| **Multi-season** (prior prompt building, overlap check) | Ключевая фича — связь между сезонами | test_pass1_prior.py (5 тестов) | **НУЖЕН, OK** |
| **Pipeline control flow** (prior context reuse, anthology guard) | Правильный порядок вызова passes | test_pipeline_prior.py (3 теста) | **НУЖЕН, OK** |
| **JSON-парсинг LLM-ответов** | Базовая утилита, edge cases code blocks | test_llm.py (5 тестов) | **НУЖЕН, OK** |
| **Synopses writer** (Wikipedia parsing, file I/O) | Утилита для подготовки входных данных | test_synopses_writer.py (15 тестов) | **НУЖЕН, но 1 тест сломан** (нет fixture) |
| **Модели** (dataclass instantiation) | Проверяет что конструкторы работают | test_models.py (2 теста) | **НЕ НУЖЕН** — тривиальные smoke-тесты, не ловят баги |
| **Consistency benchmark** (полный pipeline с API) | E2E на реальном LLM | test_consistency.py (1 тест) | **НЕ НУЖЕН в CI** — требует API key + 8 fixture-файлов, которых нет |
| **Integration resilience** (полный pipeline + callbacks) | E2E с проверкой callbacks | integration_resilience.py (2 теста) | **УСЛОВНО НУЖЕН** — требует API key, но inline data (не зависит от fixtures) |

### 5.4 Чего НЕ ХВАТАЕТ

| Что не покрыто | Приоритет | Почему нужно |
|----------------|-----------|-------------- |
| **CLI** (cli.py) | Средний | Нет тестов на парсинг аргументов, --provider, --pass2-mode, --output |
| **Input loader** (input.py: load_synopses_dir) | Средний | Нет тестов на чтение файлов, парсинг S01E01 из имён, edge cases |
| **Pass 0/1/2/3 с mock LLM** | Низкий | Внутренняя логика каждого pass (парсинг ответа, валидация, retry) — частично покрыта через test_validation и test_resilience |

### 5.5 Вердикт по каждому тестовому файлу

| Файл | Тестов | Вердикт | Действие |
|------|--------|---------|----------|
| test_validation.py | 16 | **Оставить** | Ядро качества. Все тесты осмысленные |
| test_verdicts.py | 10 | **Оставить** | Покрывает всю логику Pass 3 мутаций |
| test_postprocess.py | 9 | **Оставить** | Boundary-тесты на пороги (25%, 50%) |
| test_metrics.py | 9 | **Оставить** | Формулы метрик, edge cases |
| test_resilience.py | 11 | **Оставить** | Retry, timeout, callbacks, resume validation |
| test_pass1_prior.py | 5 | **Оставить** | Multi-season — ключевая фича |
| test_pipeline_prior.py | 3 | **Оставить** | Control flow pipeline |
| test_llm.py | 5 | **Оставить** | JSON extraction из LLM ответов |
| test_synopses_writer.py | 15 | **Оставить, починить** | 14 тестов работают. 1 тест (test_parse_episode_table_house_s01) сломан — нужен fixture wikipedia_house_s01.html |
| test_models.py | 2 | **Удалить или переписать** | Тривиальные assert-ы, не ловят баги. Если оставлять — добавить тесты на to_dict()/from_dict() roundtrip |
| test_consistency.py | 1 | **Удалить** | Зависит от 8 отсутствующих fixtures + API key. Не для CI. Если нужен — это manual benchmark, не pytest |
| integration_resilience.py | 2 | **Переименовать** | Не pytest-файл (нет test_ префикса), не собирается pytest автоматически. Требует API key. Можно оставить как manual integration test, но убрать из tests/ или пометить маркером |

### 5.6 Итог по тестам

**Работающие тесты:** 84 из 88 (в 10 файлах из 12)
**Сломанные:** 2 теста (fixture-зависимые) + 2 тривиальных
**Покрытие:** хорошее для логики (validation, verdicts, postprocess, metrics, resilience), слабое для I/O (CLI, input loader)

### Действия по тестам (приоритет)

1. **Удалить** test_consistency.py — зависит от отсутствующих fixtures, бесполезен без них
2. **Удалить или переписать** test_models.py — тривиальные тесты
3. **Починить** test_synopses_writer.py — восстановить fixture wikipedia_house_s01.html
4. **Решить** судьбу integration_resilience.py — оставить как manual test или удалить
5. **Добавить** (позже) тесты для CLI и input.py

---

## 6. Полная карта тестов: что должно быть

### Категория 1: Валидация входных данных (граница системы) — ОБЯЗАТЕЛЬНО

Библиотека должна падать с понятными ошибками при плохих входах.

**get_plotlines() — валидация параметров:**
- Неправильный формат episode key (`"ep1"` вместо `"S01E01"`) → ValueError
- Сезон в ключе не совпадает с `season` (`S02E01` при `season=1`) → ValueError
- `cast` без `plotlines` (и наоборот) → ValueError
- `breakdowns` длиной ≠ `episodes` → ValueError
- `batch_id` без `pass2_mode="batch"` → ValueError
- `prior` + `context.is_anthology=True` → ValueError
- Неизвестный `pass2_mode` → ValueError

**load_synopses_dir() — файловый ввод:**
- Несуществующая директория → FileNotFoundError
- Пустая директория (нет .txt) → FileNotFoundError
- Файлы без паттерна S01E01 → ValueError
- Дублирующиеся episode ID → ValueError
- Автодетект show name из имени папки (`"breaking-bad"` → `"Breaking Bad"`)
- Автодетект season из имён файлов

**Покрытие:** частично (resume validation в test_resilience, anthology guard в test_pipeline_prior). **Дыра: episode keys, load_synopses_dir.**

---

### Категория 2: Бизнес-логика (чистые функции без LLM) — ОБЯЗАТЕЛЬНО

Детерминированный код, легко тестируется, ловит реальные баги.

**Постобработка (postprocess.py):**
- compute_span — в каких эпизодах появляется plotline
- compute_weight — primary vs glimpse классификация
- validate_ranks — demotion A→B при коротком span, dominant flag
- aggregate_patches — сбор patches из всех эпизодов

**Вердикты (verdicts.py):**
- MERGE — удаление source, переназначение events, обновление also_affects
- REASSIGN — перенос event на другой plotline
- PROMOTE/DEMOTE — смена rank
- CREATE — новый plotline + переназначение events
- DROP — удаление plotline + redistribution
- Иммутабельность — оригинал не мутируется
- Цепочка вердиктов — CREATE → REASSIGN в одном батче

**Метрики (metrics.py):**
- coverage — доля assigned events
- ARI — consistency между прогонами
- score — формула coverage × consistency
- Edge cases: пустой список, один прогон, все null

**Покрытие: полное** — test_postprocess (9), test_verdicts (10), test_metrics (9).

---

### Категория 3: Валидация LLM-ответов — ОБЯЗАТЕЛЬНО

LLM возвращает мусор — валидация основа надёжности.

**Pass 0:** невалидный format, пустой story_engine, не-bool поля
**Pass 1:** пустой cast/plotlines, невалидный type, procedural без case_of_the_week, serial с 2+ A-rank, ensemble без 2+ A-rank
**Pass 2:** невалидная function, ссылка на несуществующий plotline, неизвестный character, guest-формат, допустимая доля null

**Покрытие: полное** — test_validation.py (16 тестов).

---

### Категория 4: Устойчивость (сеть, retry, timeout) — ОБЯЗАТЕЛЬНО

**Тесты:**
- Transient error → retry с exponential backoff
- Max retries → ошибка пробрасывается
- Backoff delays — правильная формула
- Partial success в parallel — успешные сохраняются
- Batch timeout → TimeoutError
- Callback получает batch_id
- Default callback — noop
- Subclass callback — правильные аргументы

**Покрытие: полное** — test_resilience.py (11 тестов).

---

### Категория 5: Multi-season continuity — НУЖНО

**Тесты:**
- Промпт Pass 1 с prior — JSON-структура prior_season блока
- Промпт Pass 1 без prior — блок отсутствует
- Пустой prior — блок не инжектится
- Overlap warning — тот же hero без reuse ID
- Pipeline flow — prior → Pass 0 пропускается
- Cast+plotlines явно → prior игнорируется
- Prior + anthology → ValueError

**Покрытие: полное** — test_pass1_prior.py (5) + test_pipeline_prior.py (3).

---

### Категория 6: JSON-парсинг LLM-ответов — НУЖНО

**Тесты:**
- Чистый JSON, code block с/без language tag, whitespace, невалидный JSON → ValueError

**Покрытие: полное** — test_llm.py (5 тестов).

---

### Категория 7: Synopses writer — НУЖНО

**Тесты:**
- Парсинг реального Wikipedia HTML (House S01)
- HTML без table / без descriptions → ValueError
- Wikipedia URL construction (single word, multi-word, override)
- Fallback при 404
- Оба convention 404 → ValueError
- Rewrite через mock LLM
- Сохранение individual / combined files
- Загрузка из файлов (pattern, sequential, пустые, отсутствующие)

**Покрытие:** test_synopses_writer.py (15 тестов). **1 сломан** — нужен fixture wikipedia_house_s01.html.

---

### Категория 8: Сериализация — НУЖНО

**Тесты:**
- TVPlotlinesResult.to_dict() → валидный dict для json.dumps
- Roundtrip: result → to_dict() → from_dict() → result (если from_dict существует)
- Вложенные структуры сериализуются корректно

**Покрытие: НЕТ.** test_models.py тестирует только конструкторы.

---

### Категория 9: CLI — ЖЕЛАТЕЛЬНО (можно отложить)

**Тесты:**
- Парсинг аргументов: --provider, --pass2-mode, --output, --skip-review
- Директория как вход → автодетект show + season
- Файлы как вход → требует --show
- write-synopses: --dry-run, --from-files, --format

**Покрытие: НЕТ.**

---

### Категория 10: E2E / Integration — ОПЦИОНАЛЬНО

Дорого, медленно, не для CI. Только manual benchmark.

- Полный прогон pipeline → результат валиден
- Consistency между прогонами (ARI > порог)
- Callback firing order
- Resume (0 API calls)

**Покрытие:** test_consistency.py (сломан, удалить) + integration_resilience.py (требует API key).

---

### Сводная таблица

| #   | Категория        | Приоритет   | Покрытие  | Статус                           |
| --- | ---------------- | ----------- | --------- | -------------------------------- |
| 1   | Валидация входов | Обязательно | Частичное | **ДЫРА: input.py, episode keys** |
| 2   | Бизнес-логика    | Обязательно | Полное    | OK                               |
| 3   | Валидация LLM    | Обязательно | Полное    | OK                               |
| 4   | Устойчивость     | Обязательно | Полное    | OK                               |
| 5   | Multi-season     | Нужно       | Полное    | OK                               |
| 6   | JSON-парсинг     | Нужно       | Полное    | OK                               |
| 7   | Synopses writer  | Нужно       | 14/15     | **ПОЧИНИТЬ fixture**             |
| 8   | Сериализация     | Нужно       | Нет       | **ДЫРА: написать**               |
| 9   | CLI              | Желательно  | Нет       | Отложить                         |
| 10  | E2E              | Опционально | Сломано   | Удалить/решить                   |

**6 категорий покрыты полностью, 2 дыры (входы + сериализация), 1 починить, 1 решить.**
