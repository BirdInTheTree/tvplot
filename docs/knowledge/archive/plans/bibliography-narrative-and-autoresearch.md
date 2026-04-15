---
type: note
project: tvplotlines
status: active
---

# Bibliography: Narrative Analysis + Autoresearch

Собрано 2026-03-16. Две темы: (1) computational narratology и метрики для event functions, (2) автоматическая оптимизация промптов (autoresearch подходы).

---

## Computational Narratology & Narrative Arc Detection

### Turning Point Identification

**Papalampidi et al. (2019)** — Movie Plot Analysis via Turning Point Identification.
5 turning points в синопсисах фильмов (opportunity, change of plans, point of no return, major setback, climax). Аннотированный датасет, нейросетевая модель, метрика — accuracy + distance от правильной позиции. **Прямо наша задача — но для фильмов, не сериалов.**
- https://arxiv.org/abs/1908.10328

### Narrative Theory + NLP

**Piper, So, Bamman (2021)** — Narrative Theory for Computational Narrative Understanding. EMNLP.
Связывает теорию нарратива из гуманитарных наук с NLP методами. Открывает новые эмпирические вопросы.
- https://aclanthology.org/2021.emnlp-main.26/

### Story Arc Structure

**Reagan et al. (2020)** — The Narrative Arc: Revealing Core Narrative Structures through Text Analysis. Science Advances.
Три нарративных процесса: staging, plot progression, cognitive tension. Анализ ~40,000 текстов.
- https://www.science.org/doi/10.1126/sciadv.aba2196

### Narrative Analysis via ML

**Jhala (2020)** — Three Stage Narrative Analysis: Plot-Sentiment Breakdown, Structure Learning and Concept Detection.
Трёхэтапный анализ: разбивка по сентименту, обучение структуре, детекция концептов.
- https://arxiv.org/html/2511.11857

### LLM for Story Analysis (2026)

**Narrative Theory-Driven LLM Methods for Automatic Story Analysis (2026).**
Свежая работа — LLM для автоматического анализа нарративной структуры. **Прямой конкурент/родственник tvplotlines.**
- https://arxiv.org/pdf/2602.15851

### Benchmarks

**NarraBench (2025)** — A Comprehensive Framework for Narrative Benchmarking.
Бенчмарк для narrative understanding: dialogue, plot arcs, genre classification.
- https://arxiv.org/html/2510.09869

**SeriesBench (2025)** — A Benchmark for Narrative-Driven Drama Series Understanding.
1,072 видео, задачи на понимание нарратива в сериалах. MLLMs описывают действия но плохо понимают inter-character relationships.
- https://arxiv.org/html/2504.21435v1

### TV Series Narrative Extraction

**Balestri & Pescatore (2025)** — Multi-Agent System for AI-Assisted Extraction of Narrative Arcs in TV Series.
Наша reference-статья. Grey's Anatomy, три типа арок (Anthology, Soap, Genre-Specific). ICAART 2025.
- https://arxiv.org/abs/2503.04817

**Balestri & Pescatore (2025)** — Narrative Memory in Machines: Multi-Agent Arc Extraction in Serialized TV.
Расширение предыдущей. LLM как semantic memory + vector DB как episodic memory.
- https://arxiv.org/html/2508.07010v1

---

## Autoresearch & Automated Prompt Optimization

### Karpathy Autoresearch (2026)

**Karpathy (2026)** — autoresearch: Autonomous LLM Experimentation.
630 строк кода. Агент модифицирует training code, запускает 5-мин эксперимент, проверяет метрику, keep/discard. 126 экспериментов за ночь, 700 за 2 дня. Loss: 0.9979 → 0.9697. "Time to GPT-2": 2.02h → 1.80h (11%).
- https://github.com/karpathy/autoresearch

### OPRO (Google DeepMind)

**Yang et al. (2023)** — Large Language Models as Optimizers (OPRO).
LLM оптимизирует промпты для другого LLM в feedback loop. 47% лучше человеческих экспертов на MATH.
- Meta-optimization: LLM генерирует и улучшает промпты итеративно.

### DSPy (Stanford NLP)

**Khattab et al.** — DSPy: Programming—not Prompting—Language Models.
Фреймворк для автоматической оптимизации промптов. С хорошей метрикой и данными можно автоматически оптимизировать промпт без ручного редактирования.
- https://github.com/stanfordnlp/dspy
- MIPRO optimizer — SOTA для discrete prompt optimization.

### GAAPO (2026)

**GAAPO** — Genetic Algorithm Applied to Prompt Optimization.
Гибридный фреймворк: генетический алгоритм эволюционирует промпты через поколения.
- https://www.frontiersin.org/journals/artificial-intelligence/articles/10.3389/frai.2025.1613007/full

### promptolution (2025)

**promptolution** — A Unified, Modular Framework for Prompt Optimization.
Реализует OPRO, EvoPromptDE, EvoPromptGA, и CAPO (SOTA discrete prompt optimizer).
- https://arxiv.org/html/2512.02840v1

### Self-Refine

**Madaan et al. (2023)** — Self-Refine: Iterative Refinement with Self-Feedback.
LLM генерирует → оценивает → улучшает в цикле без внешнего supervision.
- https://arxiv.org/abs/2303.17651

### IMPROVE (2025)

**IMPROVE** — Iterative Model Pipeline Refinement and Optimization Leveraging LLM Agents.
Полностью автономный фреймворк: LLM-агенты конструируют, тренируют и итеративно улучшают пайплайн.
- https://arxiv.org/html/2502.18530v1

### LLMs in Scientific Discovery (2025)

**From Automation to Autonomy: A Survey on Large Language Models in Scientific Discovery.**
Обзор: LLM переходят от автоматизации к автономии в научных исследованиях.
- https://arxiv.org/html/2505.13259v1

---

## Relevance to tvplotlines

**Для метрики event functions:**
- Papalampidi (turning points) — closest work, но для фильмов. Их 5 turning points ≈ наши 7 functions. Метрика: accuracy + distance.
- NarraBench / SeriesBench — бенчмарки для валидации.

**Для autoresearch v3:**
- Наш autoresearch ≈ Karpathy's autoresearch (тот же loop: change → test → keep/revert).
- DSPy/OPRO — более формальные подходы к prompt optimization, можно изучить для идей.
- Self-Refine — LLM оценивает свой output и улучшает (похоже на наш Pass 3).

**Для awesome list / preprint:**
- Все статьи по computational narratology — related work.
- Balestri & Pescatore — direct predecessor.

**Limitation of DSPy/OPRO/promptolution for our use case:**
These frameworks optimize short prompts ("classify this as..."). Our prompts are 200+ line specifications with tables, examples, and rules. Automated generation from scratch is not feasible. Our autoresearch is closer to Karpathy's approach: modify one element in a large, tested prompt → test → keep/revert. This is a meaningful difference worth noting in the preprint.
