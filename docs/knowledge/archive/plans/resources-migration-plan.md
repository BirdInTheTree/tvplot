---
type: plan
project: tvplotlines
status: active
---

# 3-resources Flat Migration Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Flatten `3-resources/` from 30+ nested folders into a single flat directory with YAML frontmatter, Templater templates, and Dataview navigation.

**Architecture:** Move all files to `3-resources/` root, rename per convention (`project-name.md`), add frontmatter (`type`, `project`, `status`). Templates go to `.obsidian/templates/`. Delete `birdinthetree.github.io_docs/` entirely. Non-markdown files renamed to match convention and kept flat.

**Tech Stack:** Obsidian, Templater plugin, Dataview plugin

**Spec:** `3-resources/plotter_docs/superpowers/specs/2026-03-18-resources-restructure-design.md`

---

### Task 1: Safety backup

- [ ] **Step 1: Create timestamped backup of entire 3-resources/**

```bash
cp -a /Users/nvashko/Projects/3-resources /Users/nvashko/Projects/3-resources-backup-2026-03-18
```

- [ ] **Step 2: Verify backup**

```bash
diff <(find /Users/nvashko/Projects/3-resources -type f | wc -l) <(find /Users/nvashko/Projects/3-resources-backup-2026-03-18 -type f | wc -l)
```

Expected: same file count.

---

### Task 2: Create Templater templates and config

**Files:**
- Create: `.obsidian/templates/_chooser.md`
- Create: `.obsidian/templates/_tpl-document.md`
- Create: `.obsidian/templates/_tpl-reading.md`
- Create: `.obsidian/templates/_tpl-moc.md`
- Create: `.obsidian/templates/_tpl-blog-post.md`
- Create: `.obsidian/plugins/templater-obsidian/data.json`

- [ ] **Step 1: Create templates directory**

```bash
mkdir -p /Users/nvashko/Projects/.obsidian/templates
```

- [ ] **Step 2: Create dispatcher template `_chooser.md`**

```markdown
<%*
const templates = {
  "Document (spec, plan, decision, note, draft, ref)": "_tpl-document",
  "Reading (paper notes)": "_tpl-reading",
  "MOC (Map of Content)": "_tpl-moc",
  "Blog Post": "_tpl-blog-post"
};
const names = Object.keys(templates);
const chosen = await tp.system.suggester(names, names, true, "Choose template");
const tplName = templates[chosen];
const tpl = await app.vault.getAbstractFileByPath(`.obsidian/templates/${tplName}.md`);
const content = await app.vault.read(tpl);
// Process Templater syntax in the included template
const result = await tp.file.include(`[[${tplName}]]`);
tR += result;
%>
```

- [ ] **Step 3: Create `_tpl-document.md`**

```markdown
<%*
const types = ["spec", "plan", "decision", "note", "draft", "ref", "concept", "style-analysis"];
const projects = ["tvplotlines", "preprint", "tvplotlines-app", "zotero-mcp", "awesome-list", "github-io"];
const type = await tp.system.suggester(types, types, true, "Document type");
const project = await tp.system.suggester(projects, projects, true, "Project");
-%>
---
type: <% type %>
project: <% project %>
status: active
---

# <% tp.file.title %>
```

- [ ] **Step 4: Create `_tpl-reading.md`**

```markdown
<%*
const projects = ["tvplotlines", "preprint", "tvplotlines-app", "zotero-mcp", "awesome-list", "github-io"];
const project = await tp.system.suggester(projects, projects, true, "Project");
const title = await tp.system.prompt("Paper title");
const authors = await tp.system.prompt("Authors (comma-separated)");
const year = await tp.system.prompt("Year");
const tags = await tp.system.prompt("Tags (comma-separated)");
const authorList = authors.split(",").map(a => a.trim());
const tagList = tags.split(",").map(t => t.trim());
-%>
---
type: reading
title: "<% title %>"
authors: [<% authorList.join(", ") %>]
year: <% year %>
tags: [<% tagList.join(", ") %>]
project: <% project %>
status: active
---

# <% tp.file.title %>

**Source:** URL or DOI
**Category:** empirical | theoretical | method | survey | benchmark

## Claim

What the authors assert (1-2 sentences, in your own words).

<!--
Principles:
- Self-contained: reader who never read the paper understands in 30 seconds
- Your words, not theirs. Direct quotes only for language worth citing verbatim
- If you can't fill "Relevance" — the paper doesn't belong here
-->

## Method & Evidence

How they support the claim: dataset, experiment design, key metrics,
main quantitative results. Enough to judge credibility without
reading the original.

## Limitations

What the authors acknowledge as weak, or what we see as gaps.

## Relevance

What this means for our work. Concrete: which part of the pipeline,
which argument in the preprint, which design decision it supports
or challenges.
```

- [ ] **Step 5: Create `_tpl-moc.md`**

```markdown
<%*
const tags = await tp.system.prompt("Tags for Dataview filter (comma-separated)");
const tagList = tags.split(",").map(t => `"${t.trim()}"`).join(", ");
-%>
---
type: moc
tags: [<% tags.split(",").map(t => t.trim()).join(", ") %>]
status: active
---

# <% tp.file.title %>

```dataview
TABLE type, file.cday as "Created"
FROM "3-resources"
WHERE contains(tags, [<% tagList %>]) AND status = "active"
SORT file.cday DESC
```
```

- [ ] **Step 6: Create `_tpl-blog-post.md`**

```markdown
---
type: draft
project: github-io
status: active
title: ""
date: "<% tp.date.now("YYYY-MM-DD") %>"
description: ""
series: "What Logic Can Do for Stories"
tags: []
sources:
  - reading_note: ""
    sections_used: []
---

# <% tp.file.title %>

> One-paragraph hook: the engineering problem. No jargon.

## The problem

What goes wrong without formal structure. 3-5 sentences.

## What the literature offers

2-4 approaches, one paragraph each.

## The bridge: from theory to pipeline

How does this formal method become a prompt, a data model, or an algorithm?

## Takeaway

3-5 bullet points.

## Further reading
```

- [ ] **Step 7: Write Templater data.json**

Write to `/Users/nvashko/Projects/.obsidian/plugins/templater-obsidian/data.json`:

```json
{
  "command_timeout": 5,
  "templates_folder": ".obsidian/templates",
  "templates_pairs": [["", ""]],
  "trigger_on_file_creation": true,
  "auto_jump_to_cursor": true,
  "enable_system_commands": false,
  "shell_path": "",
  "user_scripts_folder": "",
  "enable_folder_templates": true,
  "folder_templates": [
    {
      "folder": "3-resources",
      "template": ".obsidian/templates/_chooser.md"
    }
  ],
  "syntax_highlighting": true,
  "syntax_highlighting_mobile": false,
  "enabled_templates_hotkeys": [""],
  "startup_templates": [""]
}
```

- [ ] **Step 8: Verify in Obsidian**

Restart Obsidian (or reload plugins). Create a test file in `3-resources/`. Templater should show the template picker. Delete the test file after verification.

---

### Task 3: Delete birdinthetree.github.io_docs/

Before deleting, extract the 7 useful markdown files.

- [ ] **Step 1: Move useful docs to 3-resources/ root with new names**

```bash
cd /Users/nvashko/Projects/3-resources
mv birdinthetree.github.io_docs/blog/bio-quotes.md github-io-bio-quotes.md
mv birdinthetree.github.io_docs/blog/content-plan.md github-io-content-plan.md
mv birdinthetree.github.io_docs/todo/analytics-visualization-redesign.md github-io-analytics-visualization-redesign.md
mv birdinthetree.github.io_docs/todo/bugs-github-pages-ui.md github-io-bugs-ui.md
mv birdinthetree.github.io_docs/todo/design-github-pages.md github-io-design.md
mv birdinthetree.github.io_docs/todo/episode-number-from-filename.md github-io-episode-number-from-filename.md
mv birdinthetree.github.io_docs/todo/plan-github-pages.md github-io-plan.md
```

- [ ] **Step 2: Delete the entire directory**

```bash
rm -rf /Users/nvashko/Projects/3-resources/birdinthetree.github.io_docs
```

- [ ] **Step 3: Add frontmatter to moved files**

Each file gets:
```yaml
---
type: plan  # or note, depending on content
project: github-io
status: active
---
```

---

### Task 4: Flatten awesome list/

- [ ] **Step 1: Move and rename**

```bash
cd /Users/nvashko/Projects/3-resources
mv "awesome list/bibliography-event-detection-computational-narratology.md" awesome-list-bibliography-event-detection.md
mv "awesome list/curation-criteria.md" awesome-list-curation-criteria.md
mv "awesome list/pianzola-2025-golem-ontology.md" read-pianzola-2025-golem-ontology.md
```

- [ ] **Step 2: Update/add frontmatter**

`awesome-list-curation-criteria.md`: add `type: note`, `project: awesome-list`, `status: active`
`awesome-list-bibliography-event-detection.md`: update existing frontmatter, add `status: active`
`read-pianzola-2025-golem-ontology.md`: update existing frontmatter to `type: reading`, add `status: active`

- [ ] **Step 3: Delete empty directory**

```bash
rmdir /Users/nvashko/Projects/3-resources/"awesome list"
```

---

### Task 5: Flatten tvplotlines-app_docs/

- [ ] **Step 1: Move and rename**

```bash
cd /Users/nvashko/Projects/3-resources
mv tvplotlines-app_docs/specs/tvplotlines-app-context.md tvplotlines-app-context.md
mv tvplotlines-app_docs/4reddit.md tvplotlines-app-reddit-strategy.md
mv "tvplotlines-app_docs/Как украсть сериал.md" tvplotlines-app-kak-ukrast-serial.md
```

- [ ] **Step 2: Add frontmatter to each**

- `tvplotlines-app-context.md`: `type: spec`, `project: tvplotlines-app`, `status: active`
- `tvplotlines-app-reddit-strategy.md`: `type: plan`, `project: tvplotlines-app`, `status: active`
- `tvplotlines-app-kak-ukrast-serial.md`: `type: note`, `project: tvplotlines-app`, `status: active`

- [ ] **Step 3: Delete empty directory tree**

```bash
rm -rf /Users/nvashko/Projects/3-resources/tvplotlines-app_docs
```

---

### Task 6: Flatten zotero-mcp_docs/

- [ ] **Step 1: Move and rename**

```bash
cd /Users/nvashko/Projects/3-resources
mv zotero-mcp_docs/plans/2026-03-17-zotero-mcp.md zotero-mcp-plan.md
mv zotero-mcp_docs/specs/2026-03-17-zotero-mcp-design.md zotero-mcp-design.md
```

- [ ] **Step 2: Add frontmatter**

- `zotero-mcp-plan.md`: `type: plan`, `project: zotero-mcp`, `status: active`
- `zotero-mcp-design.md`: `type: spec`, `project: zotero-mcp`, `status: active`

- [ ] **Step 3: Delete empty directory tree**

```bash
rm -rf /Users/nvashko/Projects/3-resources/zotero-mcp_docs
```

---

### Task 7: Flatten plotter_docs/ — decisions, specs, todo

- [ ] **Step 1: Move decisions**

```bash
cd /Users/nvashko/Projects/3-resources
mv plotter_docs/decisions/001-context-before-extraction.md tvplotlines-decision-001-context-before-extraction.md
mv plotter_docs/decisions/002-no-internal-state.md tvplotlines-decision-002-no-internal-state.md
mv plotter_docs/decisions/003-abc-classification.md tvplotlines-decision-003-abc-classification.md
mv plotter_docs/decisions/004-no-language-parameter.md tvplotlines-decision-004-no-language-parameter.md
mv plotter_docs/decisions/005-pass3-narratologist-review.md tvplotlines-decision-005-pass3-narratologist-review.md
```

- [ ] **Step 2: Move specs**

```bash
mv plotter_docs/specs/architecture.md tvplotlines-architecture.md
mv plotter_docs/specs/inventory.md tvplotlines-inventory.md
mv plotter_docs/specs/mas4bw-library-audit.md tvplotlines-mas4bw-library-audit.md
mv plotter_docs/specs/metrics-survey.md tvplotlines-metrics-survey.md
mv plotter_docs/specs/open-source-strategy.md tvplotlines-open-source-strategy.md
mv plotter_docs/specs/stability-benchmark.md tvplotlines-stability-benchmark.md
mv plotter_docs/specs/synopsis-authoring-protocol.md tvplotlines-synopsis-authoring-protocol.md
```

- [ ] **Step 3: Move todo**

```bash
mv plotter_docs/todo/autoresearch-v3-hybrid-vs-procedural.md tvplotlines-autoresearch-v3-hybrid-vs-procedural.md
mv plotter_docs/todo/bibliography-cleanup.md tvplotlines-bibliography-cleanup.md
mv plotter_docs/todo/career-plan.md tvplotlines-career-plan.md
mv plotter_docs/todo/event-functions-redesign.md tvplotlines-event-functions-redesign.md
mv plotter_docs/todo/plan-restructure.md tvplotlines-plan-restructure.md
mv plotter_docs/todo/tvplotlines-tasks-todo.md tvplotlines-tasks-todo.md
```

- [ ] **Step 4: Move root-level non-markdown**

```bash
mv plotter_docs/awesome-shortlist.bib tvplotlines-awesome-shortlist.bib
```

- [ ] **Step 5: Move superpowers/**

```bash
mv plotter_docs/superpowers/plans/2026-03-16-preprint-writing.md preprint-writing-plan.md
mv plotter_docs/superpowers/specs/2026-03-16-preprint-design.md preprint-design-spec.md
mv plotter_docs/superpowers/specs/2026-03-18-resources-restructure-design.md tvplotlines-resources-restructure-design.md
```

- [ ] **Step 6: Add frontmatter to all moved files**

All decisions: `type: decision`, `project: tvplotlines`, `status: active`
All specs: `type: spec`, `project: tvplotlines`, `status: active`
All todos: `type: plan`, `project: tvplotlines`, `status: active`
Superpowers plans: `type: plan`, `project: preprint`, `status: active`
Superpowers specs: `type: spec`, `project: preprint`, `status: active`
Resources restructure: `type: spec`, `project: tvplotlines`, `status: active`

---

### Task 8: Flatten plotter_docs/experiments/

- [ ] **Step 1: Move root experiment files**

```bash
cd /Users/nvashko/Projects/3-resources
mv plotter_docs/experiments/autoresearch-v3-brainstorm-notes.md tvplotlines-autoresearch-v3-brainstorm-notes.md
mv plotter_docs/experiments/autoresearch-v3-event-functions.md tvplotlines-autoresearch-v3-event-functions.md
mv plotter_docs/experiments/autoresearch-v3-reading-plan.md tvplotlines-autoresearch-v3-reading-plan.md
mv plotter_docs/experiments/bibliography-narrative-and-autoresearch.md tvplotlines-bibliography-narrative-and-autoresearch.md
mv plotter_docs/experiments/naive-vs-tvplotlines.md tvplotlines-naive-vs-tvplotlines.md
mv plotter_docs/experiments/notes-liu-2026-narrative-survey.md read-liu-2026-narrative-survey.md
mv plotter_docs/experiments/notes-tian-2024-turning-points.md read-tian-2024-turning-points.md
mv plotter_docs/experiments/run_bb_all_seasons.py tvplotlines-run-bb-all-seasons.py
```

- [ ] **Step 2: Move autoresearch/ subdirectory**

```bash
mv plotter_docs/experiments/autoresearch/experiment-log.md tvplotlines-autoresearch-experiment-log.md
mv plotter_docs/experiments/autoresearch/program-v2.md tvplotlines-autoresearch-program-v2.md
mv plotter_docs/experiments/autoresearch/program.md tvplotlines-autoresearch-program.md
mv plotter_docs/experiments/autoresearch/prompt-experiment-ideas.md tvplotlines-autoresearch-prompt-experiment-ideas.md
mv plotter_docs/experiments/autoresearch/run-v2.md tvplotlines-autoresearch-run-v2.md
mv plotter_docs/experiments/autoresearch/summary-v2.md tvplotlines-autoresearch-summary-v2.md
mv plotter_docs/experiments/autoresearch/results-v2.tsv tvplotlines-autoresearch-results-v2.tsv
mv plotter_docs/experiments/autoresearch/results.tsv tvplotlines-autoresearch-results.tsv
```

- [ ] **Step 3: Move bb_results/ (JSON)**

```bash
mv plotter_docs/experiments/bb_results/bb_s01_result.json tvplotlines-bb-s01-result.json
mv plotter_docs/experiments/bb_results/bb_s02_result.json tvplotlines-bb-s02-result.json
mv plotter_docs/experiments/bb_results/bb_s03_result.json tvplotlines-bb-s03-result.json
mv plotter_docs/experiments/bb_results/bb_s04_result.json tvplotlines-bb-s04-result.json
mv plotter_docs/experiments/bb_results/bb_s05_result.json tvplotlines-bb-s05-result.json
```

- [ ] **Step 4: Move breakdowns/**

```bash
mv plotter_docs/experiments/breakdowns/GDR_S01_breakdown.md tvplotlines-breakdown-gdr-s01.md
mv plotter_docs/experiments/breakdowns/SP_S01_breakdown.md tvplotlines-breakdown-sp-s01.md
mv plotter_docs/experiments/breakdowns/TD_S01_breakdown.md tvplotlines-breakdown-td-s01.md
```

- [ ] **Step 5: Move reading-notes/**

```bash
mv plotter_docs/experiments/reading-notes/autoresearch-v3-questions.md tvplotlines-autoresearch-v3-questions.md
mv plotter_docs/experiments/reading-notes/blueprint-first-qiu-2025.md read-qiu-2025-blueprint-first.md
mv plotter_docs/experiments/reading-notes/cot-wei-2022.md read-wei-2022-cot.md
mv plotter_docs/experiments/reading-notes/got-besta-2024.md read-besta-2024-got.md
mv plotter_docs/experiments/reading-notes/tot-yao-2023.md read-yao-2023-tot.md
```

- [ ] **Step 6: Add frontmatter**

Experiment files: `type: note`, `project: tvplotlines`, `status: active`
Reading notes (read-*): `type: reading`, `project: tvplotlines`, `status: active`
Breakdowns: `type: note`, `project: tvplotlines`, `status: active`

---

### Task 9: Flatten plotter_docs/preprint/

- [ ] **Step 1: Move preprint root files**

```bash
cd /Users/nvashko/Projects/3-resources
mv plotter_docs/preprint/autoresearcher-competence-idea.md preprint-autoresearcher-competence-idea.md
mv plotter_docs/preprint/blog-post-guide.md preprint-blog-post-guide.md
mv plotter_docs/preprint/draft-fragments.md preprint-draft-fragments.md
mv plotter_docs/preprint/drafts.md preprint-drafts.md
mv plotter_docs/preprint/event-detection-sources.md preprint-event-detection-sources.md
mv plotter_docs/preprint/notes.md preprint-notes.md
mv plotter_docs/preprint/paper-summary-guide.md preprint-paper-summary-guide.md
mv plotter_docs/preprint/positioning-strategy.md preprint-positioning-strategy.md
mv plotter_docs/preprint/reference-list.md preprint-reference-list.md
mv plotter_docs/preprint/writing-rules.md preprint-writing-rules.md
mv plotter_docs/preprint/eastern-narratives.bib preprint-eastern-narratives.bib
mv plotter_docs/preprint/style-guide.mmd preprint-style-guide.mmd
```

- [ ] **Step 2: Move paper/ subdirectory**

```bash
mv plotter_docs/preprint/paper/00-abstract.md preprint-abstract.md
mv plotter_docs/preprint/paper/03-method.md preprint-method.md
mv plotter_docs/preprint/paper/evaluation-event-functions.md preprint-evaluation-event-functions.md
mv "plotter_docs/preprint/paper/glossary 1.md" preprint-glossary-old.md
mv plotter_docs/preprint/paper/glossary-antipatterns.md preprint-glossary-antipatterns.md
mv plotter_docs/preprint/paper/glossary.md preprint-glossary.md
mv "plotter_docs/preprint/paper/kinda draft.md" preprint-kinda-draft.md
mv plotter_docs/preprint/paper/related-work-citations.md preprint-related-work-citations.md
mv plotter_docs/preprint/paper/wittgenstein-chomsky-conditions-ru.md preprint-wittgenstein-chomsky-conditions-ru.md
mv plotter_docs/preprint/paper/wittgenstein-logic-as-conditions.md preprint-wittgenstein-logic-as-conditions.md
```

- [ ] **Step 3: Move sources/ (paper summaries → readings)**

```bash
mv plotter_docs/preprint/sources/brown-2020-gpt3.md read-brown-2020-gpt3.md
mv plotter_docs/preprint/sources/freytag-1863-dramatic-structure.md read-freytag-1863-dramatic-structure.md
mv plotter_docs/preprint/sources/genette-1980-narrative-discourse.md read-genette-1980-narrative-discourse.md
mv plotter_docs/preprint/sources/index.md preprint-sources-index.md
mv plotter_docs/preprint/sources/jang-2021-just-ask-generalization.md read-jang-2021-just-ask-generalization.md
mv plotter_docs/preprint/sources/karpathy-2023-english-programming.md read-karpathy-2023-english-programming.md
mv plotter_docs/preprint/sources/karpathy-2026-autoresearch.md read-karpathy-2026-autoresearch.md
mv plotter_docs/preprint/sources/kojima-2022-zero-shot-cot.md read-kojima-2022-zero-shot-cot.md
mv plotter_docs/preprint/sources/ramnath-2025-apo-survey.md read-ramnath-2025-apo-survey.md
mv plotter_docs/preprint/sources/wei-2022-chain-of-thought.md read-wei-2022-chain-of-thought.md
mv plotter_docs/preprint/sources/zhang-2025-seriesbench.md read-zhang-2025-seriesbench.md
mv plotter_docs/preprint/sources/zhou-2022-least-to-most.md read-zhou-2022-least-to-most.md
```

Note: `TEMPLATE for paper summary.md` — already covered by `_tpl-reading.md`, delete it.

- [ ] **Step 4: Move style/ subdirectory**

```bash
mv "plotter_docs/preprint/style/scientists for style.md" preprint-scientists-for-style.md
mv plotter_docs/preprint/style/style-notes-dfw.md preprint-style-notes-dfw.md
mv plotter_docs/preprint/style/style-notes-kaplan-scaling.md preprint-style-notes-kaplan-scaling.md
mv plotter_docs/preprint/style/style-notes-quine.md preprint-style-notes-quine.md
mv plotter_docs/preprint/style/style-notes-russell.md preprint-style-notes-russell.md
mv plotter_docs/preprint/style/style-notes-sparks-of-agi.md preprint-style-notes-sparks-of-agi.md
mv plotter_docs/preprint/style/style-notes-sutton-bitter-lesson.md preprint-style-notes-sutton-bitter-lesson.md
mv plotter_docs/preprint/style/style-phrases-dfw.md preprint-style-phrases-dfw.md
mv plotter_docs/preprint/style/style-phrases-kaplan-scaling.md preprint-style-phrases-kaplan-scaling.md
mv plotter_docs/preprint/style/style-phrases-quine.md preprint-style-phrases-quine.md
mv plotter_docs/preprint/style/style-phrases-russell.md preprint-style-phrases-russell.md
mv plotter_docs/preprint/style/style-phrases-sparks-of-agi.md preprint-style-phrases-sparks-of-agi.md
```

- [ ] **Step 5: Add frontmatter**

Preprint docs: `type: draft` or `type: note` or `type: ref`, `project: preprint`, `status: active`
Paper summaries (read-*): `type: reading`, `project: preprint`, `status: active`
Style notes: `type: style-analysis`, `project: preprint`, `status: active`

- [ ] **Step 6: Delete TEMPLATE for paper summary.md**

```bash
rm "plotter_docs/preprint/sources/TEMPLATE for paper summary.md"
```

---

### Task 10: Flatten knowledge/

- [ ] **Step 1: Move maps/ → moc-* files**

```bash
cd /Users/nvashko/Projects/3-resources
mv knowledge/maps/bibliography.md moc-bibliography.md
mv knowledge/maps/llm-prompting.md moc-llm-prompting.md
mv knowledge/maps/narrative-theory.md moc-narrative-theory.md
mv knowledge/maps/tvplotlines-research.md moc-tvplotlines-research.md
mv knowledge/maps/screenwriting-craft.md moc-screenwriting-craft.md
mv knowledge/maps/writing-style.md moc-writing-style.md
```

- [ ] **Step 2: Move references/**

```bash
mv knowledge/references/01_extract_quotes.md knowledge-extract-quotes.md
mv knowledge/references/2026-03-09-plotlines-knowledge-base-design.md knowledge-plotlines-kb-design.md
mv knowledge/references/book-outlines.md knowledge-book-outlines.md
mv knowledge/references/books2series-onepage.md knowledge-books2series-onepage.md
mv knowledge/references/taxonomy-approach.md knowledge-taxonomy-approach.md
mv "knowledge/references/Что делает Discourse для сериала.md" knowledge-discourse-for-serials.md
mv knowledge/references/structure_sketch.yaml knowledge-structure-sketch.yaml
```

- [ ] **Step 3: Move plotlines-quotes/ JSON files**

```bash
mv knowledge/references/plotlines-quotes/douglas_writing_tv_drama.json knowledge-quotes-douglas.json
mv knowledge/references/plotlines-quotes/landau_tv_showrunners.json knowledge-quotes-landau.json
mv knowledge/references/plotlines-quotes/nash_savethecat_tv.json knowledge-quotes-nash.json
mv knowledge/references/plotlines-quotes/pena_developing_series.json knowledge-quotes-pena.json
mv knowledge/references/plotlines-quotes/venis_inside_the_room.json knowledge-quotes-venis.json
```

- [ ] **Step 4: Move prompting files**

```bash
mv "knowledge/propmpting/Boris Cherny pipeline.md" knowledge-boris-cherny-pipeline.md
mv knowledge/propmpting/claude_pipline_prompt.md knowledge-claude-pipeline-prompt.md
mv "knowledge/propmpting/xml tags.md" knowledge-xml-tags.md
mv knowledge/propmpting/claude_best_practices.jpg knowledge-claude-best-practices.jpg
mv knowledge/propmpting/claude_pipline_prompt.jpg knowledge-claude-pipeline-prompt.jpg
```

- [ ] **Step 5: Move books4style/ PDFs**

```bash
mv "knowledge/propmpting/books4style/A Supposedly Fun Thing Ill Never Do Again .pdf" "knowledge-pdf-dfw-supposedly-fun-thing.pdf"
mv "knowledge/propmpting/books4style/Both Flesh and Not Essays.pdf" "knowledge-pdf-dfw-both-flesh-and-not.pdf"
mv "knowledge/propmpting/books4style/Consider the Lobster And Other Essays (David Foster Wallace) .pdf" "knowledge-pdf-dfw-consider-the-lobster.pdf"
mv "knowledge/propmpting/books4style/Fate, Time, and Language An Essay on Free Will ).pdf" "knowledge-pdf-dfw-fate-time-language.pdf"
mv "knowledge/propmpting/books4style/From a Logical Point of View (Willard Van Orman Quine.pdf" "knowledge-pdf-quine-from-a-logical-point.pdf"
mv "knowledge/propmpting/books4style/HDYVd4IaMAgWp2p.jpg" "knowledge-img-books4style.jpg"
mv "knowledge/propmpting/books4style/Ontological relativity and other essays WVOQ.pdf" "knowledge-pdf-quine-ontological-relativity.pdf"
mv "knowledge/propmpting/books4style/Russell(1905).pdf" "knowledge-pdf-russell-1905.pdf"
mv "knowledge/propmpting/books4style/The Bitter Lesson.pdf" "knowledge-pdf-sutton-bitter-lesson.pdf"
mv "knowledge/propmpting/books4style/The roots of reference the Paul Carus lectures (Quine, W. V) .pdf" "knowledge-pdf-quine-roots-of-reference.pdf"
mv "knowledge/propmpting/books4style/Word and Object (Willard Van Orman Quine) .pdf" "knowledge-pdf-quine-word-and-object.pdf"
```

- [ ] **Step 6: Move remaining root files**

```bash
mv knowledge/program.md knowledge-autoresearch-program.md
```

- [ ] **Step 7: Delete obsolete infrastructure**

These are replaced by Dataview + flat structure:

```bash
rm knowledge/registry.yaml
rm knowledge/setup.sh
rm knowledge/scripts/build_registry.py
rm knowledge/CLAUDE.md
rm knowledge/README.md
rm knowledge/.gitignore
```

- [ ] **Step 8: Delete old template files**

```bash
rm knowledge/templates/concept.md
rm knowledge/templates/style-analysis.md
```

- [ ] **Step 9: Add frontmatter to moved markdown files**

MOC files: update existing frontmatter, add `status: active`
Reference files: `type: ref`, `project: tvplotlines`, `status: active`
Prompting files: `type: ref`, `project: tvplotlines`, `status: active`

- [ ] **Step 10: Delete empty knowledge/ directory tree**

```bash
rm -rf /Users/nvashko/Projects/3-resources/knowledge
```

---

### Task 11: Clean up plotter_docs/

After tasks 7-9, all content has been moved out.

- [ ] **Step 1: Verify nothing remains**

```bash
find /Users/nvashko/Projects/3-resources/plotter_docs -type f
```

Expected: no files (or only .DS_Store).

- [ ] **Step 2: Delete empty directory tree**

```bash
rm -rf /Users/nvashko/Projects/3-resources/plotter_docs
```

---

### Task 12: Add frontmatter to remaining files

Files already in root that need frontmatter updates.

- [ ] **Step 1: Update lessons.md**

No frontmatter needed — this is a special file.

- [ ] **Step 2: Handle screenshot**

```bash
mv "Screenshot 2026-03-16 at 22.57.02.png" tvplotlines-screenshot-2026-03-16.png
```

---

### Task 13: Fix wikilinks

- [ ] **Step 1: Find all wikilinks in migrated files**

```bash
grep -r '\[\[' /Users/nvashko/Projects/3-resources/*.md | grep -v node_modules
```

- [ ] **Step 2: Update each wikilink to match new filenames**

Build old→new mapping from the mv commands above and do find-replace.

- [ ] **Step 3: Verify no broken links**

Use Obsidian's "Show broken links" or grep for `[[` and verify each target exists.

---

### Task 14: Final verification

- [ ] **Step 1: Count files**

```bash
ls /Users/nvashko/Projects/3-resources/ | wc -l
```

Expected: ~140-160 files (no subdirectories except possibly empty ones).

- [ ] **Step 2: Verify no subdirectories remain**

```bash
find /Users/nvashko/Projects/3-resources -type d -mindepth 1
```

Expected: no output.

- [ ] **Step 3: Verify all markdown files have frontmatter**

```bash
for f in /Users/nvashko/Projects/3-resources/*.md; do
  head -1 "$f" | grep -q '^---' || echo "MISSING: $f"
done
```

Expected: only `lessons.md` and `README.md` reported.

- [ ] **Step 4: Test Dataview queries in Obsidian**

Open a MOC file and verify the Dataview query renders correctly.

- [ ] **Step 5: Delete backup once satisfied**

```bash
rm -rf /Users/nvashko/Projects/3-resources-backup-2026-03-18
```
