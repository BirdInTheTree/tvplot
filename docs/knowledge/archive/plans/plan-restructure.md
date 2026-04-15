---
type: plan
project: tvplotlines
status: active
---

# Project Restructuring Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure tvplotlines, tvplotlines-app, and knowledge repos to follow industry conventions for open-source Python libraries.

**Architecture:** Three repos with clear boundaries: tvplotlines (public library — code + user-facing docs), tvplotlines-app (private app — code + test data), knowledge (private — all research, notes, specs, experiments). Internal specs and research currently mixed into tvplotlines/docs/ and tvplotlines-app/research/ move to knowledge.

**Principles:**
- Public repo = what a user cloning from PyPI needs (code, tests, examples, user docs)
- App repo = what you need to run the app (code, tests, fixtures, synopses)
- Knowledge repo = everything else (specs, ADRs, research, experiments, book quotes, notes)

---

## Chunk 1: Clean up tvplotlines (library)

### Task 1: Remove empty directories

**Files:**
- Delete: `md/` (empty, only .DS_Store)
- Delete: `references/` (empty, only .DS_Store)

- [ ] **Step 1: Remove empty dirs**

```bash
rm -rf md/ references/
```

- [ ] **Step 2: Remove broken symlink**

`docs/storyline-extraction-reference.md` — symlink to old path, target no longer exists.

```bash
rm -f docs/storyline-extraction-reference.md
```

- [ ] **Step 3: Commit**

```bash
git add -A md/ references/ docs/storyline-extraction-reference.md
git commit -m "Remove empty directories and broken symlink"
```

---

### Task 2: Move architecture.md to knowledge

`docs/architecture.md` is an internal spec — describes pipeline internals, data structures, prompt strategy. A library user doesn't need this; they need a quickstart and API reference. This belongs in knowledge.

**Files:**
- Move: `docs/architecture.md` → `knowledge/specs/architecture.md`

- [ ] **Step 1: Create specs/ in knowledge and move**

```bash
mkdir -p /Users/nvashko/Projects/3-resources/knowledge/specs
mv docs/architecture.md /Users/nvashko/Projects/3-resources/knowledge/specs/architecture.md
```

- [ ] **Step 2: Commit in tvplotlines**

```bash
git add docs/architecture.md
git commit -m "Move internal architecture spec to knowledge repo"
```

- [ ] **Step 3: Commit in knowledge**

```bash
cd /Users/nvashko/Projects/3-resources/knowledge
git add specs/architecture.md
git commit -m "Add tvplotlines architecture spec (moved from tvplotlines/docs/)"
```

---

### Task 3: Create proper docs/ for public library

Industry standard for Python libraries: `docs/` contains user-facing documentation built with MkDocs or Sphinx. For now, create stubs that can grow.

**Files:**
- Create: `docs/index.md` (landing page)
- Create: `docs/quickstart.md` (getting started)
- Create: `docs/api.md` (API reference stub)

- [ ] **Step 1: Create docs/index.md**

```markdown
# tvplotlines

Automatic storyline extraction from TV series synopses.

## What it does

Feed episode synopses → get structured storylines, character arcs, and per-episode event breakdowns.

## Quick links

- [Quickstart](quickstart.md) — get running in 5 minutes
- [API Reference](api.md) — function signatures and data models
```

- [ ] **Step 2: Create docs/quickstart.md**

```markdown
# Quickstart

## Install

\`\`\`bash
pip install tvplotlines
\`\`\`

## Basic usage

\`\`\`python
from tvplotlines import get_plotlines

result = get_plotlines(
    show="Breaking Bad",
    season=1,
    episodes=["Synopsis of S01E01...", "Synopsis of S01E02...", ...],
)

for storyline in result.plotlines:
    print(f"{storyline.rank} | {storyline.name} ({storyline.driver})")
\`\`\`

## Configuration

\`\`\`python
result = get_plotlines(
    show="Breaking Bad",
    season=1,
    episodes=synopses,
    llm_provider="openai",       # or "anthropic" (default)
    pass2_mode="batch",          # "parallel" | "batch" | "sequential"
)
\`\`\`

See [API Reference](api.md) for all options.
```

- [ ] **Step 3: Create docs/api.md stub**

```markdown
# API Reference

## get_plotlines()

Main entry point. Extracts storylines from a season of TV synopses.

*Full reference will be auto-generated from docstrings.*
```

- [ ] **Step 4: Commit**

```bash
git add docs/
git commit -m "Add user-facing documentation stubs (quickstart, API reference)"
```

---

## Chunk 2: Clean up tvplotlines-app

### Task 4: Remove empty directories from tvplotlines-app

**Files:**
- Delete: `png/` (empty)

- [ ] **Step 1: Remove**

```bash
cd /Users/nvashko/Projects/1-projects/tvplotlines-app
rm -rf png/
```

