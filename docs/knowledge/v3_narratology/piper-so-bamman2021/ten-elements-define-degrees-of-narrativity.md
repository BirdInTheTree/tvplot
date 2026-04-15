# Ten elements define degrees of narrativity

Source: Piper, So, Bamman 2021, "Narrative Theory for Computational Narrative Understanding" (pp. 299-300)

Instead of a binary "is this a narrative or not," the authors propose a minimal definition where narrativity exists in **degrees** — the more elements are explicitly present, the more narrative the text:

```
A  Someone          (teller)
B  tells
C  someone          (recipient)
D  somewhere        (situation/context)
E     someone       (agent)
F     did something (sequential actions)
G     [to someone]  (potential object)
H     somewhere     (spatial location)
I     at some time  (temporal specification)
J     for some reason (rationale)
```

These ten elements map to five research domains:
- **Agents** (E, G) — character detection, attributes, relations
- **Events** (F) — extraction, ordering, structure
- **Temporality** (I) — when things happen, narrative time vs narrated time
- **Setting** (H) — where things happen
- **Perspective** (A, B, C) — who tells, to whom, from what viewpoint

The "degrees of narrativity" hypothesis: recipients' response to narrativity increases as more of these variables are made explicit.

## Comparison with Bal

Bal's three layers (text/story/fabula) map onto these elements but from a different angle. Bal organizes by *analytical level* — where in the abstraction hierarchy you're working. Piper et al. organize by *what kind of information* you're extracting. Their framework is more operational for building an NLP pipeline.

## What this means for tvplotlines

Our pipeline covers some of these elements well and ignores others:
- **Agents** (E, G): ✅ cast identification, plotline heroes
- **Events** (F): ✅ event extraction and function assignment
- **Temporality** (I): ⚠️ episode ordering only, no within-episode temporal analysis
- **Setting** (H): ❌ no spatial analysis at all
- **Perspective** (A, B, C): ❌ no focalization analysis (lost in synopses)
- **Rationale** (J): ❌ no "why" — which connects to Labov's missing Evaluation component

The gaps (setting, perspective, rationale) are partly inherent to working with synopses rather than full scripts. But rationale (J) is the most actionable gap — it maps to "why does this plotline matter."

## Links

- [[three-layer-model-separates-text-story-fabula]]
- [[labov-narrative-structure-maps-to-six-components]]
- [[events-scenes-plotlines-form-a-hierarchy]]
