# Changelog

## Unreleased

### Changed
- **Welcome/landing flow in the HTML viewer.** Returning visits no longer auto-open the bundled Breaking Bad demo. Instead, the viewer opens the user's most-recently-viewed saved analysis, or falls back to the welcome screen when nothing is saved. The `#demo` URL hash still force-loads the demo (used by the onboarding animation).
- **Series picker is a visible control.** Added a "Series" label prefix, a more contrasting border, a chevron affordance, and made the dropdown always visible on the grid/analytics toolbar. A "+ Analyze another…" entry at the bottom routes back to the welcome screen.

### Added
- **Save synopses as `.zip` from the Review modal.** New "Save .zip" button between Cancel and Run writes one `.txt` per episode (`{show} {episode}.txt`) into `{show}_S{NN}_synopses.zip`. Uses the currently-edited text, does not close the modal, does not touch the draft — purely a side-effect so users can keep paid-for synopses on disk before running the pipeline. Inline STORED-method ZIP writer, no external dependencies.
- **Analysis-system picker in the Review modal.** A `[Hollywood ▾ | Narratology]` dropdown pinned to the left of the footer lets users pick the analysis system right before clicking Run, instead of digging into LLM Settings. Defaults to `Store.getSystem()`; changes persist via `Store.setSystem()` so the choice carries over as the new global default.
- **"Browse an example" section on the welcome screen.** Offers Breaking Bad and Game of Thrones (S01) as read-only previews. Both JSON fixtures are embedded into the standalone HTML at build time (`examples/results/{bb_s01,got_s01}.json`). Examples load non-destructively — they never appear in `Store.getResults()` and are not remembered as `lastSeries`.
- **Synopses draft persistence in the HTML viewer.** Generated synopses (and any in-modal edits) are saved to `localStorage` under `tvplot_synopses_draft` the moment they come back from the LLM — before the Review modal opens and before the pipeline runs. If the tab reloads, the pipeline crashes, or the user hits Cancel by mistake, the welcome screen surfaces a "Resume pending analysis: {show} S{season}?" banner with Resume / Discard buttons; Resume skips regeneration and goes straight into the Review + pipeline flow. Draft is cleared on pipeline success or explicit Cancel/Discard, kept on pipeline failure so the user can retry without paying for a second round of synopsis generation.

### Fixed
- **Pipeline progress UI no longer looks frozen.** Added a CSS spinner next to the status message, a live `Elapsed MM:SS` counter (updates every second while the overlay is visible), and a `Step N of M` line above the bar. The "Asking Claude for synopses…" text no longer stays visible during the Review-synopses dialog — the progress overlay hides while the review modal is up and reappears with a fresh "Starting pipeline…" message once the user hits Run. Added a grey hint ("Typical run: 2–5 min for a 10-episode season") so long waits don't look like a hang.

## 0.2.0 — 2026-04-15

### Changed — BREAKING
- **Package renamed `tvplotlines` → `tvplot`.** PyPI package, import path, CLI command, env vars, and localStorage keys all move. Migration: `pip install tvplot` and replace imports `from tvplotlines …` → `from tvplot …` and CLI invocations `tvplotlines run` → `tvplot run`. Env vars `TVPLOTLINES_OUTPUT_DIR` / `TVPLOTLINES_SYNOPSES_DIR` renamed to `TVPLOT_OUTPUT_DIR` / `TVPLOT_SYNOPSES_DIR`. `tvplotlines 0.1.0` on PyPI will be yanked with a "renamed to tvplot" notice.

### Added
- **AI-use, privacy, and methodology docs** — `docs/ai-disclosure.md` documents the data flow (nothing reaches Alpine Animation — your inputs and API key travel straight from your machine to the LLM vendor), lists Anthropic's and OpenAI's applicable policies, and records a paper-trail for vendor-policy compliance. `docs/methodology.md` is the plain-language Art. 50 description of how the pipeline decides, what it can't do, and where to read the code. README links both, and the standalone HTML viewer carries a dismissible AI-assisted-content footer.
- **Narratology pipeline — runnable**. New module `src/tvplot/narratology.py` implements all six passes (context, fabula, actants, story, arc, review). Results are emitted in the existing `TVPlotlinesResult` shape so the HTML viewer renders hollywood and narratology output unchanged. Actants (`who_chases`, `what_they_chase`, `stands_in_the_way`, `who_wins_if_it_works`) map onto `hero`, `goal`, `obstacle`, `stakes`. Pass 5 arc functions land in `Event.plot_fn`. Pass 6 verdicts apply in-place (MERGE/DROP/REASSIGN/REFUNCTION) and reviewed ranks override computed ranks.
- **Narratology in the browser viewer**. `runPipelineNarratology` in `pipeline.js` mirrors the Python orchestrator, runs all six passes via browser LLM calls (per-episode passes parallelised with `Promise.all`), and produces the same hollywood-compatible shape. `runPipeline` dispatches on the user's system choice. The "Narratology" option in LLM settings is now enabled.
- **Prompts inlined at build time**. `src/tvplot/html/build.py` reads every `prompts/{hollywood,narratology}/*.md` and injects them into the HTML as a `_PROMPTS` object, so the viewer no longer carries a hardcoded copy that could drift from the source.
- **"Analyze a series" entry flow** in the HTML viewer. Welcome screen now takes a show name + season; the viewer asks the configured LLM for episode synopses, shows them in an editable preview, then runs the normal pipeline. Download the single HTML and you have an end-to-end app. Fallback — drag-and-drop `.txt` synopses — still works.
- **Native PDF export** via lazy-loaded jsPDF (CDN). Generates a vector PDF directly from the loaded result: title page, per-plotline sections with actant/story-DNA fields and event lists, and an episode-by-episode appendix. Falls back to the browser print stack if the library can't be fetched (offline).
- **Knowledge consolidated into the repo**. `3-resources/tvplot/*` → `docs/knowledge/` with `decisions/` (ADR 001-005), `specs/` (architecture, per-pass specs, mas4bw audit), `theory/`, `prompting/`, `results/` (reference BB S01-S05 outputs), `v3_narratology/` (67 evergreen notes across 9 sources), and `archive/` (old autoresearch + plans). Personal artifacts (the book and friends-post) stay in `3-resources/tvplot/`.

### Changed
- **Prompt layout**: `prompts_en/` → `prompts/hollywood/`. Added `prompts/narratology/` from the former sister project, bundling eight structuralist prompts (context, fabula, actants, story, arc, review, synopses_writer, glossary). `docs/layered-schema.md` documents the shared `base + layers` JSON.
- **Library API**: `get_plotlines(..., lang=)` replaced by `get_plotlines(..., system=)` (values: `"hollywood"` default, `"narratology"`). `LLMConfig.lang` → `LLMConfig.system`. CLI: `tvplot run --lang` → `--system`; `write-synopses --system` added.
- Narratology pipeline is not yet runnable — `system="narratology"` raises `NotImplementedError` with a clear message. Prompts are in place; runners come in v2.

### Removed
- **Russian prompts** (`prompts_ru/`) — out of scope. Will be reintroduced once both analysis systems stabilise in English.
- Sister repo `tvplot_narratology/` merged into this repo under `src/tvplot/prompts/narratology/`.

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
- **Environment variables**: `TVPLOT_OUTPUT_DIR`, `TVPLOT_SYNOPSES_DIR` — default output locations
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
- CLI: `tvplot run`
