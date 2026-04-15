---
type: note
project: tvplotlines
status: active
---

# Experiment: Naive Prompt vs tvplotlines Pipeline

## Goal

Show that LLM results are non-deterministic, and that tvplotlines's constraints solve this.
Two claims in one experiment:

1. **Inter-run divergence:** naive prompt produces different plotline structures on repeated runs
2. **Divergence from ground truth:** naive results disagree with expert annotation; tvplotlines's don't

## Design

**Input:** Breaking Bad Season 1 synopses (from benchmark).
Breaking Bad chosen because it has the lowest tvplotlines ARI (0.767) — genuine ambiguity in the data. Naive prompt should show even larger spread.

**Naive prompt:**

> "Here are synopses of a TV season. Extract the main plotlines. For each plotline, list which characters are involved and which episodes it spans."

No output format, no definitions (what is a plotline? what is span?), no franchise type, no Story DNA structure.

**Runs:**

| Condition | Runs | Model | Temperature |
|-----------|------|-------|-------------|
| Naive prompt | 5 | same as tvplotlines (Haiku) | default |
| tvplotlines pipeline | 5 | Haiku | default |

**Metrics:**

- **ARI** (Adjusted Rand Index) across runs — measures inter-run consistency
- **ARI vs ground truth** — measures accuracy against expert annotation
- **Coverage** — fraction of events assigned to a plotline

## Status

- [ ] Write naive prompt runner script
- [ ] Run 5x naive
- [ ] Run 5x tvplotlines
- [ ] Compute ARI (inter-run + vs ground truth)
- [ ] Write up results for preprint (Section 1 or Section 3)

## Notes

- Keep naive prompt intentionally simple — this is what a user would type into ChatGPT
- Use the same model and temperature for fair comparison
- Results go into the intro as motivation: "here's the problem we solve"
