# Fabula can be formalized as events plus a causal relation matrix

Source: Huang & Usbeck 2024, "Narration as Functions: from Events to Narratives" (p. 4)

The paper proposes a minimal formal representation of fabula:

```
F = {E, H}
```

Where:
- **E** = [e₁, e₂, ..., eₙ] — a list of temporally ordered events
- **H** = n×n causal relation matrix, where rᵢⱼ ∈ {1, -1, 0}
  - rᵢⱼ = 1: event eᵢ causes eⱼ
  - rᵢⱼ = -1: eⱼ causes eᵢ
  - rᵢⱼ = 0: no causal relation

The "core story" I_c = {E_c, H_c} is obtained by filtering to constituent events only, producing a denser (less sparse) causal matrix.

## The sparsity problem

All existing document-level event causal extraction datasets have S(H) > 0.95 — meaning over 95% of event pairs have no causal relation. Most events are supplementary. The core story, after filtering, has a much denser matrix.

## Three-stage pipeline

The paper maps information flow from real world to narrative text:

1. **f(·)**: real-world events → fabula (selection and temporal ordering)
2. **g(·)**: fabula → discourse (narrative composition — causal logic, emphasis)
3. **z(·)**: discourse → text (natural language generation)

This corresponds to Bal's three layers (fabula → story → text) but adds an explicit computational framing.

## What this means for tvplotlines

Our pipeline implicitly builds something like F = {E, H}: pass2 extracts events (E) and assigns them to plotlines (which implies causal chains within each plotline). But we don't explicitly build the causal relation matrix H. Doing so would let us:
1. Identify constituent events (those with many causal links)
2. Detect orphaned events (those with no causal links — likely supplementary)
3. Validate plotline boundaries (events in the same plotline should be causally linked)

The formalization also highlights what our pipeline *doesn't* do: we capture which plotline an event serves but not *which other events it causally depends on or causes*.

## Links

- [[constituent-vs-supplementary-events]]
- [[narration-transforms-fabula-into-discourse]]
- [[three-layer-model-separates-text-story-fabula]]
