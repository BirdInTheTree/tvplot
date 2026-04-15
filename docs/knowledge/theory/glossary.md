---
type: draft
project: tvplotlines
status: active
---

# Glossary

Terms in dependency order — each term is defined before it is used.

---

## 1. Story DNA

Shorthand for four components every plotline must have: **hero** + **goal** + **obstacle** + **stakes**. Term from Nash *Save the Cat! Writes for TV*. Used throughout as a completeness test.

- **hero** — main cast member whose decisions drive this plotline. Must be from the recurring cast, not a guest. Each plotline has its own hero — not necessarily the series protagonist.
- **goal** — what the hero wants. Tangible, trackable — the audience can tell whether the hero is winning or losing. "Build a drug empire." "Find the meth cook." Can be forward-looking ("will they survive?" = Central Question) or backward-looking ("who killed Danny?" = Central Mystery). Formulate through a verb (investigate, survive, escape, discover).
- **obstacle** — what specifically blocks the hero. Another person? A circumstance? An internal fear?
- **stakes** — what happens if the hero fails. "Gets caught." "Family falls apart." "Dies."

---

## 2. Plotline

A story with complete Story DNA (hero + goal + obstacle + stakes). Missing any component = not a plotline, just an event inside another plotline. Exception: runner — a minor recurring thread tracked as plotline but without full conflict structure (no obstacle or resolution).

A plotline has a three-act structure (beginning, middle, end), conflict, and a causal chain of events.

TV episodes typically feature two or more parallel plotlines, denoted by letters A, B, C: a main A plot that dominates screen time and secondary B plots that may offer thematic parallels or counterpoint. Three stories per episode are typical, though some shows have more — in ensemble shows it's not unheard of to have 4 or 5 concurrent plotlines. Each story is usually driven by one character in the main cast.

Granularity: the key is GOAL, not character. One character can drive multiple plotlines with different goals. One plotline = one hero + one goal + causal connection between events. Different plotlines = different heroes, OR same hero with different goals, OR no causal connection.

Test: can you write a logline (hero + goal + obstacle + stakes)? Yes = plotline. No = not a plotline.

Not a plotline:
- "John has lunch" — background, no goal/conflict
- "Everyone goes to a party" — setting, no hero/stakes
- "John is sad" — state, no goal/obstacle
- "John and Mike's friendship" — context, no conflict
- "The investigation" (procedural, ep.5) — franchise engine, part of the case_of_the_week plotline

Seed and wraparound are not plotline types — seed is an event function (see function below), wraparound is a narrative device.

When in doubt — do NOT create a plotline.

Examples — NYPD Blue (hybrid, A = character-led, B = case):
- A "Sipowicz: Partnership" — wants to accept new partner, but jealousy and distrust, stakes: career
- B "Simone: Murder Case" — wants to solve murder, but clues don't add up, stakes: justice
- C "Lesniak: Abusive Ex" — wants to get free of ex, but he won't let go, stakes: safety

Examples — Breaking Bad (serial, one character = two plotlines with different goals):
- A "Walt: Empire" — wants to build drug empire, but law enforcement and rivals, stakes: death
- B "Walt: Family" — wants to provide for family, but Skyler discovers the truth, stakes: family falls apart

## 3. Format (Pass 0)

### format
Determines what plotlines to expect in pass1: how many, what types, whether they close per episode.
Tech insight: understanding the problem before extraction improves accuracy (Wang 2023, Plan-and-Solve: "first understand the problem and devise a plan, then carry out the plan").
Cognitive science insight: format tells the LLM what to look for — like a genre label on a book cover switches how we read it (Zwaan 1993).

- **procedural** — each episode contains a self-contained story (case, patient, mission) that opens and closes within the episode. Character plotlines exist but stay in the background. CSI, House, Law & Order.
- **hybrid** — each episode has a case-of-the-week AND serialized plotlines that carry across episodes and actively intertwine with the case. Both matter. X-Files, Buffy, Good Wife, Grey's.
- **serial** — episodes continue each other. Conflicts don't close within an episode. No case-of-the-week. Breaking Bad, The Wire, Sopranos.
- **limited** — same as serial, but the story is designed to end this season. All plotlines must resolve by the end of season. Chernobyl, Queen's Gambit.

Diagnostic: if E01 and E02 have different cases — procedural or hybrid. If E02 continues E01's conflict without closing it — serial.

Expected plotline count by format:
- procedural: 2–3 (1 case_of_the_week + 1–2 serialized)
- hybrid: 3–6
- serial: 3–8
- ensemble: 4–6

### is_ensemble
No single protagonist. Multiple characters drive their own plotlines with roughly equal screen time. Diagnostic: can you name THE main character? If not — ensemble. This matters because ensemble shows have 2+ A-rank plotlines instead of one. Game of Thrones, This Is Us, Succession, The Crown.

### is_anthology
Are seasons or episodes independent — new cast, new story, no continuity? Yes = anthology. This matters because anthology seasons have no continuity — prior season data is not passed to the next step. True Detective, Fargo, Black Mirror.

