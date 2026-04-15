# Events, scenes, and plotlines form a hierarchy

Source: Piper, So, Bamman 2021, "Narrative Theory for Computational Narrative Understanding" (pp. 301-302)

The paper proposes a hierarchical scheme for narrative structure at the document level:

```
events → scenes → plotlines
```

- **Events** — the atomic units of narrative action (change of state)
- **Scenes** — contiguous sequences of events grouped by time/place/characters (passage-level segments)
- **Plotlines** — higher-level arcs that span multiple scenes across a narrative

This hierarchy maps onto passage-level and document-level NLP challenges:

**Passage-level:**
- **Narrative detection** — is this passage narrative at all (vs. descriptive, argumentative)?
- **Scene detection** — where are the boundaries between story segments?

**Document-level:**
- **Plotline detection** — identifying the through-lines that connect events across scenes
- The authors propose the shorthand: **event-scene-plotline**

## Relation to existing frameworks

Ouyang and McKeown (2014) — cited here — "leverage the categorization of narrative structure by Labov and Waletzky (1967), focusing specifically on the 'most reportable event (MRE)' as an indicator of a narrative's more general meaning."

The paper also cites Boyd et al. (2020) on "the narrative arc" — revealing core narrative structures through text analysis — as showing that "sentiment valence" approximates narrative structure but much more work needs to be done on formal and cognitive conditions of narrative pivots.

## What this means for tvplotlines

Our pipeline implicitly uses this hierarchy: pass2 extracts events, pass1 defines plotlines, but we skip the **scene** level entirely. We go directly from sentences → events → plotlines. There's no intermediate grouping of events into scenes.

For TV, "scene" is actually a natural unit — episodes are composed of scenes. If synopses described scenes (rather than just events), we'd have a richer intermediate representation. Our synopsis_writer prompt could be modified to produce scene-level descriptions.

The hierarchy also clarifies our pipeline's architecture: pass2 does event extraction + plotline assignment simultaneously, but these are conceptually two different tasks at two different levels.

## Links

- [[ten-elements-define-degrees-of-narrativity]]
- [[constituent-vs-supplementary-events]]
- [[most-reportable-event-is-the-point-of-the-story]]
- [[narrative-cycle-has-three-phases-not-seven]]
