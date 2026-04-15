---
type: spec
project: tvplotlines
status: active
---

# Design: 3-resources Flat Structure

## Problem

111 files in 30+ folders, up to 5 levels deep. Can't find anything.
Templates scattered across 4 locations. No consistent frontmatter.
Folder-based organization creates ever-growing nesting that doesn't
match how the user actually navigates (sort by date, recall by name).

## Solution

One flat folder. No subfolders. YAML frontmatter for metadata.
Dataview for navigation. Templater for consistent file creation.

## Structure

```
3-resources/
├── _tpl-document.md          ← template: universal work document
├── _tpl-reading.md           ← template: paper notes (includes guide)
├── _tpl-moc.md               ← template: map of content with Dataview
├── _tpl-blog-post.md         ← template: blog post
├── lessons.md                ← global lessons (no frontmatter change)
├── tvplotlines-architecture.md
├── tvplotlines-career-plan.md
├── preprint-abstract.md
├── read-wei-2022-chain-of-thought.md
├── moc-narrative-theory.md
└── ...
```

## Naming Convention

**Work documents:** `project-descriptive-name.md`
- `tvplotlines-architecture.md`
- `preprint-positioning-strategy.md`
- `zotero-mcp-plan.md`
- `awesome-list-curation-criteria.md`
- `github-io-blog-guide.md`

**Readings:** `read-author-year-topic.md`
- `read-wei-2022-chain-of-thought.md`
- `read-tian-2024-turning-points.md`
- `read-pianzola-2025-golem-ontology.md`

**MOC:** `moc-topic.md`
- `moc-narrative-theory.md`
- `moc-tvplotlines-research.md`

**Templates:** `_tpl-name.md`
- `_tpl-document.md`
- `_tpl-reading.md`
- `_tpl-moc.md`
- `_tpl-blog-post.md`

## Frontmatter

### Work documents

```yaml
---
type: spec | plan | decision | note | draft | ref | concept | style-analysis
project: tvplotlines | preprint | tvplotlines-app | zotero-mcp | awesome-list | github-io
status: active | archived
---
```

### Readings

```yaml
---
type: reading
title: "Full Paper Title"
authors: [Last1, Last2, Last3]
year: 2022
tags: [topic1, topic2]
project: tvplotlines
status: active
---
```

### MOC

```yaml
---
type: moc
tags: [topic1, topic2]
status: active
---
```

## Allowed Values

### type
`spec` | `plan` | `decision` | `note` | `draft` | `ref` | `concept` | `style-analysis` | `moc` | `reading`

### project
`tvplotlines` | `preprint` | `tvplotlines-app` | `zotero-mcp` | `awesome-list` | `github-io`

New projects added to this list as needed.

### status
`active` | `archived`

## Templates (4)

### _tpl-document.md
Universal template for all work documents. Templater prompts for
`type` and `project` from allowed values lists.

### _tpl-reading.md
Paper notes template. Extended frontmatter (title, authors, year, tags).
Body structure: Claim, Method & Evidence, Limitations, Relevance.
Key principles from paper-summary-guide.md baked in as inline hints:
- Self-contained (reader who never read the paper understands in 30s)
- Own words, not theirs
- Relevance section mandatory

### _tpl-moc.md
Map of Content. Frontmatter + pre-built Dataview query filtered by tags.

### _tpl-blog-post.md
Blog post template with hook, problem, literature, bridge, takeaway structure.

## Templater Configuration

- Template folder: `3-resources/` (filter by `_tpl-` prefix)
- "Trigger Templater on new file creation": enabled for `3-resources/`
- On new file: prompt user to pick template from list

## Archival

No `_archive/` folder. Set `status: archived` in frontmatter.
Dataview queries filter by `status = "active"` by default.

## Navigation

Dataview queries replace manual MOC maintenance. Examples:

All active tvplotlines documents:
```
TABLE type, file.cday as "Created"
FROM "3-resources"
WHERE project = "tvplotlines" AND status = "active"
SORT file.cday DESC
```

All readings:
```
TABLE title, authors, year, project
FROM "3-resources"
WHERE type = "reading" AND status = "active"
SORT year DESC
```

All plans across projects:
```
LIST
FROM "3-resources"
WHERE type = "plan" AND status = "active"
SORT file.cday DESC
```

## CLAUDE.md Update

Add to `/Users/nvashko/Projects/3-resources/CLAUDE.md`:
- Naming convention rules
- Allowed type/project values
- Frontmatter requirement
- "No subfolders" rule
- Template list

## Migration

1. Create 4 templates in `3-resources/`
2. Configure Templater in `.obsidian/plugins/templater-obsidian/data.json`
3. Move all files from subfolders to `3-resources/` root, renaming per convention
4. Add frontmatter to files that lack it
5. Update wikilinks if any exist
6. Delete empty subfolders
7. Update CLAUDE.md
8. Verify Dataview queries work
