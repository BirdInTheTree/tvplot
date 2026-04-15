
## Infrastructure (imported once at startup)
1. __init__.py — public API exports
2. models.py — dataclasses used by all modules [^models]
3. llm.py — LLM client abstraction (temperature=0 hardcoded for all calls)
4. callbacks.py — optional progress hooks after each pass
5. prompts/__init__.py — loads .md prompt files by pass name and language

## User input
- Synopsis files [^3]
	- Option A: user provides `dict[str, str]` (episode ID → synopsis text)
	- Option B: `prepare_synopses(show, season)` — LLM generates synopses by synopsis-authoring-protocol, temperature=0, returns `dict[str, str]`. Same LLM client as pipeline. CLI: `tvplotlines run "Breaking Bad" --season 1 --auto-synopses`
- Prior season result (optional) — TVPlotlinesResult from previous season, for multi-season continuity

## Prior season logic
When prior is provided:
- pass0 is skipped — reuses prior.context
- pass1 receives prior.cast + prior.plotlines to maintain character/plotline ID continuity
- pass1 marks each prior plotline as CONTINUES / TRANSFORMED / ENDED
- not supported for anthology format (anthology seasons are independent)

## Pipeline (orchestrated by pipeline.py)
### 6. pass0.py — detect series context
- INPUT: synopsis files from user, formatted or named based on convention (see User input above)
- CODE:
	1. extracts
		1. show name,
		2. season number,
		3. episode IDs from file structure
	2. builds user prompt: JSON with show name + season number + first 3 synopses
	3. calls LLM with system prompt (pass0.md) and user prompt (3 synopses): 1 call
- LLM:
	1. reads synopses
	2. returns JSON with
		1. format ∈ {procedural, hybrid, serial, limited} [^format]
		2. is_ensemble: bool
		3. is_anthology: bool
		4. story_engine
		5. genre [^genre]
		6. reasoning — explains why this format was chosen (not used downstream, for auditability)
- CODE: validates
	1. format ∈ {procedural, hybrid, serial, limited}
	2. is_ensemble: bool
	3. is_anthology: bool
	4. story_engine is non empty str
	5. genre — no validation
- OUTPUT: SeriesContext object (format, is_ensemble, is_anthology, story_engine, genre) — used by all subsequent passes [^usage_tracking]

### 7. pass1.py — extract cast + plotlines
- CODE:
	1. builds JSON from all synopses + context object from pass0
	2. calls LLM with system prompt (pass1.md) and user prompt (all synopses): 3 parallel calls [^voting]
- LLM:
	1. reads all synopses,
	2. returns JSON with
		1. cast list
		2. plotlines with Story DNA (hero, goal, obstacle, stakes) [^renames]
		3. rank (A/B/C),
		4. type (case_of_the_week, serialized, runner)
		5. nature (plot-led, character-led, theme-led)[^nature]
		6. confidence (solid, partial, inferred)
- CODE:
	1. majority voting — picks most common result from 3 runs [^voting]
	2. validates
		1. type ∈ {case_of_the_week, serialized, runner}
		2. rank ∈ {A, B, C}
		3. nature ∈ {plot-led, character-led, theme-led}
		4. confidence ∈ {solid, partial, inferred}
		5. hero references existing cast member
		6. A-rank count: 1 for serial/procedural/hybrid, 2+ if is_ensemble
		7. procedural/hybrid must have exactly 1 case_of_the_week plotline
- OUTPUT:
	1. cast: list of CastMember (id, name, aliases)
	2. plotlines: list of Plotline (id, name, hero, goal, obstacle, stakes, type, rank, nature, confidence)
	— used by pass2 (in user prompt per episode) and pass3 (for review)

### 8. pass2.py — assign events to plotlines per episode
- CODE:
	1. builds N user prompts with shared system prompt (pass2.md, cached across episodes)
	2. user prompt per episode: JSON with one episode synopsis + cast + plotlines
	3. execution mode (CLI: `--pass2-mode`):
		- parallel (default) — all N episodes async, N parallel LLM calls
		- batch — Anthropic Batch API, 50% cheaper, slower turnaround
		- sequential — one episode at a time, for debugging; fires `on_episode_complete` callback per episode
- LLM (1 call per episode):
	1. reads one episode synopsis,
	2. returns JSON with
		1. theme — one sentence, thematic summary of the episode
		2. events — each assigned with
			1. plotline (or null for orphan events),
			2. function, [^functions]
			3. characters,
			4. also_affects
		3. interactions between plotlines in the episode, each with:
			1. type ∈ {thematic_rhyme, dramatic_irony, convergence}
			2. lines — plotline IDs involved
			3. description — one sentence
		4. patches — suggested fixes passed as context to pass3, each with:
			1. action ∈ {ADD_LINE, CHECK_LINE, SPLIT_LINE, RERANK}
			2. target — plotline ID (or proposed new ID)
			3. reason
			4. episodes — relevant episode IDs
