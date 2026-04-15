---
type: plan
project: tvplotlines
status: active
---

# TODO: Redesign event functions

## Problem

Current 7 functions: `setup`, `escalation`, `turning_point`, `climax`, `resolution`, `cliffhanger`, `seed`.

Issues:
- `cliffhanger` and `seed` are not arc positions — they're narrative mechanics (modifiers). A cliffhanger IS a climax or turning_point that's cut at the peak. A seed IS a setup for a future storyline.
- Missing `catalyst` (inciting incident) — "the single most important beat" (Nash p.14). LLM has no way to mark the trigger event that launches a storyline.
- Missing `crisis` (All Is Lost) — "the lowest point, a whiff of death" (Nash p.15). LLM conflates this with escalation or turning_point.
- LLM misuses `seed` for any future-facing setup (should be rare, 2-3 per season).
- LLM misuses `cliffhanger` in mid-season episodes (should be act breaks or finales).
- Each event gets exactly one function — but a catalyst can consist of multiple events.

## Proposed functions (7)

| #   | function            | Act | definition                                      | sources                                                                                                                                                                    |
| --- | ------------------- | --- | ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `setup`             | 1   | Context, status quo, establishing the world     | Nash: Set-Up, Netflix: Setup, Oberg: "before"                                                                                                                              |
| 2   | `inciting Incident` | 1   | Trigger event that launches the storyline       | Nash: Catalyst ("the thing that happens that makes everything else happen" p.14), Netflix: Inciting Incident ("must happen in first 20 pages"), Douglas: inciting incident |
| 3   | `escalation`        | 2   | Stakes rise, situation complicates              | Nash: Bad Guys Close In, Netflix: Escalation, Pena: Stakes Escalation                                                                                                      |
| 4   | `turning_point`     | 2   | Direction changes, false peak or false collapse | Nash: Midpoint ("false peak or false collapse, stakes are raised" p.15), Netflix: Midpoint (BIG twist)                                                                     |
| 5   | `crisis`            | 2   | Lowest point, "whiff of death"                  | Nash: All Is Lost ("the moment the hero most feared actually happens" p.15) + Dark Night of the Soul, Netflix: Crisis                                                      |
| 6   | `climax`            | 3   | Peak confrontation                              | Nash: Finale, Netflix: Climax                                                                                                                                              |
| 7   | `resolution`        | 3   | Outcome, aftermath                              | Nash: Final Image, Netflix: Resolution/Denouement                                                                                                                          |

Changes from current: +inciting Incident, +crisis, -cliffhanger, -seed.

## Fractal structure: three levels of the same arc

The same 7-phase arc applies at three levels (Oberg: "The dramatic three-act structure can be applied at any level: scene, sequence, subplot, storyline, episode or season"):

| Level | What | Who labels | How |
|-------|------|------------|-----|
| **Episode** | arc of a single episode | LLM (Pass 2) | Already does this — `Event.function` |
| **Storyline** | arc of one storyline across the season | Computed | Group events by storyline, sort by episode → arc phases |
| **Season** | arc of the whole season | Computed | A-storyline's arc (franchise engine) |

**One event, three functions.** Example: Walt kills Krazy-8 (S01E03):

| Level | Function | Why |
|-------|----------|-----|
| Episode | climax | Peak tension of this episode |
| Storyline (empire) | escalation | Still early in the season arc |
| Season | escalation | Season is still building |

LLM labels episode-level (what it sees). Storyline-level and season-level are computed from data.

### Episode tension: max across all storylines

Episode tension = max function weight across **all** storylines present in that episode.

Why: the viewer feels tension regardless of which storyline causes it. If a C-storyline has a climax in E05, E05 is a tense episode even if the A-storyline is just escalating.

Dramatic weight scale: setup(1) → catalyst(2) → escalation(3) → turning_point(4) → crisis(5) → climax(6) → resolution(1). Resolution returns to baseline — the arc on a graph is a mountain: rise 1→6, drop to 1.

**Important**: these weights represent **structural position in the arc**, not emotional intensity. A catalyst (weight 2) can be emotionally more powerful than an escalation (weight 3) — e.g. cancer diagnosis vs "someone arrived". The weight says WHERE in the arc, not HOW STRONG the feeling. This matters for visualization: the tension curve shows arc progression, not emotional intensity.

### Season arc: follows the A-storyline

Season arc = A-storyline's arc across the season. The season is structured around the protagonist's journey — the A-storyline's phases define the season's shape (Netflix Season Map).

Episode tension (all storylines) adds texture and variation, but the season's structural backbone is A.

