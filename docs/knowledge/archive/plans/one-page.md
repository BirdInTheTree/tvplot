---
type: draft
project: tvplotlines
status: active
date_read: 2026-03-20
---

# What it is
A Python library that extracts key plotlines from TV episode synopses.

# Why it exists

"To PLOT means to navigate through the dangerous terrain of story and when confronted by a dozen branching possibilities to choose the correct path. Plot is the writer's choice of events and their design in time." (p. 26) McKee

plot is an accurate term that names the internally consistent, interrelated pattern of events that move through time to shape and design a story." McKee

In a story, the storyline encompasses the characters, setting, and the conflict they face. Complex works of fiction feature two or more distinct plots (A-story, B-story) that may run independently or eventually intersect at the climax. 

**plotlines** specifically ==focus on the **causal mechanics**—the "why" and "how" behind a story’s events==. A plotline is the logical thread that connects actions to their consequences, whereas a storyline is often seen as the chronological summary of what happens.

- **Story**: "The king died and then the queen died." (A simple chronological sequence).
- **Plot**: "The king died, and then the queen died **of grief**." (Adds causality and emotional weight).
In longer works like novels or TV series, authors often weave multiple plotlines together: 

- **Master Plotline**: The overarching primary conflict of the work.
- **Subplotlines**: Secondary threads that support the main plot or develop side characters.
- **Internal Plotlines (Character Arcs)**: The emotional or psychological journey and transformation of a character.
- **External Plotlines**: The physical events, such as battles, quests, or investigations.


A TV series is a transformation machine. It's an elaborate Rube Goldberg device designed to test the same character flaw over and over and over.

if someone asks, "What's Season 1 ?" you'll have an exciting answer full of twists and turns and OMG moments. You'll have enough story that they'll lean forward and go, "Mmmm-hmmm, that is good. I think you've got something."

the quickest way to lose your series' audience is to slow-burn the season-long story, not providing the necessary stake-raisers, plot twists, and emotional turning points that viewers crave.

# What it does

tvplotlines takes plain-text episode synopses (300–500 words each) and returns a JSON breakdown of the season's plotlines.

Each plotline gets four fields — driver, goal, obstacle, stakes — following Jamie Nash's *Save the Cat! Writes for TV* (2018). Plotlines are ranked A, B, or C by narrative weight.

Every event in every episode is assigned to a plotline with a narrative function: setup, escalation, turning point, climax, resolution, or cliffhanger. The output also includes show structure (procedural, serial, hybrid, or ensemble), episode themes, and interactions between plotlines — convergence, dramatic irony, thematic echoes.

# How it works

The LLM interprets narrative; code enforces structure.

Four LLM passes, each feeding the next:

1. **Detect show structure.** Procedural? Serial? Ensemble? This determines what counts as a plotline.
2. **Extract plotlines.** The LLM reads all synopses and identifies season-level arcs. Three independent extractions run in parallel; the system takes the majority answer.
3. **Break down each episode.** Assign every event to a plotline. Flag anything that does not fit.
4. **Review the full picture.** A final pass catches problems: plotlines that should merge, ranks that do not match screen time, threads that emerge late.

Between passes, code validates output, computes plotline span and weight, reassigns orphan events, and applies the final pass's decisions — merge, split, promote, demote — mechanically.

# How to view results

The output is JSON. Any tool that reads JSON can display it. A companion viewer app is available at [link].

# Who is it for

- **Development executives** — structured season overview without reading full scripts
- **Writers' rooms** — map how plotlines weave, collide, and echo across episodes
- **Story analysts** — a structured first pass before deep coverage
- **Tool builders** — tvplotlines is a library, not a closed product; plug it into your own pipeline
