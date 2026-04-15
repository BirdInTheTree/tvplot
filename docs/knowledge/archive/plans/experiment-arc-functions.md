---
type: plan
project: tvplotlines
status: active
---

# Experiment: Arc Functions

## Question

How to assign dramatic functions to events at the season-arc level (not episode level)?

Two sub-questions:
1. Does the order of assignment matter — arc first, episode first, both at once, or arc only?
2. Which scale works best for arc functions — our 7, Harmon, McKee, or Freytag?

## Design

Two stages. Stage 1 finds the best assignment order. Stage 2 finds the best scale.

### Stage 1: Assignment Order

Fix scale = our 7 functions (setup, inciting_incident, escalation, turning_point, crisis, climax, resolution). Vary the order:

| Run | What Pass 2 assigns | What Pass 3 assigns | Pass 3 sees |
|-----|--------------------|--------------------|-------------|
| A | nothing (events only, no function) | arc function | all events across season, plotlines |
| B | episode function | arc function | all events + their episode functions |
| C | arc function (preliminary) | arc function (corrected) | all events + preliminary arc functions |
| D | episode function + arc function (both) | — | plotlines + 1 episode |

Run A: cleanest — no anchoring from episode function. But Pass 3 gets no function signal at all.
Run B: current plan — episode functions exist, Pass 3 adds arc functions on top.
Run C: Pass 2 guesses arc function from one episode, Pass 3 corrects with full season view.
Run D: Pass 2 does everything — cheapest (no Pass 3 work), but one-episode context for arc.

### Evaluation: Majority Voting

Each run repeated 3 times. For each event, compare arc function across 3 runs.

**Agreement rate** = fraction of events where all 3 runs agree. Higher = model is more confident = assignment is more natural for the model.

No ground truth needed at this stage — we're measuring model self-consistency, not correctness.

### Test data

Breaking Bad S01, plotline "Walt: Empire" — ~80 events across 7 episodes. One plotline, clear arc, well-known show.

### Stage 2: Scale

Take the winning order from Stage 1. Test 4 scales:

| Scale | Values |
|-------|--------|
| Our 7 | setup, inciting_incident, escalation, turning_point, crisis, climax, resolution |
| Harmon 8 | you (comfort), need, go, search, find, take, return, change |
| McKee 5 | inciting incident, progressive complications, crisis, climax, resolution |
| Freytag 5 | exposition, rising action, climax, falling action, denouement |

Same evaluation: 3 runs each, agreement rate.

### Stage 3: Confirmation

Take winning scale + one alternative. Test with a different order than the winner. If agreement rate stays similar — order and scale are independent. If it drops — they interact.

## What we need to build

### For Stage 1

- Prompt variant for each run (A-D)
- Script that:
  - Extracts events for one plotline from existing pipeline result
  - Calls LLM with appropriate prompt 3 times
  - Compares arc function assignments across runs
  - Reports agreement rate per event and overall
- No changes to pipeline code — this is a standalone experiment

### Prompts

**Run A prompt (Pass 3 assigns, no episode functions):**
"Here are all events for plotline [name] across the season, in episode order. Assign a dramatic function (arc_fn) to each event based on its role in the season-long arc. Values: setup, inciting_incident, escalation, turning_point, crisis, climax, resolution."

**Run B prompt (Pass 3 assigns, sees episode functions):**
Same + "Each event already has a function assigned for its role within the episode. The arc function may differ."

**Run C prompt (Pass 2 assigns preliminary):**
"Here is one episode's events for plotline [name]. Guess the arc function based on what you see. You may be wrong — this will be corrected later with full season context."
Then Pass 3 prompt: "Here are preliminary arc functions. Correct them with full season view."

**Run D prompt (Pass 2 assigns both):**
"For each event, assign two functions: episode_fn (role in this episode) and arc_fn (role in the season arc, as far as you can tell from this episode)."

## Metrics

- **Agreement rate** per run = events with 3/3 agreement / total events
- **Partial agreement** = events with 2/3 agreement
- **Disagreement** = events with 3 different answers
- **Distribution** = how many events get each function (is it balanced or all escalation?)

## Cost estimate

BB Empire: ~80 events. Each run = 1-3 LLM calls (depending on variant). 3 repeats.
Stage 1: 4 variants × 3 repeats = 12 calls. ~$1-2.
Stage 2: 4 scales × 3 repeats = 12 calls. ~$1-2.
Stage 3: 2 calls × 3 repeats = 6. ~$0.50.
Total: ~$3-5.

## Files

- `scripts/arc_fn_experiment.py` — experiment runner
- `3-resources/tvplotlines/experiment-arc-functions.md` — this plan
- Results saved to `experiments/arc_functions/` (gitignored)

## Execution order

1. Write experiment script
2. Run Stage 1 (4 variants × 3 repeats) on BB Empire
3. Analyze agreement rates → pick best order
4. Run Stage 2 (4 scales × 3 repeats) with best order
5. Analyze → pick best scale
6. Run Stage 3 (confirmation)
7. Write up results
8. If results clear → implement in pipeline
