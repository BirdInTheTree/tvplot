---
type: note
project: tvplotlines
status: active
---

# tvplotlines autoresearch v2 — multi-show prompt optimization

Автономная оптимизация промптов на диверсифицированном датасете (12 шоу, 7–25 эпизодов, en/ru).

## Отличия от v1

- **v1**: один шоу (Слово пацана, 8 eps), метрика = coverage × ARI (consistency). Оптимизировал стабильность, не качество.
- **v2**: 12 шоу разных типов/длин, метрика = coverage × Coh−Sep (embedding-based). Оптимизирует качество разделения линий.

## Метрика

**Quality score** = mean across all shows of:

```
show_score = coverage × max(coh_sep, 0)
```

Where:
- **coverage** = fraction of events with non-null storyline (from `metrics.py`)
- **coh_sep** = within-storyline coherence minus between-storyline separation (from embeddings). Higher = storylines are more distinct from each other.

**Constraint**: min(show_score) ≥ 0.01 — no show may collapse to zero. A change that improves the mean but kills one show is rejected.

**Why not ARI**: ARI measures run-to-run consistency, not quality. A pipeline that consistently produces bad results scores high on ARI. Coh−Sep measures whether extracted storylines are semantically distinct — closer to actual extraction quality.

**Embeddings**: OpenAI `text-embedding-3-small`. Cost: ~$0.002 per show (negligible).

## Dataset

| Show | Code | Eps | Type | Lang |
|------|------|-----|------|------|
| Breaking Bad S01 | BB | 7 | serial | en |
| Слово пацана S01 | SP | 8 | serial | ru |
| True Detective S01 | TD | 8 | serial | en |
| GoT S01 | GOT | 10 | ensemble | en |
| Мажор S01 | MAJOR | 12 | hybrid | ru |
| ГДР S01 | GDR | 14 | serial | ru |
| Метод S01 | METOD | 16 | hybrid | ru |
| This Is Us S01 | TIU | 18 | ensemble | en |
| House S01 | HOUSE | 22 | procedural | en |
| CSI S01 | CSI | 23 | procedural | en |
| ER S01 | ER | 25 | procedural | en |
| Lost S01 | LOST | 25 | serial/ensemble | en |

Synopses: `/Users/nvashko/Projects/tvplotlines-app/research/synopses/{CODE}_S01E*.txt`
Results: `/Users/nvashko/Projects/tvplotlines-app/research/results/{code}_s01_result.json`

### Fast set vs full set

Running all 12 shows per experiment is expensive (~$10–15). Use a two-tier approach:

**Fast set (4 shows, ~$3–4)** — for rapid iteration:
- BB (7 eps, short serial, en) — known good baseline
- SP (8 eps, short serial, ru) — Russian, known good baseline
- House (22 eps, long procedural, en) — known problem case
- Lost (25 eps, long serial/ensemble, en) — new, long non-procedural

Fast set covers: short/long, serial/procedural/ensemble, en/ru. If a change helps on the fast set, validate on the full set.

**Full set (all 12 shows)** — for validation of promising changes only. Run full set when:
- Fast set score improves by ≥ 0.005
- Before marking an experiment as `keep`

## Setup

1. **Agree on a run tag**: propose a tag based on today's date (e.g. `mar14`). The branch `autoresearch/<tag>` must not already exist.
2. **Create the branch**: `git checkout -b autoresearch/<tag>` from current main.
3. **Read the in-scope files** — read ALL of these before starting:
   - `CLAUDE.md` — project context and conventions.
   - `docs/architecture.md` — pipeline architecture.
   - `src/tvplotlines/prompts/pass0.md` — Pass 0 prompt (context detection).
   - `src/tvplotlines/prompts/pass1.md` — Pass 1 prompt (storyline extraction).
   - `src/tvplotlines/prompts/pass2.md` — Pass 2 prompt (event assignment).
   - `src/tvplotlines/prompts/pass3.md` — Pass 3 prompt (narratologist review).
   - `src/tvplotlines/prompts_en/pass1.md` — English Pass 1 prompt.
   - `src/tvplotlines/metrics.py` — metric computation.
4. **Source environment**: `set -a && source .env && set +a`
5. **Establish baseline**: Run all 12 shows once, compute scores, record in `results-v2.tsv`.
6. **Confirm and go**.

## What you CAN modify

- Prompt files: `src/tvplotlines/prompts/pass{0,1,2,3}.md` and `src/tvplotlines/prompts_en/pass{0,1,2,3}.md`
- Pipeline code: `src/tvplotlines/pass0.py`, `pass1.py`, `pass2.py`, `pass3.py`
- Post-processing: `src/tvplotlines/postprocess.py`, `verdicts.py`
- Orchestration: `src/tvplotlines/pipeline.py`
- LLM settings: `src/tvplotlines/llm.py` — model, temperature, max_tokens

## What you CANNOT modify

- Metric computation script: `research/compute_embedding_metrics.py`
- Synopsis files: `research/synopses/`
- The scoring formula defined in this document

## Running an experiment

### Step 1: Run pipeline on shows

```bash
# Fast set (4 shows)
set -a && source .env && set +a

tvplotlines run /Users/nvashko/Projects/tvplotlines-app/research/synopses/BB_S01E*.txt \
  --show "Breaking Bad" --season 1 --lang en --pass2-mode batch \
  -o /Users/nvashko/Projects/tvplotlines-app/research/results/bb_s01_result.json

tvplotlines run /Users/nvashko/Projects/tvplotlines-app/research/synopses/SP_S01E*.txt \
  --show "Слово пацана" --season 1 --lang ru --pass2-mode batch \
  -o /Users/nvashko/Projects/tvplotlines-app/research/results/slovo_patsana_s01_result.json

tvplotlines run /Users/nvashko/Projects/tvplotlines-app/research/synopses/HOUSE_S01E*.txt \
  --show "House" --season 1 --lang en --pass2-mode batch \
  -o /Users/nvashko/Projects/tvplotlines-app/research/results/house_s01_result_v2.json

tvplotlines run /Users/nvashko/Projects/tvplotlines-app/research/synopses/LOST_S01E*.txt \
  --show "Lost" --season 1 --lang en --pass2-mode batch \
  -o /Users/nvashko/Projects/tvplotlines-app/research/results/lost_s01_result.json
```

