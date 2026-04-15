---
type: ref
project: preprint
status: active
created: 2026-03-21
---

# tvplotlines: Design Decision Registry


An exhaustive list of design decisions, assumptions, and architectural choices that tvplotlines is built upon. For each decision: what exactly it is, where it lives, and what assumption stands behind it.

---
## 1. Pipeline Architecture
### 1.1.  LLM prompts with deterministic scaffolding and domain knowledge 

- **Decision:** The pipeline is built around 4 prompts — context detection, plotline extraction, event assignment, structural review (the *what*)— connected by code that handles everything the LLM does not do well consitently (the *how*): validation, aggregation, orchestration, and correction. 
- The number of actual LLM calls is more than 4 as pass 1 has 3 voting rounds and pass 2 works over N episodes, and any call may be retried up to 2 times on validation errors.
- **Where:** `pipeline.py:1`, `prompts/pass{0,1,2,3}.md`, table in `README.md:119-124`
- **Assumption:** A single LLM task "extract everything at once" yields worse results than a flow of specialized prompts with code between them [^1]. `pass1_merged.py` and `ablation_pass0.py` exist as ablation studies investigating how many prompts are actually needed.

### 1.2. Pass order: context first, then plotlines, then events
- **Decision:** Context (franchise_type, story_engine) is determined first and passed forward as input.
- **Where:** `pipeline.py:128-130` (Pass 0), `pass0.md:6-8`
- **Assumption:** Franchise type is a classification of TV series by their narrative structure. Four types: **procedural** (self-contained episode stories, e.g. House — each week a new case), **serial** (season-long arcs, e.g. Breaking Bad), **hybrid** (procedural engine + serialized arcs, e.g. X-Files), **ensemble** (multiple co-equal protagonists, e.g. Game of Thrones). The taxonomy draws on Douglas (*Writing the TV Drama Series*), Nash (*Television Storytelling*), and Mittell (*Complex TV*). Each type sets different expectations for plotline structure: procedural = 1 episodic + 1-2 serialized; serial = 3-8 season-spanning; ensemble = 4-6 parallel.

  This decision parallels Zwaan's (1993) finding that readers activate different **cognitive control systems** depending on discourse type — a news reader and a literary reader process the same text differently because genre signals switch their comprehension strategy. We assume Pass 0 does the same for the LLM: determining franchise type switches the model into a specific "reading mode" that shapes how it granulates plotlines in Pass 1.

  Original hypothesis: context must be a separate LLM call before extraction. The ablation study showed that the task "determine context + extract plotlines" can be combined within a single prompt — separation within the instruction is sufficient, a separate LLM call is not mandatory.

### 1.3. Pass 1 receives ALL synopses, Pass 2 — one at a time
- **Decision:** Pass 1 sees the entire season to identify season-spanning plotlines. Pass 2 processes one episode at a time.
- **Where:** `pass1.py:107-173` (all synopses), `pass2.py:33-101` (one synopsis)
- **Assumption:** Identifying season-spanning plotlines requires an overview of the whole season. Assigning events to those plotlines requires only one episode + the plotline list. This separation enables parallelization of Pass 2 — a decision made for speed and cost efficiency (parallel calls with short context are cheaper than a single long one).

### 1.4. System/user prompt split in Pass 2 — architecture for caching
- **Decision:** In Pass 2, the instruction + series context + plotline list go into the system prompt (immutable part); the synopsis of a single episode goes into the user prompt (variable part). The immutable portion of the prompt is cached across all episodes.
- **Where:** `pass2.py:85-101` (system prompt assembly), `pass2.py:98` (`cache_system=True`)
- **Assumption:** Cost savings via prompt caching — the system prompt contains ~80% of call tokens and is reused for all episodes in a season.

### 1.5. Pass 2 is parallel, Pass 1 is not
- **Decision:** Pass 2 runs for all episodes simultaneously (async). Pass 1 runs three parallel calls (majority voting, see 1.7).
- **Where:** `pipeline.py:144-146`, `pass2.py:162-201` (assign_events_parallel), `llm.py:240-284` (acall_llm_parallel)
- **Assumption:** Episodes in Pass 2 are independent of each other — each has its own synopsis, the same plotline set, the same system prompt. System prompt caching makes parallel calls cheaper.

