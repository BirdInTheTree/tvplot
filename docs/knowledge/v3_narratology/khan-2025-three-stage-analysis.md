---
type: research
project: tvplotlines
status: active
source: https://arxiv.org/abs/2511.11857
year: 2025
authors: [Khan]
venue: arXiv
---

# Three Stage Narrative Analysis: Plot-Sentiment Breakdown, Structure Learning and Concept Detection

## Summary

Трёхэтапный пайплайн для анализа нарратива в киносценариях: (1) разбивка на plot-sentiment arcs, (2) кластеризация структур методом Ward's hierarchical clustering, (3) извлечение концептов. Использует dictionary-based sentiment analysis с кастомным лексиконом на основе NRC-VAD (Valence, Arousal, Dominance).

## Key concepts

- **Sentiment arcs** — сюжет как траектория эмоциональных состояний (не событий)
- **VAD model** — Valence/Arousal/Dominance вместо бинарной позитивность/негативность
- **Structure clustering** — группировка похожих нарративных структур
- **Concept extraction** — высокоуровневые и низкоуровневые концепты из нарратива

## Relevance to tvplotlines

Альтернативный подход к тому же: разбиение нарратива на формальные компоненты. Но через sentiment, не через драматические функции. Может дать дополнительное измерение к текущим промптам — эмоциональная дуга поверх сюжетной.

## Connections

- [[hamilton-2025-narrabench]] — sentiment arcs как один из narrative skills
- [[liu-2025-narrative-theory-survey]] — контекст sentiment-подходов
- [[chauvel-2022-narrative-structure-survey]] — лингвистические теории структуры
