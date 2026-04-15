---
type: plan
project: tvplotlines
status: active
---

# write-synopses — план реализации утилиты

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** CLI-утилита `tvplotlines write-synopses` — по названию шоу и номеру сезона получает описания эпизодов из Wikipedia, переписывает их по протоколу (`synopsis-authoring-protocol.md`) через LLM, сохраняет в файлы.

**Architecture:** Wikipedia API (season page) → beautifulsoup4 (парсинг `wikiepisodetable`) → LLM parallel (один вызов на эпизод) → отдельные файлы `S01E01.txt` или combined file. Fallback: `--from-files` — пользователь указывает сырые описания, утилита только переписывает по протоколу.

**Tech Stack:** httpx (HTTP-клиент), beautifulsoup4 (парсинг HTML), существующий LLM-клиент из tvplotlines (`acall_llm_parallel`).

---

## Принципы

- CLI-утилита, **не часть библиотечного API** — `__init__.py` не импортирует и не экспортирует
- Optional dependency: `pip install tvplotlines[writer]` ставит httpx + beautifulsoup4. Поисковый API не нужен — Wikipedia API с правильным page title отдаёт данные напрямую
- Паттерн httpx: `try/except ImportError` в `cli.py`
- Источник данных: Wikipedia API (бесплатный, легальный, без API-ключа)
- User-Agent: `tvplotlines/{version} (https://github.com/BirdInTheTree/tvplotlines)` — Wikipedia требует корректный User-Agent, иначе 403

## Решения

- **LLM-вызовы:** parallel (один вызов на эпизод, через `acall_llm_parallel`). Batch API не подходит — пользователь ждёт результат интерактивно
- **`--lang`:** да, с дефолтом `en`. Определяет язык Wikipedia (`en.wikipedia.org` vs `ru.wikipedia.org`)
- **Формат вывода:** два режима:
  - `-o synopses/` (директория) → отдельные файлы `S01E01.txt`, `S01E02.txt` — для `tvplotlines run synopses/*.txt --show House --season 1`
  - `-o house_s01.txt` (файл) → один combined файл с header + episode delimiters — для `tvplotlines run house_s01.txt`
  - Определяется автоматически: путь заканчивается на `/` или существующая директория → отдельные файлы, иначе → combined
- **Промпт:** перевод и адаптация `3-resources/tvplotlines/synopsis-authoring-protocol.md` (русский → английский, формат ROLE/CONTEXT/RULES/OUTPUT)
- **Тип шоу:** optional `--format procedural|serial|hybrid|limited`. Определяет beat counts в промпте (протокол задаёт разные для procedural/serial/ensemble). Если не указан — LLM определяет сам

## Wikipedia: структура данных

Нужны **season pages**, не list pages. `List of X episodes` — без описаний. Описания есть на страницах типа `House_(season_1)`, `Breaking_Bad_(season_1)`.

HTML-структура консистентная:
- Таблица: `wikitable wikiepisodetable`
- Строка эпизода: `tr.module-episode-list-row`
- Название: `td.summary`
- Описание: следующий `tr.expand-child` → `td.description`

Описания — 300–1400 символов (3–8 предложений). Достаточно для LLM-переписывания.

## Обработка ошибок Wikipedia

- **Страница не найдена (404):** попробовать оба варианта naming convention (`Show_(season_N)` и `Show_season_N`). Если оба 404 — понятная ошибка: `Page not found. Try --wiki-title "Exact_Page_Title" (check Wikipedia URL)`
- **Таблица без описаний:** если `td.description` пустые или отсутствуют — ошибка: `No episode descriptions found on this page. Use --from-files with raw synopsis files instead`
- **Описания слишком короткие (< 50 символов):** warning, но продолжить (LLM справится)
- **Сетевые ошибки:** retry с exponential backoff (как в `llm.py`), максимум 3 попытки

## Типы данных

