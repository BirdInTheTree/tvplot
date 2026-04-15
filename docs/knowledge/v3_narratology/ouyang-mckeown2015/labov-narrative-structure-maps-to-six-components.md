# Labov's narrative structure maps to six components

Source: Ouyang & McKeown 2015, "Modeling Reportable Events as Turning Points in Narrative" (p. 2), drawing on Labov 1967/1997/2013

Labov's model of oral narrative has six components, which the paper uses as the backbone of their change-based analysis:

| Component | Function | Maps to tvplotlines |
|---|---|---|
| **Abstract** | Brief intro, sometimes refers to the MRE | ~ story_engine / logline |
| **Orientation** | Background information, starting state | ~ setup |
| **Complicating Action** | Chain of events leading up to MRE | ~ escalation, turning_point |
| **Evaluation** | Author's/narrator's perspective on events — why this matters | *no equivalent* |
| **Resolution** | Ending state, what finally happened | ~ resolution |
| **Coda** | Wrapping up, returning to the present | *no equivalent* |

## The missing piece: Evaluation

The most interesting component for us is **Evaluation** — the narrator's commentary on *why* events matter. Labov (2013) has three subcomponents:
- **Orientation** (background)
- **Complicating action** (events leading to MRE)
- **Evaluation** (the narrator's perspective)

Plus the **Abstract** and **Coda** which frame the narrative.

Our pipeline has no equivalent of Evaluation. We extract *what happens* (events) and *what function it serves* (setup/climax/etc.), but we don't capture *why it matters* — the narrator's or showrunner's emphasis on significance.

In TV analysis, Evaluation manifests as: voice-over commentary, lingering camera shots, musical scoring, characters' emotional reactions. These are text-level signals that we lose in synopses. But even synopses sometimes contain evaluative language ("in a shocking twist," "devastated by the news") that we currently ignore.

## What this means for tvplotlines

Labov's six components are an alternative to Freytag's seven functions. The mapping isn't 1:1 — Labov adds Evaluation and Abstract, loses crisis/inciting_incident as separate categories. The key insight is that Evaluation is structurally distinct from the events themselves: it's not *what happens* but *how the telling emphasizes what matters*.

## Links

- [[most-reportable-event-is-the-point-of-the-story]]
- [[change-in-metrics-predicts-turning-points-not-absolute-values]]
- [[three-layer-model-separates-text-story-fabula]]
