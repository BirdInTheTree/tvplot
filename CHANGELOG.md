# Changelog

## Unreleased

### Added
- **AI-use, privacy, and methodology docs** — `docs/ai-disclosure.md` documents the data flow (nothing reaches Alpine Animation — your inputs and API key travel straight from your machine to the LLM vendor), lists Anthropic's and OpenAI's applicable policies, and records a paper-trail for vendor-policy compliance. `docs/methodology.md` is the plain-language Art. 50 description of how the pipeline decides, what it can't do, and where to read the code. README links both, and the standalone HTML viewer carries a dismissible AI-assisted-content footer.
- **Narratology pipeline — runnable**. New module `src/tvplotlines/narratology.py` implements all six passes (context, fabula, actants, story, arc, review). Results are emitted in the existing `TVPlotlinesResult` shape so the HTML viewer renders hollywood and narratology output unchanged. Actants (`who_chases`, `what_they_chase`, `stands_in_the_way`, `who_wins_if_it_works`) map onto `hero`, `goal`, `obstacle`, `stakes`. Pass 5 arc functions land in `Event.plot_fn`. Pass 6 verdicts apply in-place (MERGE/DROP/REASSIGN/REFUNCTION) and reviewed ranks override computed ranks.
- **Narratology in the browser viewer**. `runPipelineNarratology` in `pipeline.js` mirrors the Python orchestrator, runs all six passes via browser LLM calls (per-episode passes parallelised with `Promise.all`), and produces the same hollywood-compatible shape. `runPipeline` dispatches on the user's system choice. The "Narratology" option in LLM settings is now enabled.
- **Prompts inlined at build time**. `src/tvplotlines/html/build.py` reads every `prompts/{hollywood,narratology}/*.md` and injects them into the HTML as a `_PROMPTS` object, so the viewer no longer carries a hardcoded copy that could drift from the source.
- **"Analyze a series" entry flow** in the HTML viewer. Welcome screen now takes a show name + season; the viewer asks the configured LLM for episode synopses, shows them in an editable preview, then runs the normal pipeline. Download the single HTML and you have an end-to-end app. Fallback — drag-and-drop `.txt` synopses — still works.
- **Native PDF export** via lazy-loaded jsPDF (CDN). Generates a vector PDF directly from the loaded result: title page, per-plotline sections with actant/story-DNA fields and event lists, and an episode-by-episode appendix. Falls back to the browser print stack if the library can't be fetched (offline).
- **Knowledge consolidated into the repo**. `3-resources/tvplotlines/*` → `docs/knowledge/` with `decisions/` (ADR 001-005), `specs/` (architecture, per-pass specs, mas4bw audit), `theory/`, `prompting/`, `results/` (reference BB S01-S05 outputs), `v3_narratology/` (67 evergreen notes across 9 sources), and `archive/` (old autoresearch + plans). Personal artifacts (the book and friends-post) stay in `3-resources/tvplotlines/`.

### Changed
- **Prompt layout**: `prompts_en/` → `prompts/hollywood/`. Added `prompts/narratology/` from the former sister project, bundling eight structuralist prompts (context, fabula, actants, story, arc, review, synopses_writer, glossary). `docs/layered-schema.md` documents the shared `base + layers` JSON.
- **Library API**: `get_plotlines(..., lang=)` replaced by `get_plotlines(..., system=)` (values: `"hollywood"` default, `"narratology"`). `LLMConfig.lang` → `LLMConfig.system`. CLI: `tvplotlines run --lang` → `--system`; `write-synopses --system` added.
- Narratology pipeline is not yet runnable — `system="narratology"` raises `NotImplementedError` with a clear message. Prompts are in place; runners come in v2.

### Removed
- **Russian prompts** (`prompts_ru/`) — out of scope. Will be reintroduced once both analysis systems stabilise in English.
- Sister repo `tvplotlines_narratology/` merged into this repo under `src/tvplotlines/prompts/narratology/`.

