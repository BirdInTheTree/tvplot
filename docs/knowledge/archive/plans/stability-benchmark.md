---
type: spec
project: tvplotlines
status: active
---

# Stability Benchmark Specification

## Goal

Demonstrate that tvplotlines's pipeline produces stable, reproducible storyline analyses. The key claim for the preprint: "a single run is representative of what the pipeline would produce on repeated execution."

## Why this matters

LLM outputs are non-deterministic (temperature=0 reduces but doesn't eliminate variance). If storyline assignments shift dramatically between runs, the tool's analysis is unreliable. We need to quantify the variance.

## Metric: Adjusted Rand Index (ARI)

ARI compares two clusterings without requiring label alignment — ideal for storyline analysis where storyline IDs may differ between runs, but the groupings should be consistent.

- **Input:** For each run, build a vector of (episode, character) → storyline assignments.
- **Comparison:** ARI between all pairs of runs.
- **Scale:** ARI=1.0 identical, ARI=0.0 random, ARI<0 worse than random.

Implementation: `tvplotlines.metrics.compute_consistency_ari()` — already exists in the library.

## Success criteria

| Metric | Threshold | Meaning |
|--------|-----------|---------|
| Mean ARI per show | ≥ 0.70 | Good reproducibility |
| Min ARI per show | ≥ 0.50 | No catastrophic divergence |
| Mean coverage per show | ≥ 0.90 | ≤10% unassigned events |

### If criteria are not met

- **ARI < 0.50:** Investigate. Likely cause: Pass 1 voting produces different storyline sets across runs. Fix: increase voting rounds or add structural constraints.
- **ARI 0.50–0.70:** Acceptable with caveat in preprint. Document which storylines diverge — likely low-confidence (inferred) lines.
- **Coverage < 0.90:** Investigate orphan assignment. May need stronger Pass 2 prompts.

## Benchmark set

5 shows chosen for franchise type diversity and episode count range:

| Show | Code | Episodes | Franchise type | Rationale |
|------|------|----------|---------------|-----------|
| True Detective S01 | TD | 8 | serial | Small, clean serial narrative |
| Breaking Bad S01 | BB | 7 | serial | Classic, complex character arcs |
| House S01 | HOUSE | 22 | procedural | Long, case-of-week + serialized B/C |
| Game of Thrones S01 | GOT | 10 | ensemble | Many equal storylines |
| This Is Us S01 | TIU | 18 | hybrid | Episodic + throughline mix |

Total: 65 episodes across 5 runs = 325 Pass 2 calls + 25 Pass 1 + 25 Pass 0 + 25 Pass 3.

## Cost estimate

- Pass 2 (dominant cost): ~$0.013/episode (Sonnet, cached system prompt)
- 325 episodes × $0.013 = ~$4.23
- Batch mode (50% discount): ~$2.12
- Passes 0/1/3 overhead: ~$1.00
- **Total estimate: $3–5 in batch mode**

## Protocol

1. For each show, run pipeline 5 times with identical input.
2. Save each run's TVPlotlinesResult as JSON.
3. Compute pairwise ARI across all 5 runs (10 pairs per show).
4. Compute coverage per run.
5. Report: mean ARI, min ARI, coverage range, storyline count range.

## Results (2026-03-15)

Two full runs of 5 shows × 5 runs each + 1 run of SP × 5. Total: ~55 pipeline executions.

### Run 1 (before unassigned validation fix)

| Show | Mean ARI | Min ARI | Coverage | Storylines | Pass? |
|------|----------|---------|----------|------------|-------|
| TD | 0.884 | 0.715 | 1.000 | 4-5 | PASS |
| BB | 0.682 | 0.508 | 1.000 | 4-5 | **FAIL** |
| HOUSE | 1.000 | 1.000 | 1.000 | 10 | PASS |
| GOT | 0.904 | 0.820 | 0.992 | 7-8 | PASS |
| TIU | 0.866 | 0.849 | 1.000 | 6-10 | PASS |

### Run 2 (after removing unassigned events validation from Pass 2)

| Show | Mean ARI | Min ARI | Coverage | Storylines | Pass? |
|------|----------|---------|----------|------------|-------|
| TD | 0.884 | 0.810 | 1.000 | 4 | PASS |
| BB | 0.767 | 0.666 | 1.000 | 4-6 | PASS |
| HOUSE | 0.917 | 0.859 | 1.000 | 9-11 | PASS |
| GOT | 0.940 | 0.893 | 1.000 | 8-9 | PASS |
| TIU | 0.899 | 0.856 | 0.999 | 6-8 | PASS |

### SP (separate run, Russian language)

| Show | Mean ARI | Min ARI | Coverage | Storylines | Pass? |
|------|----------|---------|----------|------------|-------|
| SP | 0.920 | 0.898 | 0.998 | 6-7 | PASS |

### Analysis

**Coverage:** Near-perfect (0.992–1.000) across all shows. The `assign_orphan_events()` postprocessing effectively handles unassigned events.

**Consistency by franchise type:**
- **Procedural (HOUSE):** Highest — distinct storylines per character, clear A/B/C hierarchy. ARI 0.917–1.000.
- **Serial (TD, SP):** High — clear narrative threads. ARI 0.884–0.920.
- **Ensemble (GOT):** High — many characters with distinct goals. ARI 0.904–0.940.
- **Hybrid (TIU):** High — mix of episodic and serial. ARI 0.866–0.899.
- **Serial with intertwined drivers (BB):** Lowest — one character (Walt) drives multiple storylines with ambiguous boundaries. ARI 0.682–0.767.

**BB instability:** Storyline count is stable (4-6), so Pass 1 voting works. The variance is in Pass 2 event assignment: "Walt lies to Skyler" could be empire (hiding the business) or family (protecting the family). This is genuinely ambiguous, not a pipeline bug.

**Comparison to baseline:** autoresearch v1 baseline on SP was ARI 0.595. Current result: 0.920. Improvement from voting in Pass 1, autoresearch prompt optimization (49 experiments), and code audit fixes.

**Actual cost:** ~$0.20–0.50 per run (batch mode, Sonnet with caching). Full benchmark (55 runs): ~$15–20 total.