```python
class RawEpisode(TypedDict):
    number: int       # 1, 2, 3...
    title: str        # "Pilot"
    description: str  # Raw Wikipedia description
```

Используется вместо `list[dict]` для явного контракта.

## Файловая структура

### Новые файлы

- `src/tvplotlines/write_synopses.py` — Wikipedia API + парсинг + LLM-переписывание
- `src/tvplotlines/prompts_en/write_synopses.md` — промпт для LLM
- `tests/test_write_synopses.py` — тесты
- `tests/fixtures/wikipedia_house_s01.html` — мок HTML для тестов

### Изменения в существующих файлах

- `cli.py` — добавить команду `write-synopses` с `try/except ImportError`
- `pyproject.toml` — добавить `writer = ["httpx>=0.27", "beautifulsoup4>=4.12"]`

## Поток работы утилиты

```
tvplotlines write-synopses "House" --season 1 -o synopses/
tvplotlines write-synopses "House" --season 1 --lang en -o synopses/
```

1. **Resolve:** конструирует page title `{Show}_(season_{N})`. Если 404 — пробует `{Show}_season_{N}` (оба формата встречаются). Если оба 404 — ошибка с подсказкой `--wiki-title`
2. **Fetch:** Wikipedia API `action=parse`, page=resolved title → HTML
3. **Parse:** bs4 извлекает episode titles + descriptions из `wikiepisodetable`
4. **LLM:** parallel — каждый эпизод переписывается по протоколу (один вызов на эпизод)
5. **Save:** если `-o` — директория → `synopses/S01E01.txt`, ...; если файл → combined format:
   ```
   House, Season 1

   Episode 1 — Pilot
   Synopsis text...

   Episode 2 — Paternity
   Synopsis text...
   ```

### Fallback: `--from-files`

```
tvplotlines write-synopses "House" --season 1 --from-files raw/*.txt -o synopses/
```

Пропускает шаги 1-2, берёт сырые описания из файлов, только переписывает через LLM.

## Оценка стоимости

**Вход:** описание из Wikipedia — 300-1400 символов (~100-400 токенов).
**Промпт:** ~2000 токенов (system prompt из протокола).
**Выход:** 300-500 слов (~400-650 токенов).

**На один эпизод:** ~2500 input + ~500 output токенов.
**Сезон 22 серии (House) на claude-haiku-4-5:** 55K input × $0.80/M + 11K output × $4.0/M ≈ **$0.09**
**Сезон 22 серии на claude-sonnet-4:** 55K × $3.0/M + 11K × $15.0/M ≈ **$0.33**
**Batch mode (−50%):** haiku ~$0.05, sonnet ~$0.17.

Поиск бесплатный (Wikipedia API).

### `--dry-run`

Добавить флаг `--dry-run`: выполняет шаги 1-2 (fetch + parse), показывает найденные эпизоды и оценку стоимости, не вызывает LLM. Позволяет проверить что Wikipedia-страница найдена правильно.

## Стратегия тестирования

### Unit-тесты с мок-данными

- **Парсинг HTML:** сохранить реальный HTML `House_(season_1)` в `tests/fixtures/wikipedia_house_s01.html`. Тесты проверяют: правильное количество эпизодов, заполненные titles и descriptions, корректные номера эпизодов.
- **Wikipedia API:** мок httpx-ответа. Тесты проверяют: правильный URL формируется, ошибки обрабатываются (404, таймаут, нет таблицы).
- **LLM-переписывание:** мок `acall_llm_parallel`. Тесты проверяют: промпт формируется правильно, результаты сохраняются в файлы с правильными именами.
- **Combined output:** тест что `-o file.txt` создаёт один файл с header `Show, Season N` и episode delimiters `Episode N — Title`, совместимый с `input_parser.parse_synopsis_file()`.

### Тест формата выхода

- Валидация синопсиса: plain text (без markdown), 300-500 слов, без bullet points, без подзаголовков. Это проверяется на мок-ответах LLM.