Run shows in parallel when possible (background jobs or separate terminals).

### Step 2: Compute metrics

```bash
cd /Users/nvashko/Projects/tvplotlines-app/research
python3 compute_embedding_metrics.py
```

### Step 3: Record results

Log to `results-v2.tsv`:

```
commit	mean_score	min_score	bb	sp	house	lost	cost_usd	status	description
```

For full-set runs, add all 12 columns.

## Experiment priorities

### Primary target: Pass 1 prompt for long seasons

The data shows Pass 1 undersegments long seasons (22+ eps → 4 storylines instead of 6–8). Hypotheses:

1. **Season length awareness**: Add instruction that longer seasons typically have more storylines (5–8 for 20+ episodes vs 3–5 for 8 episodes).
2. **Short arc recognition**: Explicitly describe multi-episode arcs that span 3–6 episodes as valid serialized storylines, not just full-season ones.
3. **Franchise engine isolation**: In procedurals, ensure the episodic line doesn't absorb serialized sub-arcs.
4. **Ensemble vs procedural scaling**: Ensemble shows naturally have more parallel storylines. Procedurals may also have them but the prompt currently discourages it.
5. **Worked examples**: Add a long-season example (e.g. ER) to the prompt alongside the existing Breaking Bad example.

### Secondary: Pass 2 assignment quality

Even with correct Pass 1 extraction, Pass 2 may assign events to wrong storylines. This shows up as low Coh−Sep even when the right number of storylines exist.

### Tertiary: Pass 3 verdicts

Pass 3 may DROP valid short arcs or fail to CREATE missing ones. Test with skip_review=True vs False.

## The experiment loop

LOOP FOREVER:

1. Check git state and `results-v2.tsv` — what's been tried, what worked.
2. Pick the next experiment. One change per experiment — isolate variables.
3. Edit prompt(s) and/or pipeline code.
4. `git commit` the change.
5. Run fast set (4 shows). Compute metrics.
6. If fast set score improved by ≥ 0.005:
   - Run full set (all 12 shows). Compute metrics.
   - If full set score improved AND min_score ≥ 0.01 → keep.
   - Otherwise → revert.
7. If fast set score did not improve → revert.
8. Record all results in `results-v2.tsv`.
9. `git reset --hard HEAD~1` to revert discarded experiments.

**NEVER STOP**: Once the loop begins, do NOT pause to ask the human. The human might be asleep or away and expects you to continue working indefinitely until manually stopped. If you run out of ideas, reread the prompts, try combining near-misses, try radical changes.

## Cost optimization

Use `--pass2-mode batch` for all autoresearch runs. Batch API is 50% cheaper on Pass 2 (the most expensive pass — N episodes × LLM call). System prompt caching is automatic in both modes.

| Mode | Per show (22 eps) | Fast set (4 shows) | Full set (12 shows) |
|------|-------------------|--------------------|--------------------|
| parallel + cache | ~$0.65 | ~$3–4 | ~$8–12 |
| **batch + cache** | **~$0.35** | **~$1.5–2** | **~$4–5** |

Batch mode is slower (~2–5 min polling) but for autoresearch speed is less important than cost.

## Cost budget

- Fast set: ~$1.5–2 per experiment
- Full set: ~$4–5 per experiment
- Embeddings: ~$0.02 per experiment (negligible)
- Expected: ~4–6 experiments per hour (fast set only), ~2 per hour (with full validation)
- **HARD LIMIT: $30 total.** Track cumulative cost in results-v2.tsv. When cumulative cost approaches $28, stop and summarize findings. Do NOT exceed $30.

## Baseline reference (before optimization)

From current results:

| Show | Eps | Lines | Coh−Sep | Coverage |
|------|-----|-------|---------|----------|
| Breaking Bad S01 | 7 | 4 | 0.083 | 0.97 |
| GoT S01 | 10 | 8 | 0.077 | 1.00 |
| Slovo Patsana S01 | 8 | 7 | 0.077 | 0.97 |
| GDR S01 | 14 | 5 | 0.069 | 1.00 |
| ER S01 | 25 | 8 | 0.037 | 1.00 |
| True Detective S01 | 8 | 4 | 0.024 | 1.00 |
| House S01 | 22 | 4 | 0.002 | 0.98 |
| CSI S01 | 23 | 4 | −0.004 | 1.00 |

Mean score (coverage × max(coh_sep, 0)): ~0.043
Min score: 0.0 (CSI — negative coh_sep)

The gap between short shows (~0.08) and long procedurals (~0.00) is the primary optimization target.

## Strategy notes

- **Coh−Sep is the bottleneck for long shows.** Coverage is already high everywhere.
- Long seasons produce too few storylines → all events blend together → low coherence, no separation.
- Focus on Pass 1 instructions that scale storyline count with season length.
- Be careful not to over-generate storylines for short shows — verify on fast set.
- If a change helps House/CSI but hurts BB/SP, it's rejected (min constraint).
- Prompts exist in two languages (ru + en). Changes must be applied to both.
- Theoretical grounding matters: changes should be defensible from narrative theory, not ad-hoc rules.
