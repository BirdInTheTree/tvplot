---
type: spec
project: tvplotlines
status: active
date: 2026-03-23
---

# Architecture

TV seasons contain dozens of interwoven plotlines, but no structured representation of that weave exists. Synopses describe what happens; they don't say which events belong to which plotline, where each plotline starts and ends, or how plotlines interact across episodes. This document explains how the tvplotlines pipeline turns raw synopses into that structured representation — what each pass does, why it's designed this way, and what tricks keep LLM calls cheap and results consistent.

## Design principles

* **A pure function, nothing else**

    The entire library is one function call. Synopses go in, structured plotlines come out. No database, no files on disk, no sessions, no hidden state between runs. This makes the library easy to test, easy to embed, and impossible to misconfigure — there is nothing to configure beyond the function arguments.

* **The LLM reads; code enforces**

    Each pass asks the LLM to do what humans do well: read a synopsis and identify who wants what, what stands in their way, and what's at stake. The LLM never decides how to structure the output, what fields to include, or whether a plotline is valid. Code handles all of that — JSON schema validation, referential integrity checks, rank distribution rules. This split exists because LLMs are good readers but unreliable bookkeepers.

* **Deterministic by default**

    All LLM calls use temperature=0. Pass 1 runs three identical calls and picks the majority result. The same synopses produce the same plotlines. This matters because the library's output feeds downstream tools — dashboards, editors, exports — that break when structure shifts between runs.

* **Extract first, review second**

    The pipeline has two phases. The first phase (Pass 0 through Pass 2) extracts raw structure: what plotlines exist, what events belong to each plotline in each episode. The second phase (post-processing and Pass 3) reviews that structure and corrects it. Separating extraction from review means the LLM in Pass 3 sees the full picture — all plotlines, all episodes, all spans — before making editorial decisions like merging two plotlines or promoting a rank.

* **Every LLM response is validated**

    The library never trusts raw LLM output. Every response is parsed, checked against the expected schema, and tested for referential integrity: does this character ID exist in the cast? Does this plotline ID exist? Is the rank distribution legal for this format? Validation failures raise clear errors instead of propagating silently into downstream passes.

## Overview

The pipeline has two main phases: extract and review. Both are orchestrated by `pipeline.py`.

### Extract phase

This phase starts with a set of episode synopses and builds the raw structural model of the season. It runs three passes in sequence, each one building on the output of the previous.

Pass 0 reads a few synopses and determines the show's format — procedural, serial, hybrid, or limited — along with a one-sentence story engine that describes how the show generates plot, and a genre tag. Pass 1 reads all synopses and extracts the cast and plotlines, each described by its Story DNA: hero, goal, obstacle, stakes. Pass 2 reads one episode at a time and assigns individual events to plotlines, tagging each event with its narrative function (setup, escalation, turning point, climax, resolution) and capturing the episode's thematic summary.

### Review phase

This phase takes the raw extraction and refines it. Post-processing computes derived metrics — which episodes each plotline spans, how much screen weight it carries per episode, whether the rank distribution matches the format. Pass 3 then reviews the full picture and issues structural corrections: merge two plotlines that are really one, promote a plotline that earned more screen time than its rank suggests, reassign a misplaced event. Code applies these corrections mechanically; the LLM only decides what to change, not how.

## How context shapes the pipeline

Every TV show has a format that determines how plotlines behave. A procedural like House resets its A-plotline every episode — the medical case is self-contained, while serialized B and C plotlines carry across the season. A serial like Breaking Bad runs all plotlines continuously. A hybrid like The Good Wife mixes both. Getting this wrong cascades through the entire pipeline: if the model thinks a serial is a procedural, it will look for a case-of-the-week plotline that doesn't exist.

Pass 0 exists to detect this format from the synopses themselves. It reads the first two or three episodes and returns a format classification, a story engine — a one-sentence description of the show's plot-generation mechanism — and a reasoning field that explains why this format was chosen. For House, the story engine might be "a new patient each episode forces a diagnostic puzzle." For Breaking Bad, "Walt's choices create escalating consequences." The reasoning field is not used downstream but makes the classification auditable: if Pass 0 misclassifies a show, the reasoning tells you why.

