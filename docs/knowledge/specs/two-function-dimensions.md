---
type: concept
project: tvplotlines
status: active
---

# Two dimensions of event function

## Idea

Each event has two independent roles:

1. **Episode function** — its role in the episode's dramatic structure (where in the episode's story does this event land?)
2. **Arc function** — its role in the season-long plotline arc (where in the plotline's season journey does this event land?)

These are orthogonal. A climax of episode 3 can be an escalation in the season arc. Currently we have one `function` field that conflates both.

## How it would work

**Pass 2** assigns episode function. It sees one episode — it can only judge the role within that episode. Candidate framework: Dan Harmon's story circle (8 steps) or a simplified version.

**Pass 3** assigns arc function. It sees the whole season — it can judge where each event falls in the plotline's season-long trajectory. This uses our current 7 functions: setup → inciting_incident → escalation → turning_point → crisis → climax → resolution.

## What it gives us

- Pass 2 stops guessing about the season arc (it can't see it)
- Pass 3 gets a clearer task: not "review" but "assign arc functions"
- Two dimensions give richer analysis: episode structure vs season structure
- Enables fractal analysis (same structure at episode and season levels, as Oberg describes)

## Open questions

- Dan Harmon's circle is 8 steps for one hero. How to handle multiple plotlines per episode?
- Do we need all 8 Harmon steps or can we simplify?
- How does this change the data model? Two fields instead of one? Or two separate passes?
