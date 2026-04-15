# No single approach universally fits narrative structure

Source: Piper, So, Bamman 2021, "Narrative Theory for Computational Narrative Understanding" (p. 302)

A crucial warning from the paper: "it is important to emphasize here that no single approach is universally appropriate to understanding narrative structure."

Fields as diverse as folkloristics and narrative psychology provide competing models. The best-known classification systems for fictional narratives are:
- **Thompson's Motif-Index of Folk-Literature** (1989)
- **Aarne-Thompson-Uther (ATU) Tale Index**
- **Adler et al. (2016)** — narrative psychology taxonomy correlated with life satisfaction

These classification systems have seen only limited computational implementation (Broadwell et al. 2018). The cross-disciplinary computational implementation of large-scale story type classifiers "represents a major research challenge."

## Two levels of temporal analysis

The paper distinguishes two temporal levels:
1. **"Time of telling"** (narrative time) — the order in which events are presented
2. **"Time of what is told"** (narrated time) — the chronological order in the fabula

This maps directly to Bal's story-time vs fabula-time distinction. Underwood (2018) provides an empirical approach to this with the concept of "passage of time" in novels.

## What this means for tvplotlines

This is a useful sanity check against over-committing to any single narratological framework. We shouldn't replace Freytag with Bremond and then treat Bremond as gospel. The right approach is probably **layered**: keep multiple lenses (Freytag for positional structure, Bremond for process direction, Labov for reportability) and let them complement each other rather than picking one.

For our v3 prompts, this suggests: don't replace the seven functions, **add dimensions** alongside them. An event can simultaneously be an "escalation" (Freytag), a "realization of deterioration" (Bremond), and the "most reportable event" (Labov). Each lens captures something different.

## Links

- [[narrative-cycle-has-three-phases-not-seven]]
- [[most-reportable-event-is-the-point-of-the-story]]
- [[sequential-ordering-separates-fabula-time-from-story-time]]
- [[ten-elements-define-degrees-of-narrativity]]
