---
type: research
project: tvplotlines
status: active
source: https://doi.org/10.1017/9781009270403
year: 2022
authors: [Elkins]
venue: Cambridge Elements (Digital Literary Studies)
---

# The Shapes of Stories: Sentiment Analysis for Narrative

## Summary

Книга (Cambridge Element) о sentiment analysis как методе визуализации нарративной структуры. Отталкивается от идеи Воннегута (простые формы историй) и работы Reagan (2016, "6 basic shapes"). Сравнивает 30+ моделей sentiment analysis, от dictionary-based (Syuzhet, sentimentR) до deep learning (transformers). Показывает что "форма" (emotional arc) есть даже у экспериментальных модернистских романов.

## Key concepts

- **Sentiment arc ≠ story arc** — sentiment analysis показывает syuzhet (порядок изложения), не fabula (хронологию событий). Это эмоциональная дуга, не сюжетная.
- **6 basic shapes** (Reagan 2016): rags to riches, tragedy, man in a hole, Icarus, Cinderella, Oedipus
- **Unique fingerprint** — каждый нарратив имеет уникальный эмоциональный отпечаток, простые формы видны только при сильном сглаживании
- **Smoothing methods**: Rolling Mean (SMA), DCT (Jockers/Syuzhet), LOWESS — дают разные "расстояния" от текста
- **Crux points** — пики и впадины sentiment arc коррелируют с ключевыми пассажами, выбранными литературоведами для close reading
- **Human-in-the-loop обязателен** — модели не заменяют критика, а помогают ему
- **Ensemble approach** — нет единственной "лучшей" модели, оптимальная зависит от текста

## Tools mentioned

- **SentimentArcs** (Jon Chun) — Python/Jupyter, 30+ моделей, open-source
- **Syuzhet** (Jockers) — R package, GPL-3, dictionary + DCT smoothing
- **sentimentR** (Rinker) — R, heuristics (intensification, negation)
- **Hedonometer** (Reagan/Story Lab) — web tool, sliding window

## Применимость к TV-сериалам

### Что может работать
- tvplotlines уже имеет синопсисы разбитые по эпизодам — это готовый input для sentiment analysis
- Sentiment arc поверх эпизодов = эмоциональная траектория сезона — дополнительное измерение к текущим dramatic functions
- Crux points из sentiment arc могут коррелировать с turning points / climax из tvplotlines
- Можно строить sentiment arc **per plotline** (каждый event уже привязан к plotline)

### Что проблематично
- Elkins работает с **полными текстами** романов (тысячи предложений). tvplotlines работает с **синопсисами** (200-400 слов на эпизод). Синопсисы — сжатый пересказ, в них меньше "языка эмоций" и больше "языка событий".
- Dictionary-based модели (Syuzhet, sentimentR) могут плохо работать на синопсисах — слишком мало слов для статистически значимого сигнала
- Transformer-модели (BERT-based) могут справиться лучше, но теряют explainability
- Elkins подчёркивает: sentiment arc показывает **discourse** (порядок изложения), не **story** (что произошло). Синопсисы обычно хронологичны — разница между syuzhet и fabula стирается.

### Verdict: стоит ли пробовать?

**Да, но как эксперимент с чётким scope.** Конкретный тест:

1. Взять сериал где tvplotlines уже разметил всё (Grey's Anatomy S1 или Breaking Bad)
2. Запустить SentimentArcs на синопсисах (по эпизодам → кривая за сезон)
3. Сравнить: коррелируют ли впадины sentiment arc с crisis/climax из tvplotlines?
4. Если да → sentiment arc как дешёвый (без LLM) pre-pass для оценки "формы" сезона
5. Если нет → синопсисы слишком бедны для sentiment analysis, метод не переносится

Это один скрипт на Python, не требует переписывания промптов. SentimentArcs бесплатен.

## Connections

- [[khan-2025-three-stage-analysis]] — тоже sentiment + narrative structure, но через VAD (Valence/Arousal/Dominance)
- [[liu-2025-narrative-theory-survey]] — контекст sentiment подходов в NLP
- [[hamilton-2025-narrabench]] — sentiment arcs как один из 50 narrative skills
