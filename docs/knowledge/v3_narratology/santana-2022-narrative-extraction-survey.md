---
type: research
project: tvplotlines
status: active
source: https://link.springer.com/article/10.1007/s10462-022-10338-7
doi: 10.1007/s10462-022-10338-7
year: 2022
authors: [Santana, Campos, Amorim, Jorge, Silvano, Nunes]
venue: Artificial Intelligence Review
---

# A Survey on Narrative Extraction from Textual Data

## Summary

Обзор подходов к извлечению нарратива из текста. Организован по pipeline задач: от raw text до структурированного нарратива. Покрывает computational linguistics и AI подходы. Pre-LLM survey — показывает состояние поля до GPT-эры.

## Key concepts

- **Narrative extraction pipeline** — последовательность задач от текста к структуре
- **Entity extraction** — персонажи, локации, объекты
- **Event extraction** — действия, изменения состояний
- **Relation extraction** — связи между событиями и персонажами
- **Timeline construction** — темпоральное упорядочивание событий

## Why this matters

Фундаментальный обзор до-LLM эпохи. Все 2024-2025 работы на него ссылаются. Показывает какие задачи решались классическими методами (и где LLM их превзошли).

## Relevance to tvplotlines

Pipeline-структура этого обзора зеркалит pipeline tvplotlines. Полезно для сравнения: что tvplotlines делает промптами, а что можно было бы делать кодом.

## Connections

- [[liu-2025-narrative-theory-survey]] — LLM-эра продолжение
- [[chauvel-2022-narrative-structure-survey]] — параллельный обзор с лингвистическим фокусом
- [[mani-2025-narrative-generative-ai]] — монография, покрывает обе эры
- [[keith-2025-interactive-narrative-analytics]] — extraction как компонент INA
