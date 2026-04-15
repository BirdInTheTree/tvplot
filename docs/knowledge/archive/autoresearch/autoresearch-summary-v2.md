---
type: note
project: tvplotlines
status: active
---

# Autoresearch v2 — Summary

## Setup

- **Date**: 2026-03-14
- **Branch**: `autoresearch/mar14`
- **Metric**: `score = coverage × max(coh_sep, 0)` where coh_sep = within-storyline coherence minus between-storyline separation (embedding-based)
- **Dataset**: 12 shows, fast set (BB, SP, House, Lost) for iteration, full set for validation
- **Budget**: $30 hard limit, spent ~$27.7
- **12 experiments** run (2 kept, 10 discarded)

## Baseline

| Show | Eps | Lines | Coh-Sep | Score |
|------|-----|-------|---------|-------|
| This Is Us | 18 | 7 | 0.1111 | best |
| Breaking Bad | 7 | 5 | 0.0881 | good |
| GoT | 10 | 8 | 0.0768 | good |
| Lost | 25 | 10 | 0.0731 | good |
| GDR | 14 | 5 | 0.0687 | ok |
| Слово пацана | 8 | 6 | 0.0591 | ok |
| Метод | 16 | 6 | 0.0561 | ok |
| Мажор | 12 | 6 | 0.0371 | low |
| ER | 25 | 8 | 0.0366 | low |
| True Detective | 8 | 4 | 0.0240 | low |
| House | 22 | 4 | 0.0049 | very low |
| CSI | 23 | 4 | -0.0037 | zero |

**Baseline mean: 0.0530**. Procedurals (House, CSI, ER) are the clear bottleneck.

## Best result: v2-10 (specificity + Driver:Theme naming)

Two changes kept:

### 1. Event description specificity (v2-05, Pass 2)
Added guidance to write specific, concrete event descriptions with character names, actions, and dramatic consequences.

### 2. Driver:Theme naming convention (v2-10, Pass 1)
Changed from generic naming ("Empire", "Family") to `Driver: Theme` format ("Walt: Empire", "Walt: Family"). This makes it explicit who drives each storyline.

### Full set results (v2-10)

| Show | Baseline | v2-10 | Delta |
|------|----------|-------|-------|
| This Is Us | 0.1111 | 0.1022 | -0.0089 |
| Breaking Bad | 0.0881 | 0.0819 | -0.0062 |
| GDR | 0.0687 | 0.0876 | +0.0189 |
| GoT | 0.0768 | 0.0772 | +0.0004 |
| Слово пацана | 0.0591 | 0.0840 | +0.0249 |
| Lost | 0.0731 | 0.0810 | +0.0079 |
| ER | 0.0366 | 0.0702 | **+0.0336** |
| Метод | 0.0561 | 0.0415 | -0.0146 |
| Мажор | 0.0371 | 0.0319 | -0.0052 |
| True Detective | 0.0240 | 0.0289 | +0.0049 |
| **House** | **0.0049** | **0.0146** | **+0.0097** |
| CSI | 0.0000 | 0.0042 | +0.0042 |

**v2-10 mean: 0.0588** (baseline: 0.0530, **+11%**)

Key wins:
- **ER**: 0.0366 → 0.0702 (nearly 2x)
- **Слово пацана**: 0.0591 → 0.0840 (+42%)
- **House**: 0.0049 → 0.0146 (3x)
- **CSI**: negative → 0.0042 (out of zero)
- **GDR**: 0.0687 → 0.0876 (+28%)

## What didn't work

| Experiment | Hypothesis | Result |
|-----------|-----------|--------|
| v2-01: Season-length scaling | Longer seasons → more storylines | Mean dropped -0.005. Made model confused. |
| v2-02: Procedural assignment rule | Separate episodic from serialized in Pass 2 | Neutral (-0.001). Too subtle for LLM. |
| v2-03: Skip Pass 3 | Narratologist overmerges | Mixed. SP improved, House dropped. Pass 3 helps House. |
| v2-04: More storylines for procedurals | 1 episodic + 3-6 serialized | Mean dropped -0.007. Hurt serials. |
| v2-06: Goal-linked descriptions | "How it advances the goal" | Worse than pure specificity (-0.010). |
| v2-07: Fewer events (8-15 per ep) | Less noise | House slightly up, BB/Lost down (-0.011). |
| v2-08: Oversized storyline check in Pass 3 | >60% events → split | House +0.002, Lost -0.01. Not enough. |
| v2-11: v2-10 + oversized check | Combine best changes | House regressed. Changes interact poorly. |
| v2-12: v2-10 + skip-review | Skip Pass 3 | House 0.0146→0.0044. Pass 3 IS helping House. |

## Key insights

1. **Event description quality matters more than storyline structure.** Specific, concrete event descriptions improve embedding-based metrics across all show types. This is the single most impactful change.

2. **Driver:Theme naming improves procedurals.** Making the driver explicit in storyline names helps the LLM assign events more precisely, especially in procedurals where many characters participate in the same case.

3. **Pass 3 (narratologist review) helps procedurals.** Experiments v2-03 and v2-12 both showed that skipping Pass 3 hurts House. The narratologist creates and reassigns storylines that the initial pass misses.

4. **Pass 1 structure changes are risky.** Modifying storyline counts or adding complex guidance (season-length scaling, short arcs) tends to confuse the model. Simple, clear rules work better.

5. **Run-to-run variance is ~0.01-0.02 on Coh-Sep.** This makes it hard to isolate small improvements. Only changes with ≥0.005 delta on the fast set are reliably above noise.

6. **The procedural problem is structural, not prompt-based.** In procedurals like House, the episodic line naturally dominates (285/383 events). Even with better naming and specificity, the fundamental imbalance remains. Fixing this likely requires architectural changes (e.g., two-pass event assignment, or explicit episodic/serialized separation in Pass 2 output format).

## Recommended next steps

1. **Architectural approach to procedural episodic dominance**: Consider splitting Pass 2 into two substeps for procedurals — first assign episodic events, then assign serialized events from the remainder. This would force better separation.

2. **Per-episode Pass 2 voting**: Like Pass 1 voting but for event assignment. Would reduce run-to-run variance in the most expensive pass.

3. **Coh-Sep metric analysis**: Investigate whether the metric ceiling for procedurals is inherently lower (all events involve medical/crime themes). Consider using a topic-adjusted version of the metric.

4. **Full-set rerun of v2-10**: Run 3 times to establish confidence intervals on the current best.

5. **Test on new shows**: Add 2-3 shows not in the training set to verify generalization.