### Интеграционный тест

- Реальный вызов на `House S01` (требует сеть + API-ключ, запускается вручную, не в CI).

## Задачи

### Task 1: Промпт `write_synopses.md`

**Files:**
- Create: `src/tvplotlines/prompts_en/write_synopses.md`
- Source: `3-resources/tvplotlines/synopsis-authoring-protocol.md`

- [ ] Адаптировать `synopsis-authoring-protocol.md` в LLM-промпт
- [ ] Формат: ROLE → CONTEXT → RULES → OUTPUT (как pass0.md, pass1.md)
- [ ] Вход: сырое описание эпизода + название шоу + номер сезона + номер эпизода
- [ ] Выход: синопсис по протоколу (300-500 слов, 8-15 beats, plain text)
- [ ] Commit

### Task 2: Wikipedia парсер

**Files:**
- Create: `src/tvplotlines/write_synopses.py` (функции для Wikipedia)
- Create: `tests/fixtures/wikipedia_house_s01.html` (мок HTML)
- Create: `tests/test_write_synopses.py`

- [ ] Функция `fetch_season_page(show: str, season: int, lang: str = "en") -> str` — получить HTML season page через Wikipedia API
- [ ] Функция `parse_episode_table(html: str) -> list[RawEpisode]` — извлечь эпизоды из `wikiepisodetable`
- [ ] Скачать реальный HTML `House_(season_1)` в `tests/fixtures/wikipedia_house_s01.html`
- [ ] Тесты: парсинг мок-HTML → правильное количество эпизодов, заполненные описания
- [ ] Commit

### Task 3: LLM-переписывание + основная функция

**Files:**
- Modify: `src/tvplotlines/write_synopses.py`
- Modify: `tests/test_write_synopses.py`

- [ ] Функция `rewrite_synopses(episodes: list[RawEpisode], show: str, season: int, config: LLMConfig) -> list[str]` — parallel LLM-вызов через `acall_llm_parallel`
- [ ] Функция `write_synopses(show, season, output_dir, *, from_files=None, lang="en", provider, model, base_url)` — основной entry point
- [ ] Режим Wikipedia: fetch → parse → rewrite → save
- [ ] Режим `--from-files`: read files → rewrite → save
- [ ] Save: отдельные файлы (если `-o` — директория) или combined file (если `-o` — файл). Combined format: `Show, Season N\n\nEpisode 1 — Title\ntext\n\n...`
- [ ] Загрузка промпта через `load_prompt("write_synopses")`
- [ ] Тесты с мок LLM-ответами
- [ ] Commit

### Task 4: CLI интеграция

**Files:**
- Modify: `src/tvplotlines/cli.py`
- Modify: `pyproject.toml`

- [ ] Добавить `writer = ["httpx>=0.27", "beautifulsoup4>=4.12"]` в `[project.optional-dependencies]`
- [ ] Добавить команду `write-synopses` в `cli.py`
- [ ] Аргументы: `show` (positional), `--season` (default 1), `-o/--output` (dir), `--from-files` (glob), `--wiki-title` (exact Wikipedia page title, fallback для disambiguации), `--format` (procedural/serial/hybrid/limited, optional), `--lang` (default "en"), `--dry-run`, `--provider`, `--model`, `--base-url`
- [ ] `try/except ImportError` при вызове `_write_synopses(args)` с сообщением: `pip install tvplotlines[writer]`
- [ ] Ручной тест: `tvplotlines write-synopses --help`
- [ ] Commit

### Task 5: Интеграционный тест

- [ ] Запустить `tvplotlines write-synopses "House" --season 1 -o /tmp/synopses/`
- [ ] Проверить что файлы `S01E01.txt` ... `S01E22.txt` создались
- [ ] Проверить формат: 300-500 слов, prose, без bullet points
- [ ] Проверить `--from-files` режим на тестовых fixtures
- [ ] Commit финальный
