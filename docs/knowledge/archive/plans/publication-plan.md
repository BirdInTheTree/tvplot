---
type: plan
project: tvplotlines
status: active
---

# tvplotlines v0.1.0 — план публикации

Дата: 2026-03-25

## 1. Утилита `tvplotlines write-synopses`

### Что делает

CLI-утилита: по названию шоу и номеру сезона ищет информацию в интернете, читает страницы с описаниями эпизодов, и пишет синопсисы по протоколу (`synopsis-authoring-protocol.md`). Сохраняет в файлы.

### Принцип

- CLI-утилита, **не часть библиотечного API**
- `__init__.py` её не импортирует и не экспортирует
- Библиотека остаётся чистым вычислением (`get_plotlines()`)
- Optional dependency: `pip install tvplotlines[writer]` ставит httpx
- Паттерн httpx: `try/except ImportError` в `cli.py` с сообщением "установите `tvplotlines[writer]`"

### CLI интерфейс

```bash
pip install tvplotlines[writer]
tvplotlines write-synopses "House" --season 1 -o synopses/
# → synopses/S01E01.txt, S01E02.txt, ...
```

### Файловая структура (новые файлы)

```
src/tvplotlines/
├── write_synopses.py        # веб-поиск + LLM-генерация (НОВЫЙ)
└── prompts_en/
    └── write_synopses.md    # промпт на основе synopsis-authoring-protocol (НОВЫЙ)
```

### Изменения в существующих файлах

- `cli.py` — добавить команду `write-synopses` с `try/except ImportError`
- `pyproject.toml` — добавить `[project.optional-dependencies] writer = ["httpx>=0.27"]`

### Поток работы

1. Ищет в интернете "{show} season {N} episode guide"
2. Находит страницы с описаниями эпизодов (Wikipedia, IMDb, и др.)
3. Читает контент страниц
4. LLM переписывает каждый эпизод по протоколу (300–500 слов, 8–15 beats, покрытие всех линий)
5. Сохраняет `S01E01.txt`, `S01E02.txt`, ... в output-директорию

## 2. Подготовка к публикации

### 2.1. Новые файлы

- [ ] `CHANGELOG.md` — одна запись `## 0.1.0`, описание что есть в первом релизе
- [ ] `CONTRIBUTING.md` — краткий гайд: как запустить тесты, стиль кода, как создать PR

### 2.2. Git history и внутренние артефакты

`experiments/`, `program.md`, `results.tsv` — в git history. `.gitignore` не удалит их из истории. Но данные **не чувствительные** (промпты, синопсисы public domain, метрики экспериментов). Никаких ключей или приватных данных.

**Решение: оставить как есть.** `experiments/` — часть research-истории, для open-source это плюс (прозрачность). Если позже захотим чистый старт — orphan branch проще чем filter-repo.

- [ ] `experiments/` — добавить в `.gitignore` (чтобы новые файлы не попадали)
- [ ] `program.md` — добавить в `.gitignore`
- [ ] `results.tsv` — уже untracked, убедиться что в `.gitignore`
- [ ] Проверить что `.env`, `CLAUDE.md` не попадают (уже в `.gitignore`)

### 2.3. GitHub metadata

- [ ] Добавить description: "LLM-powered narrative breakdown for TV series"
- [ ] Добавить topics: `narrative`, `llm`, `tv-series`, `plotlines`, `narrative-analysis`, `screenwriting`
- [ ] Сделать репо public (последний шаг)

## 3. Что НЕ делаем сейчас

- PyPI публикация
- GitHub Actions CI (pytest)
- `py.typed` маркер
- Документация на ReadTheDocs

## 4. Порядок выполнения

1. Написать `write_synopses.py` + промпт
2. Обновить `cli.py` и `pyproject.toml`
3. Протестировать утилиту
4. Написать `CHANGELOG.md`
5. Написать `CONTRIBUTING.md`
6. Убрать внутренние артефакты из git tracking
7. Проверить что всё чисто (`git status`, тесты)
8. Коммит
9. GitHub metadata (description, topics)
10. Сделать репо public