### 1.6. Pass 3 exists as a separate pass
- **Decision:** Structural revision after Pass 1+2, rather than "get it right the first time."
- **Where:** `pass3.md:12-14`, `pipeline.py:176-190`
- **Assumption:** Pass 1 does not see events. Pass 2 cannot modify the plotline list. Between them lies a gap: Pass 2 discovers problems (via patches) but cannot fix them. Pass 3 is the first to see the full picture (plotlines + all events + span + weight) and can make decisions: MERGE, REASSIGN, PROMOTE, DEMOTE, CREATE, DROP. The alternative — iteratively rerunning Pass 1+2 until stabilization — is more expensive and less predictable.

### 1.7. Majority voting in Pass 1, but not in Pass 2
- **Decision:** Pass 1 runs 3 times in parallel; the result with the most frequent plotline ID set is selected.
- **Where:** `pass1.py:19` (`_VOTING_ROUNDS = 3`), `pass1.py:148-165`
- **Assumption:** Plotline identification is the most subjective part of the pipeline. Different runs may produce different plotline sets. Voting stabilizes the result. Pass 2 binds events to already-fixed plotlines — less variability, voting is unnecessary. The consistency metric (ARI) measures precisely the stability of Pass 1.

### 1.8. Post-processing is code, not LLM
- **Decision:** span, weight, orphan assignment, rank validation — all computed by code.
- **Where:** `postprocess.py` (entire file), `pipeline.py:171-173`
- **Assumption:** These operations are deterministic aggregations. An LLM is not needed to count events or determine which episodes a plotline appears in. Code is faster, cheaper, and deterministic.

### 1.9. Verdicts are code, not LLM
- **Decision:** Pass 3 outputs JSON with verdicts that are applied by code (`verdicts.py`).
- **Where:** `verdicts.py` (entire file), `pipeline.py:184-188`
- **Assumption:** The LLM makes the decision (MERGE, REASSIGN...), but mechanical application (moving events, deleting plotlines) is the code's job. This separation allows validating verdicts before applying them and guarantees consistency.

### 1.10. The library is stateless — the caller stores results
- **Decision:** `get_plotlines()` is a pure function. No database, no files, no state between calls.
- **Where:** `pipeline.py:33-199`, `CLAUDE.md:8-9`, `docs/2026-03-16-prior-season-continuity-design.md:141`
- **Assumption:** The library is computation, not a product. Persistence is the application's responsibility (tvplotlines-app).

### 1.11. Pipeline resumability — intermediate results can be supplied
- **Decision:** Parameters `context`, `cast`, `plotlines`, `breakdowns` allow skipping the corresponding passes.
- **Where:** `pipeline.py:39-47`, `pipeline.py:128-167`
- **Assumption:** The pipeline can fail at any step. The user should be able to resume from where it stopped without restarting everything.

### 1.12. Multi-season via the `prior` parameter
- **Decision:** `prior: TVPlotlinesResult` is the only way to pass context from a previous season.
- **Where:** `pipeline.py:38`, `docs/2026-03-16-prior-season-continuity-design.md:140-145`
- **Assumption:** One parameter instead of two (`prior_cast` + `prior_plotlines`). The library remains stateless. The caller stores results and chains: `r2 = get_plotlines(..., prior=r1)`. Anthology format is blocked (`ValueError`) because anthology seasons are independent by definition.

---

## 2. Prompt Design

### 2.1. Theoretical framework: Story DNA
- **Decision:** A plotline is defined through four components: driver + goal + obstacle + stakes.
- **Where:** `pass1.md:43-44`, `pass3.md:27-29` (Nash p.34 quote)
- **Assumption:** Story DNA is the minimal sufficient abstraction for describing narrative conflict. Source: Nash, "Television Storytelling." Without any of the four components, it is not a plotline but an event or a runner.

### 2.2. Franchise type — 4 types
- **Decision:** Classification: procedural, serial, hybrid, ensemble.
- **Where:** `pass0.md:24-32`
- **Assumption:** These four types cover the vast majority of TV series. Each type sets different expectations for the number and structure of plotlines. Sources: Douglas, Nash, Mittell. There is no "miniseries" as a separate franchise type — that is `format: limited`, orthogonal to structure.

### 2.3. Story engine — templates by type
- **Decision:** For each franchise type, a story engine template with fillable slots.
- **Where:** `pass0.md:37-56`
- **Assumption:** The template constrains the LLM from free-form speculation and provides a structured description. Procedural: "each week, a [profession] solves a [problem], testing [quality]." Serial: "[protagonist] [transformation], testing how far they will go for [goal]." Hybrid and Ensemble follow analogous patterns.

