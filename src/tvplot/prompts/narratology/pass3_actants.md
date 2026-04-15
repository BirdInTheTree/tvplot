# TASK

You see the events from every episode of a season, plus the full cast. Group the events into plotlines and describe each plotline's actant structure.

# INPUT

Show context, full cast list, and all events from all episodes of the season.

# GLOSSARY

{GLOSSARY}

# WHAT TO PRODUCE

```json
{
  "plotlines": [
    {
      "id": "empire",
      "name": "Walt: Empire",
      "who_chases": "walt",
      "what_they_chase": "build a meth operation that secures his family",
      "stands_in_the_way": ["krazy-8", "tuco"],
      "helpers": ["jesse"],
      "bigger_force": "Walt's pride and need to provide",
      "who_wins_if_it_works": "walt",
      "type": "serialized",
      "nature": "character-led",
      "confidence": "solid"
    },
    {
      "id": "investigation",
      "name": "Hank: Investigation",
      "who_chases": "hank",
      "what_they_chase": "find Heisenberg",
      "stands_in_the_way": [],
      "helpers": ["gomez"],
      "bigger_force": "the justice system",
      "who_wins_if_it_works": "hank",
      "type": "serialized",
      "nature": "plot-led",
      "confidence": "partial"
    }
  ]
}
```

# FIELDS

- **id** — short stable identifier, lowercase
- **name** — "Character: Theme" format ("Walt: Empire", "Hank: Investigation")
- **who_chases** — character ID of the person driving this plotline
- **what_they_chase** — the goal, in plain words. Can be a thing, a state, knowledge, or prevention
- **stands_in_the_way** — character IDs of people who block them. Empty list if no specific person
- **helpers** — character IDs of people who help. Empty list if none
- **bigger_force** — the abstract force enabling or blocking the whole chase (institution, fate, character flaw). Can be null
- **who_wins_if_it_works** — usually the same as `who_chases`. Can be different
- **type**, **nature**, **confidence** — see glossary

# RULES

- **Choosing `who_chases`**: every plotline needs one character who drives it. Use these tests in order:
  1. Who makes the key decisions in this plotline?
  2. Whose point of view dominates the scenes of this plotline?
  3. Who has the most at stake if the goal fails or succeeds?

  The first two matter more than the third — agency over emotional stakes. If multiple characters share decisions equally (true ensemble plotline like a heist crew), pick the one whose POV the show favors most. If no character clearly drives the plotline (theme-led shows where the system is the real subject — *The Wire*, *Slow Horses*), pick the character most affected by the system. Note this in the plotline name: "MI5 vs Slough House: Lamb" rather than just "Lamb".

- **Anti-subject test**: a character with their own goal and own actions gets their own plotline, not a `stands_in_the_way` slot. Test: if you removed `who_chases` from the show, would this person still be doing things? If yes, separate plotline. Cersei in GoT → separate plotline. The patient in House → goes in `stands_in_the_way` (actually the object — but if there's no clear opponent, leave the list empty)
- Every event should belong to one plotline. Don't worry about assigning events here — that's the next pass. Just make sure you have plotlines that cover them all
- If a character appears in many events but has no clear chase, they may not need their own plotline. Major characters without their own plotline are fine
- 2–5 plotlines per season is typical. More than 7 means you're probably splitting too finely

# OUTPUT

Strict JSON, no markdown wrapping, no comments.
