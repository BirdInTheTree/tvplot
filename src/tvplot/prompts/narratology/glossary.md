## event

A transition from one state to another. The change of state is what matters, not the action itself. "John falls ill" is an event; "John is ill" is not.

Label every event with its kind:

- **drive** — moves the plot. If removed, the plotline's outcome would change. Walt strangles Krazy-8.
- **texture** — atmosphere, character beat, comic relief. If removed, the plot still works. The Native girl brings a mask to the DEA office.

## plotline

Someone wants something and chases it. The chain of events that come from the chase is the plotline.

For each plotline, identify six slots. These are Greimas's actant model restated in plain English — use the plain names in prompt output; the canonical Greimas term is given for reference.

| slot in output         | Greimas term | what it is                                                                                                                                                 |
| ---------------------- | ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **who_chases**         | subject      | the character driving the plotline                                                                                                                         |
| **what_they_chase**    | object       | what they want — a thing (a person, money), a state (independence, safety), or knowledge (who killed her)                                                  |
| **stands_in_the_way**  | opponents    | usually people who block them; empty list if no specific person                                                                                            |
| **helpers**            | helpers      | anyone who supports the chase                                                                                                                              |
| **bigger_force**       | power        | the abstract force enabling or blocking the whole chase (institution, deadline, character flaw, fate). Can be null                                         |
| **who_wins_if_it_works** | receiver   | usually the same character as `who_chases`, but not always — e.g. the subject dies in their own plotline but a descendant receives the object              |

**A separate plotline rule**: if a character has their own thing they're chasing — not just blocking the main character but going after their own goal — they get their own plotline. Test: if you removed the main character from the show, would this person still be doing things? If yes, separate plotline.

Classifications:
- `type`: `case_of_the_week` | `serialized` | `runner`
- `nature`: `plot-led` | `character-led` | `theme-led`
- `confidence`: `solid` | `partial` | `inferred`

## function

A plotline has a recognizable shape: it starts somewhere, builds, peaks, and ends. Each event sits in one of those moments. The function tags which moment.

For every event in a plotline, label its function:

| function            | what it does in the plotline                                                                                                                                                                                                                                                                                                     |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `setup`             | Establishes the starting situation. The world before the story kicks in                                                                                                                                                                                                                                                          |
| `inciting_incident` | The thing that breaks the starting situation. **Once per plotline across the whole season** — typically in the first episode                                                                                                                                                                                                     |
| `recognition`       | The character realizes what happened and decides to act. Only use when this is a separate moment from the inciting incident — e.g., Walt's cancer diagnosis is the inciting incident; deciding to cook meth is the recognition. Most plotlines don't need this — skip it when the disruption and the decision are the same event |
| `escalation`        | Stakes rise. Can happen many times                                                                                                                                                                                                                                                                                               |
| `turning_point`     | The direction of the plotline shifts — what looked like a win turns out to be a loss, or vice versa                                                                                                                                                                                                                              |
| `crisis`            | The worst moment. The character faces what they were most afraid of                                                                                                                                                                                                                                                              |
| `climax`            | The outcome locks in. After this, things can't be undone                                                                                                                                                                                                                                                                         |
| `resolution`        | The aftermath. A new normal — different from the starting situation                                                                                                                                                                                                                                                              |

Each event gets two function labels:

- **episode function** — where the event sits in the arc *of this episode*
- **season function** — where the event sits in the arc *of the whole season*

The two often differ. An event that's the climax of episode 3 might just be an escalation in the season-long story — the plotline is still building.

**Exception**: `inciting_incident` only exists at the season level. A plotline has exactly one inciting incident across the whole season — usually in the early episodes. At the episode level, use `setup` or `escalation` instead.

## direction

Function tells you where an event sits in the plotline's shape. Direction tells you which way it pushes the character — toward what they want, or away from it.

For every event, label its direction from the perspective of the character chasing the goal:

- **improvement** — moves the character closer to what they want, or weakens what blocks them
- **deterioration** — moves them further from what they want, costs them something, hits them with a setback
- **neutral** — gives information without clearly helping or hurting

Direction is independent of function. A `setup` can be a `deterioration` (Walt's cancer diagnosis sets up the show, but it's a hit). An `escalation` can be an `improvement` (Walt's first successful cook raises the stakes, and it works in his favor for the Empire plotline).

The same event can push one plotline up and another down. Walt's first cook is `improvement` for the Empire plotline (he's becoming Heisenberg) and `deterioration` for the Family plotline (he's drifting from Skyler). When this happens, list the secondary plotlines in `also_affects`.

Like function, direction has two levels:

- **episode direction** — which way the event pushes within this episode
- **season direction** — which way the event pushes across the whole season

The two can differ. Walt killing Krazy-8 looks like an `improvement` in the episode (he survived) and a `deterioration` in the season (he crossed a moral line he can't uncross).

## interaction

`thematic_rhyme` — same theme, different angles
`convergence` — characters or conflicts physically intersect
`threat` — viewer knows, character doesn't (= dramatic irony)
`riddle` — neither knows (mystery)
`secret` — character knows, viewer doesn't

## breach

The canonical expectation the show violates. One sentence. Examples: "teachers don't cook meth", "spies are competent", "therapy is confidential".

## MRE

Most Reportable Event — the one event in a plotline that makes it worth telling. Often the climax, not always.

## verdict

The pipeline makes mistakes in earlier passes — wrong plotline boundaries, events assigned to the wrong plotline, functions that don't fit. The final review pass looks at the whole season at once and fixes them by issuing verdicts.

A verdict is one structural correction. There are five kinds:

| verdict | when to use |
|---|---|
| `MERGE` | Two plotlines turn out to be the same plotline (same chase, same character). Combine them into one |
| `DROP` | A plotline doesn't hold up — too few events, no real chase. Remove it; redistribute its events to other plotlines |
| `CREATE` | A group of events wasn't assigned to any plotline, but together they form one. Bundle them into a new plotline |
| `REASSIGN` | A single event was put in the wrong plotline. Move it to the right one |
| `REFUNCTION` | An event's function label is wrong. Change it (e.g., `escalation` → `crisis`) |