The format classification controls downstream behavior. In Pass 1, it determines how many A-rank plotlines are legal: one for serial, procedural, and hybrid formats; two or more for ensemble shows like This Is Us. In post-processing, it determines how rank validation works. The caller can also provide context directly, bypassing Pass 0 entirely.

Two boolean flags extend the format. `is_ensemble` marks shows with multiple co-equal A-rank plotlines. `is_anthology` marks shows where seasons are independent — when this is true, prior-season continuity is disabled.

## How plotlines are extracted

A synopsis describes events but doesn't say which events belong together. Two characters meeting in episode three might advance a plotline that started in episode one, or it might be a standalone beat. Pass 1 resolves this ambiguity. The LLM reads all synopses for the season and returns two things: a cast list (characters with IDs and aliases) and a set of plotlines.

Each plotline is described by four fields borrowed from narrative theory, collectively called Story DNA: the hero (who drives the plotline), the goal (what they want), the obstacle (what prevents them), and the stakes (what happens if they fail). These four fields anchor the plotline's identity. Everything else — rank, type, nature, confidence — describes the plotline's structural role in the season.

Rank (A, B, C, or runner) reflects screen time weight. Type distinguishes between case-of-the-week plotlines that reset every episode, serialized plotlines that run across episodes, and runners — low-key threads that surface occasionally and pay off late. Nature marks whether the plotline is plot-led or character-led. Confidence signals how certain the extraction is: solid, partial, or inferred.

### Majority voting

Pass 1 makes three parallel LLM calls with identical inputs and picks the result that appears most often. This exists because even at temperature=0, LLM output can vary slightly between calls — a plotline might get a different name or a borderline character might be included or excluded. Voting stabilizes the output. Whether this is necessary at temperature=0 remains an open question; it's a candidate for removal after ablation testing.

### Prior season continuity

When a previous season's result is provided, Pass 0 is skipped entirely — the context carries over. Pass 1 receives the prior season's cast and plotlines as additional input and marks each prior plotline with a continuity status: CONTINUES (same hero, same goal), TRANSFORMED (same hero, new goal), or ENDED (resolved). Character and plotline IDs are preserved across seasons so that downstream tools can track arcs over time. Anthology formats disable this mechanism — each season starts fresh.

## How events are assigned to plotlines

Knowing what plotlines exist is not enough — each individual event in each episode needs to be linked to the plotline it advances. A single synopsis might contain beats from three different plotlines interleaved in a few paragraphs. Pass 2 resolves this by processing one episode at a time.

For each episode, the LLM reads the synopsis alongside the cast and plotline definitions from Pass 1. It returns a structured breakdown: a thematic summary of the episode, a list of events, a set of interactions between plotlines, and suggested patches.

Each event is a single narrative beat — one sentence describing what happened. The LLM assigns it to a plotline (or marks it as unassigned) and tags it with a narrative function. It also lists the characters involved and notes which other plotlines the event secondarily affects. Narrative functions position events within a plotline's arc: setup, escalation, turning point, climax, resolution. An event's function tells you where in the story the plotline stands at that moment.

Interactions capture how plotlines relate within an episode. A thematic rhyme means two plotlines echo the same theme. Dramatic irony means the audience knows something a character doesn't. Convergence means two plotlines physically meet. Meta covers structural devices like twist-reveals or time jumps.

Patches are the LLM's self-correction mechanism. When Pass 2 encounters something that doesn't fit the plotline definitions from Pass 1 — an orphan event with no matching plotline, a plotline that should be split, a rank that looks wrong — it flags the issue as a patch. Patches are not applied during Pass 2. They're passed forward to Pass 3 as additional context for the structural review.

### Execution modes

