# Rules and Formulas

If you're reading a rule in the code or a prompt and wondering why it's there, this is where to look. Every rule, threshold, and computation — whether the LLM follows it from a prompt or the code computes it — ordered by pipeline stage.

**LLM** = the LLM follows this rule from the prompt.
**Code** = deterministic computation.

Code paths relative to `src/tvplotlines/`.

The sections below cover the **hollywood** system (5 passes). The **narratology** system is documented in the "Narratology pipeline" section at the end — it reuses the same prompt-loader and model shapes, but has its own six-pass flow.

---

## Pass 0: Format Detection

**LLM** reads the first 3 synopses and classifies the show.

### Format

Four formats, each telling the pipeline what kind of plotlines to expect:

| Format | What it means |
|--------|--------------|
| procedural | Each episode has a standalone case that opens and closes. CSI, House. |
| hybrid | Case-of-the-week AND serialized arcs intertwine. Good Wife, Buffy. |
| serial | Episodes continue each other. One protagonist. Breaking Bad, Sopranos. |
| ensemble | Like serial, but no single protagonist — multiple characters carry equal weight. Game of Thrones, Succession. |

Ensemble is always serial by nature — there are no procedural or hybrid ensembles. A case-of-the-week structure creates hierarchy (someone leads the case), which is incompatible with ensemble's equal weight.

**Diagnostic:** different cases in E01 and E02 → procedural or hybrid. E02 continues E01's conflict → serial or ensemble. Can you name THE main character? No → ensemble.

### Anthology

A boolean flag, independent of format. Seasons are independent — new cast, new story, no continuity. Prior season data is not passed forward. True Detective, Fargo.

### Story engine

One-sentence logline describing the show's repeating dramatic mechanism. Two reference structures:

- "[Who] [does what] in order to [goal], but [obstacle]."
- "When [situation], [who] must [do what], or else [stakes]."

Neither is mandatory. Real loglines vary freely — the structures are a starting point, not a template.

### Code: validation

`pass0.py:_validate` — rejects output where `format` is not one of the four values, or `is_anthology` is not boolean. LLM retries automatically.

---

## Pass 1: Plotline Extraction

**LLM** identifies cast and plotlines from all synopses. **Code** validates structure and runs majority voting.

### What the LLM extracts

For each plotline: Story DNA (hero, goal, obstacle, stakes), type (case_of_the_week / serialized / runner), nature (plot-led / character-led / theme-led), confidence (solid / partial / inferred).

The LLM does not assign rank — rank is computed by code after Pass 2.

### Quantity expectations

The number of episodes in the season affects how many plotlines to expect.

| Format | ≤8 episodes | 9+ episodes |
|--------|-------------|-------------|
| Procedural | max 5 | max 5 |
| Hybrid | max 5 | max 5 |
| Serial | max 5 | max 7 |
| Ensemble | max 7 | max 9 |

Procedural and hybrid stay at 5 because the case-of-the-week structure limits how many serialized arcs can run alongside it. Serial and ensemble grow with episode count — more episodes give more space for plotlines to develop.

### Code: majority voting

`pass1.py:extract_plotlines` · `_VOTING_ROUNDS = 3`

The same Pass 1 call runs three times with identical input. Code picks the result whose plotline ID set appears most often. If all three disagree, the first wins.

A single LLM run can miss a plotline or hallucinate one. Majority voting catches one-off errors without adding prompt complexity. Three runs is the minimum for a majority; more would improve reliability but cost 2× more.

### Code: validation

`pass1.py:_validate` — rejects output with missing fields, invalid enum values, or missing case_of_the_week in procedural/hybrid. LLM retries.

---

## Pass 2: Event Assignment

**LLM** breaks each episode into events and assigns them to plotlines. **Code** validates.

### Functions are episode-scoped

Each event gets a dramatic function (setup, escalation, climax, etc.) based on its role **within the episode**, not across the season. An event that is the climax of episode 3 might turn out to be an escalation in the season-long arc — but Pass 2 only sees one episode, so it assigns based on what it sees.

This distinction matters because the same function vocabulary appears in two contexts. Pass 2 uses it for episodes. Post-processing and Pass 3 interpret it across the season. The two readings may differ.

### Event assignment