- [ ] **Step 2: Commit**

```bash
git add -A png/
git commit -m "Remove empty png/ directory"
```

---

### Task 5: Move ADRs from tvplotlines-app to knowledge

Architecture Decision Records are project-level knowledge, not app code. They document why decisions were made — useful across both tvplotlines and tvplotlines-app.

**Files:**
- Move: `research/decisions/` (5 ADR files) → `knowledge/decisions/`

- [ ] **Step 1: Move**

```bash
mv research/decisions/ /Users/nvashko/Projects/3-resources/knowledge/decisions/
```

- [ ] **Step 2: Commit in tvplotlines-app**

```bash
git add research/decisions/
git commit -m "Move ADRs to knowledge repo"
```

- [ ] **Step 3: Commit in knowledge**

```bash
cd /Users/nvashko/Projects/3-resources/knowledge
git add decisions/
git commit -m "Add Architecture Decision Records (moved from tvplotlines-app)"
```

---

### Task 6: Move research notes and references to knowledge

Strategy docs, audit, book quotes, design docs, notes — all knowledge, not app code.

**Files to move:**
- `research/inventory.md` → `knowledge/specs/inventory.md`
- `research/open-source-strategy.md` → `knowledge/specs/open-source-strategy.md`
- `research/mas4bw-library-audit.md` → `knowledge/specs/mas4bw-library-audit.md`
- `research/metrics-survey.md` → `knowledge/specs/metrics-survey.md`
- `research/synopsis-authoring-protocol.md` → `knowledge/specs/synopsis-authoring-protocol.md`
- `research/CONTEXT.md` → `knowledge/specs/tvplotlines-app-context.md`
- `research/notes/` → `knowledge/notes/tvplotlines-app/`
- `research/references/` → `knowledge/references/`

- [ ] **Step 1: Create target dirs and move**

```bash
mkdir -p /Users/nvashko/Projects/3-resources/knowledge/specs
mkdir -p /Users/nvashko/Projects/3-resources/knowledge/notes/tvplotlines-app
mkdir -p /Users/nvashko/Projects/3-resources/knowledge/references

# Strategy/audit docs
mv research/inventory.md /Users/nvashko/Projects/3-resources/knowledge/specs/
mv research/open-source-strategy.md /Users/nvashko/Projects/3-resources/knowledge/specs/
mv research/mas4bw-library-audit.md /Users/nvashko/Projects/3-resources/knowledge/specs/
mv research/metrics-survey.md /Users/nvashko/Projects/3-resources/knowledge/specs/
mv research/synopsis-authoring-protocol.md /Users/nvashko/Projects/3-resources/knowledge/specs/
mv research/CONTEXT.md /Users/nvashko/Projects/3-resources/knowledge/specs/tvplotlines-app-context.md

# Notes
mv research/notes/* /Users/nvashko/Projects/3-resources/knowledge/notes/tvplotlines-app/
rmdir research/notes/

# References (book quotes, design docs)
mv research/references/* /Users/nvashko/Projects/3-resources/knowledge/references/
rmdir research/references/
```

- [ ] **Step 2: Commit in tvplotlines-app**

```bash
git add research/inventory.md research/open-source-strategy.md research/mas4bw-library-audit.md research/metrics-survey.md research/synopsis-authoring-protocol.md research/CONTEXT.md research/notes/ research/references/
git commit -m "Move research notes, references, and strategy docs to knowledge repo"
```

- [ ] **Step 3: Commit in knowledge**

```bash
cd /Users/nvashko/Projects/3-resources/knowledge
git add specs/ notes/tvplotlines-app/ references/
git commit -m "Add tvplotlines-app specs, notes, and references"
```

---

### Task 7: Move autoresearch experiments to knowledge

Experiment logs, results TSVs, program descriptions — research, not app code.

**Files:**
- Move: `research/autoresearch/` → `knowledge/experiments/autoresearch/`
- Move: `research/breakdowns/` → `knowledge/experiments/breakdowns/`

- [ ] **Step 1: Move**

```bash
mkdir -p /Users/nvashko/Projects/3-resources/knowledge/experiments
mv research/autoresearch/ /Users/nvashko/Projects/3-resources/knowledge/experiments/autoresearch/
mv research/breakdowns/ /Users/nvashko/Projects/3-resources/knowledge/experiments/breakdowns/
```

- [ ] **Step 2: Commit in tvplotlines-app**

```bash
git add research/autoresearch/ research/breakdowns/
git commit -m "Move experiment logs and breakdowns to knowledge repo"
```

- [ ] **Step 3: Commit in knowledge**

```bash
cd /Users/nvashko/Projects/3-resources/knowledge
git add experiments/
git commit -m "Add autoresearch experiments and episode breakdowns"
```

---

### Task 8: Reorganize what stays in tvplotlines-app