### story_engine
The show's repeating dramatic mechanism in one sentence. Focus on the verbs — what are characters doing each week? (Landau: "Verbs express characters' episodic goals in the form of micro missions.")

Templates by format:
- **procedural:** "Every week [profession] [verb] [type of challenge], testing [hero's quality]." Example: "Every week a diagnostician solves a medical mystery, testing the limits of ethics" (House).
- **hybrid:** "Every week [profession] [verb] [case] while [ongoing character plotline]." Example: "Every week lawyers litigate a new case while navigating political power games" (Good Wife).
- **serial:** "[Hero] [transformation], testing how far they'll go for [goal]." Example: "A chemistry teacher builds a drug empire, testing how far he'll go for family and control" (Breaking Bad).
- **limited:** "[Characters] [verb] [one problem] over one season." Example: "Nuclear engineers and officials investigate a reactor explosion, testing how far the state will go to cover it up" (Chernobyl).

### genre
Free text. Not validated, not used downstream.

---

## 4. Cast (Pass 1)

### cast member
- **id** — snake_case: "walt", "jesse"
- **name** — full: "Walter White"
- **aliases** — synopsis variants: ["Walt", "Heisenberg"]

---

## 5. Plotline Fields (Pass 1)

### plotline fields
- **id** — snake_case, stable (doesn't change if plotline is renamed): "empire", "murder_case", "family_tension"
- **name** — "Hero: Theme": "Walt: Empire". Named by GOAL, not by event.
- **hero** — see Story DNA above.
- **goal** — see Story DNA above. case_of_the_week plotline has a template Story DNA — repeating goal/obstacle/stakes, specific content filled in per episode by pass2.
- **obstacle** — see Story DNA above.
- **stakes** — see Story DNA above.

### type
How long does this plotline last?
- **case_of_the_week** — opens and closes within one episode. New each episode. The patient in House, the murder in CSI. Always named "Case of the Week" regardless of the show — the specific case content changes per episode, but the plotline is one recurring slot.
- **serialized** — spans multiple episodes, conflicts carry over. Walt's empire, Alicia's career.
- **runner** — minor recurring thread, 3-5 beats per episode, no complete set of functions. Incomplete Story DNA (no obstacle or resolution). Ted's shortbread, office romance.

### rank
Typical importance of this plotline across the season. Rank = resonance, not event count. A = "the largest or most resonant story", not necessarily most screen time. Rank is assigned once per season in pass1. Within individual episodes, a plotline's actual presence may differ — a B-plotline can dominate a specific episode (Oberg: "The A-Story over one episode can become a B-story in the next episode"). Per-episode presence is captured by weight (see postprocess below).
- **A** — the plotline the series is ABOUT. Gets all or most of 7 functions across the season. In procedural: case_of_the_week = A. In hybrid: character plotline = A, case = B. For example, NYPD Blue — character relationship = A, murder case = B, even though case has more scenes.
- **B** — second most important. Has its own complete Story DNA. Often carries the episode's theme.
- **C** — third. Lighter in tone, less screen time. Can be comic relief or a seed for future plotlines.

Plotlines with type=runner have rank=null — they are by definition minor threads that don't participate in A/B/C ranking.

### nature
Where does the main problem come from? Nature sets expectations for Story DNA validation: plot-led plotline should have an external obstacle, character-led should show internal conflict, theme-led should have a systemic problem without a single antagonist. Nature of a plotline and nature of individual events can differ — plot-led action serving a character-led plotline is normal (Oberg: "each episode tends to be plot-led, even if the series is character-led").
- **plot-led** — from outside the hero. Antagonist, monster, crime. Stranger Things, CSI.
- **character-led** — from inside the hero. The hero IS the problem. Breaking Bad, Fleabag.
- **theme-led** — from society. Systemic, no single solution. The Wire, Succession.

### confidence
How complete is the conflict structure?
- **solid** — hero, goal, obstacle, stakes all clear. You can write a logline with conflict.
- **partial** — hero and goal clear, obstacle or stakes unclear.
- **inferred** — plotline implied, conflict structure incomplete.

Confidence is used downstream:
- postprocess: arc_completeness thresholds are lower for inferred/partial plotlines (inferred with 3/7 = expected, solid with 3/7 = flag)
- pass3: inferred plotline with few events = candidate for DROP
- app: visual distinction (e.g. dashed line for inferred, solid for solid)

### prior season plotline status
When analyzing a new season with prior season data, each prior plotline is classified. Process prior plotlines BEFORE looking for new ones.
- **CONTINUES** — same hero, same goal, new circumstances. Keep ID, update obstacle/stakes. Example: "Walt: Empire" S1→S2 — still building the empire, but now Gus is the obstacle instead of Tuco.
- **TRANSFORMED** — same hero, different goal. Keep ID, rewrite goal/obstacle/stakes. Example: "Walt: Empire" S4→S5 — no longer building, now hiding from consequences.
- **ENDED** — plotline is gone. Do not include.

---

## 6. Events (Pass 2)

### event
One action that changes the situation. If nothing changes — not an event. Two actions where the second is an immediate consequence of the first = one event.
- **event** — one sentence: "Walt kills Krazy-8."
- **plotline** — which plotline (ID), or null
- **function** — position in the episode structure: where this event sits in THIS episode (see function below). The same event may have a different position in the plotline's season-long sequence of functions — that is computed in postprocess, not assigned by LLM.
- **characters** — who is involved (cast IDs, guests: `guest:name`)
- **also_affects** — other plotlines secondarily affected by this event. One event touches two plotlines → assign to primary goal, note the secondary in also_affects. "Walt kills Krazy-8" = empire, also_affects: investigation.

### function
Where in the episode structure does this event sit? The same 7 functions apply at two levels (Oberg: "the same dramatic three-act structure applies at every level: scene, sequence, subplot, storyline, episode, season"):
- **Episode level** — LLM assigns in pass2. "Walt kills Krazy-8" = climax of this episode.
- **Plotline level** — code computes in postprocess by collecting all events of a plotline across the season. The same event may be episode climax but plotline escalation (early in the season, far from the season climax).

Seven functions, in order:
- **setup** — world before anything happens. Status quo. Can repeat (setup for different plotlines).
- **inciting_incident** — the event that starts the plotline. Without it, the plotline doesn't exist. One per plotline, does not repeat. "Walt is diagnosed with cancer."
- **escalation** — stakes rise, situation complicates. Can repeat — multiple escalations in a row is normal (Nash: Fun & Games). Escalation AFTER turning_point is OK (Bad Guys Close In comes after Midpoint).
- **turning_point** — direction reverses. Winning turns to losing or vice versa. One major turn per plotline.
- **crisis** — lowest point. Hero faces what they feared most. True dilemma, no good options. Must come AFTER turning_point, never before.
- **climax** — peak confrontation. Outcome is irreversible. Must come AFTER crisis. Does not repeat.
- **resolution** — aftermath. World after the climax. Optional — some plotlines end on climax (especially in ongoing format). In limited format, all plotlines must have resolution.

Order rules:
- Strict sequence of milestones: inciting_incident → turning_point → crisis → climax. No going back past a milestone.
- escalation can appear between any milestones (before turning_point, after turning_point, even after crisis — as long as climax hasn't happened).
- setup can only appear before inciting_incident.
- resolution can only appear after climax (or be absent).
- Timing is flexible — milestones don't have to be evenly spaced (Nash: "The beat sheet is an itinerary, not a calendar").

Emotional counterpoint: if all plotlines in an episode are rising or all falling — something is missed or functions are wrong.

### interaction
How plotlines connect in this episode:
- **thematic_rhyme** — two plotlines explore the same theme from different angles.
- **dramatic_irony** — audience knows something a character doesn't, because of another plotline.
- **convergence** — plotlines collide: characters or conflicts from different plotlines meet.

### patch
Problem detected during episode analysis. Patches are hints for pass3 — suggestions, not commands. Pass3 decides whether each patch is justified.
- **ADD_LINE** — event doesn't fit any plotline. New plotline needed?
- **CHECK_LINE** — plotline has no events this episode. Ended early?
- **SPLIT_LINE** — plotline covers two unrelated things. Split?
- **RERANK** — C-plotline has more events than A. Ranks wrong?

---

## 7. Postprocess — Code

### span
`[episode_id for episode in episodes if plotline has events in episode]`

### weight
Per plotline per episode — how present this plotline is:
- `primary` — >= 50% of max event count in this episode
- `background` — >= 2 events
- `glimpse` — 1 event

### arc_completeness
`len(set(e.function for e in plotline_events)) / 7`
Flag if below minimum: A >= 6/7, B >= 5/7, C >= 3/7, runner >= 1/7.

### convergence_matrix
Directed count from `also_affects`: how many times plotline A's events affected plotline B. A->B != B->A.

### monotonicity
Plotline's season-long sequence of functions must not return past a milestone. Milestones: inciting_incident, turning_point, crisis, climax.
OK: escalation after turning_point. Violation: crisis after climax.

---

## 8. Verdicts (Pass 3)

### notes
Free text: overall quality assessment of the season's plotline structure. What works, what doesn't.

### verdict actions
- **MERGE** — two plotlines are really one. Combine.
- **REASSIGN** — event belongs to a different plotline. Move.
- **PROMOTE** — plotline is more important than rank says. B -> A.
- **DEMOTE** — plotline is less important than rank says. A -> B.
- **CREATE** — orphaned events form a new plotline pass1 missed.
- **DROP** — plotline has no real conflict. Remove, redistribute events. Only for phantoms — weak but real plotlines should be marked through confidence, not dropped.
- **REFUNCTION** — event has wrong function. Escalation is actually crisis.
