---
type: research
project: tvplotlines
status: active
source: https://arxiv.org/abs/2601.11459
doi: 10.1109/ACCESS.2025.3650352
year: 2025
authors: [Keith]
venue: IEEE Access
---

# Interactive Narrative Analytics: Bridging Computational Narrative Extraction and Human Sensemaking

## Summary

Определяет поле Interactive Narrative Analytics (INA): computational narrative extraction + interactive visual analytics для sensemaking. Обзор методов, вызовов (масштабируемость, интерактивность, интеграция знаний, стандартизация оценки) и приложений (новостной анализ, разведка, научная литература, соцсети).

## Key concepts

- **Interactive Narrative Analytics (INA)** — новое определение поля на стыке extraction и визуализации
- **Sensemaking** — человеческое осмысление через интерактивное исследование нарративных структур (Pirolli & Card, information foraging)
- **Four theoretical foundations**: interactive visual analytics, computational narratives, sensemaking, knowledge representation
- **Event-based narratives** — нарратив как цепочка событий со связями (temporal, causal, semantic), НЕ как литературная структура (Propp, Genette)
- **Knowledge integration** — онтологии и knowledge graphs для обогащения extraction

## Verdict after reading

**Аутлайер в seed-списке.** Библиография почти не пересекается с классической нарратологией. Фокус — news analysis, intelligence, misinformation detection. "Narrative" здесь = "цепочка событий в новостном потоке", а не "сюжетная структура художественного произведения".

**Для v3 narratology промптов — малополезна.** Но полезна для tvplotlines-app (визуализация, human-in-the-loop, semantic interaction).

## Relevance to tvplotlines

- **Для библиотеки (prompts)**: низкая. Другое понимание "narrative".
- **Для приложения (viewer)**: высокая. tvplotlines уже делает INA: extraction pipeline + HTML viewer. Keith даёт теоретическую рамку и показывает что можно добавить: semantic interaction, progressive analytics, knowledge integration.

## Connections

- [[balestri-pescatore-2025-icaart]] — тоже имеет графический интерфейс
- [[santana-2022-narrative-extraction-survey]] — extraction часть
- [[hamilton-2025-narrabench]] — evaluation часть