Processing episodes is the most expensive part of the pipeline — one LLM call per episode. The library offers three modes to manage this cost.

Parallel mode (the default) sends all episodes at once as concurrent async calls. This is the fastest option. The system prompt is cached on the API side, so only the first episode pays the full prompt cost.

Batch mode uses the Anthropic Message Batches API. All episodes are submitted as a single batch job at a 50% discount. The trade-off is latency — batch jobs are processed asynchronously and may take minutes to hours.

Sequential mode processes one episode at a time. It's slower and costs the same as parallel mode, but fires a callback after each episode, making it useful for debugging and progress monitoring.

## What post-processing computes

Raw LLM output from Pass 2 has gaps. Some events lack a plotline assignment. Plotline ranks reflect the LLM's judgment but not the actual data. Span and weight — how many episodes a plotline covers and how much screen time it commands — can't be known until all episodes are processed. Post-processing fills these gaps with four deterministic computations, no LLM calls.

Orphan assignment resolves events that Pass 2 left unlinked to any plotline. For each orphan event, the code looks at which characters are involved, finds the plotlines those characters most often appear in, and assigns the event to the best match.

Span computation collects, for each plotline, the list of episodes where it has at least one event. This is a concrete measure of how many episodes a plotline actually appears in, as opposed to how many it was intended to cover.

Weight computation measures how much screen time a plotline commands per episode. A plotline with the most events in an episode gets "primary" weight. Those with fewer events get "background." A single event earns "glimpse."

Rank validation checks whether the A/B/C distribution matches the show's format. If an A-rank plotline only spans 25% of the season, the code demotes it to B and raises a diagnostic flag. If a single plotline accounts for more than 50% of all events, a dominance flag goes up. These diagnostics feed into Pass 3.

## How the structural review works

Extraction passes work episode by episode — none of them sees the full season at once. This means systematic errors accumulate: a plotline that spans two episodes might be identified as two separate plotlines; a rank assigned from three synopses might not hold up across twelve. Pass 3 exists to catch these errors.

Pass 3 is the editorial pass. It sees everything: all plotlines with their spans and per-episode weights, all events across all episodes, all patches from Pass 2, and all diagnostic flags from post-processing. From this full picture, it issues verdicts — structural corrections to apply.

Six verdict types exist, each corresponding to an editorial decision. MERGE combines two plotlines that are really phases of the same story — if "Walt starts cooking" and "Walt builds an empire" share a hero and one flows into the other, they should be one plotline. REASSIGN moves a misplaced event from one plotline to another. PROMOTE and DEMOTE adjust a plotline's rank when the data contradicts the original assignment. CREATE adds a new plotline when multiple orphan events form a coherent thread that Pass 1 missed. DROP removes a plotline that turned out to be noise, redistributing its events elsewhere.

The LLM decides which verdicts to issue and returns a free-text quality assessment alongside them. Code then applies each verdict mechanically — updating plotline lists, reassigning events, recomputing spans. After all verdicts are applied, the pipeline re-runs span computation and rank validation to ensure the corrections didn't introduce new inconsistencies.

## The LLM call structure

Each LLM call has two parts: a system prompt and a user message. The system prompt is the full prompt file — rules, definitions, output format — unchanged across calls within the same pass. The user message carries the concrete data for one specific call.

```
Pass 0:  1 call    system = pass0.md
                    user   = {show, season, first 2–3 synopses}

Pass 1:  3 calls   system = pass1.md
                    user   = {show, season, context, all synopses}

Pass 2:  N calls   system = pass2.md  ← cached across episodes
                    user   = {episode synopsis, cast, plotlines}

Pass 3:  1 call    system = pass3.md
                    user   = {full result + diagnostics}
```

A full run costs 5+N LLM calls, where N is the number of episodes. If majority voting in Pass 1 is removed after ablation testing, that drops to 3+N.

### Prompt caching

