# Constituent events form the causal backbone, supplementary events add texture

Source: Huang & Usbeck 2024, "Narration as Functions: from Events to Narratives" (pp. 3-4), drawing on Abbott 2020, Barthes & Duisit 1975, Chatman 1978

The paper adopts a fundamental distinction between two types of events:

**Constituent events** (also called nuclei by Barthes/Duisit 1975, or kernels by Chatman 1978) — the events without which the story would fundamentally change or would not make sense. They form the causal backbone of the narrative. Remove one, and the story is "significantly altered or loses coherence."

**Supplementary events** (also called catalyzers by Barthes, or satellites by Chatman) — events that add depth, richness, and complexity but aren't necessary for the story to be complete. Remove one, and "the story might be less detailed or interesting, but it would still be recognizable as the same story."

## The test

Abbott (2020) provides the test: if you remove this event, does the story significantly change? If yes — constituent. If no — supplementary.

This is closely related to Bal's "choice" criterion for functional events: a functional event is one that opens a fork, and if it hadn't happened, the rest would change. Constituent events ≈ functional events (Bal) ≈ kernels (Chatman).

## Why the distinction matters computationally

The authors show that in existing event extraction datasets (BECauSE 2.0, CaTeRS, RED, Causal-TB, EventStoryLine, MAVEN-ERE), the causal relation matrix is extremely sparse — S(H) > 0.95 in all datasets. Most extracted events don't causally relate to other events. This means most extracted events are supplementary: they describe things that happen but don't drive the plot forward.

Filtering out supplementary events produces a much denser causal matrix — the "core story" — which captures the actual causal logic of the narrative.

## What this means for tvplotlines

Our pass2 currently extracts events from every sentence of the synopsis. By the constituent/supplementary distinction, many of these are supplementary — they add texture but don't form the causal backbone. This creates noise in the event list and makes function assignment harder.

Adding a constituent/supplementary label to each event (or filtering supplementary events before function assignment) could sharpen the pipeline. The test is simple enough for an LLM: "If this event were removed, would the plotline's outcome change?"

## Links

- [[three-criteria-filter-functional-events]] (Bal's functional event = constituent event)
- [[fabula-as-events-plus-causal-matrix]]
- [[narration-transforms-fabula-into-discourse]]
