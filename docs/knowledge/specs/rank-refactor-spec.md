---
type: spec
project: tvplotlines
status: archived
---

# How plotline rank works

## The problem with rank today

A plotline's ABC rank — how central it is to the season — gets decided three times by three different mechanisms. The LLM assigns it during Pass 1 based on its reading of the synopses. Then code in post-processing may auto-demote an A-rank plotline if it appears in too few episodes. Then Pass 3 may promote or demote it again through structural review.

Each mechanism overrides the previous one. The user never sees the disagreement — only the final number, with no trace of who changed it or why.

This becomes a real problem with ensemble shows. When a season has seven or more plotlines, the LLM's initial ranking is a guess — it hasn't seen the events yet, only the synopses. After Pass 2 assigns events to plotlines, we have actual data: how many events each plotline drives, how many episodes it spans. That data should inform the rank, not be ignored.

## Two ranks instead of one

Split rank into two fields:

- **computed_rank** — code calculates this after Pass 2 from event counts. Objective, reproducible, based on data.
- **reviewed_rank** — Pass 3 sets this through PROMOTE/DEMOTE only when it disagrees with the computed rank. Null when Pass 3 agrees or has nothing to say.

When `reviewed_rank` is null, the user sees `computed_rank`. When both are present, the user sees both — and the disagreement itself tells a story.

In Mad Men, the formula gives Pete Campbell rank B (34 events — second most in the season). The LLM gives him C. Don's marriage gets the opposite treatment: C by events, B by the LLM. A producer looking at both numbers learns something neither says alone: Pete dominates screen time, but Don's marriage dominates the show's identity. That tension is worth seeing.

Full experiment results: `docs/experiments/counting-events-for-ABC-rank.md`.

## How computed_rank works

### Counting events

For each plotline, count the events where it is the primary plotline (`event.plotline_id`). Events that mention the plotline in `also_affects` are not counted.

`also_affects` means "this event touches the plotline" — not "this event belongs to the plotline." A runner mentioned in fifteen `also_affects` lists is not a B-plotline. It is background presence, and counting it equally would inflate plotlines that influence many scenes without driving any of them.

The optimal weight for `also_affects` (zero, half, or full) is still an open question — the current choice is conservative. Pass 3 receives both counts and can correct with PROMOTE if the `also_affects` pattern suggests a higher rank.

### Assigning ABC

1. Runners (`type = "runner"`) get no rank.
2. In procedural format, the case-of-the-week plotline gets A — it is what the show is about, regardless of how many events other plotlines have.
3. In hybrid format, the case-of-the-week gets B — the character arc matters more, even when the case generates more events (Douglas: "A-story = the most resonant story, not necessarily the largest proportion of pages").
4. The remaining plotlines are sorted by descending primary event count. First gets the highest available rank, second gets the next, third and beyond get C.

Example for a hybrid show with five plotlines:

- Case of the week → B (fixed)
- Runner → null (fixed)
- Most events → A
- Next → B (second B is fine)
- Next → C

### Safety net

After computing ranks, one check remains: if an A-rank plotline appears in fewer than 25% of episodes, demote it to B. A plotline concentrated in three episodes out of thirteen is not the season's spine, no matter how many events it packs in.

## What changes

### Model

`Plotline.rank` becomes two fields: `computed_rank` and `reviewed_rank`. A property `rank` returns `reviewed_rank or computed_rank` — existing code that reads `rank` keeps working.

The JSON output includes all three: `rank` (the effective value), `computed_rank`, and `reviewed_rank`.

### Pass 1

The prompt no longer asks the LLM to assign rank. The rank section, rank validation rules, rank in the JSON example, and rank assignment rules all come out. The LLM focuses on what it does well: identifying plotlines, cast, and Story DNA. Rank is data-driven — it belongs after the data exists.

### Pass 2

RERANK patches are removed. During Pass 2, the LLM doesn't know the final ranks — it hasn't finished assigning events yet. Asking it to flag rank problems at this stage produces noise.

### Post-processing

A new function `compute_ranks` runs after orphan assignment and span computation. It counts primary events, applies the rules above, and writes `computed_rank`.

The existing `validate_ranks` keeps the span-based demotion and dominance checks as diagnostics for Pass 3.

Pipeline order:
1. `assign_orphan_events()`
2. `compute_span()`
3. `compute_ranks()`
4. `validate_ranks()`
5. Pass 3

### Pass 3

PROMOTE and DEMOTE verdicts write to `reviewed_rank` instead of mutating `computed_rank`. The prompt explains: "Code computed rank from event frequency. If narrative resonance tells a different story — a plotline that defines the show despite fewer events, or one that dominates events without defining the show — propose a different rank through PROMOTE or DEMOTE."

Pass 3 receives both primary and `also_affects` event counts for each plotline, so it can make informed decisions.

The non-ensemble A-rank block checks the effective rank (`reviewed_rank if set, else computed_rank`).

### CLI

`--stop-after pass1` saves an intermediate JSON without rank — rank doesn't exist yet at that stage. `--resume-from` accepts plotlines without rank — it will be computed after Pass 2.

### Tests

Pass 1 validation tests, verdict tests, and post-processing tests will need updates. The test plan will be detailed during implementation.
