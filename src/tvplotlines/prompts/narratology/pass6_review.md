# TASK

Review the full season. Find structural problems. Issue verdicts to fix them. Rank the plotlines.

# INPUT

Show context, the full plotline list (with actant structure and MRE), all events with episode/season function and direction, all interactions.

# GLOSSARY

{GLOSSARY}

# WHAT TO PRODUCE

```json
{
  "verdicts": [
    {
      "kind": "MERGE",
      "targets": ["family", "marriage"],
      "rationale": "Both plotlines have Skyler chasing the same goal — getting Walt to be honest. Same chase, same character"
    },
    {
      "kind": "DROP",
      "targets": ["jesse-side"],
      "rationale": "Only 2 events across the whole season; no real chase, no inciting incident. Redistribute its events to 'empire'"
    },
    {
      "kind": "REASSIGN",
      "event_episode": "S01E04",
      "event_description": "Walt lies to Skyler about where he was",
      "to_plotline": "family",
      "rationale": "Was assigned to 'empire' but it advances the Family plotline — Walt building a wall of lies"
    },
    {
      "kind": "REFUNCTION",
      "event_episode": "S01E07",
      "event_description": "Walt and Tuco's first deal",
      "new_function": "turning_point",
      "rationale": "Was labeled `escalation` but it changes the trajectory — Walt enters the criminal world for real"
    }
  ],
  "ranks": [
    {"plotline_id": "empire", "rank": "A"},
    {"plotline_id": "investigation", "rank": "B"},
    {"plotline_id": "family", "rank": "B"},
    {"plotline_id": "jesse-arc", "rank": "C"}
  ]
}
```

# RULES

**Verdicts** — issue them when you find problems:

- `MERGE` two plotlines when they have the same chase by the same character. `targets` lists the plotline IDs to combine
- `DROP` a plotline that doesn't hold up — too few events, no inciting incident, no real chase. `targets` lists the one plotline to drop
- `CREATE` a new plotline when you find a group of orphaned events (`plotline_id: null`) that together form one. Provide a tentative `id` and `name`, list the event references
- `REASSIGN` a single event when it was put in the wrong plotline. Provide `event_episode`, `event_description`, and the correct `to_plotline`
- `REFUNCTION` an event when its function label is wrong. Provide `event_episode`, `event_description`, and the `new_function`

**Ranks** — assign every plotline an `A`, `B`, or `C`:

- `A` — the plotline whose MRE is the most reportable event of the season. The one you'd lead with when telling someone what the season is about
- `B` — important plotlines that share screen time with A but don't define the season
- `C` — runners and minor plotlines that add texture but aren't structural

If two plotlines compete for A, ask: which MRE would you lead with? That's A.

# OUTPUT

Strict JSON, no markdown wrapping, no comments. Empty `verdicts` list is fine if nothing needs fixing.
