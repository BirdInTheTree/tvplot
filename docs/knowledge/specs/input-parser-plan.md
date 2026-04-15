---
type: plan
project: tvplotlines
status: active
---

# Input parser — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Научить `tvplotlines run` принимать один текстовый файл со всеми синопсисами. Сценарист пишет `.txt` или `.md` по трём простым правилам — программа парсит название шоу, сезон и разбивает на эпизоды. Ключевой use case — сценаристы работающие с **оригинальным** контентом (пилоты, разработка шоу), а не только копирующие с Википедии.

**Architecture:** Новый модуль `input_parser.py` — парсит файл, возвращает `(show, season, dict[str, str])`. CLI поддерживает два режима: новый (один файл) и старый (много файлов + `--show`). Python API (`get_plotlines`) не меняется.

**Tech Stack:** Только stdlib (re, pathlib). Никаких зависимостей.

---

## Решения

| # | Вопрос | Решение |
|---|--------|---------|
| 1 | Обратная совместимость CLI | Оба режима. Detect by: есть `--show` → старый, нет → парсим файл. Autoresearch, program-v2, tvplotlines-app не ломаются |
| 2 | Encoding | Явно `encoding="utf-8"`. При `UnicodeDecodeError` — ошибка: "File is not UTF-8. Save as UTF-8 and try again." |
| 3 | `__init__.py` exports | Не экспортируем. `parse_synopsis_file` — внутренний модуль для CLI, не часть публичного API |
| 4 | `--lang` | Остаётся как отдельный CLI-флаг. Парсер не детектит язык. `--lang` передаётся в pipeline как раньше |
| 5 | YAML frontmatter | Убрано. Overengineering — ни одной реальной аудитории |
| 6 | Название эпизода (`- Pilot`) | Не парсим отдельно. Строка заголовка целиком отбрасывается, всё после неё до следующего заголовка — текст синопсиса |
| 7 | Русское название шоу | Валидации нет. Если пользователь написал "Доктор Хаус" — pipeline получит русское название. LLM мультиязычный, справится |
| 8 | Regex edge cases | Тесты на: "24, Season 1", "9-1-1, Season 1", "House S01", "House S1". Regex будет отлажен по тестам |
| 9 | Порядок эпизодов | Сортировать по номеру из заголовка, не по порядку в файле |
| 10 | Дубликаты | Ошибка: "Duplicate Episode N found" |
| 11 | Интеграционный тест | Manual smoke test (pipeline стоит $1.5+, нужен API key). Не автоматизированный |
| 12 | Текст между заголовком и первым эпизодом | Warning: "Text before first episode heading will be ignored". Не ломать, не молчать |
| 13 | Интерфейс `parse_episodes` | Принимает полный текст файла, пропускает всё до первого `Episode N`. Заголовок файла не его забота — его парсит `parse_header` |
| 14 | Приоритет CLI-флагов vs файл | CLI-флаг побеждает файл. `--show` и `--season` переопределяют то что в первой строке (явное важнее неявного) |
| 15 | Остальные CLI-флаги | `--output`, `--provider`, `--model`, `--base-url`, `--skip-review`, `--pass2-mode`, `--lang` — работают как раньше, не затрагиваются |
| 16 | Сокращение "S01" / "S1" | Поддерживаем в regex: `(?:Season\|сезон\|S)\s*(\d+)`. "House S01", "House S1" — валидные форматы |

## Формат ввода для пользователя

Три правила:

1. **Первая строка** — название шоу и номер сезона
2. **Каждый эпизод** начинается с заголовка (`Episode 1`, `Эпизод 1`)
3. **Текст синопсиса** — всё до следующего заголовка

### Пример файла

```
House, Season 1

Episode 1
Dr. Gregory House reluctantly takes on a new case when a young
kindergarten teacher collapses in her classroom with seizures...

Episode 2
A teenage lacrosse player is brought in with seizures. House
suspects it's not epilepsy and pushes his team to find the cause...

Episode 3
A college student collapses after a night with his girlfriend...
```

### CLI

```bash
# Новый способ — один файл, всё внутри
tvplotlines run house_s01.txt

# Старый способ — отдельные файлы (обратная совместимость для autoresearch/scripts)
tvplotlines run synopses/*.txt --show "House" --season 1
```

## Логика парсера

### Определение режима (в cli.py)

- Есть `--show` → старый режим (как сейчас, любое количество файлов)
- Нет `--show` + один файл → новый режим (парсим файл)
- Нет `--show` + много файлов → ошибка: "Specify --show when passing multiple files, or use single-file format"

### Парсинг первой строки

BOM/whitespace: `text.lstrip('\ufeff').strip().splitlines()[0]`

Извлечь show и season из строк вида:
- `House, Season 1` → show="House", season=1
- `Breaking Bad Season 2` → show="Breaking Bad", season=2
- `Слово пацана, сезон 1` → show="Слово пацана", season=1

