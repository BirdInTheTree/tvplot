---
type: spec
project: tvplotlines
status: active
---

# Prompt Template

Unified structure for all pipeline prompts (pass0, pass1, pass2, pass3). Every prompt follows the same 7 sections in the same order.

Definitions come from `tvplotlines-glossary.md` — the glossary is the ground truth. Prompts include only the definitions relevant to their pass.

## Principles

1. Don't explain basics — set the coordinate system. LLM already knows what "conflict" is. Tell it what YOU mean by "plotline" (how-to-prompt rule 1).
2. Be concrete, not abstract. "What specifically blocks the hero?" not "define the obstacle" (rule 2).
3. Explain WHY, not just WHAT. "Format determines what plotlines to expect" not just "classify the format" (rule 3).
4. Theory as vocabulary, not instruction. Give terms to look for, not general instructions to "analyze" (rule 7).
5. Definitions with examples = strongest single component (GoLLIE, Sainz 2024: +5.4 F1).
6. Code validates — don't repeat in prompt what code checks (Qiu 2025: code validation +11.7pp, prompt rules +1.1pp).

## Template

```
# ROLE
Who you are. 1-2 sentences.
Why this perspective matters for the task.
Example: "You are a story editor analyzing a TV season. Your job is to
identify parallel storylines, not to evaluate quality or suggest improvements."

# CONTEXT
What you receive. Where it comes from. What prior passes already determined.
Example: "You receive all episode synopses for one season, plus the SeriesContext
from Pass 0 (format, story_engine). Your task builds on this context."

# GLOSSARY
Definitions of terms used in THIS pass. From tvplotlines-glossary.md.
Only include what this pass needs — don't dump the whole glossary.
Each definition must have:
  - what it is (concrete, not abstract)
  - examples (real shows)
  - counter-examples ("not a plotline: ...")

# TASK
What to do, step by step.
"First read all synopses. Then identify the cast. Then extract plotlines.
For each plotline, fill in Story DNA (hero, goal, obstacle, stakes)."
Understand before extract (Wang 2023).

# RULES
Constraints. Edge cases. What NOT to do.
- Granularity rules (one goal = one plotline)
- Order rules (functions sequence)
- "When in doubt" rules (don't create, don't invent)
- Format-specific rules (procedural: 1 case_of_the_week; limited: all resolve)

# OUTPUT
JSON schema. Field names, types, enums.
One worked example — full JSON for a real show (Breaking Bad S01).
Reasoning BEFORE JSON output, not after (Wei 2022).

# VALIDATION
What code will check after your response. So you know:
- what will be caught automatically (don't waste effort)
- what code can't check (you must get right)
Example: "Code checks: JSON schema, enum values, hero references cast ID.
Code cannot check: whether Story DNA makes narrative sense — that's your job."
```

## Section-specific notes

### ROLE
- pass0: "You are determining the structural pattern of a TV series."
- pass1: "You are a story editor identifying parallel storylines in a TV season."
- pass2: "You are assigning events to storylines within a single episode."
- pass3: "You are a narratologist reviewing the complete season structure."

### GLOSSARY per pass
- pass0: format, is_ensemble, is_anthology, story_engine, genre
- pass1: Story DNA (hero, goal, obstacle, stakes), plotline, type, rank, nature, confidence, prior season status (CONTINUES/TRANSFORMED/ENDED)
- pass2: event, function (7 functions + order rules), interaction (3 types), patch (4 types), also_affects
- pass3: verdict (7 actions), weight, span, arc_completeness, monotonicity

### VALIDATION per pass
- pass0: format enum, is_ensemble bool, is_anthology bool, story_engine non-empty
- pass1: type enum, rank enum, nature enum, confidence enum, hero → cast ID, A-rank count matches format
- pass2: function enum, plotline → pass1 ID, characters → cast ID, interaction type enum, patch action enum
- pass3: verdict action enum, MERGE/REASSIGN/PROMOTE/DEMOTE/CREATE/DROP/REFUNCTION field validation

## References

- Wang 2023, Plan-and-Solve: "first understand the problem and devise a plan"
- Sainz 2024, GoLLIE: definitions with representative examples = strongest component
- Qiu 2025, Blueprint First: code validation between LLM calls = +11.7pp
- Wei 2022, Chain-of-Thought: reasoning before output
- Zwaan 1993: genre label switches comprehension strategy
- Anthropic docs: XML tags for section boundaries, queries at the bottom
- tvplotlines-how-to-prompt.md: 10 principles for writing prompts