The system prompt for Pass 2 is identical across all episodes. With Anthropic's prompt caching, the API charges full price for the first episode and a 90% discount on system prompt tokens for every subsequent episode. This is the single largest cost optimization in the pipeline — Pass 2 prompts are 10-15KB, and a typical season has 10-24 episodes.

### Batching

Pass 2 calls are independent — episode order doesn't matter, and no call depends on another's result. Batch mode (described in "Execution modes" above) exploits this by submitting all episodes as one API batch job at half price.

## Two layers: library and application

```
┌─────────────────────────────────────────────┐
│  Application (proprietary)                  │
│                                             │
│  UI → editing → database → export           │
│         │                     ▲              │
│         ▼                     │              │
│   get_plotlines()  →  result                │
│                                             │
│  ┌─────────────────────────────────────┐    │
│  │  Library (open source, pip)         │    │
│  │                                     │    │
│  │  synopses → processing → result    │    │
│  │  (no DB, no files, no UI)          │    │
│  └─────────────────────────────────────┘    │
└─────────────────────────────────────────────┘
```

The library is pure computation — data in, answer out. It knows nothing about files, databases, or interfaces. The application is a separate product built on top: it displays results, stores them, and lets users edit. Open source covers the library only.

## Resilience

The library remains a pure function with no stored state. But it survives API outages and lets callers save intermediate results for resumption.

### Retries

Transient errors — connection drops, rate limits, 500s — are automatically retried with exponential backoff (up to 3 attempts, delays of 2/4/8 seconds). Each request has a configurable timeout (default 120 seconds). In parallel mode, failed episodes do not crash the whole run — successful results are preserved and only failures are retried.

### Callbacks

```python
from tvplotlines import get_plotlines, PipelineCallback

class SaveCheckpoints(PipelineCallback):
    def on_pass1_complete(self, cast, plotlines):
        save_json("checkpoint_pass1.json", {"cast": cast, "plotlines": plotlines})

    def on_episode_complete(self, index, breakdown):
        # Only fires in sequential mode
        save_json(f"checkpoint_ep{index}.json", breakdown)

    def on_batch_submitted(self, batch_id):
        save_text("batch_id.txt", batch_id)  # save for crash recovery

result = get_plotlines(
    show="House", season=1, episodes=synopses,
    pass2_mode="sequential",
    callback=SaveCheckpoints(),
)
```

`PipelineCallback` is a base class with no-op methods. Override the ones you need:

| Method | When it fires |
|--------|--------------|
| `on_pass0_complete(context)` | After context detection |
| `on_pass1_complete(cast, plotlines)` | After plotline and cast extraction |
| `on_episode_complete(index, breakdown)` | After each episode (sequential mode only) |
| `on_pass2_complete(breakdowns)` | After all episodes are processed |
| `on_batch_submitted(batch_id)` | After batch creation, before polling |
| `on_pass3_complete(verdicts)` | After structural review |

A buggy callback never kills the pipeline — exceptions are logged and execution continues.

### Resume

If a run is interrupted, restart from saved intermediate results to skip expensive LLM calls:

```python
# Pipeline crashed after Pass 2 — rerun only Pass 3
result = get_plotlines(
    show="House", season=1, episodes=synopses,
    context=saved_context,           # skip Pass 0
    cast=saved_cast,                 # skip Pass 1
    plotlines=saved_plotlines,       #
    breakdowns=saved_breakdowns,     # skip Pass 2
)
```

Two constraints: `cast` and `plotlines` must be provided together, and `breakdowns` length must match `episodes` length. Post-processing always runs regardless — it's fast and deterministic.

Batch mode supports resumption by batch ID. If the process dies during polling, the batch already exists on the API side and can be resumed without re-submitting:

```python
result = get_plotlines(
    show="House", season=1, episodes=synopses,
    pass2_mode="batch",
    batch_id="msgbatch_abc123",    # skip creation, go straight to polling
)
```

## What the library does NOT contain

- No databases
- No file reads or writes
- No web server or API
- No UI or dashboard
- No hidden state between calls
- No NLP preprocessing — synopses are already clean text