Паттерн: `(.+?)[,.]?\s+(?:Season|сезон|S)\s*(\d+)` (case-insensitive)

Поддерживает: "House, Season 1", "House Season 1", "House S01", "House S1", "Слово пацана, сезон 1".

Если не распознал — ошибка с примером:
```
Could not parse show and season from first line: "..."
Expected format: "Show Name, Season N"
Example: "House, Season 1"
```

### Парсинг эпизодов

Заголовок эпизода — строка, начинающаяся с:
- `Episode N` / `episode N`
- `Эпизод N` / `эпизод N`
- `# Episode N` (markdown — парсер поймёт, но в документации не учим)

Паттерн: `^(?:#+ )?(?:Episode|Эпизод|Ep\.?)\s+(\d+)` (case-insensitive)

**Не поддерживаем:** `N.` и `N -` (нумерованные списки — коллизии).

Всё после строки-заголовка до следующего заголовка — текст синопсиса. Текст между заголовком файла и первым эпизодом — warning и пропуск.

`parse_episodes` принимает полный текст файла, пропускает всё до первого заголовка эпизода. Разделение ответственности: `parse_header` парсит первую строку, `parse_episodes` парсит эпизоды.

### Валидация

- Дубликаты → ошибка: "Duplicate Episode N found"
- Пустой синопсис → warning, пропуск
- Текст до первого эпизода → warning: "Text before first episode heading will be ignored"
- Эпизоды сортируются по номеру (не по порядку в файле)

## Файловая структура

### Новые файлы

- `src/tvplotlines/input_parser.py` — парсинг файла
- `tests/test_input_parser.py` — тесты
- `examples/input_format.txt` — пример для пользователя

### Изменения в существующих файлах

- `cli.py` — логика выбора режима + вызов `input_parser`
- `README.md` — обновить Quick Start (новый способ первым, старый как альтернатива)

## Задачи

### Task 1: Парсер первой строки

**Files:**
- Create: `src/tvplotlines/input_parser.py`
- Create: `tests/test_input_parser.py`

- [ ] Функция `parse_header(text: str) -> tuple[str, int]` — возвращает (show, season)
- [ ] BOM/whitespace handling
- [ ] Тесты: "House, Season 1", "Breaking Bad Season 2", "Слово пацана, сезон 1", "24, Season 1", "9-1-1, Season 1", "House S01", "House S1", невалидная строка
- [ ] Commit

### Task 2: Парсер эпизодов

**Files:**
- Modify: `src/tvplotlines/input_parser.py`
- Modify: `tests/test_input_parser.py`

- [ ] Функция `parse_episodes(text: str) -> list[tuple[int, str]]` — возвращает [(номер, текст)]
- [ ] Тесты: "Episode 1", "# Episode 1", "Эпизод 1", пустой синопсис, Episode 3 перед Episode 2 (сортировка), дубликаты (ошибка), текст перед первым эпизодом (warning)
- [ ] Commit

### Task 3: Основная функция

**Files:**
- Modify: `src/tvplotlines/input_parser.py`
- Modify: `tests/test_input_parser.py`

- [ ] Функция `parse_synopsis_file(path: Path) -> tuple[str, int, dict[str, str]]`
- [ ] Encoding: `path.read_text(encoding="utf-8")`, `UnicodeDecodeError` → понятная ошибка
- [ ] Тест на полном файле (заголовок + несколько эпизодов)
- [ ] Тест ошибок: нет заголовка, нет эпизодов, пустой файл, не UTF-8
- [ ] Commit

### Task 4: CLI интеграция

**Files:**
- Modify: `src/tvplotlines/cli.py`

- [ ] Логика выбора режима: есть `--show` → старый, нет `--show` + один файл → парсим, нет `--show` + много файлов → ошибка
- [ ] `--show` и `--season` — опциональные override (CLI-флаг побеждает файл). В старом режиме `--show` обязателен
- [ ] Все остальные флаги (`--output`, `--provider`, `--model`, `--lang`, `--skip-review`, `--pass2-mode`) работают как раньше
- [ ] Тест: оба режима работают
- [ ] Commit

### Task 5: Пример и документация

**Files:**
- Create: `examples/input_format.txt`
- Modify: `README.md`

- [ ] Пример файла с 2-3 эпизодами True Detective S01
- [ ] README: новый способ первым в Quick Start, старый как альтернатива для скриптов
- [ ] `--help`: описание формата файла
- [ ] Commit

### Task 6: Manual smoke test

- [ ] Создать тестовый файл из fixtures (True Detective S01E01-E04)
- [ ] `tvplotlines run test_file.txt` — прогнать pipeline до конца, проверить result.json
- [ ] Требует API key, запускается вручную
