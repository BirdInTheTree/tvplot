# Design: Prior Season Continuity

**Date:** 2026-03-16
**Status:** Approved
**Scope:** Add `prior: TVPlotlinesResult | None` parameter for multi-season continuity

## Problem

Each season is processed independently. When running Season 2, the pipeline has no knowledge of Season 1's characters or plotlines. This causes:

1. Pass 1 may "rediscover" characters with different IDs (e.g. `walter` instead of `walt`)
2. Continuing plotlines get new IDs instead of reusing existing ones (e.g. `drug_business` instead of `empire`)
3. No explicit tracking of which plotlines continue vs. end between seasons

## Solution

One new parameter: `prior: TVPlotlinesResult | None` in `get_plotlines()`.

### Usage

```python
r1 = get_plotlines("Breaking Bad", 1, episodes_s01)
r2 = get_plotlines("Breaking Bad", 2, episodes_s02, prior=r1)
r3 = get_plotlines("Breaking Bad", 3, episodes_s03, prior=r2)
```

The caller stores results and passes the previous season's result. Library remains stateless.

## Changes by Pass

### Pass 0 — skip if prior provided

If `prior` is provided and `context` is not explicitly passed, reuse `prior.context`. Same show, same franchise type — no need to re-detect.

### Pass 1 — inject prior cast + plotlines into prompt

**Code change (`pass1.py`):**

Add `prior_cast` and `prior_plotlines` parameters to `extract_plotlines()`. When provided, include a `prior_season` block in the user message JSON:

```python
if prior_cast and prior_plotlines:
    user_data["prior_season"] = {
        "cast": [{"id": c.id, "name": c.name, "aliases": c.aliases} for c in prior_cast],
        "plotlines": [
            {
                "id": p.id, "name": p.name, "driver": p.driver,
                "goal": p.goal, "obstacle": p.obstacle, "stakes": p.stakes,
                "type": p.type, "rank": p.rank,
            }
            for p in prior_plotlines
        ],
    }
```

Note: explicit dict construction, not `asdict()`. Excludes `span` (computed post-hoc metadata), `confidence`, `nature`, and `devices` — not needed for continuity decisions.

**Prompt change (`pass1.md` / `pass1.md` en):**

Add section after "## Input". Also update "## Task" to reference prior workflow:

> Read ALL season synopses. **If `prior_season` data is provided, first process prior plotlines (see Prior season section), then identify new plotlines.** Extract the list of plotlines and the main cast.

New section:

```
## Prior season (if provided)

If `prior_season` is present in the input, it contains cast and plotlines from the
previous season. Process them BEFORE analyzing new synopses:

For each plotline in `prior_season.plotlines`, decide based on the NEW season's synopses:
- **CONTINUES** — the plotline is present this season. Keep the same `id`, update
  goal/obstacle/stakes to reflect the new season's material.
- **TRANSFORMED** — same driver, but goal fundamentally changed. Keep the `id`,
  rewrite Story DNA.
- **ENDED** — the plotline resolved or disappeared. Don't include it.

For each character in `prior_season.cast`:
- If the character appears in this season's synopses — reuse the same `id` and `name`.
- If the character does not appear — don't include them.

Only after processing all prior plotlines, identify NEW plotlines not present before.
```

**Validation (code, `pass1.py`):**

After voting selection (post-voting, not inside `_full_validate`), check for suspicious overlaps: if a new plotline has the same `driver` as a prior plotline that wasn't continued, log a warning. No hard block — majority voting (3 rounds) reduces randomness.

### Pass 2 — no changes

Works with Pass 1 output which already has correct IDs.

### Pass 3 — no changes

Pass 3 does not receive prior season data. It reviews the current season's plotlines independently.

### Pipeline (`pipeline.py`)

```python
def get_plotlines(
    show: str,
    season: int,
    episodes: list[str],
    *,
    prior: TVPlotlinesResult | None = None,  # NEW
    context: SeriesContext | None = None,
    cast: list[CastMember] | None = None,
    plotlines: list[Plotline] | None = None,
    ...
) -> TVPlotlinesResult:
```

Logic:

1. If `prior` is provided and `context.format == "anthology"` → raise `ValueError` (anthology seasons are independent by definition)
2. If `prior` is provided and `context` is None → `context = prior.context`
3. If `prior` is provided and `cast` is None → pass `prior.cast` and `prior.plotlines` to `extract_plotlines()`
4. If `prior` is provided but `cast`/`plotlines` are also provided (Pass 1 skip) → `prior` only affects Pass 0 context reuse. The caller is responsible for continuity in manually-provided data.
5. Everything else unchanged

## Files to modify

| File | Change |
|------|--------|
| `pipeline.py` | Add `prior` parameter, wire to Pass 0 skip + Pass 1 |
| `pass1.py` | Add `prior_cast`, `prior_plotlines` params; inject into user message; add overlap warning |
| `prompts_en/pass1.md` | Add "Prior season" section |
| `prompts/pass1.md` | Add "Prior season" section (Russian) |
| `docs/api.md` | Document `prior` parameter |

## Out of scope

- Cross-season analysis (comparing plotline evolution across all seasons) — separate future feature
- Passing multiple prior seasons — `prior` is the immediately previous season only; caller chains results
- Changes to Pass 2 or Pass 3 prompts

## Design decisions

1. **One parameter, not two.** `prior: TVPlotlinesResult` instead of separate `prior_cast` + `prior_plotlines`. Simpler API, no ambiguity.
2. **Library is stateless.** Caller stores results and chains them. No internal tracking.
3. **Prior is a hint, not a constraint.** LLM is free to ignore prior plotlines that don't appear in new synopses. Prompt forces explicit decision per prior plotline to reduce hallucination.
4. **Reuse context from prior.** Same show → same franchise type. Saves one LLM call.
5. **Anthology guard.** `prior` + `format="anthology"` raises ValueError — anthology seasons are independent by definition.
6. **Explicit dict construction.** No `asdict()` — exclude `span` and other computed fields from prior data sent to LLM.
