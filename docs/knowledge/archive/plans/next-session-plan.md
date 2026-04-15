---
type: plan
project: tvplotlines
status: active
---

# Что доделать (после сессии 2026-03-26/27)

## Не закончено

### 1. Theme-led не работает на Mad Men
MM прогон показал: 6 plotlines, все character-led, ни одной институциональной.
Две причины:
- **Синопсисы** — synopses_writer пишет через character lens, рекламные кейсы = фон
- **Промпт Pass 1** — нет примера theme-led plotline в JSON output, правило «when in doubt don't create» давит

Нужно:
- [ ] Поправить промпт synopses_writer — явно просить описывать институциональную/рабочую динамику, не только персональные конфликты
- [ ] Добавить theme-led пример в JSON output секции pass1.md
- [ ] Перегенерировать синопсисы MM
- [ ] Прогнать заново, сравнить

### 2. Протестировать на других шоу
- [ ] CSI S01 — procedural, ожидаем case_of_the_week + «Lab Politics»
- [ ] Slow Horses S01 — нужны синопсисы (write-synopses теперь работает с Wikipedia search)
- [ ] Ablation testing — откатывать изменения по одному, смотреть что ломается

### 3. write-synopses рефакторинг
- [ ] Заменить Wikipedia-парсер на LLM с web search (или по памяти)
- [ ] Нужен search tool в call_llm (tool use loop) или callback search_fn
- [ ] Пока что — Wikipedia search API работает (починили), но парсер ломается на нестандартных страницах

### 4. Два измерения функций (будущее)
Записано в `3-resources/tvplotlines/two-function-dimensions.md`.
- Pass 2: episode function (Dan Harmon circle или simplified)
- Pass 3: arc function (plot_fn) — роль в сезонной арке
- Сейчас убрали из Pass 3, нужно вернуть когда будет ясна модель

### 5. Pass 3: reviewed_rank
Решили что Pass 3 просто ставит свои ранки, код сравнивает. Но механизм не реализован:
- [ ] Формат вывода Pass 3 — добавить поле ranks в JSON ответ
- [ ] Код pass3.py — парсить ranks, записывать в reviewed_rank
- [ ] Сравнение computed_rank vs reviewed_rank в pipeline

### 6. formulas.md
- [ ] Добавить design rationale / цитаты из книг ко всем формулам
- [ ] Обновить после всех изменений (rank, ensemble, patches removed)

### 7. Chain-of-thought
- [ ] Исследовать эффект на качество (все пассы)
- [ ] Может просить LLM рассуждать в отдельном поле перед ответом

## Закончено в этой сессии
- ✅ --stop-after / --resume-from / --output-dir в CLI
- ✅ Rank refactor (computed_rank + reviewed_rank)
- ✅ Ensemble как формат (убран is_ensemble)
- ✅ Limited убран
- ✅ Patches убраны
- ✅ PROMOTE/DEMOTE убраны
- ✅ Shared glossary
- ✅ Theme-led правки в glossary и pass1
- ✅ Wikipedia search fix
- ✅ docs/formulas.md
- ✅ Rank experiment + скрипт
- ✅ Pass 2: функции episode-scoped
- ✅ Chain-of-thought nudge во всех промптах
- ✅ Changelog
