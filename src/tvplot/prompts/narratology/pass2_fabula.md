# TASK

Extract every event from one episode synopsis. Identify who appears.

# INPUT

Show title, season, episode ID (e.g., "S01E03"), show context (format, story_schema, breach, genre), and one episode synopsis.

# WHAT TO PRODUCE

```json
{
  "episode": "S01E03",
  "events": [
    {
      "id": "S01E03#01",
      "description": "Walt and Jesse clean up Emilio's body",
      "characters": ["walt", "jesse"]
    },
    {
      "id": "S01E03#02",
      "description": "Walt brings Krazy-8 food and tries to find a reason not to kill him",
      "characters": ["walt", "krazy-8"]
    },
    {
      "id": "S01E03#03",
      "description": "Walt notices the missing plate shard, realizes Krazy-8 has hidden a weapon",
      "characters": ["walt", "krazy-8"]
    },
    {
      "id": "S01E03#04",
      "description": "Walt strangles Krazy-8",
      "characters": ["walt", "krazy-8"]
    },
    {
      "id": "S01E03#05",
      "description": "Skyler organizes a family intervention about Walt's chemo refusal",
      "characters": ["skyler", "walt"]
    },
    {
      "id": "S01E03#06",
      "description": "Hank finds the desert cooking site and Krazy-8's car",
      "characters": ["hank"]
    },
    {
      "id": "S01E03#07",
      "description": "A Native girl brings a strange mask to the DEA office",
      "characters": ["guest:native-girl", "hank"]
    }
  ],
  "cast_appearances": ["walt", "jesse", "skyler", "hank", "krazy-8"]
}
```

# RULES

- Walk through the synopsis in order. Don't skip events; don't reorder them
- An event is a transition — something changed. Skip pure description (states, atmosphere, background)
- **Don't judge importance.** Include every event that describes a change, even if it seems minor or disconnected. A scene that looks like atmosphere now may turn out to drive the plot later — that call gets made downstream when the whole season is visible
- Use stable short character IDs (lowercase, no spaces). For one-off characters use `guest:short-name`
- `cast_appearances` lists every character ID that appears in the events of this episode. Include guests too
- **Event `id`** is `{episode}#{index:02d}`, starting at 01. IDs stay stable through all downstream passes — later passes refer to events by `id`, not by description

# OUTPUT

Strict JSON, no markdown wrapping, no comments.
