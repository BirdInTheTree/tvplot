---
type: plan
project: tvplotlines
status: active
---

# Autoresearch v3: уточнить разницу hybrid vs procedural

## Проблема

В глоссарии разница читается нормально:
- **Procedural**: self-contained story per episode
- **Hybrid**: case-of-week + serialized arcs

Но в промпте pass0 граница размыта — procedural тоже может иметь serialized B-storylines (House: cases + House/team dynamics). Когда шоу перестаёт быть procedural и становится hybrid?

## Что проверить

- [ ] Как pass0 присваивает franchise_type на реальных шоу — есть ли ошибки hybrid↔procedural?
- [ ] Найти в литературе (Nash, Douglas, Mittell) чёткий критерий: что делает шоу hybrid, а не procedural с B-arc?
- [ ] Возможный критерий: в procedural serialized arcs — фон (character development), в hybrid — serialized arc является полноценным двигателем сюжета наравне с case-of-week
- [ ] Обновить промпт pass0 с более чётким разграничением
