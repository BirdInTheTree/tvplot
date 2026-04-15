# tvplot

A Python library — and a standalone HTML viewer — that extracts plotlines from a season of TV synopses using LLMs.

## What it does

Feed episode synopses → get structured plotlines, character arcs, and per-episode event breakdowns. Two analysis systems ship side by side: the Hollywood screenwriting model (hero/goal/obstacle/stakes, Freytag functions) and structuralist narratology (Bal/Todorov/Greimas/Bremond — actants, fabula, arc).

Three ways to run it:

- **Python library** — `from tvplot import get_plotlines`
- **CLI** — `tvplot run my-show/ [--system narratology] [--html]`
- **Standalone HTML viewer** — one self-contained file that runs the whole pipeline in the browser, takes a show name + season, fetches synopses from the LLM, and renders the grid

## Quick links

- [Quickstart](quickstart.md) — get running in 5 minutes
- [API Reference](api.md) — function signatures and data models
- [Rules and formulas](formulas.md) — every rule, threshold, and computation
- [Layered JSON schema](layered-schema.md) — `base + layers` form for storing multiple systems' analyses side by side