### Added
- **Pass 4: arc functions** (`plot_fn`) — each event gets a season-arc role alongside its episode function. Pass 4 runs per-plotline, sees episode functions as context.
- **Reviewed rank**: Pass 3 assigns its own ranks. When they differ from `computed_rank`, stored as `reviewed_rank` — user sees both.
- **Fandom wiki** as second synopsis source — 15-20× more detailed than Wikipedia. Fetched automatically alongside Wikipedia.
- **DuckDuckGo fallback** — searches web for episodes with sparse Wikipedia + Fandom descriptions. Works for any language.
- **Suggested plotlines** from synopsis writer passed to Pass 0 and Pass 1 as context.
- **Russian prompts** (`prompts_ru/`) — all passes + glossary translated.
- **Rank refactor**: rank split into `computed_rank` (code, from event counts) and `reviewed_rank` (Pass 3, when it disagrees). LLM no longer assigns rank in Pass 1.
- **Theme-led plotlines**: glossary, logline test, naming rules for institutional/systemic plotlines (e.g. "MI5 vs Slough House", "Sterling Cooper: Business")
- **Shared glossary**: all prompt definitions in one file (`glossary.md`), injected into all passes via `{GLOSSARY}`
- **CLI**: `--stop-after pass1` saves intermediate JSON, `--resume-from` resumes from it
- **CLI**: `--output-dir` saves timestamped copy of results
- **CLI**: `--no-glossary`, `--no-fandom`, `--fandom-wiki` flags for write-synopses
- **Environment variables**: `TVPLOTLINES_OUTPUT_DIR`, `TVPLOTLINES_SYNOPSES_DIR` — default output locations
- **Rules and formulas reference**: `docs/formulas.md`
- Chain-of-thought nudge in all prompts before OUTPUT section

### Changed
- **5-pass pipeline**: Pass 4 (arc functions) added after Pass 3
- **Synopses writer auto-mode**: parallel for procedural/hybrid (preserves B-stories), single for serial/ensemble (season context)
- **Synopses writer**: Wikipedia + Fandom + DuckDuckGo, self-check for plotline balance
- **Rank formula**: equal weight for primary and also_affects events. Span requirements: A ≥ 75%, B ≥ 50%, C ≥ 25%.
- **Quantity limits** scale with season length: serial ≤8 eps max 5, 9+ max 7; ensemble ≤8 max 7, 9+ max 9
- **Ensemble is now a format** (`format: "ensemble"`), not a boolean flag. Ensemble = always serial.
- **Pass 2 functions are episode-scoped**: clarified as role within the episode, not the season arc
- **Pass 2**: plotline distribution check — warns if all events in one plotline
- Wikipedia `write-synopses`: Search API instead of URL guessing
- `max_tokens` scales by episode count (synopses) and event count (Pass 4)

### Removed
- **`limited` format** — not useful for analysis
- **Patches** (ADD_LINE, CHECK_LINE, SPLIT_LINE) — dead feature
- **PROMOTE/DEMOTE verdicts** — replaced by reviewed_rank

### Fixed
- Verdicts with invalid plotline IDs skipped instead of applied
- DROP aborts if events remain unredistributed
- CLI callback inherits PipelineCallback
- Arc function parsing: warn on mismatched event text instead of crash
- Pass 4 plotline ID normalization (name → id mapping)
- Single mode chunking for seasons >13 episodes
- Timeout scaling for large plotlines in Pass 4

## 0.1.0 — 2026-03-25

Initial open-source release.

- 4-pass LLM pipeline: context detection, plotline extraction, event assignment, structural review
- Story DNA extraction: hero, goal, obstacle, stakes for each plotline
- A/B/C ranking and format classification (procedural, serial, hybrid, ensemble), genre, is_ensemble, is_anthology
- Per-episode theme extraction
- Multi-season continuity via `prior` parameter
- Providers: Anthropic (default), OpenAI, Ollama, DeepSeek, Groq, any OpenAI-compatible API
- Pass 2 modes: parallel, batch (50% cheaper), sequential
- CLI: `tvplotlines run`