### 2.4. A/B/C/runner — rank hierarchy
- **Decision:** Four levels: A (primary), B (secondary), C (tertiary), runner (incomplete).
- **Where:** `pass1.md:56-63`
- **Assumption:** The TV industry standardly uses A/B/C to denote plotline weight (Douglas). Runner is added for plotlines without obstacle/resolution — they exist in TV series but lack full conflict. Constraint: serial/procedural/hybrid have exactly 1 A-plotline; ensemble has 2+ A-plotlines (`pass1.py:257-268`).

### 2.5. Granularity: by GOAL, not by character
- **Decision:** A single character can drive multiple plotlines with different goals.
- **Where:** `pass1.md:78-83`
- **Assumption:** LLMs tend to group everything "about Walt" into one plotline. The explicit instruction "the key is the goal, not the character" + the naming format `Driver: Theme` counteracts this bias. Example: Walt drives both "Empire" (drug business) and "Family" (hiding the truth from Skyler).

### 2.6. Naming format: `Driver: Theme`
- **Decision:** A plotline name always follows the format `Driver: Theme` (e.g., "Walt: Empire," "Hank: Investigation").
- **Where:** `pass1.md:103` (RU), `pass1_en.md:106` (EN)
- **Assumption:** The format makes explicit who drives the plotline and prevents confusion when assigning events in Pass 2. Without it, the LLM might name a plotline "Drug Business" — and then it is unclear whether it belongs to Walt or Jesse.

### 2.7. "What is NOT a plotline" — negative examples
- **Decision:** A table of 5 counter-examples: background, setting, state, context, franchise engine.
- **Where:** `pass1.md:86-95`
- **Assumption:** Without negative examples, LLMs tend to create false plotlines from background details. "When in doubt — do NOT create a plotline" — conservative bias.

### 2.8. Plotline types: episodic, serialized, runner
- **Decision:** Three types, not two. Episodic — for franchise engine, serialized — season-spanning, runner — incomplete.
- **Where:** `pass1.md:49-53`
- **Assumption:** Runner is a deliberate choice: rather than discarding plotlines without an obstacle, they are labeled. This allows Pass 3 to decide their fate.

### 2.9. For procedural/hybrid — exactly one episodic plotline
- **Decision:** Code validates: `episodic_count != 1` → error.
- **Where:** `pass1.py:247-254`, `pass1.md:50`
- **Assumption:** The franchise engine (case-of-the-week) is ONE recurring structure, not N separate stories. The specific content of each episode is handled in Pass 2.

