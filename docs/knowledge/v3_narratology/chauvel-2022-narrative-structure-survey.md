---
type: research
project: tvplotlines
status: active
source: https://aclanthology.org/2022.tal-1.3.pdf
year: 2022
authors: [Chauvel]
venue: TAL
---

# Survey on Narrative Structure: from Linguistic Theories to Automatic Extraction

## Summary

Обзор от лингвистических теорий нарративной структуры к автоматическому извлечению. Начинает с Propp, Greimas, Genette, Labov — переходит к вычислительным реализациям. Покрывает фольклор, художественную литературу, другие нарративные формы.

## Key concepts

- **Propp's functions** — 31 функция волшебной сказки, первая формальная модель сюжета
- **Greimas' actantial model** — 6 актантов (Subject, Object, Sender, Receiver, Helper, Opponent)
- **Genette's narratology** — focalization, order, duration, frequency, voice
- **Labov's narrative structure** — abstract, orientation, complicating action, evaluation, resolution, coda
- **From theory to extraction** — как каждая теория переводится в NLP-задачу

## Why this matters

Мост между классической нарратологией и NLP. Именно здесь найти ответ "какие нарратологические концепции можно заменить на сценарные в промптах tvplotlines".

## Relevance to tvplotlines

Прямая карта соответствий: Story DNA ≈ actantial model? Narrative functions ≈ Propp's functions? Format classification ≈ genre theory? Эта статья даёт теоретическую базу для такого маппинга.

## Connections

- [[santana-2022-narrative-extraction-survey]] — параллельный обзор с NLP-фокусом
- [[liu-2025-narrative-theory-survey]] — LLM-эра продолжение
- [[mani-2025-narrative-generative-ai]] — монография, развивает те же теории
- [[hamilton-2025-narrabench]] — таксономия, основанная на этих теориях
