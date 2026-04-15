---
type: research
project: tvplotlines
status: active
source: https://arxiv.org/abs/2503.04817
doi: 10.5220/0013369600003890
year: 2025
authors: [Balestri, Pescatore]
venue: ICAART 2025
---

# Multi-Agent System for AI-Assisted Extraction of Narrative Arcs in TV Series

## Summary

Мульти-агентная система для извлечения нарративных арок из сериалов. Тестировалась на Grey's Anatomy S1. Классифицирует арки как Anthology (самостоятельные), Soap (отношения), Genre-Specific (жанровые). Хранит в реляционной + векторной БД. Графический интерфейс для ручной доработки.

## Key concepts

- **Anthology / Soap / Genre-Specific** — трёхчастная классификация арок (ср. tvplotlines: case_of_the_week / serialized / runner)
- **Paratexts** — система работает с синопсисами, не с полным текстом (как и tvplotlines)
- **Multi-agent architecture** — агенты для разных этапов извлечения
- **Human-in-the-loop** — графический интерфейс для коррекции

## Limitations

Reliance on episode summaries misses overlapping arcs and subtle dynamics. Blends distinct storylines when they share characters.

## Relevance to tvplotlines

Прямой предшественник. tvplotlines переосмыслил их классификацию (A/B/C вместо Anthology/Soap/Genre) и добавил Story DNA, narrative functions, multi-pass verification.

## Connections

- [[balestri-pescatore-2025-memory]] — расширенная версия этой же работы
- [[liu-2025-narrative-theory-survey]] — обзор, включает эту работу
- [[keith-2025-interactive-narrative-analytics]] — похожий подход к визуализации
