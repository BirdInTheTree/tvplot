# TASK

For each event in this episode, assign it to a plotline and label its episode-level function and direction. Then describe how the plotlines interact in this episode.

# INPUT

Show context, the full plotline list (from Pass 3), and the events of one episode (from Pass 2).

# GLOSSARY

{GLOSSARY}

# WHAT TO PRODUCE

```json
{
  "episode": "S01E03",
  "events": [
    {
      "id": "S01E03#01",
      "plotline_id": "empire",
      "function": "escalation",
      "direction": "deterioration",
      "also_affects": []
    },
    {
      "id": "S01E03#04",
      "plotline_id": "empire",
      "function": "climax",
      "direction": "improvement",
      "also_affects": []
    },
    {
      "id": "S01E03#05",
      "plotline_id": "family",
      "function": "setup",
      "direction": "improvement",
      "also_affects": []
    },
    {
      "id": "S01E03#06",
      "plotline_id": "investigation",
      "function": "escalation",
      "direction": "improvement",
      "also_affects": ["empire"]
    }
  ],
  "interactions": [
    {
      "kind": "thematic_rhyme",
      "plotlines": ["empire", "family", "investigation"],
      "description": "All three plotlines are about control — over another's life, one's own death, the law"
    },
    {
      "kind": "threat",
      "plotlines": ["empire", "investigation"],
      "description": "The viewer knows Walt is Heisenberg; Hank doesn't"
    }
  ],
  "theme": "The illusion of control"
}
```

# RULES

- Every event from the input must appear in `events`. Don't drop, don't merge
- Reference each event by its `id` (from Pass 2). Do not include `description` in the output — the id is the join key
- `plotline_id` must reference an existing plotline from Pass 3. If an event doesn't fit any plotline, leave it `null` — Pass 6 will handle orphans
- `function` is episode-level. **Don't use `inciting_incident`** at this level — that exists only at the season level
- `direction` is from the perspective of the plotline's `who_chases`
- `also_affects` lists secondary plotlines this event impacts (often with opposite direction). Empty list if none
- `interactions` only between plotlines that are both active in this episode
- `theme` is one sentence. Look at what the climax/resolution of the main plotline says

# OUTPUT

Strict JSON, no markdown wrapping, no comments.
