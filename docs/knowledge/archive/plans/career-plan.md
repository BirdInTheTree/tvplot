---
type: plan
project: tvplotlines
status: active
---

# Career Plan

Цель: академическая и профессиональная видимость вокруг tvplotlines.

## Фаза 1 — Фундамент
- [ ] Открытый tvplotlines repo на GitHub (библиотека)
- [ ] Preprint на arXiv (описание метода)
  - [ ] После публикации: обновить Citation в README (добавить arXiv DOI)

## Фаза 2 — GitHub Pages сайт
Один сайт, всё вместе:
- [ ] Резюме / CV
- [ ] Блог с summaries статей (прочитанных во время работы над tvplotlines)
- [ ] tvplotlines demo viewer (статический JS, ~20 готовых результатов)
  - Переписать viewer с FastAPI+Jinja2 на статический JS
  - Заодно улучшить UI
  - Analytics: каждый график на полную ширину, не по 2 в ряд
  - Analytics: добавить описание/интерпретацию к каждому графику
  - Analytics: tension curves — переосмыслить или убрать (сейчас бесполезны)
  - Терминология в viewer: storyline → plotline везде в UI
  - Series selector: показывать полное название шоу из JSON, не slug

## Фаза 3 — Расширение
- [ ] Awesome list — неформальные логики применительно к нарративу

## Терминология
- [ ] Переименовать `Event.storyline` → `Event.plotline` в коде, промптах, тестах и результатах (breaking change)

## Фаза 4 — Монетизация (когда будет спрос)
- [ ] Lemon Squeezy лицензия для полного tvplotlines-app