- CODE: validates
	1. function ∈ {setup, inciting_incident, escalation, turning_point, crisis, climax, resolution}
	2. plotline references existing plotline ID from pass1 (or null)
	3. characters reference existing cast IDs or use guest: prefix
	4. also_affects references existing plotline IDs
	5. interaction type ∈ {thematic_rhyme, dramatic_irony, convergence}
	6. patch action ∈ {ADD_LINE, CHECK_LINE, SPLIT_LINE, RERANK}
- OUTPUT: list of EpisodeBreakdown (one per episode), each with theme, events, interactions, patches

### 9. postprocess.py — compute spans, assign orphan events, validate ranks [^postprocess]
- CODE:
	1. assign_orphan_events: events without a plotline get assigned to new plotlines
	2. compute_span: calculates which episodes each plotline appears in (list of episode IDs)
	3. compute_weight: per plotline per episode — primary / background / glimpse (from event counts)
	4. validate_ranks: checks A/B/C distribution matches format (+ is_ensemble flag)
	5. arc_completeness thresholds adjusted by confidence: inferred with 3/7 = expected, solid with 3/7 = flag
- OUTPUT:
	1. plotlines updated with span and weight fields
	2. diagnostics flags (validate_ranks + arc_completeness adjusted by confidence) — passed to pass3

### 10. pass3.py — structural review [^pass3]
- CODE:
	1. builds user prompt JSON with:
		- context (show, season, format, is_ensemble, story_engine)
		- cast (id, name)
		- plotlines (all pass1 fields + span + weight from postprocess)
		- episodes (theme, events, patches from pass2)
		- diagnostics from postprocess (ranks, arc_completeness, monotonicity)
	2. calls LLM with system prompt (pass3.md) and user prompt: 1 call
- LLM
	1. reviews full picture (plotlines with spans + weights, all events, patches),
	2. returns JSON with
		1. notes — overall quality assessment (free text)
		2. verdicts — structural corrections to apply to plotlines:
			- MERGE: combine two plotlines into one (source → target)
			- REASSIGN: move an event from one plotline to another
			- PROMOTE: raise plotline rank (e.g. B → A)
			- DEMOTE: lower plotline rank (e.g. A → B)
			- CREATE: add a new plotline and reassign events to it
			- DROP: delete a plotline and redistribute its events (inferred plotline + few events = candidate for DROP)
- CODE: validates
	1. action ∈ {MERGE, REASSIGN, PROMOTE, DEMOTE, CREATE, DROP, REFUNCTION}
	2. MERGE: source and target reference existing plotline IDs
	3. REASSIGN: event exists, target plotline ID exists
	4. PROMOTE/DEMOTE: target exists, new_rank ∈ {A, B, C}
	5. CREATE: plotline has all required fields, reassign_events reference existing events
	6. DROP: target exists, redistribute events reference existing events and target IDs

### 11. verdicts.py — apply pass3 verdicts to plotlines [^refunction]
- CODE:
	1. applies each verdict (MERGE, REASSIGN, PROMOTE, DEMOTE, CREATE, DROP, REFUNCTION) to plotlines and events
	2. pipeline recomputes spans and re-validates ranks
- OUTPUT: final plotlines + episodes — ready for TVPlotlinesResult

### TVPlotlinesResult — final output object
- context: SeriesContext (format, is_ensemble, is_anthology, story_engine, genre)
- cast: list of CastMember (id, name, aliases)
- plotlines: list of Plotline (id, name, hero, goal, obstacle, stakes, type, rank, nature, confidence, span)
- episodes: list of EpisodeBreakdown (episode, theme, events, interactions, patches)
- usage: token/cost summary [^usage_tracking]

## Total LLM calls per run: 5 + N (where N = number of episodes) [^total_calls]
[^2]: [[tvplotlines-event-functions-redesign]]

[^3]: **Input contract.** API: `episodes: dict[str, str]` (key=episode ID `S\d{2}E\d{2}`, value=synopsis text 300-500 words). CLI: `tvplotlines run files/*.txt --show "..." --season 1`. Опциональный шаг: `prepare_synopses(show, season)` — LLM генерирует синопсисы по synopsis-authoring-protocol (temperature=0, тот же LLM client). CLI: `--auto-synopses`. Задачи:
1. написать `prepare.py` + промпт `prompts/synopsis.md`,
2. документировать в docs/quickstart.md + docs/api.md + docs/synopsis-guide.md,
3. починить баг: `examples/run_pipeline.py` передаёт `list[str]` вместо `dict[str, str]`.