After moves, `research/` should contain only operational data: synopses (test input), results (test output), scripts (utilities). Rename to make purpose clear.

**Remaining in research/:**
- `research/synopses/` — test data, stays
- `research/results/` — pipeline outputs, stays
- `research/scripts/` — utilities, stays
- `research/compute_all_metrics.py`, `compute_embedding_metrics.py`, `per_line_diagnostics.py` — utilities, stay

- [ ] **Step 1: Rename research/ → data/**

`research/` implies knowledge. What stays is operational data: inputs and outputs for the pipeline.

```bash
mv research/ data/
```

- [ ] **Step 2: Update any imports/references**

Check if scripts reference `research/` paths internally.

```bash
grep -r "research/" data/scripts/ data/*.py
```

Fix paths if found.

- [ ] **Step 3: Commit**

```bash
git add -A research/ data/
git commit -m "Rename research/ to data/ — only operational data remains"
```

---

## Chunk 3: Update knowledge registry and MOCs

### Task 9: Add new knowledge dirs to build_registry.py

**Files:**
- Modify: `knowledge/scripts/build_registry.py` — add specs/, decisions/, references/, experiments/ to local dirs scan
- Modify: `knowledge/CLAUDE.md` — update structure description

- [ ] **Step 1: Update _LOCAL_DIRS in build_registry.py**

Add entries for new local directories:

```python
_LOCAL_DIRS = {
    "preprint/sources": ("preprint-sources", "tvplotlines"),
    "preprint/style": ("preprint-style", "tvplotlines"),
    "decisions": ("decisions", "tvplotlines"),
    "specs": ("specs", "tvplotlines"),
    "references": ("references", "tvplotlines"),
    "experiments/autoresearch": ("autoresearch", "tvplotlines"),
    "experiments/breakdowns": ("breakdowns", "tvplotlines"),
    "notes/tvplotlines-app": ("tvplotlines-app-notes", "tvplotlines-app"),
}
```

- [ ] **Step 2: Rebuild registry**

```bash
python scripts/build_registry.py
```

- [ ] **Step 3: Update CLAUDE.md with new structure**

- [ ] **Step 4: Commit**

```bash
git add scripts/build_registry.py registry.yaml CLAUDE.md
git commit -m "Index new knowledge dirs (specs, decisions, references, experiments)"
```

---

### Task 10: Update tvplotlines CLAUDE.md

Remove references to `docs/inventory.md`, `docs/open-source-strategy.md`, `docs/mas4bw-library-audit.md` — they've moved to knowledge.

**Files:**
- Modify: `tvplotlines/CLAUDE.md`

- [ ] **Step 1: Update file references**

Remove lines referencing moved files. Add pointer to knowledge repo.

- [ ] **Step 2: Commit**

```bash
git commit -m "Update CLAUDE.md — remove references to moved docs"
```

---

### Task 11: Update todo.md

Mark restructuring tasks complete.

- [ ] **Step 1: Update tasks/todo.md**
- [ ] **Step 2: Commit**

---

## Target structure after restructuring

### tvplotlines/ (public library)
```
tvplotlines/
├── src/tvplotlines/          # library code + prompts
├── tests/                # unit tests
├── examples/             # usage examples
├── docs/                 # user-facing: quickstart, API ref
│   ├── index.md
│   ├── quickstart.md
│   └── api.md
├── tasks/                # session tracking (gitignored or untracked)
├── pyproject.toml
├── README.md
├── LICENSE
├── CLAUDE.md
└── .gitignore
```

### tvplotlines-app/ (private application)
```
tvplotlines-app/
├── src/plotter_app/      # app code
├── tests/                # app tests
├── data/                 # operational data
│   ├── synopses/         # test input (250+ episodes)
│   ├── results/          # pipeline output (20 JSON files)
│   └── scripts/          # utility scripts
├── docs/superpowers/     # current feature plans
├── viz/                  # generated visualizations
├── pyproject.toml
└── .gitignore
```

### knowledge/ (private knowledge base)
```
knowledge/
├── preprint/             # paper-writing materials
│   ├── sources/          # paper notes (brown, kojima, zhang)
│   ├── style/            # style analyses (russell, dfw, quine)
│   └── ...               # drafts, bib, style-guide
├── specs/                # internal specifications
│   ├── architecture.md   # pipeline internals
│   ├── inventory.md      # what's ours vs borrowed
│   ├── open-source-strategy.md
│   ├── mas4bw-library-audit.md
│   └── ...
├── decisions/            # ADRs (001-005)
├── references/           # book quotes, design docs
├── experiments/          # autoresearch, breakdowns
├── notes/                # misc notes
├── maps/                 # thematic MOCs
├── templates/            # YAML frontmatter templates
├── scripts/              # build_registry.py
├── _sources/             # symlinks to external projects
├── registry.yaml         # auto-generated index
├── setup.sh
└── CLAUDE.md
```
