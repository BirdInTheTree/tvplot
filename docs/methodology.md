# Methodology — how tvplotlines uses AI

**Last updated:** 2026-04-15 · **Publisher:** Alpine Animation (Switzerland)

Plain-language description of how the AI in `tvplotlines` works, as required by EU AI Act Art. 50(1)(c). This page stays concise; `formulas.md` has the full rule-by-rule breakdown.

## What the AI does

### Step 0: getting the synopses

The pipeline needs one synopsis per episode. Three paths land there, all via the same LLM you configure:

- **You supply them** as `.txt` files you wrote or collected yourself.
- **The library fetches them** — `tvplotlines write-synopses "Show Name"` pulls raw episode rows from Wikipedia (and Fandom, when available), then asks the LLM to rewrite each into a 150–500-word beat-dense synopsis. The rewritten `.txt` files are written to disk so you can inspect them before running the extraction.
- **The model writes them from memory** — the HTML viewer's "Analyze a series" flow asks the LLM for episode synopses of a public show based on its own training data, then shows them to you in an editable preview before the pipeline runs.

In the last two paths the synopsis text is itself AI-generated. The library surfaces this fact (files on disk, editable preview), and the HTML viewer's footer repeats the disclosure.

### Step 1–N: extraction

Given the synopses, `tvplotlines` extracts structured analysis:

- The **story engine** (one-sentence logline of the show's dramatic mechanism).
- The **format** (procedural, serial, hybrid, ensemble).
- The **cast** and the **plotlines** with their Story DNA (hero, goal, obstacle, stakes) or — in the narratology mode — actant structure (who chases what, who helps, who opposes, who wins).
- Every **event** in every episode, assigned to a plotline, labelled with its role in the episode and in the season arc, plus character-level interactions.
- **Structural ranks** (A/B/C) indicating which plotline is the spine of the season.

The same analysis can be run through two systems — **hollywood** (screenwriting tradition, Syd Field / Douglas / Freytag) or **narratology** (structuralist tradition, Bal / Todorov / Greimas / Bremond). Both emit the same result shape.

## How it decides

The pipeline is **not** one LLM call. It is 5 or 6 small prompts, each with a narrow job, orchestrated by deterministic code:

| System | Passes |
|--------|--------|
| hollywood | Pass 0 (context) → Pass 1 (plotlines, 3× majority vote) → Pass 2 (per-episode events) → Pass 3 (structural review) → Pass 4 (arc functions) |
| narratology | 1 context → 2 fabula → 3 actants → 4 story → 5 arc → 6 review |

Each prompt lives as a `.md` file under `src/tvplotlines/prompts/{hollywood,narratology}/`. The prompts encode narrative-theory rules (what a plotline is, what a setup vs climax is, when to merge two plotlines, what ranks mean). Between passes, `postprocess.py` computes objective things deterministically: event counts, plotline spans, ranks derived from event counts, orphan-event reassignment by character voting. The LLM is asked for judgements; the code is what tracks totals.

When two passes disagree (for example, code-computed rank vs LLM-reviewed rank), both values are kept in the output — the user sees the disagreement.

## Why this split

A naive single-prompt LLM extraction covers 5–12% of a season's source material; our measurements put `tvplotlines` at 78–91%. The gap comes from separating *what to look for* (narrative theory, written into the prompts) from *how to tally it* (deterministic code). Neither half is "AI deciding everything".

## What it cannot do

- The model hallucinates. Plotlines described in the output may exist only in the model's imagination; character names may be off; function labels may be wrong. Always verify against the source synopsis.
- Knowledge of the show is bounded by what was in the model's training data *and* what's in the synopses the user provides. Obscure shows with short synopses give thin results.
- The library does not fact-check its own output against any external source (no Wikipedia cross-reference at inference time, no viewer-rating database).
- The LLM is prompted to refuse cases where there is no clear plotline ("inferred" confidence), but the safeguard is soft — a confidently wrong answer is still possible.

## Training and data

The supported LLMs (Claude by Anthropic, GPT by OpenAI — the user picks one per run) are trained by their respective vendors on corpora those vendors do not fully disclose. **Alpine Animation does not train or fine-tune any model** — the library sends prompts to the vendor at runtime and consumes the response. No tvplotlines-specific training data exists.

See [`ai-disclosure.md`](ai-disclosure.md) for the data-flow details and vendor policy links.

## Where to check what the code actually does

- `src/tvplotlines/pipeline.py` — orchestrator for the hollywood flow
- `src/tvplotlines/narratology.py` — orchestrator for the narratology flow
- `src/tvplotlines/pass{0,1,2,3,4}.py` — per-pass hollywood logic
- `src/tvplotlines/postprocess.py` — deterministic span / rank / orphan-assignment logic
- `src/tvplotlines/prompts/{hollywood,narratology}/*.md` — every prompt the LLM receives
- [`formulas.md`](formulas.md) — every rule, threshold, and computation documented at one level above the code

## Limitations under EU AI Act

`tvplotlines` is a **general-purpose tool** for narrative analysis. It is not deployed in any Annex III high-risk context (law enforcement, essential public services, employment decisions). If an integrator puts it in one of those contexts, that integrator assumes the stricter Annex III obligations (Art. 11, Art. 12 technical documentation) — this methodology is not sufficient on its own for those cases.

## Contact for methodology questions

Write to <tvplotlines@alpineanimation.ch> or open an issue at <https://github.com/BirdInTheTree/tvplotlines/issues>.
