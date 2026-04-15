# Layered JSON schema

The pipeline output is one JSON file per show+season. It contains a **base** that any narrative system shares, and one or more **layers** that add system-specific analysis on top.

A single file can hold multiple layers — the same show analyzed through Hollywood screenwriting, structuralist narratology (Bal/Greimas/Bremond), Japanese kishōtenketsu, and so on. The HTML viewer picks a layer; the base is always visible.

## Top-level

```json
{
  "show": "Breaking Bad",
  "season": 1,
  "base": { ... },
  "layers": [ { ... }, { ... } ]
}
```

## base

Universal information, layer-agnostic. Every narrative system needs these.

```json
{
  "context": {
    "format": "serial",
    "is_anthology": false,
    "genre": "crime drama"
  },
  "cast": [
    {"id": "walt", "name": "Walter White", "kind": "main"},
    {"id": "guest:native-family", "name": "Native American family", "kind": "guest"}
  ],
  "episodes": [
    {
      "id": "S01E01",
      "synopsis": "..."
    }
  ],
  "events": [
    {
      "id": "S01E01#01",
      "episode": "S01E01",
      "description": "Walt collapses at the car wash",
      "characters": ["walt"]
    }
  ],
  "plotlines": [
    {
      "id": "empire",
      "name": "Walt: Empire"
    }
  ],
  "assignments": {
    "S01E01#01": {"plotline_id": "cancer", "also_affects": []}
  }
}
```

### Fields

- **`context`** — format (procedural/serial/hybrid/ensemble), is_anthology, genre. Nothing system-specific.
- **`cast`** — every character with a stable id. `kind` is `main` or `guest`.
- **`episodes`** — each episode's id + synopsis text.
- **`events`** — every event has a stable id (`{episode}#{index}`), an episode reference, a description, and the characters involved. **No functions, no directions, no drive/texture — those are in layers.**
- **`plotlines`** — generic groupings with id and name. **No hero, no actants, no rank — those are in layers.** Each plotline just exists as a container.
- **`assignments`** — map from event id to its plotline plus any secondary plotlines it also affects. This is the only base-level structure because it's a factual claim (event X belongs to plotline Y), not an interpretation.

## layers

Each layer is a system-specific analysis. Layers reference base ids (events, plotlines, episodes, cast) but add their own tags.

```json
{
  "name": "greimas-bal",
  "version": "1.0",
  "description": "Structuralist narratology: actant model, Bremond cycles, Bal focalization",
  "context": { ... },
  "plotlines": { "empire": { ... } },
  "events": { "S01E01#01": { ... } },
  "episodes": { "S01E01": { ... } },
  "verdicts": [ ... ]
}
```

### Required fields

- **`name`** — stable identifier of the layer (`hollywood`, `greimas-bal`, `kishotenketsu`, `chinese-qicheng`, `propp`, etc.)
- **`version`** — schema version of the layer

### Optional fields

Every layer defines its own schema for these. What's below is shape, not content.

- **`context`** — extra show-level info this layer adds (e.g., `breach`, `story_schema`, `protagonists`)
- **`plotlines`** — map from plotline id to layer-specific info (e.g., `actants`, `hero/goal/obstacle/stakes`, `rank`, `type`, `nature`, `mre`)
- **`events`** — map from event id to layer-specific tags (e.g., `function`, `direction`, `kind`, `arc_function`, `arc_direction`)
- **`episodes`** — map from episode id to layer-specific info (e.g., `theme`, `act` for kishotenketsu)
- **`verdicts`** — structural corrections issued by the layer's review pass

## Layer specifications

### `greimas-bal` (our main layer)

Version 1.0.

**context**:
```json
{
  "breach": "Teachers don't cook meth.",
  "story_schema": "...",
  "protagonists": ["Walter White"]
}
```

**plotlines**: map from id → {actants, type, nature, confidence, rank, mre}

Pass 3 emits actants with plain-English keys; `prompts/narratology/glossary.md` maps each one to its Greimas term (who_chases↔subject, what_they_chase↔object, stands_in_the_way↔opponents, helpers↔helpers, bigger_force↔power, who_wins_if_it_works↔receiver).

```json
{
  "empire": {
    "actants": {
      "who_chases": "walt",
      "what_they_chase": "cook and sell meth",
      "stands_in_the_way": ["krazy-8", "emilio", "tuco"],
      "helpers": ["jesse"],
      "bigger_force": "Walt's pride and cancer deadline",
      "who_wins_if_it_works": "walt"
    },
    "type": "serialized",
    "nature": "character-led",
    "confidence": "solid",
    "rank": "A",
    "mre": {
      "event_id": "S01E03#04",
      "why": "The first time Walt kills with his own hands..."
    }
  }
}
```

**events**: map from event id → {function, direction, arc_function, arc_direction, kind}

```json
{
  "S01E03#04": {
    "function": "climax",
    "direction": "improvement",
    "arc_function": "turning_point",
    "arc_direction": "deterioration",
    "kind": "drive"
  }
}
```

Enums: see `src/tvplot/prompts/narratology/glossary.md` for `function` (8 values), `direction` (3), `kind` (2).

**episodes**: map from episode id → {theme}

### `hollywood` (for backward compatibility with tvplot)

Version 1.0.

**context**:
```json
{"story_engine": "..."}
```

**plotlines**: map from id → {hero, goal, obstacle, stakes, type, nature, confidence, rank}

**events**: map from event id → {function, arc_function, interactions}

Enum: `function` has 7 values (no `recognition`). `interactions` include `dramatic_irony` etc.

### `kishotenketsu` (future)

Version 1.0.

**events**: map from event id → {act: "ki" | "sho" | "ten" | "ketsu"}

No plotlines-specific fields — kishōtenketsu does not analyze plotlines as separate programs. Four-act flow across the whole narrative.

## Compatibility rules

- **Base is authoritative**: all layers reference base ids. If an event id doesn't exist in base, any reference to it is invalid.
- **Layers are independent**: removing a layer does not invalidate other layers. Base plus any subset of layers is always a valid file.
- **Graceful degradation**: the viewer shows whatever layer is selected. If a layer lacks a field the viewer expects, the viewer shows a placeholder.
- **Multiple layers per file**: a single file can contain many layers. Useful for comparative study.

## Converting old tvplot output

Old `tvplot` JSON has a flat structure with Hollywood-only fields. Converter:

1. Extract `context`, `cast`, `episodes`, events (flatten per-episode `events` lists), plotlines, and assignments → `base`.
2. Extract Hollywood fields (hero/goal/obstacle/stakes, function, interactions, rank, etc.) → `layers[hollywood]`.

Converter preserves all data. No lossy transformations.