### Non-consecutive phases and arc monotonicity

Grouping consecutive same-function events gives phases. But what about: escalation → turning_point → escalation?

This is **normal** — Nash: "beat sheet is an itinerary, not a calendar. Beats can expand, contract, move around." After a turning_point, stakes can continue to rise (Bad Guys Close In comes AFTER Midpoint). The arc is not strictly monotonic.

But some returns signal errors. Rule: **no return past a milestone**. Milestones = catalyst, turning_point, crisis, climax.

- **OK**: escalation → turning_point → escalation (filling between milestones)
- **Suspicious**: crisis → climax → crisis (return past climax milestone)
- **Error**: resolution → escalation (return past climax AND crisis)

Pass 3 should check: if a storyline arc returns past a milestone, flag for REFUNCTION.

### Season arc: alternative computation methods

Two options to test:
- **Simple**: season arc = A-storyline's arc (franchise engine, Nash)
- **Weighted**: episode weight = A×3 + B×2 + C×1 + runner×0.5 (gives A priority without ignoring others)

Start with simple. If the shape doesn't match Netflix Season Map on BB S01-S05, try weighted.

### Pass 3 validates computed arcs

```
Pass 2: LLM labels episode-level functions
    ↓
Post-processing: compute storyline arcs + season arc
    ↓
Pass 3: receives computed arcs, validates:
    - storyline arc complete? (has catalyst? has climax?)
    - order logical? (catalyst before escalation?)
    - season arc shape makes sense? (climax near end?)
    ↓
Verdicts: REFUNCTION (new verdict type) if function assignment is wrong
```

Pass 3 doesn't compute — it **validates**. Code computes, LLM reviews.

tvplotlines could show all three levels — that the season arc is composed of storyline arcs, which are composed of episode arcs. This would be a strong illustration for the preprint.

### Netflix Season Map (Todd Kessler)

| ACT 1               | ACT 2                       | ACT 3                  |
|----------------------|-----------------------------|------------------------|
| Teaser               | Episodes 4–5 (Escalation)   | Episode 8+ (Resolution)|
| Inciting Incident    | Midpoint (BIG twist)        | Descending Action      |
| Pilot 2–3 (Setup)    | Episodes 6–7 (Confrontation)| Denouement (wrap-up)   |
| Climax of Act One    | Crisis                      | CLIFFHANGER            |
|                      | Climax of Act Two           |                        |

## Modifiers (future consideration)

