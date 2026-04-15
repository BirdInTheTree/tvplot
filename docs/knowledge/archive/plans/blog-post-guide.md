---
type: ref
tags: [methodology, blog, writing]
project: preprint
status: active
---

# Blog Post Guide

How to write posts for birdinthetree.github.io/blog from existing reading
notes in `books2series/research/vault/readings/`.

## Relationship to other formats

| Format | Purpose | Location |
|--------|---------|----------|
| **Reading note** (9 sections) | Deep analysis for the project | `books2series/.../readings/` |
| **Paper summary** (4 sections) | Lit review for preprint | `plotter_docs/preprint/sources/` |
| **Blog post** (this format) | External audience, grouped by task | `birdinthetree.github.io/src/content/blog/` |

Reading notes are the raw material. Blog posts synthesize multiple notes
around a single engineering task.

## Principles

1. **One task, not one paper.** Each post answers: "I'm building a narrative
   system and I need to ___." Then shows which formal methods help.

2. **Engineer-first.** The reader builds LLM pipelines. They don't care
   about modal logic for its own sake — they care that epistemic logic
   solves their "who knows what" tracking problem.

3. **Your experience is the hook.** The unique value is: you read the paper,
   you tried to use it, here's what happened. Not a survey — a field report.

4. **No internal references.** Reading notes reference Q3, Q10, Q31 etc.
   Blog posts must be self-contained. Replace internal refs with the
   actual problem statement.

5. **Show the bridge.** Every post must connect: formal method → concrete
   prompt / data model / algorithm → result or insight.

## Template

See [TEMPLATE for blog post.md](TEMPLATE%20for%20blog%20post.md).

## How to write a post from existing reading notes

1. **Pick a task** from the awesome-narrative-ai section list:
   Story World, Characters & Arcs, Causality, Story Structure,
   Audience & Author, Consistency & Verification, Genre,
   Generation & Planning, Evaluation & Metrics.

2. **Pull 2-4 reading notes** that address this task. Use their
   Section 2 (task + solution) and Section 8 (integration potential)
   as source material.

3. **Write the Problem section** from Section 2 of the strongest note.
   Strip project-specific language. Frame as a universal task any
   narrative engineer faces.

4. **Write the Approaches section** by comparing the 2-4 papers.
   Use Section 4 (where it works / doesn't) to show tradeoffs.
   One paragraph per paper, not one section.

5. **Write the Bridge section** from Section 8 of the notes —
   this is where your unique expertise shows. What did you actually
   try? What worked? What broke?

6. **Write the Takeaway** — the one thing the reader should remember.
   Concrete: a prompt pattern, a data structure, a design principle.

## Series structure

Posts form a series "What Logic Can Do for Stories" (working title).
Each post is standalone but they share:
- Same audience (narrative AI engineers)
- Same structure (problem → approaches → bridge → takeaway)
- Cross-links to related posts and to awesome-narrative-ai entries