[^4]: Currently not in the code, but is in the source so should be added

[^models]: **Переделать models.py:** Event.function enum — убрать cliffhanger/seed, добавить inciting_incident/crisis. См. [[tvplotlines-event-functions-redesign]].

[^genre]: **Genre:** оставить как есть, не трогать. Свободный формат, не валидируется, в пайплайне не используется — но ничего не стоит (pass0 и так возвращает). Кандидат для ablation: влияет ли передача genre в pass1/pass2 на качество извлечения?

[^format]: **Заменить franchise_type + format на новую схему.** Одно поле `format` ∈ {procedural, hybrid, serial, limited} + два флага: `is_ensemble: bool` (2+ A-линий), `is_anthology: bool` (нет prior между сезонами). Убрать старые franchise_type и format. Менять: models.py (SeriesContext), pass0 промпт + валидация, pass1 (правила по количеству A-линий), postprocess (validate_ranks).

[^usage_tracking]: **Добавить трекинг токенов по пассам:** usage: str → структура (input_tokens, output_tokens, calls per pass). Библиотека собирает и возвращает в TVPlotlinesResult. Показ (таблица, UI) — задача app. См. [[tvplotlines-what-to-change]] п.5.

[^voting]: **Ablation majority voting:** 3 параллельных вызова в pass1 могут быть избыточны при temperature=0. Оставить до autoresearch-эксперимента, но пометить как кандидат на удаление. Если убрать — total calls = 3+N вместо 5+N.

[^renames]: **Переименования в models.py:** (1) `driver` → `hero` — в коде сейчас driver, в документе hero; (2) `episodic` → `case_of_the_week` — в коде сейчас episodic, в документе case_of_the_week; (3) Event.`storyline` → `plotline` — в коде сейчас storyline, в документе plotline. Менять: models.py, все пассы (промпты + валидация), verdicts.py.

[^nature]: **Добавить theme-led в nature:** в источниках (Nash) есть theme-led plotlines, но в коде валидируется только {plot-led, character-led}. Нужно: (1) добавить в enum, (2) обновить промпт pass1, (3) обновить валидацию.

[^functions]: **Переделать event functions:** убрать cliffhanger/seed, добавить inciting_incident/crisis. Итого: {setup, inciting_incident, escalation, turning_point, crisis, climax, resolution}. cliffhanger и seed → модификаторы (в будущем). Менять: enum в models.py, валидацию pass2.py, таблицу функций в промпте pass2. Описания функций в промпте (как объяснить LLM что такое crisis vs escalation) — оптимизировать через autoresearch. См. [[tvplotlines-event-functions-redesign]].

[^postprocess]: **Расширить postprocess.py:** добавить
1. build_plotline_arcs — собрать все события plotline по эпизодам в порядке (для pass3 и app),
2. build_episode_arcs — собрать все события эпизода по всем plotlines в порядке,
3. convergence_matrix — из Event.also_affects агрегировать directed matrix пересечений,
4. arc_completeness — `len(set(functions)) / 7` per plotline,
5. validate_arc_completeness — completeness < минимума для ранга (A>=6/7, B>=5/7, C>=3/7) → diagnostics,
6. validate_monotonicity — возврат past milestone (inciting_incident→turning_point→crisis→climax) → diagnostics.
Всё чистый код, без LLM. Diagnostics передаются в pass3. См. [[tvplotlines-event-functions-redesign]].

[^pass3]: **Расширить pass3:** промпт получает из postprocess: plotline arcs, episode arcs, arc_completeness + diagnostics (неполные арки, нарушения монотонности). LLM решает что делать: REFUNCTION, PROMOTE/DEMOTE, etc. См. [[tvplotlines-event-functions-redesign]].

[^refunction]: **Добавить вердикт REFUNCTION:** pass3 может исправить неверные function assignments (напр. escalation→crisis). Новый action в enum вердиктов, новая логика применения в verdicts.py. См. [[tvplotlines-event-functions-redesign]].

[^total_calls]: **Пересчитать если убрать voting:** если ablation покажет что 1 вызов pass1 достаточен — total calls = 3+N вместо 5+N.

## Ablation ideas
- **Voting in pass1:** 3 calls vs 1 call at temperature=0. May be redundant with pass3 review.
- **Reasoning before JSON (Wei 2022):** "First analyze the synopses in 2-3 sentences, then output JSON." Currently reasoning is inside JSON field. Test if free-form thinking before JSON improves quality. Requires parser change (extract JSON from mixed response).
- **Genre in pass1/pass2:** does passing genre from pass0 improve extraction quality?

---