Each event belongs to the plotline whose goal it advances. When one event advances two plotlines, the primary goal gets `plotline_id` and the secondary goes into `also_affects`. Events that don't fit any plotline get `plotline_id: null` — code resolves them in post-processing.

### Code: validation

`pass2.py:_validate` — checks function enums, plotline ID references, character ID format (`cast_id` or `guest:name`), interaction types.

---

## Post-processing

All **Code**, no LLM. Runs between Pass 2 and Pass 3.

### Orphan event assignment

`postprocess.py:assign_orphan_events`

Events with `plotline_id = null` get assigned by character voting: for each character across the season, which plotline do they appear in most? The orphan event inherits the plotline most associated with its characters. Fallback: most common plotline in the same episode.

Orphan events are rare (typically 1-7 per season in our tests). Resolving them fills gaps in span and weight calculations.

### Span

`postprocess.py:compute_span`

A plotline's span = the list of episodes where it has at least one event. Recomputed after Pass 3 verdicts.

### Computed rank

`postprocess.py:compute_ranks`

Rank is computed from event counts, not assigned by the LLM. This changed in the rank refactor — the LLM used to assign rank in Pass 1, but event count proved to be a more reliable starting point (see `docs/experiments/counting-events-for-ABC-rank.md`).

**Counting:** both primary events (`plotline_id`) and `also_affects` mentions count equally toward a plotline's total. The LLM's decision to make an event "primary" vs "also_affects" is often arbitrary — the event advances both plotlines. Weighting `also_affects` lower would amplify that arbitrariness.

**Assignment:**

1. Runners → null (no rank)
2. Procedural: case_of_the_week → A. The case is what a procedural show is about.
3. Hybrid: case_of_the_week → B. The character arc matters more than the case, even when the case generates more events. Douglas: "A-story = the most resonant story, not necessarily the largest proportion of pages."
4. Remaining plotlines sorted by descending event count → A, B, C, C, C...

Pass 3 receives `computed_rank` and can propose a different rank through its review (stored as `reviewed_rank`). When they disagree, the user sees both.

### Weight per episode

`postprocess.py:compute_weight` · `threshold = 0.5`

Each plotline gets a weight label per episode based on event count relative to the episode's busiest plotline: `primary` (≥50% of max), `background` (≥2 events but <50%), `glimpse` (1 event). Pass 3 uses these labels to assess plotline presence without counting events.

### Diagnostic flags

`postprocess.py:validate_ranks`

**A-rank span check:** `min_span_frac = 0.25` — A-rank plotline in fewer than 25% of episodes → auto-demote to B. A plotline concentrated in three episodes out of thirteen is not the season's spine.

**Dominance check:** `dominance_threshold = 0.50` — plotline with >50% of all season events → flag `dominant`. No auto-fix — Pass 3 decides whether this means two plotlines were collapsed into one (→ CREATE + REASSIGN) or the show genuinely revolves around one story.

---

## Pass 3: Structural Review

**LLM** reviews the full season and issues verdicts. **Code** applies them mechanically.

### What Pass 3 does

Checks Story DNA completeness, spot-checks event assignments, looks for duplicate plotlines (same hero, adjacent goals), checks orphaned events, verifies format consistency.

Event functions from Pass 2 reflect episode-level roles. Pass 3 reads them across the season but keeps this distinction in mind — a "climax" in episode 3 may be an escalation in the season arc.

When diagnostics flag a problem (`low_completeness`, `monotonicity_violation`, `dominant`), Pass 3 decides the response: REASSIGN misplaced events, REFUNCTION incorrectly labeled events, MERGE duplicate plotlines, CREATE new plotlines from patterns in orphaned events, or DROP phantom plotlines with no events.

### Code: verdict application

`verdicts.py:apply_verdicts`

| Action | Effect |
|--------|--------|
| MERGE | Moves all events from source to target; removes source |
| REASSIGN | Moves one event (exact text match) to a different plotline |
| CREATE | Adds a new plotline with `confidence: "inferred"`; reassigns specified events |
| DROP | Redistributes events to specified targets; removes plotline only when zero remain |
| REFUNCTION | Changes an event's function |

After verdicts, span recomputes to reflect the changed plotline list.

---

## Pass 4: Arc Functions

