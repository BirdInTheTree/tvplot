---
type: spec
project: tvplotlines
status: active
tags: [prompt-engineering]
---

# Prompt Writing Rules

Lessons from rewriting pass0–pass3 prompts. Use as checklist for future prompts.

## Process
1. Glossary — ground truth. Definitions written once, prompts reference them.
2. Original text — keep as much as possible. Change only what changed in logic.
3. Every term defined before it is used.

## Structure
- ROLE → CONTEXT → GLOSSARY → TASK → RULES → OUTPUT → VALIDATION
- GLOSSARY = definitions (what it means). TASK = steps (what to do). RULES = constraints (what not to do). Don't mix them.
- No repeats between GLOSSARY and TASK. Definition lives in one place.

## Role
- One role for the whole pipeline: story editor.
- Difference per pass — what the story editor is doing right now (reading first episodes / mapping the season / breaking down an episode / reviewing the full picture).

## Language
- How people talk, not how documentation reads. "Figure out" not "determine". "Pick the template" not "select the appropriate template".
- No "See X above" — either repeat inline or don't reference.
- Don't rewrite in your own words what's already well written in the original.

## VALIDATION
- Explicitly separate: what code checks (enum, references, schema) vs what LLM is responsible for (meaning, quality, completeness).
- Business rules from GLOSSARY/RULES must be duplicated in VALIDATION (e.g. rank=null for runner).

## Definitions
- Concrete, not abstract. With examples and counter-examples.
- Explain WHY (format → "tells us what plotlines to look for"), not just WHAT.
- If an attribute is used downstream — say how (confidence → "inferred plotlines won't be flagged").
