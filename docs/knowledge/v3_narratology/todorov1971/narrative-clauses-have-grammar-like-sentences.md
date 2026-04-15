# Narrative clauses have a grammar like sentences

Source: Todorov 1969, "Structural Analysis of Narrative", Novel 3, pp. 70-76 (via Clarke lecture notes)

Todorov proposes a deep analogy between sentence grammar and narrative structure. The minimal element of plot is a **clause** — equivalent to a sentence in language. His "schematic formulation" gives eight properties of narrative clauses:

a) **Minimal plot element = clause** — the atomic unit of narrative
b) **Each clause = agent + predicate** — the predicate is either a verb (action that modifies the situation) or an adjective/epithet (describes the current state)
c) **Each action has positive or negative status** — success or failure, gain or loss
d) **Each clause has modality** — indicative (actually happened) vs imperative/potential (desired, feared, possible). This distinguishes realized events from unrealized possibilities
e) **Each clause has perspective** — whose point of view
f) **Three types of relations between clauses**: temporal (succession), causal (entailment/presupposition), spatial (parallelism)
g) **Clauses form sequences** — sometimes the entire narrative, sometimes part of it
h) **Genre is distinguished by the prevailing modality** of its clauses

## Two types of Decameron stories

From the analysis of Boccaccio, Todorov identifies two basic plot types:
- Stories of **punishment avoided** — a threat is escaped
- Stories of **conversion** — a state is fundamentally changed

Both are patterns of transformation, but with different structures: avoidance preserves the initial equilibrium (threat → return to safety), while conversion creates a genuinely new state (old state → new state).

## What this means for tvplotlines

The most actionable insight is **modality** (point d). Our events are all in the indicative — things that happened. But narratives are full of unrealized possibilities: threats that didn't materialize, plans that failed, fears that didn't come true. These "potential" events shape the narrative even though they didn't happen.

In TV: "Walt considers letting Krazy-8 go" (imperative/potential) is narratively significant even though it doesn't happen. Our pipeline currently only captures what *did* happen, not what was *considered* or *feared*. Adding modality — actual vs potential — could capture this dimension.

The **three types of relations** (temporal, causal, spatial) also formalize what our pipeline does implicitly: we track temporal order (episode sequence), causal order (plotline assignment implies causality), but not spatial relations (parallelism between plotlines). Our "interactions" (thematic_rhyme, convergence) are an informal version of spatial/paradigmatic relations.

## Links

- [[two-principles-succession-and-transformation]]
- [[five-part-sequence-is-richer-than-three-act-structure]]
- [[three-criteria-filter-functional-events]]
- [[narrative-cycle-has-three-phases-not-seven]]