`cliffhanger` and `seed` become modifiers that can attach to any function:
- `cliffhanger` — unresolved conflict at end of scene/episode/season (Oberg p.65, Landau: "must grow out of character jeopardy, risk, or fear" p.268)
- `seed` — plants something for future payoff (Landau: "eating your seed corn" — don't use up all your seeds)

Not in scope for first iteration — focus on getting the 7 functions right.

## Sources

- Nash, *Save the Cat! Writes for TV* — beat sheet, 5 pillar beats, Story DNA
- Netflix Pitch Workshop — Season Map (Todd Kessler), inciting incident, crisis
- Oberg, *Screenwriting Unchained* — fractal three-act structure at any level
- Douglas, *Writing the TV Drama Series* — act breaks, inciting incident
- Landau, *The TV Showrunner's Roadmap* — cliffhangers, seed corn, act breaks from characters
- Pena, *Developing Series Television* — detailed beat structure
- Harmon Story Circle — YOU/NEED/GO/STRUGGLE/FIND/SUFFER/RETURN/CHANGE

## Post-processing: building storyline arcs from flat events

After Pass 2, we have a flat list of events per episode. Post-processing builds the arc:

1. Take all events for storyline `empire` across all episodes
2. Sort by episode order (S01E01 → S01E02 → ...)
3. Group consecutive events with the same function → phase
4. Result: ordered list of phases, each with episode range and event list

```
Input (flat, from Pass 2):
  S01E01: Walt diagnosed with cancer         → empire, setup
  S01E01: Walt sees Jesse escape raid         → empire, setup
  S01E01: Walt proposes partnership           → empire, catalyst
  S01E01: First cook produces 99.1% meth     → empire, catalyst
  S01E02: Emilio and Krazy-8 arrive          → empire, escalation
  S01E03: Walt kills Krazy-8                 → empire, escalation
  S01E05: Walt decides to sell to Tuco       → empire, turning_point
  S01E06: Tuco beats Jesse                   → empire, crisis
  S01E07: Walt confronts Tuco with crystals  → empire, climax
  S01E07: Walt secures the deal              → empire, resolution

Output (arc):
  Walt: Empire:
    SETUP      [S01E01..S01E01]  2 events  ██
    CATALYST   [S01E01..S01E01]  2 events  ██
    ESCALATION [S01E02..S01E03]  2 events  ██
    TURN.POINT [S01E05..S01E05]  1 event   █
    CRISIS     [S01E06..S01E06]  1 event   █
    CLIMAX     [S01E07..S01E07]  1 event   █
    RESOLUTION [S01E07..S01E07]  1 event   █
```

This is pure code (no LLM). New function in `postprocess.py`.

## Arc completeness metric

Derived metric per storyline: how many of the 7 phases are present.

```
Walt: Empire    — 7/7 (setup, catalyst, escalation, turning_point, crisis, climax, resolution)
Hank: Investigation — 5/7 (setup, catalyst, escalation, turning_point, climax — no crisis, no resolution)
```

Computation: `len(set(event.function for event in storyline_events)) / 7`

This is a **fact**, not a quality judgment. 5/7 for a runner is normal. 5/7 for an A-storyline is a signal for Pass 3 to investigate (missing crisis in the main arc?).

Expected minimum completeness by rank:

| Rank | Min | Rationale |
|------|-----|-----------|
| A | 6/7 | Main arc, may lack crisis |
| B | 5/7 | Secondary, may lack crisis or resolution |
| C | 3/7 | Minor thread |
| runner | 1/7 | Incomplete Story DNA by definition |

Pass 3 checks: completeness < expected minimum for rank → flag.

Useful for: visualization (completeness bars), Pass 3 validation, preprint analysis.

## Episode arc vs storyline arc divergence

The most interesting insight for visualization. When episode function ≠ storyline function for the same event, it reveals where the show is structurally clever.

Example: "Walt kills Krazy-8" = episode climax (peak of E03), but storyline escalation (early in the season). Where these two levels diverge strongly — those are the most interesting moments of dramaturgy: the episode peaks on what is still just build-up for the season.

Visualization idea: two small numbers in a cell (ep: climax / arc: escalation), or color-code the divergence.

## Episode arc construction

Episode arc is built from events of ALL storylines within one episode, in the order LLM listed them (which follows synopsis chronological order).

Same algorithm as storyline arc (group consecutive same-function → phases), but across storylines within one episode instead of across episodes within one storyline.

## Convergence: directed storyline intersections

Convergence = when an event from storyline A affects storyline B. NOT just "both present in same episode".

Data source: `Event.also_affects` field — list of storyline IDs that the event secondarily impacts. Already exists in the model.

Example: event "Walt kills Krazy-8" belongs to `empire` with `also_affects: ["investigation"]` — Walt's action in the empire storyline impacts Hank's investigation.

This is a **directed** relationship: A→B ≠ B→A. "How many times did empire events affect investigation" vs "how many times did investigation events affect empire".

Visualization:
- **Directed matrix**: rows = source storyline, columns = target storyline. Cell value = count of also_affects links. Asymmetric.
- **Timeline arcs with arrows**: at each episode, draw A→B arrow where an event crosses storylines. Direction matters.

Data is already collected by Pass 2 — no new LLM work. Post-processing aggregates `also_affects` into a convergence matrix. New function in `postprocess.py`.

## Implementation scope

| What | Where | Size | LLM involved? |
|------|-------|------|---------------|
| Change function enum | Pass 2 prompt, pass2.py | Small | Yes (prompt change — needs autoresearch) |
| Arc building from flat events | postprocess.py | Medium | No |
| Convergence matrix from also_affects | postprocess.py | Small | No |
| Arc visualization | tvplotlines-app | Large | No |
| Convergence visualization | tvplotlines-app | Medium | No |
| Pass 3 arc checking update | Pass 3 prompt | Small | Yes (prompt change) |

## Files to change (when implementing)

- `src/tvplotlines/models.py` — Event.function enum + new phase model
- `src/tvplotlines/prompts_en/pass2.md` — function definitions (TESTED PROMPT — change only through autoresearch)
- `src/tvplotlines/prompts/pass2.md` — same, Russian
- `src/tvplotlines/pass2.py` — validation
- `src/tvplotlines/postprocess.py` — span/weight computation
- `src/tvplotlines/prompts_en/pass3.md` — arc checking in Step 2
- `docs/api.md` — documentation

**WARNING**: Pass 2 prompt is tested through autoresearch. Any changes must go through A/B testing, not direct editing. See lesson 2026-03-16 in lessons.md.