**LLM** assigns each event a season-level role per plotline. **Code** applies the mapping.

### What Pass 4 does

Pass 2 labels events at the **episode** level (function reflects role within one episode). Pass 4 revisits every event from the perspective of its plotline across the **whole season** and assigns `plot_fn`. The same event can be a `climax` in its episode (Pass 2) and an `escalation` in the season arc (Pass 4).

One call per plotline, in parallel.

### Code: application

`pass4.py:assign_arc_functions` · `pipeline.py`

Arc functions are written to `Event.plot_fn`. Texture events (narratology) or events that don't sit in the plotline's arc stay `None`.

### Code: validation

`pass4.py:_validate` — arc function values must come from the function enum (see glossary).

---

## Pipeline orchestration

### Execution order

`pipeline.py:get_plotlines`

1. Pass 0 (skip if `context` provided)
2. Pass 1 (skip if `cast` + `plotlines` provided)
3. Pass 2 — parallel, batch, or sequential (skip if `breakdowns` provided)
4. Post-processing: orphan assignment → span → rank → diagnostics
5. Pass 3 (skip if `skip_review=True`)
6. Post-verdict: span recomputes. Rank does not — `computed_rank` is fixed.
7. Pass 4: arc functions, one call per plotline in parallel.

### Pass 2 execution modes

| Mode | How | Cost |
|------|-----|------|
| parallel | All episodes async | Full price, fast |
| batch | Anthropic batch API | 50% discount, slow (polling) |
| sequential | One at a time | Full price, slowest |

### Episode ID format

`S{dd}E{dd}` (regex `^S\d{2}E\d{2}$`). Season prefix must match the `season` parameter. Sorted alphabetically before processing.

---

## Narratology pipeline

`narratology.py:run_narratology`

A six-pass alternative to the five-pass hollywood flow. Prompts live under `prompts/narratology/`. Output is mapped into the same `TVPlotlinesResult` shape (actants → hero/goal/obstacle/stakes) so every downstream consumer — the HTML viewer, exports — stays unchanged.

### Passes

| Pass | Role | Calls |
|------|------|-------|
| **1 context** | Format, story schema, breach (the canonical violation), genre, protagonists | 1 |
| **2 fabula** | Per-episode events as state transitions. Every event gets a stable id `{episode}#{nn}` that every later pass references | 1 per episode (parallel) |
| **3 actants** | Plotlines via Greimas's actant model: `who_chases`, `what_they_chase`, `stands_in_the_way`, `helpers`, `bigger_force`, `who_wins_if_it_works`. The anti-subject test decides when a blocking character deserves their own plotline | 1 |
| **4 story** | Per-event episode function + direction (improvement/deterioration/neutral); episode theme; interactions between plotlines | 1 per episode (parallel) |
| **5 arc** | Per-plotline: season-level `arc_function` + `arc_direction`, `kind` (drive vs texture), and the plotline's MRE (most reportable event) | 1 per plotline (parallel) |
| **6 review** | Verdicts (MERGE/DROP/REASSIGN/REFUNCTION) and ranks (A/B/C) | 1 |

### Glossary

See `src/tvplotlines/prompts/narratology/glossary.md` for `function` (8 values including `recognition`), `direction` (3), `kind` (2), and the full actant mapping.

### Result shape

Same `TVPlotlinesResult` as hollywood:

- `Plotline.hero` ← `who_chases`
- `Plotline.goal` ← `what_they_chase`
- `Plotline.obstacle` ← `stands_in_the_way` joined, fall back to `bigger_force`
- `Plotline.stakes` ← `If wins: {who_wins_if_it_works}`
- `Event.function` ← episode-level function
- `Event.plot_fn` ← arc function (or `None` for texture events)

Pass 6 verdicts apply via `narratology.py:_apply_narratology_verdicts` (event re-point for MERGE, event orphaning for DROP, function change for REFUNCTION, plotline move for REASSIGN). Reviewed ranks override computed ranks.

### Dispatcher

`pipeline.py:get_plotlines` calls `narratology.run_narratology` when `system="narratology"` and the ordinary hollywood flow otherwise. A matching dispatcher in the browser viewer picks between `runPipeline` (hollywood) and `runPipelineNarratology` based on the user's LLM-settings choice.
