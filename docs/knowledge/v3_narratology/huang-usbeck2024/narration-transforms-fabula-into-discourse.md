# Narration is a function that transforms fabula into discourse

Source: Huang & Usbeck 2024, "Narration as Functions: from Events to Narratives" (pp. 2-3)

The paper frames narration as a computational function: given a fabula (selected events + causal relations), narration produces discourse — an intermediate representation that shapes the narrated world. This discourse is then textualized into natural language.

The key insight for news narratives (the paper's domain): news narrators don't just report events. They **re-represent** real-world events through selection (what to include), ordering (in what sequence), and framing (what causal connections to highlight). The narrated world is not the real world — it's a construction.

## Authorial intent

The paper revisits "authorial intent" through Critical Discourse Analysis (CDA): news narrators are "a dominant group" who shape "the narrated world encoded in language consumed by the public." The narrated world reflects power structures, values, and ideology — not objective reality.

This is less relevant for fiction (where the "narrated world" is explicitly constructed), but the framework applies: a TV show's narration selects events, orders them, and frames causal connections to produce a particular narrated world.

## Limitations the authors acknowledge

- Only causal relations considered — ignores temporal shifts, rhetorical strategies, emotional arcs
- Domain limited to news narratives
- "Non-event-related narrative nuances cannot be captured"
- Constituent event identification is domain-specific and requires interpretation

## What this means for tvplotlines

The paper is a position paper, not a system — there's no implementation to borrow. But the framing is useful: our pipeline's job is essentially φ(·) in reverse. We receive text (synopses), and we try to reconstruct fabula (events + causal structure). The paper confirms this is a well-defined task with a theoretical foundation.

The limitation about "only causal relations" is relevant: our pipeline captures more than causality (dramatic functions, thematic connections, interactions between plotlines). This is a strength.

## Links

- [[fabula-as-events-plus-causal-matrix]]
- [[constituent-vs-supplementary-events]]
- [[three-layer-model-separates-text-story-fabula]]
- [[fabula-is-memory-trace-not-authors-plan]]
