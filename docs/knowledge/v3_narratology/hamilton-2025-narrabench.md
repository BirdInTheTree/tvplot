---
type: research
project: tvplotlines
status: active
source: https://arxiv.org/abs/2510.09869
doi: 10.18653/v1/2026.eacl-long.176
year: 2025
authors: [Hamilton, Wilkens, Piper]
venue: EACL 2026
---

# NarraBench: A Comprehensive Framework for Narrative Benchmarking

## Summary

Теоретически обоснованная таксономия задач narrative understanding. Обзор 78 существующих бенчмарков. Четыре измерения нарратива: story, narration, discourse, situatedness. 50 нарративных навыков. Вывод: только 27% задач покрыты существующими бенчмарками.

## Key concepts

- **Four dimensions**: story (что произошло), narration (кто и как рассказывает), discourse (как организован текст), situatedness (контекст восприятия)
- **50 narrative skills** — гранулярная карта того, что LLM должна уметь делать с нарративом
- **Gap analysis** — events, style, perspective, revelation почти не покрыты бенчмарками
- **Taxonomy** — от нарратологической теории к вычислительным задачам

## Taxonomy (Table 4)

4 dimensions → 12 features → 50 aspects:

- **Story**: Agent (name, role, attributes, emotions, motivation), Social Net (interaction, connections, relationship), Event (event, schema, causality), Plot (topic, plot, plotline, moral, obstacle, conflict, archetype), Structure (plot arc), Setting (setting, location)
- **Discourse**: Time (duration, order), Revelation (suspense, curiosity, surprise)
- **Narration**: Perspective (point of view, focalization, dialogue), Style (allusion, figurative, imageability, complexity, evaluative)
- **Situatedness**: Paratext (genre, author, date, medium, platform), Motivation (intent)

Теоретические основания: Genette (1980) narrative triangle (story/discourse/narration) + Herman (2009) situatedness.

## Benchmark gaps (Table 5)

Пробелы — нет бенчмарков для: Event causality/schema, Plot obstacle/conflict/archetype, all Style, Perspective point of view/focalization, Revelation curiosity/surprise.

**tvplotlines покрывает несколько из этих пробелов:** Plot obstacle + conflict (Story DNA), Plot plotline (pass 1-2), Structure plot arc (pass 4). Это territory claim.

## Why this matters

Даёт формальный язык для описания того, что делает tvplotlines: какие из 50 навыков покрывает текущий пайплайн, какие нет. Карта пробелов. Таксономия основана на Genette + Herman — классическая нарратология, не сценарное мастерство.

## Relevance to tvplotlines

- **Текущее покрытие**: Story dimension (Agent, Plot, Structure) — основа текущего пайплайна
- **Новые направления для v3**: Discourse (Time order, Revelation), Narration (Perspective, focalization), Style
- **Territory claim**: tvplotlines закрывает пробелы в бенчмарках (obstacle, conflict, plot arc) — это аргумент для публикации
- **Evaluation framework**: NarraBench SMV (Scale/Mode/Variance) может дать метрики для оценки tvplotlines output

## Connections

- [[liu-2025-narrative-theory-survey]] — survey-компаньон
- [[mani-2025-narrative-generative-ai]] — теоретическая база для таксономии
- [[khan-2025-three-stage-analysis]] — один из подходов к narrative understanding
- [[elkins-2022-shapes-of-stories]] — sentiment arc как один из narrative skills (Structure → plot arc)
