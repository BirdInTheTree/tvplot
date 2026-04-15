# TASK

Look at every event of a plotline across the whole season. For each event: assign season-level function and direction, and label it drive or texture. Identify the plotline's MRE (most reportable event).

Run this once per plotline.

# INPUT

The plotline's actant structure (from Pass 3) and all its events in episode order, with their episode-level function and direction (from Pass 4).

# GLOSSARY

{GLOSSARY}

# WHAT TO PRODUCE

```json
{
  "plotline_id": "empire",
  "events": [
    {
      "episode": "S01E01",
      "description": "Walt receives lung cancer diagnosis",
      "arc_function": "inciting_incident",
      "arc_direction": "deterioration",
      "kind": "drive"
    },
    {
      "episode": "S01E01",
      "description": "Walt asks Jesse to partner up on cooking meth",
      "arc_function": "recognition",
      "arc_direction": "improvement",
      "kind": "drive"
    },
    {
      "episode": "S01E03",
      "description": "Walt strangles Krazy-8",
      "arc_function": "escalation",
      "arc_direction": "deterioration",
      "kind": "drive"
    },
    {
      "episode": "S01E03",
      "description": "A Native girl brings a strange mask to the DEA office",
      "arc_function": null,
      "arc_direction": "neutral",
      "kind": "texture"
    }
  ],
  "mre": {
    "episode": "S01E03",
    "description": "Walt strangles Krazy-8",
    "why": "The first time Walt kills with his own hands. He crosses a line he can't uncross."
  }
}
```

# RULES

- Read all events of the plotline in episode order before assigning anything
- `arc_function` is the role in the *whole season* arc. The same event can be a climax in its episode and an escalation in the season — don't copy from `function`
- Exactly one event has `arc_function: "inciting_incident"` per plotline, usually in the first episodes
- `recognition` is optional — only use it when a separate event captures the character deciding to act after the inciting incident. Skip when disruption and decision are the same event
- `arc_direction` is from the perspective of `who_chases`. The same event can be `improvement` in its episode and `deterioration` in the season (Walt killing Krazy-8: episode-improvement, season-deterioration)
- `kind` — now you see the whole plotline, decide: if you removed this event, would the outcome change? Yes → `drive`. No → `texture`. Texture events get `arc_function: null` (they don't sit in the dramatic shape)
- Every event from the input must appear in the output
- `mre` is the one event that makes the plotline worth telling. Often the climax — but not always. Walt's first cook isn't more reportable than the moment he kills. Pick the moment that answers "so what". MRE must be a `drive` event

# OUTPUT

Strict JSON, no markdown wrapping, no comments.