### 2.10. Nature: plot-led vs character-led
- **Decision:** Two conflict categories: external (plot-led) and internal (character-led).
- **Where:** `pass1.md:68-71`
- **Assumption:** The distinction matters for understanding structure: the B-story is often character-led (carries the episode's theme), while the A-story is plot-led (advances the plot).

### 2.11. Confidence: solid, partial, inferred
- **Decision:** Three confidence levels for a plotline's Story DNA.
- **Where:** `pass1.md:221`, `pass3.md:33-38`
- **Assumption:** TV series can be poorly written. A plotline may exist without a clear goal, with nominal conflict. Instead of discarding it, we mark confidence. "A weak plotline in a bad script is data, not an error" (pass3.md:39).

### 2.12. Event functions: 7 types
- **Decision:** setup, escalation, turning_point, climax, resolution, cliffhanger, seed.
- **Where:** `pass2.md:38-49`
- **Assumption:** A minimal set covering three-act structure + TV-specific functions (cliffhanger, seed). Seed — the germ of a future plotline, distinct from setup. Cliffhanger — a break at the peak, distinct from climax.

### 2.13. Narrative devices: 6 types
- **Decision:** dramatic_irony, flashback, flashforward, callback, twist, unreliable — at the plotline level (Pass 1) and at the event level (Pass 2).
- **Where:** `pass1.md:105-118`, `pass2.md:51-63`
- **Assumption:** Devices characterize a plotline across the entire season, not as a one-time occurrence. Pass 1 outputs devices for a plotline; Pass 2 uses them as hints when annotating events.

### 2.14. Interactions between plotlines: 4 types
- **Decision:** thematic_rhyme, dramatic_irony, convergence, meta.
- **Where:** `pass2.md:67-73`
- **Assumption:** Plotlines do not exist in a vacuum. Thematic rhyme is a key TV narrative device (Douglas). Convergence is the intersection of plotlines. Meta is a structural device operating above plotlines (wraparound, twist-reveal, time_jump).

### 2.15. Emotional counterpoint as a check
- **Decision:** "If all plotlines are rising or all are falling — something is missed or the functions are wrong."
- **Where:** `pass2.md:75`
- **Assumption:** Good TV narrative alternates emotional registers. This is a heuristic for LLM self-checking.

### 2.16. Patches — Pass 2 does not rerun Pass 1
- **Decision:** Pass 2 collects suggestions (patches: ADD_LINE, CHECK_LINE, SPLIT_LINE, RERANK) but cannot modify the plotline list.
- **Where:** `pass2.md:231-240`
- **Assumption:** Pass 2 processes one episode at a time. It lacks the full picture to modify the global plotline list. Patches are hints for Pass 3, which sees everything.

### 2.17. also_affects — double bump
- **Decision:** An event is bound to one plotline; incidentally affected plotlines go in `also_affects`.
- **Where:** `pass2.md:34` (rule 4), `models.py:57`
- **Assumption:** An event can pertain to two plotlines (Walt killing Krazy-8 is both empire and family). Instead of duplication — one binding + cross-reference.

### 2.18. Weight is computed by code, not the LLM
- **Decision:** The Pass 2 prompt explicitly prohibits including weight in the JSON: "Weight is computed by code from event counts — do NOT include it in JSON."
- **Where:** `pass2.md:81`, `postprocess.py:83-111`
- **Assumption:** Weight is an objective metric (primary/background/glimpse), determined by thresholds: ≥50% of max = primary, ≥2 events = background, otherwise glimpse. These thresholds are hardcoded (`postprocess.py:104-109`).

### 2.19. Pass 3 — the "Hollywood story editor" role
- **Decision:** The Pass 3 prompt assigns a specific role: a story editor who is the first to see the full picture.
- **Where:** `pass3.md:12-14`
- **Assumption:** Framing helps the LLM understand the task: not "find errors" but "look at the result as a whole, as an editor, and decide whether corrections are needed."

### 2.20. Pass 3 — "if everything is fine, return an empty array"
- **Decision:** An explicit instruction not to fabricate problems.
- **Where:** `pass3.md:174`
- **Assumption:** LLMs tend to "be helpful" and find problems even when there are none. Without this instruction, Pass 3 would generate false verdicts.

### 2.21. The Pass 3 prompt references theory with citations
- **Decision:** Quotes from Nash p.34, Oberg p.60, Douglas p.132 are embedded in the prompt.
- **Where:** `pass3.md:29`, `pass3.md:49`, `pass3.md:59`
- **Assumption:** Book citations anchor the LLM to a specific theoretical framework rather than general knowledge from training data. This improves decision quality.

### 2.22. Two prompt languages: Russian and English
- **Decision:** Prompts exist in two versions: `prompts/` (RU) and `prompts_en/` (EN).
- **Where:** `prompts/__init__.py:10-25`, `llm.py:98` (`lang: str = "ru"`)
- **Assumption:** Prompt language affects output quality. Russian is the default (original development language). English is for international audiences and potentially better quality on English-language synopses. Fields goal/obstacle/stakes are in the synopsis language.

### 2.23. Event specificity — explicit instruction
- **Decision:** "Event descriptions must be specific. Name the characters, state exactly what happens, and what dramatic consequence it leads to."
- **Where:** `pass2.md:22-23`
- **Assumption:** Without this instruction, LLMs tend to write generic descriptions ("the team works on a case"), making correct plotline assignment impossible.

### 2.24. Response format — strictly JSON, no markdown
- **Decision:** "Response must be strictly JSON, no markdown wrapping, no comments outside JSON." Repeated in every prompt.
- **Where:** `pass0.md:60`, `pass1.md:134`, `pass2.md:79`, `pass3.md:98`
- **Assumption:** LLMs tend to wrap JSON in ```json``` blocks. The instruction tries to prevent this. The code in `_extract_json()` can still parse markdown wrappers as a fallback (`llm.py:596-610`).

### 2.25. Binding rule: by goal, not by character
- **Decision:** "Multiple characters in a scene → the plotline of the one whose GOAL the scene advances."
- **Where:** `pass2.md:33`
- **Assumption:** Counters LLM bias: without this rule, the model assigns an event to the plotline of a character who is merely present in the scene, not the one whose goal the scene advances.

### 2.26. Frequency hint — B-story check
- **Decision:** "B-story = 1-2 scenes per act. If a plotline has more events than the A → recheck the hierarchy."
- **Where:** `pass2.md:35`
- **Assumption:** A quantitative heuristic for LLM self-checking. Helps detect hierarchy errors.

### 2.27. Prior season — three decisions for each plotline
- **Decision:** For each prior plotline, the LLM explicitly chooses: CONTINUES, TRANSFORMED, or ENDED.
- **Where:** `pass1.md:26-28`, `docs/2026-03-16-prior-season-continuity-design.md:142`
- **Assumption:** Forcing an explicit decision reduces hallucination. "Prior is a hint, not a constraint" — the LLM is free to decide that a plotline has ENDED, but must do so explicitly.

### 2.28. Seed and wraparound are NOT plotline types
- **Decision:** An explicit prohibition on creating plotlines of type "seed" or "wraparound."
- **Where:** `pass1.md:73-74`
- **Assumption:** LLMs may create a plotline "Seed: Future Plot" — this is not a plotline but an event function or a meta device.

### 2.29. Format (ongoing/limited/anthology) affects expectations
- **Decision:** limited → all plotlines should receive resolution; ongoing → cliffhanger is acceptable; anthology → do not reference other seasons.
- **Where:** `pass1.md:122-124`, `pass2.md:49`
- **Assumption:** Format is a characteristic orthogonal to franchise type. A limited series in its final episode expects resolution, not seed.

### 2.30. Quantitative expectations by type
- **Decision:** Procedural: 2-3 plotlines per episode. Serial: 3-8 per season. Ensemble: 4-6.
- **Where:** `pass1.md:128-131`
- **Assumption:** Numbers are based on analysis of real TV series (Nash, Douglas). They set a frame for the LLM to avoid generating 20 plotlines or 1.

---

## 3. Data Model

### 3.1. Story DNA: driver, goal, obstacle, stakes
- **Decision:** Four fields — the core of Plotline.
- **Where:** `models.py:37-40`
- **Assumption:** This is the minimal sufficient set for describing narrative conflict. Nash p.34: "Story DNA has four parts: Hero, Goal, Obstacle, Stakes." Goal — what the hero wants. Obstacle — what stands in the way. Stakes — what is at risk.

### 3.2. Rank A/B/C/runner — enum, not a number
- **Decision:** A text enum, not a numeric value.
- **Where:** `models.py:42`
- **Assumption:** A/B/C is standard industry terminology. Runner is not "D" but a separate category (incomplete Story DNA).

### 3.3. Cast with id, name, aliases
- **Decision:** Each character has a stable id, a full name, and a list of aliases.
- **Where:** `models.py:23-28`
- **Assumption:** Synopses use different name forms (Walt, Walter White, Heisenberg, Mr. White). Aliases allow the LLM in Pass 2 to correctly identify characters. The id is stable — it does not change between seasons.

### 3.4. Guest characters — `guest:short_name` format
- **Decision:** Guest characters are not included in the cast but are marked with the `guest:` prefix.
- **Where:** `pass2.md:203`, `pass2.py:330-335`
- **Assumption:** Guest characters appear in one episode. Creating a full CastMember for them is overengineering. Plotlines belong to the cast, not to guests.

### 3.5. Span is computed post-hoc from Pass 2
- **Decision:** Plotline.span is not determined by the LLM — it is computed by code from event presence.
- **Where:** `pass1.md:226`, `postprocess.py:13-29`
- **Assumption:** Span is an objective metric: a plotline is present in an episode if it has at least one event. An LLM is not needed for counting.

### 3.6. Verdict — action + data dict
- **Decision:** A Verdict stores an action (MERGE/REASSIGN/...) and an arbitrary dict with data.
- **Where:** `models.py:93-97`
- **Assumption:** Different verdict types have different fields (MERGE: source/target; REASSIGN: event/episode/from/to; CREATE: plotline/reassign_events). Instead of a class hierarchy — a simple dict with an action key.

### 3.7. EpisodeBreakdown includes theme and interactions
- **Decision:** Beyond events, each episode contains a theme and inter-plotline relationships.
- **Where:** `models.py:82-89`
- **Assumption:** The episode theme and interactions (thematic_rhyme, dramatic_irony, convergence, meta) are valuable data for analysis, not only for Pass 3.

### 3.8. Patch — a suggestion, not a command
- **Decision:** A Patch from Pass 2 contains action, target, reason, episodes. But it is not applied automatically.
- **Where:** `models.py:72-78`, `pass2.md:232-233`
- **Assumption:** Pass 2 processes one episode at a time — it lacks the full picture. Patches are hints for Pass 3. The separate model (Patch vs Verdict) underscores the difference: Patch is a suggestion, Verdict is a decision.

### 3.9. TVPlotlinesResult contains a usage summary
- **Decision:** The result includes a string with request count, token count, and cost.
- **Where:** `models.py:108`, `pipeline.py:198`
- **Assumption:** The user wants to know how much a run costs. Usage is a string, not a structure (because the format depends on the provider).

---

## 4. Engineering Decisions

### 4.1. Anthropic as the default provider
- **Decision:** `provider: str = "anthropic"`, default model: `claude-sonnet-4-20250514`.
- **Where:** `llm.py:96`, `llm.py:115`
- **Assumption:** Claude is the best model for long structured prompts with JSON output (based on the author's experience). But the pipeline is not locked in — OpenAI and any OpenAI-compatible APIs are supported.

### 4.2. Prompt caching for Pass 2
- **Decision:** The Pass 2 system prompt is cached across episodes (`cache_system=True`).
- **Where:** `pass2.py:98`, `pass2.py:194-196`, `llm.py:449-457`
- **Assumption:** All episodes in Pass 2 use the same system prompt. Caching saves ~90% on input tokens for the prompt (Anthropic: cache reads are 90% cheaper, `llm.py:63`).

### 4.3. Retry with JSON validation
- **Decision:** Up to 2 retries on JSON errors and validation failures. On retry, the previous response is included in context.
- **Where:** `llm.py:25` (`_MAX_RETRIES = 2`), `llm.py:205-237`
- **Assumption:** LLMs sometimes return invalid JSON (markdown wrapping, extraneous comments) or violate the schema. Retrying with a specific error indication usually fixes the problem.

### 4.4. Retry with exponential backoff for network errors
- **Decision:** Up to 3 retries for transient errors (APIConnectionError, RateLimitError, InternalServerError).
- **Where:** `llm.py:26` (`_MAX_NETWORK_RETRIES = 3`), `llm.py:162-185`
- **Assumption:** Network errors are transient. Exponential backoff (2s, 4s, 8s) avoids overloading the API.

### 4.5. Batch API for Pass 2 (50% cheaper)
- **Decision:** `pass2_mode="batch"` — Anthropic Batch API, 50% cheaper but slower.
- **Where:** `llm.py:287-414`, `pipeline.py:149-155`
- **Assumption:** For long seasons (22-episode House), batch yields significant savings. Fallback: if batch fails for individual requests — retry via the regular API.

### 4.6. Async-first architecture with sync wrappers
- **Decision:** All LLM calls are async (`acall_llm`). Sync wrappers (`call_llm`) use `asyncio.run()`.
- **Where:** `llm.py:1-8`, `llm.py:527-588`
- **Assumption:** Async enables parallel calls (Pass 2). Sync wrappers exist for ease of use in single-threaded code. Jupyter fix via `ThreadPoolExecutor` (`llm.py:534-538`).

### 4.7. Temperature = 0
- **Decision:** All LLM calls use temperature=0.
- **Where:** `llm.py:462`, `llm.py:507`
- **Assumption:** The task is extraction, not generation. Maximum determinism is needed. Voting in Pass 1 still provides variability through parallel calls.

### 4.8. max_tokens = 6144
- **Decision:** All calls use max_tokens=6144.
- **Where:** `llm.py:461`, `llm.py:339`
- **Assumption:** Pass 2 (one episode) typically uses 1000-3000 tokens. Pass 3 (all episodes) can be longer. 6144 provides headroom without overpaying for unused capacity.

### 4.9. Orphan assignment — by character → storyline frequency
- **Decision:** Orphaned events are assigned to the plotline most frequently associated with their characters.
- **Where:** `postprocess.py:32-80`
- **Assumption:** If the LLM returns `storyline: null`, it is most likely a binding error, not a genuinely unassignable event. Character frequency is a reasonable heuristic. Fallback: if a character has not appeared anywhere, the most frequent plotline in the episode is used.

### 4.10. validate_ranks — automatic demotion of A-rank with short span
- **Decision:** An A-rank plotline with span < 25% of the season → demote to B.
- **Where:** `postprocess.py:114-120`, `postprocess.py:152-153`
- **Assumption:** An A-plotline should be present in a significant portion of the season. 25% is an empirical threshold. The dominance threshold (>50% of events) is a flag for Pass 3, not an automatic action.

### 4.11. PROMOTE to A is blocked for non-ensemble
- **Decision:** Code blocks PROMOTE to A if an A-rank plotline already exists (except for ensemble).
- **Where:** `verdicts.py:116-123`
- **Assumption:** Serial/procedural/hybrid have exactly 1 A-plotline. This is an invariant that the code protects even if the LLM reviewer suggests otherwise.

### 4.12. _extract_json — regex fallback
- **Decision:** First `json.loads()`, then regex for ```json...``` blocks.
- **Where:** `llm.py:596-610`
- **Assumption:** Despite the "no markdown wrapping" instruction, models sometimes wrap anyway. Fallback is cheaper than retry.

### 4.13. response_format: json_object — only for OpenAI
- **Decision:** `response_format` is used only for `provider == "openai"`, not for Ollama/DeepSeek/Groq.
- **Where:** `llm.py:509-511`
- **Assumption:** Not all OpenAI-compatible providers support `response_format`. It is safer not to send it.

### 4.14. Known providers with defaults
- **Decision:** Ollama, DeepSeek, Groq are built in with default base_url and model.
- **Where:** `llm.py:104-108`
- **Assumption:** The user should not have to enter a URL and model for popular providers. Ollama: `localhost:11434/v1`, `qwen2.5:14b`. DeepSeek: `api.deepseek.com/v1`, `deepseek-chat`. Groq: `api.groq.com/openai/v1`, `llama-3.3-70b-versatile`.

### 4.15. Hardcoded pricing
- **Decision:** Per-token prices for claude-sonnet-4, haiku-4.5, gpt-4o are hardcoded.
- **Where:** `llm.py:32-36`
- **Assumption:** Prices change infrequently. This is sufficient for cost estimation. If the model is not in the dictionary — cost = 0.

### 4.16. Callback pattern — not files
- **Decision:** `PipelineCallback` — a subclass with methods `on_pass0_complete`, `on_pass1_complete`, etc.
- **Where:** `callbacks.py`, `pipeline.py:23-30`
- **Assumption:** The library does not write files. The caller decides what to do with intermediate results. Callbacks are wrapped in try/except so that a bug in a callback does not kill the pipeline.

### 4.17. Metrics: coverage + ARI
- **Decision:** Coverage = the fraction of events with a non-empty storyline. ARI = adjusted rand index across multiple runs.
- **Where:** `metrics.py`
- **Assumption:** Coverage is a simple completeness metric. ARI is a standard clustering metric that measures result stability (consistency). Used in the ablation study. The sklearn dependency is only for consistency, outside the core pipeline.

### 4.18. Ablation study: baseline vs merged
- **Decision:** The experiment compares the standard pipeline (4 passes) with merged (Pass 0+1 combined).
- **Where:** `experiments/ablation_pass0.py`, `pass1_merged.py`, `prompts_en/pass1_merged.md`
- **Assumption:** Hypothesis: a separate Pass 0 yields better quality because franchise type is determined before plotline analysis. The ablation tests this via coverage, ARI, tokens, and time.

### 4.19. Episode keys — strict S{dd}E{dd} format
- **Decision:** Episode keys must match the regex `^S\d{2}E\d{2}$`.
- **Where:** `pipeline.py:20, 87-91`
- **Assumption:** This is the standard episode identification format in the industry. The season number in the key must match the `season` parameter.

### 4.20. Diagnostics — post-processing flags for Pass 3
- **Decision:** validate_ranks generates flags (demoted, dominant) that are passed to Pass 3 as `diagnostics`.
- **Where:** `pipeline.py:173, 179`, `pass3.md:22`
- **Assumption:** Automated flags are objective data (computed by code) that help Pass 3 make decisions. They are context, not commands.

### 4.21. Global usage tracker, reset per run
- **Decision:** A global `UsageStats` object, reset on each `get_plotlines()` call.
- **Where:** `llm.py:84`, `pipeline.py:125-126`
- **Assumption:** A simple way to aggregate usage across all LLM calls. `usage.__init__()` is a reset. Not thread-safe, but not a problem within a single pipeline run.

---

## 5. Assumptions (Implicit)

### 5.1. Synopses (~300 words) contain sufficient signal
- **Assumption:** The pipeline operates on synopses, not scripts. A synopsis provides ~300 words for a 45-minute episode. This is sufficient for identifying plotlines and key events.
- **Where:** `README.md:9` ("Works from synopses alone — no scripts or transcripts needed"), `CLAUDE.md:25`
- **Risk:** Synopses may omit B/C-plotlines, focusing on A. The confidence field partially compensates for this.

### 5.2. The LLM possesses sufficient knowledge of narrative structure
- **Assumption:** The model (Claude/GPT) knows what A/B/C stories, franchise engine, three-act structure, and story engine are — from training data.
- **Where:** Prompts use professional terminology without definitions (except for franchise types and Story DNA).
- **Risk:** Local models (Ollama/Qwen) may not know these concepts. The prompts contain enough context to compensate.

### 5.3. Story DNA is the correct abstraction
- **Assumption:** Four components (driver + goal + obstacle + stakes) are a sufficient and necessary abstraction for describing a plotline.
- **Where:** `pass1.md:43-44`
- **Risk:** Some narrative traditions (ensemble dramas, slice-of-life) may not fit this model. Confidence = inferred and runner provide partial compensation.

### 5.4. Franchise type is stable within a season
- **Assumption:** The type is determined from the first 2-3 episodes and applied to the entire season.
- **Where:** `pass0.py:42` (episodes[:3])
- **Risk:** Some series change structure mid-season (procedural → serial). Pass 0 will not detect this.

### 5.5. Franchise type is stable across seasons
- **Assumption:** With `prior`, the previous season's context is reused without re-evaluation.
- **Where:** `pipeline.py:121`
- **Risk:** Some series change type between seasons (The Wire: different focus each season). The user can pass `context` explicitly to override.

### 5.6. One season is one unit of analysis
- **Assumption:** The pipeline processes one season at a time. Cross-season analysis is out of scope.
- **Where:** `pipeline.py:33-51`, `docs/2026-03-16-prior-season-continuity-design.md:134`
- **Risk:** Plotlines that exist only between seasons (setup in S01 finale → payoff in S02 premiere) may be missed.

### 5.7. 3 voting rounds are sufficient for stability
- **Assumption:** `_VOTING_ROUNDS = 3` is enough for majority voting.
- **Where:** `pass1.py:19`
- **Risk:** At temperature=0, 3 rounds may yield the same result (no diversity). With an unstable model, 3 may be too few. But more rounds are more expensive (3x the cost of Pass 1).

### 5.8. Sorting by storyline ID set is a sufficient agreement metric
- **Decision:** Voting selects the result whose set of storyline IDs occurs most frequently.
- **Where:** `pass1.py:155-161`
- **Assumption:** ID set is a proxy for "plotline structure." If two runs yield the same IDs, they are assumed to agree on content (goal, obstacle, stakes may differ). This is a coarse metric, but fast.

### 5.9. The LLM response in Pass 3 correctly references event text
- **Assumption:** REASSIGN/DROP/CREATE require exact event text matches. If the LLM paraphrases, validation rejects it.
- **Where:** `pass3.md:176`, `pass3.py:171-172`
- **Risk:** LLMs tend to paraphrase. Retry should fix this, but it is not guaranteed.

### 5.10. Verdict order does not matter (except CREATE → REASSIGN)
- **Assumption:** `apply_verdicts` applies verdicts in the order received. CREATE adds an ID that may then be used in a REASSIGN within the same batch.
- **Where:** `verdicts.py:37-56`, `pass3.py:139-145`
- **Risk:** If REASSIGN precedes CREATE for the same ID, the verdict will not find the target. Validation accounts for `created_ids` during checking.

### 5.11. Weight thresholds are empirical
- **Assumption:** primary ≥ 50% of max, background ≥ 2 events, glimpse — everything else.
- **Where:** `postprocess.py:104-109`
- **Risk:** On seasons with few events per episode, the thresholds may be inadequate.

### 5.12. Rank validation threshold — 25% span for A-rank
- **Assumption:** An A-plotline must be present in at least 25% of the season's episodes.
- **Where:** `postprocess.py:119` (`min_span_frac: float = 0.25`)
- **Risk:** For short seasons (4-6 episodes), 25% = 1-2 episodes — may be too lenient.

### 5.13. Prompts are self-contained documents
- **Assumption:** Each prompt is a "self-contained document, fed to the LLM as-is" (line 1 of each prompt).
- **Where:** `pass0.md:3`, `pass1.md:3`, `pass2.md:3`, `pass3.md:3`
- **Risk:** When updating references, the prompt must be "reassembled." There is no automatic assembly — it is a manual process.

### 5.14. The original is a from-scratch rewrite, not a fork
- **Assumption:** tvplotlines is rewritten from scratch. Balestri & Pescatore (ICAART 2025) is an ideological source, not code.
- **Where:** `CLAUDE.md:12-14`
- **Risk:** Not applicable as a risk per se, but important for the preprint — proper citation is required.

[^1]: Qiu, Libin, and others, ‘Blueprint First, Model Second: A Framework for Deterministic LLM Workflow’, arXiv:2508.02721, preprint, arXiv, 1 August 2025, doi:[10.48550/arXiv.2508.02721](https://doi.org/10.48550/arXiv.2508.02721)
