---
type: plan
project: tvplotlines
status: active
---

# Open-source release checklist

## Code quality

- [x] Тесты проходят (`pytest`) — 77 passed, 1 skipped
- [x] Нет hardcoded путей, API ключей, персональных данных в коде
- [x] Нет TODO/FIXME которые блокируют релиз
- [x] `.env` в `.gitignore`
- [x] `CLAUDE.md` в `.gitignore` (внутренние инструкции, не для публики)

## Документация

- [x] README: установка, quickstart (CLI + Python), пример вывода, описание pipeline
- [x] README: примеры кода соответствуют реальному API (имена полей, типы аргументов)
- [x] docs/quickstart.md — рабочий пример
- [x] docs/api.md — все параметры `get_plotlines()`, все поля моделей
- [x] examples/run_pipeline.py — рабочий пример
- [x] CHANGELOG.md — v0.1.0
- [x] examples/synopses/ — BB S01 + GoT S01
- [x] examples/results/ — результаты прогона

## Packaging

- [x] pyproject.toml: name, version, description, authors (с email), license, keywords, classifiers
- [x] pyproject.toml: dependencies полные (anthropic, openai, scikit-learn)
- [x] pyproject.toml: CLI entry point (`tvplotlines = "tvplotlines.cli:main"`)
- [ ] `pip install -e .` работает — нужно проверить вручную в чистом venv
- [x] `tvplotlines --help` работает

## Legal / metadata

- [x] LICENSE файл (MIT)
- [x] Copyright owner корректный (BirdInTheTree)
- [x] Нет чужого кода без атрибуции
- [x] Синопсисы — собственные пересказы, fair use

## Git

- [x] `.gitignore` покрывает: .env, __pycache__, .DS_Store, CLAUDE.md
- [x] Нет секретов в git истории
- [x] Ветка main — основная
- [x] Удалить старые ветки (autoresearch/*, feature/*, claude/*) перед публикацией

## CI/CD

- [x] GitHub Actions: тесты на push/PR (Python 3.11, 3.12, 3.13)
- [x] Badge в README: PyPI, License, Python versions

## Перед `git push` в публичный репо

- [ ] Перечитать README глазами нового пользователя
- [x] `pip install -e .` в чистом venv
- [ ] Убедиться что репо на GitHub — public (или переключить)
- [x] Удалить старые ветки

## После публикации

- [ ] `pip install tvplotlines` из PyPI
- [ ] Проверить что badges в README показывают правильную информацию
