// LLM API client + 5-pass plotline extraction pipeline.
// Runs entirely in the browser — calls Anthropic or OpenAI APIs directly.

// --- SSE streaming helpers ---

async function _readSSE(response, onChunk) {
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let accumulated = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split('\n');
    // Keep the last partial line in the buffer
    buffer = lines.pop();

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const payload = line.slice(6).trim();
      if (payload === '[DONE]') continue;

      try {
        const parsed = JSON.parse(payload);
        const chunk = _extractChunkText(parsed);
        if (chunk) {
          accumulated += chunk;
          if (onChunk) onChunk(accumulated);
        }
      } catch (_) {
        // Skip unparseable lines (e.g. SSE comments)
      }
    }
  }

  return accumulated;
}

function _extractChunkText(parsed) {
  // Anthropic format: content_block_delta with text_delta
  if (parsed.type === 'content_block_delta' && parsed.delta?.type === 'text_delta') {
    return parsed.delta.text;
  }
  // OpenAI format: choices[0].delta.content
  if (parsed.choices?.[0]?.delta?.content) {
    return parsed.choices[0].delta.content;
  }
  return null;
}

// --- API calls ---

async function callAnthropic(systemPrompt, userMessage, apiKey, onChunk) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 16384,
      stream: true,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Anthropic API error ${response.status}: ${err}`);
  }

  return _readSSE(response, onChunk);
}

async function callOpenAI(systemPrompt, userMessage, apiKey, onChunk) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      max_tokens: 16384,
      stream: true,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenAI API error ${response.status}: ${err}`);
  }

  return _readSSE(response, onChunk);
}

async function callLLM(systemPrompt, userMessage, provider, apiKey, onChunk) {
  if (provider === 'anthropic') {
    return callAnthropic(systemPrompt, userMessage, apiKey, onChunk);
  }
  return callOpenAI(systemPrompt, userMessage, apiKey, onChunk);
}

// --- JSON parsing from LLM responses ---

function _parseJSONResponse(text) {
  // Strip markdown code fences if present
  let cleaned = text.trim();
  const fenceMatch = cleaned.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
  if (fenceMatch) {
    cleaned = fenceMatch[1].trim();
  }
  return JSON.parse(cleaned);
}

// --- Embedded prompts ---
// Glossary is inlined into each pass prompt where {GLOSSARY} appears.

const _GLOSSARY = `## story DNA

Every plotline has four parts: **hero** (who drives it), **goal** (what they want), **obstacle** (what blocks them), **stakes** (what happens if they fail). Missing any component—not a plotline, but an event within another plotline.

Some plotlines have no obvious single hero—typically theme-led ones (see plotline:nature), where the problem comes from an institution or system rather than a character. Examples: "MI5 vs Slough House" in Slow Horses, "Professional life at Sterling Cooper" in Mad Men. In such cases, use your judgment to assign the most fitting character as hero—the one most affected, or driving the dynamic, or whose POV dominates.

## plotline

A story with complete Story DNA. Has a three-act structure, conflict, and a causal chain of events. A plotline is tied to a main cast character or an institution, not a guest.

TV episodes typically feature two or more parallel plotlines, denoted by letters A, B, C: a main A plot that dominates screen time and secondary B plots that may offer thematic parallels or counterpoint.

### granularity

The key is GOAL, not character.
Different plotlines: different heroes, OR one hero with different goals and obstacles and stakes.

Test: if you can't write a logline—"[hero] wants [goal], but [obstacle], and if they fail [stakes]"—it's not a plotline.

For theme-led plotlines, the logline test becomes: "[institution/system] [problem]; [hero] [role in it], stakes: [stakes]." Example: "MI5 covers up its role in the kidnapping; Taverner drives the cover-up, stakes: exposure and careers."

### what is not a plotline

| example                            | what it is                                             |
| ---------------------------------- | ------------------------------------------------------ |
| "John has lunch"                   | Background—no goal/conflict                            |
| "Everyone goes to a party"         | Setting—no hero/stakes                                 |
| "John is sad"                      | State—no goal/obstacle                                 |
| "John and Mike's friendship"       | Context—no conflict                                    |
| "Investigation" (procedural, ep.5) | Part of the case_of_the_week plotline, not a separate one |

## plotline:type

How long does this plotline last?

- **case_of_the_week**—opens and closes within one episode. The show's story engine describes the repeating formula. Story DNA is templated (repeating goal/obstacle/stakes), specific content—filled in per episode.
- **serialized**—spans multiple episodes or the entire season. Conflicts carry over.
- **runner**—minor recurring thread. Incomplete Story DNA—no obstacle or resolution, logline is descriptive. Everything else—a full plotline.

## plotline:nature

Where does the main problem come from? This matters because nature tells you what kind of obstacle to look for: an outside enemy (plot-led), the hero's own flaw (character-led), or a system nobody can fix alone (theme-led).

- **plot-led**—from outside the hero. External goal vs antagonist. Stranger Things, CSI.
- **character-led**—from inside the hero. Internal conflict, the hero IS the problem. Breaking Bad, Fleabag.
- **theme-led**—from society. Systemic, no single solution. The Wire, Succession.

## plotline:confidence

How complete is the conflict structure?

- **solid**—hero, goal, obstacle, stakes all clear.
- **partial**—hero and goal clear, obstacle or stakes unclear.
- **inferred**—plotline implied, conflict structure incomplete.

This matters because inferred plotlines are expected to have incomplete structure—they won't be flagged for missing functions or low event count. Solid plotlines will be.

## format

- **procedural**—each episode has a standalone story (case, patient, mission) that opens and closes within the episode. Even though each episode's case is different, we treat them as one recurring plotline called "Case of the Week"—same structural slot, different content each time. Other plotlines are secondary. CSI, House, Law & Order.
- **hybrid**—each episode has a case-of-the-week AND serialized plotlines, and they actively intertwine. Both matter. X-Files, Buffy, Good Wife, Grey's Anatomy.
- **serial**—episodes continue each other. Conflicts don't close within an episode. No case-of-the-week. One clear protagonist. Breaking Bad, Sopranos.
- **ensemble**—like serial, but no single protagonist. Multiple characters drive their own plotlines with roughly equal screen time. Diagnostic: can you name THE main character? If not—ensemble. Game of Thrones, Succession, The Wire, The Crown.

Base classification on the synopses, not on prior knowledge of the show. The same show can change format between seasons.

Don't default to serial just because character plotlines are present—hybrid means BOTH case-of-the-week AND serialized arcs are significant.

Diagnostic:
- if E01 and E02 have different cases—procedural or hybrid
- if E02 continues E01's conflict without closing it—serial or ensemble
- serial vs ensemble: can you name THE main character? If not—ensemble

## is_anthology

Seasons are independent—new cast, new story, no continuity between seasons. Within a single season, an anthology show has normal structure (serial, procedural, etc.). This matters because prior season data is not passed forward. True Detective, Fargo.

## story_engine

The show's repeating dramatic mechanism in one sentence. Focus on the verbs—what are characters doing each week?

Write the story engine as a one-sentence logline. Two common structures:
- "[Who] [does what] in order to [goal], but [obstacle]."
- "When [situation], [who] must [do what], or else [stakes]."

Use whichever fits the show.

Examples from real shows (none follow the formulas exactly—that's fine, the formulas are a starting point):
- "A high school chemistry teacher diagnosed with inoperable lung cancer turns to manufacturing and selling methamphetamine in order to secure his family's future." (Breaking Bad)
- "Nine noble families fight for control over the lands of Westeros, while an ancient enemy returns after being dormant for millennia." (Game of Thrones)
- "An antisocial maverick doctor does whatever it takes to solve puzzling cases that come his way." (House)

## genre

Free text—drama, thriller, comedy, sci-fi, etc.

## event

One action by one character (or group) that changes the situation. Two actions by different characters = two events. Two actions at the same moment where the second is an immediate consequence of the first = one event.

Write event descriptions that are specific and concrete. Include character names, what specifically happens, and the dramatic consequence. Bad: "The team works on the case." Good: "House orders a lumbar puncture over Cameron's objection, risking paralysis to test his sarcoidosis theory."

## function

Each event carries a function—its position in the dramatic structure:

| function | what it does |
|----------|-------------|
| \`setup\` | Introduces the plotline. Status quo. |
| \`inciting_incident\` | The event that starts the plotline. One per plotline, does not repeat. |
| \`escalation\` | Raises the stakes. Can repeat. |
| \`turning_point\` | Changes direction. False peak or false collapse. |
| \`crisis\` | Lowest point. Hero faces what they feared most. True dilemma. |
| \`climax\` | Peak of the conflict. Outcome is irreversible. |
| \`resolution\` | Conflict resolved. Aftermath. |

Functions are checked downstream for arc completeness and monotonicity—if a plotline has only setup and escalation across the whole season, that's a flag.

## interaction

How plotlines connect within an episode:

- **thematic_rhyme**—plotlines explore the same theme from different angles.
- **dramatic_irony**—the audience knows what a character in another plotline doesn't.
- **convergence**—plotlines merge (characters/conflicts intersect).

## verdict

A structural correction applied after reviewing the full season:

| action | what it does |
|--------|-------------|
| \`MERGE\` | Merge two plotlines into one |
| \`REASSIGN\` | Move an event to a different plotline |
| \`CREATE\` | Create a new plotline from orphaned events |
| \`DROP\` | Remove a plotline, redistribute its events |
| \`REFUNCTION\` | Change an event's function (e.g. escalation → crisis) |`;

const _PROMPT_PASS0 = `# ROLE
You are a story editor evaluating a show's structure from its synopses.

# CONTEXT
You receive: show title, season number, and up to 3 first synopses. Your output goes to the next step as context for plotline extraction.

# GLOSSARY

${_GLOSSARY}

# TASK

If \`suggested_plotlines\` is present in the input, use it as additional context — it contains preliminary plotline suggestions from the synopsis writer. These can help with format and ensemble detection, but verify against the synopses.

Read the synopses and determine, in this order:
### Step 1: Determine format
What's the episode structure? Use the definitions and diagnostic in Glossary.
### Step 2: Check anthology
Are seasons independent?
### Step 3: Write the story engine
Write a one-sentence logline. See story_engine in Glossary for structure and examples.
### Step 4: Determine genre

# OUTPUT

Think through before writing the JSON. You will need to explain your choices in the \`reasoning\` field — it is reviewed by a human.

Response—strictly JSON, no markdown wrapping, no comments outside JSON.

\`\`\`json
{
  "show": "Breaking Bad",
  "season": 1,
  "format": "serial",
  "is_anthology": false,
  "story_engine": "A high school chemistry teacher diagnosed with inoperable lung cancer turns to manufacturing and selling methamphetamine in order to secure his family's future",
  "genre": "drama",
  "reasoning": "Episodes continue each other: E01's conflict (first cook) flows into E02 (consequences), no self-contained stories within episodes."
}
\`\`\`

Field types:

- \`show\`: string
- \`season\`: integer
- \`format\`: enum—\`"procedural"\` | \`"serial"\` | \`"hybrid"\` | \`"ensemble"\`
- \`is_anthology\`: boolean
- \`story_engine\`: string—one sentence logline
- \`genre\`: string
- \`reasoning\`: string—why you chose this format (1–2 sentences)

# VALIDATION

Code will check:

- JSON schema: all required fields present
- \`format\` is one of: procedural, serial, hybrid, ensemble
- \`is_anthology\` is a boolean
- \`story_engine\` is a non-empty string

Code cannot check: whether your format classification actually matches the synopses, whether story_engine captures the real mechanism—that's your job.`;

const _PROMPT_PASS1 = `# ROLE

You are a story editor who's read the entire season's synopses. Map out the plotlines: who drives each one, what they want, what are the obstacles, what's at stake.

# CONTEXT

You receive: show title, season number, format, story engine, and all episode synopses. If prior season data is provided, you also receive the previous season's cast and plotlines.

Your output—cast list and plotlines with Story DNA—goes to the next step, where events from each episode will be assigned to these plotlines.

# GLOSSARY

${_GLOSSARY}

# TASK

### Step 1: Process prior season (if provided)

If \`prior_season\` is present in the input, process it BEFORE analyzing new synopses.

For each plotline in \`prior_season.plotlines\`, decide based on the NEW season's synopses:
- **CONTINUES**—present this season. Keep \`id\`, update goal/obstacle/stakes. Example: "Walt: Empire" S1→S2—same goal, but Gus is the obstacle instead of Tuco.
- **TRANSFORMED**—same hero, goal fundamentally changed. Keep \`id\`, rewrite Story DNA. Example: "Walt: Empire" S4→S5—no longer building, now hiding from consequences.
- **ENDED**—resolved or disappeared. Don't include.

For each character in \`prior_season.cast\`:
- If the character appears in this season's synopses—reuse the same \`id\` and \`name\`.
- If the character does not appear—don't include them.

Only after processing all prior plotlines, identify NEW plotlines not present before.

### Step 2: Read all synopses and suggested plotlines
Read ALL season synopses. If \`suggested_plotlines\` is present in the input, use them as a starting point — they come from an earlier analysis of the same synopses. Verify each suggestion against the text: keep what you find evidence for, drop what you don't, add what was missed. Story DNA is reconstructed from the aggregate of mentions across the season. Don't invent—mark confidence.

### Step 3: Identify the main cast
Recurring characters who drive plotlines. One character per cast entry. Guests are not cast.

### Step 4: Extract plotlines
For each plotline, fill in:
- Story DNA: hero, goal, obstacle, stakes
- type: case_of_the_week, serialized, or runner
- nature: plot-led, character-led, or theme-led
- confidence: solid, partial, or inferred

# RULES
### Naming
Name and id = ONE abstract word by GOAL, not by event or outcome. Examples: "belonging", "leadership", "love", "redemption". Do NOT use compound names like "gang_survival" or "family_destruction"—use "survival" or "family". The \`id\` must be a single snake_case word matching the \`name\`.

 Use \`Hero: Theme\` format for plotline names (e.g. "House: Authority", "Cameron: Ethics", "Jon: Honor"). This makes it clear who drives each plotline and prevents confusion during event assignment.

Case_of_the_week plotline: name it by the franchise formula—"Case of the Week", "Crime of the Week", "Mission", etc.—so it is immediately clear this is a recurring structure.

For theme-led plotlines, name by the institutional dynamic or conflict rather than by hero (e.g. "MI5 vs Slough House", "Lab Politics", "Professional Life at Sterling Cooper").

### Seed and Wraparound

Seed—an event function at the next step. Wraparound—a narrative device at the next step. Do not create plotlines of these types.

### Format and Resolution

- **serial/ensemble**: plotlines may extend beyond the season, cliffhanger in the finale is acceptable.
- **is_anthology=true**: each season is independent, don't reference other seasons.

### Quantity Expectations

- Procedural: 1 case_of_the_week + 1–3 serialized arcs. Max 5 total.
- Hybrid: 1 case_of_the_week + 2–4 serialized. Max 5 total.
- Serial (≤8 episodes): max 5 plotlines. Serial (9+ episodes): max 7. Runners must span 3+ episodes.
- Ensemble (≤8 episodes): max 7 plotlines. Ensemble (9+ episodes): max 9. Runners must span 3+ episodes.

### General

- When in doubt—do NOT create a plotline.
- For procedural/hybrid format: create exactly 1 plotline with type case_of_the_week.
- Nature of a plotline and nature of individual events can differ—plot-led action serving a character-led plotline is normal.
- Don't invent missing Story DNA components—mark confidence as partial or inferred instead.
- Goal language: same language as the synopses.

# OUTPUT

Think through your choices before writing the JSON. Each plotline must pass the logline test, and your work is reviewed by a human.

Response—strictly JSON, no markdown wrapping, no comments outside JSON.

\`\`\`json
{
  "show": "Breaking Bad",
  "season": 1,
  "cast": [
    {"id": "walt", "name": "Walter White", "aliases": ["Walt", "Heisenberg", "Mr. White"]},
    {"id": "jesse", "name": "Jesse Pinkman", "aliases": ["Jesse", "Cap'n Cook"]},
    {"id": "hank", "name": "Hank Schrader", "aliases": ["Hank"]},
    {"id": "skyler", "name": "Skyler White", "aliases": ["Skyler"]},
    {"id": "tuco", "name": "Tuco Salamanca", "aliases": ["Tuco"]}
  ],
  "plotlines": [
    {
      "id": "empire",
      "name": "Walt: Empire",
      "hero": "walt",
      "goal": "build a drug business",
      "obstacle": "moral choices, escalating danger, unpredictable partners",
      "stakes": "death, loss of humanity",
      "type": "serialized",
      "nature": "character-led",
      "confidence": "solid"
    },
    {
      "id": "family",
      "name": "Walt: Family",
      "hero": "walt",
      "goal": "keep the family together and hide the truth",
      "obstacle": "cancer, family pressure for treatment, escalating lies",
      "stakes": "family breakdown, exposure",
      "type": "serialized",
      "nature": "character-led",
      "confidence": "solid"
    },
    {
      "id": "investigation",
      "name": "Hank: Investigation",
      "hero": "hank",
      "goal": "find the new meth producer",
      "obstacle": "no direct evidence, only circumstantial traces",
      "stakes": "criminal at large, public threat",
      "type": "serialized",
      "nature": "plot-led",
      "confidence": "solid"
    },
    {
      "id": "partnership",
      "name": "Jesse: Partnership",
      "hero": "jesse",
      "goal": "survive as Walt's drug business partner",
      "obstacle": "incompetence, fear, conflict with Walt",
      "stakes": "prison or death",
      "type": "serialized",
      "nature": "character-led",
      "confidence": "solid"
    },
    {
      "id": "cancer",
      "name": "Walt: Cancer",
      "hero": "walt",
      "goal": "deal with the diagnosis",
      "obstacle": null,
      "stakes": null,
      "type": "runner",
      "nature": "character-led",
      "confidence": "partial"
    }
  ]
}
\`\`\`

Field types:

**cast[]:**

- \`id\`: string—unique snake_case identifier, used in \`hero\` field and in event \`characters\` at the next step
- \`name\`: string—full name as in credits
- \`aliases\`: array of strings—name variants found in synopses

**plotlines[]:**

- \`id\`: string—unique snake_case identifier (stable, doesn't change on rename)
- \`name\`: string—display name (see naming convention)
- \`hero\`: string—\`id\` of a character from cast
- \`goal\`: string—in synopsis language
- \`obstacle\`: string | null—in synopsis language (null for runners)
- \`stakes\`: string | null—in synopsis language (null for runners)
- \`type\`: enum—\`"case_of_the_week"\` | \`"serialized"\` | \`"runner"\`
- \`nature\`: enum—\`"plot-led"\` | \`"character-led"\` | \`"theme-led"\`
- \`confidence\`: enum—\`"solid"\` | \`"partial"\` | \`"inferred"\`

Language of \`goal\`, \`obstacle\`, \`stakes\` fields—in the language of the synopsis.

The \`span\` field (which episodes the plotline appears in) is computed by code from the next step's results—not included here.

# VALIDATION

Code will check:

- JSON schema: all required fields present, enum values valid
- Each \`hero\` references an existing \`id\` in \`cast\`
- For procedural/hybrid format: exactly 1 plotline with type case_of_the_week

Code cannot check: whether Story DNA makes narrative sense, whether you found all the plotlines—that's your job. Rank (A/B/C) is computed by code after the next step, not by you.`;

const _PROMPT_PASS2 = `# ROLE
You are a story editor breaking down a single episode: what happens, which plotline does it serve, what function does it play.

# CONTEXT
You receive: show title, season number, format, story engine, cast (with IDs), plotlines (with IDs and Story DNA), and one episode synopsis. Your output is one episode's worth of events and interactions.

# GLOSSARY

${_GLOSSARY}

# TASK

### Step 1: Break the synopsis into events
Go through the synopsis sentence by sentence. Each sentence should result in at least one event.

### Step 2: Assign each event to a plotline
For each event, decide which plotline it belongs to. Use the assignment rules below.

### Step 3: Assign functions
For each event, assign its dramatic function. These are two separate tasks — which plotline an event belongs to and what function it plays are independent decisions.

Assign functions based on what happens **within this episode**, not across the season. An event that is the climax of this episode's story might turn out to be an escalation in the season-long arc — but you only see this episode, so assign based on what you see here.

### Step 4: Identify interactions between plotlines
Check each pair of plotlines active in this episode. If they connect — through shared theme, dramatic irony, or converging characters — record the interaction. See interaction types in Glossary.

### Step 5: Determine the episode theme
One sentence. What idea ties the plotlines together? Look at what the climax/resolution of the A-story says.

# RULES

### Assigning events to plotlines

Each event belongs to the plotline whose goal it advances. When multiple characters are in a scene, ask: whose goal moves forward here? That character's plotline owns the event.

Guest characters don't have their own plotlines. A guest's action belongs to the main cast member whose plotline it serves.

When one event advances two plotlines, assign it to the primary one and list the secondary in \`also_affects\`.

### Checking your work

Every sentence of the synopsis must produce at least one event. If you can't map a sentence to an event, you missed something.

Every episode has at least 2-3 active plotlines. If all events ended up in one plotline — re-read the synopsis and look for events that belong to other plotlines, especially serialized ones that continue across episodes. In procedural and hybrid shows, don't assign everything to the case — character arcs and institutional dynamics have events too.

If all plotlines in the episode have only escalation functions, or all have only crisis/resolution — you probably misassigned some functions. A well-written episode takes its main plotline through a full arc: setup → escalation → turning point → climax → resolution. Other plotlines may cover fewer stages, but the A-story typically has all of them.

# OUTPUT

Think through before writing the JSON. Your assignments are reviewed by a human and checked by code.

Response—strictly JSON, no markdown wrapping, no comments outside JSON.


\`\`\`json
{
  "show": "Breaking Bad",
  "season": 1,
  "episode": "S01E03",
  "events": [
    {
      "event": "Walt and Jesse clean up Emilio's remains",
      "plotline_id": "empire",
      "function": "escalation",
      "characters": ["walt", "jesse"],
      "also_affects": null
    },
    {
      "event": "Krazy-8 talks about his childhood, Walt about cancer",
      "plotline_id": "empire",
      "function": "escalation",
      "characters": ["walt"],
      "also_affects": ["family"]
    },
    {
      "event": "Walt makes a pros and cons list for killing",
      "plotline_id": "empire",
      "function": "turning_point",
      "characters": ["walt"],
      "also_affects": null
    },
    {
      "event": "Skyler organizes a family intervention",
      "plotline_id": "family",
      "function": "setup",
      "characters": ["skyler", "walt"],
      "also_affects": null
    },
    {
      "event": "Family votes for chemo, Walt wants to refuse",
      "plotline_id": "family",
      "function": "escalation",
      "characters": ["walt", "skyler"],
      "also_affects": null
    },
    {
      "event": "Hank finds the desert cooking site",
      "plotline_id": "investigation",
      "function": "escalation",
      "characters": ["hank"],
      "also_affects": null
    },
    {
      "event": "DEA finds Krazy-8's car with meth",
      "plotline_id": "investigation",
      "function": "escalation",
      "characters": ["hank"],
      "also_affects": null
    },
    {
      "event": "Native girl brings a mask to the DEA office",
      "plotline_id": "investigation",
      "function": "setup",
      "characters": ["guest:native_girl"],
      "also_affects": null
    },
    {
      "event": "Walt decides to release Krazy-8",
      "plotline_id": "empire",
      "function": "turning_point",
      "characters": ["walt"],
      "also_affects": null
    },
    {
      "event": "Walt notices the missing plate shard",
      "plotline_id": "empire",
      "function": "crisis",
      "characters": ["walt"],
      "also_affects": null
    },
    {
      "event": "Walt strangles Krazy-8",
      "plotline_id": "empire",
      "function": "climax",
      "characters": ["walt"],
      "also_affects": null
    },
    {
      "event": "Walt decides to tell Skyler about the cancer",
      "plotline_id": "family",
      "function": "turning_point",
      "characters": ["walt"],
      "also_affects": null
    }
  ],
  "theme": "the illusion of control",
  "interactions": [
    {
      "type": "thematic_rhyme",
      "lines": ["empire", "family", "investigation"],
      "description": "all three plotlines are about control—over another's life, one's own death, the law"
    },
    {
      "type": "dramatic_irony",
      "lines": ["empire", "investigation"],
      "description": "the audience knows Walt = Heisenberg, Hank doesn't"
    }
  ]
}
\`\`\`

### Field Types

**events[]:**
- \`event\`: string—one sentence
- \`plotline_id\`: string | null—\`id\` of a plotline from the previous step, or \`null\` if the event doesn't fit any plotline
- \`function\`: enum—\`"setup"\` | \`"inciting_incident"\` | \`"escalation"\` | \`"turning_point"\` | \`"crisis"\` | \`"climax"\` | \`"resolution"\`
- \`characters\`: array of strings—\`id\` of characters from cast. For guest characters use \`"guest:short_name"\` (e.g. \`"guest:native_girl"\`)
- \`also_affects\`: array of strings | null—\`id\` of secondarily affected plotlines

**interactions[]:**
- \`type\`: enum—\`"thematic_rhyme"\` | \`"dramatic_irony"\` | \`"convergence"\`
- \`lines\`: array of strings—plotline \`id\`s
- \`description\`: string

# VALIDATION

Code will check:
- JSON schema: all required fields, enum values
- Each \`plotline_id\` references an existing \`id\` from the previous step or is \`null\`
- Each \`characters\` element references an existing \`id\` from cast or has the \`guest:\` prefix
- \`theme\` is not empty

Code cannot check: whether events cover the full synopsis, whether function assignments are correct, whether interactions are real—that's your job.`;

const _PROMPT_PASS3 = `# ROLE

You are a story editor with all episodes laid out in front of you. Check the full picture: are plotlines identified correctly, are events assigned right, does the structure hold up? Fix what's wrong.

# CONTEXT

You receive:
- **show**, **season**, **format**, **story_engine** (series context)
- **cast**: character list with \`id\`, \`name\`
- **plotlines**: plotline list with \`id\`, \`name\`, \`hero\`, \`goal\`, \`obstacle\`, \`stakes\`, \`type\`, \`computed_rank\`, \`nature\`, \`confidence\`, \`span\`
- **episodes**: for each episode—\`events\` (with plotline assignments), \`theme\`, \`interactions\`
- **diagnostics** (optional): automated flags from post-processing. Each flag has \`plotline\`, \`flag\`, and \`reason\`. Possible flags:
  - \`low_completeness\`—plotline has fewer arc functions than expected for its confidence (e.g. solid plotline with 3/7)
  - \`monotonicity_violation\`—function sequence goes backwards past a milestone (e.g. crisis after climax)
  - \`dominant\`—plotline has more than 50% of all season events
  These are computed facts—use them in your analysis.

Your output—verdicts (structural corrections)—is applied by code to produce the final result.

# GLOSSARY

${_GLOSSARY}

# TASK

### Step 1: Check each plotline for Story DNA

Complete Story DNA: **hero → goal → obstacle → stakes**.

**Logline test:** if you can write a logline with conflict (hero wants X, but Y stands in the way, Z is at stake)—it's a solid plotline.

But shows can be poorly written. A plotline may exist without a clear goal, with nominal conflict, or be abandoned halfway. That doesn't mean it doesn't exist—it means it's weak. Don't discard weak plotlines—mark confidence instead.

### Step 2: Spot-check event assignments

Scan events across episodes. For each plotline, read its events and check: does this event advance THIS plotline's goal, or would it fit better elsewhere? Common errors:

- Event assigned to hero's A-plotline but actually advances their B-plotline (wrong goal)
- Event describes a character reacting to another plotline's conflict (should be \`also_affects\`, not primary assignment)
- Multiple events in a row assigned to the same plotline but describing different conflicts

If you find misassigned events → REASSIGN.

### Step 3: Check plotline arcs

Note: event functions from the previous step reflect each event's role within its episode, not within the season-long arc. Keep this in mind when checking arc progression — a "climax" in episode 3 may be an escalation in the season arc.

If diagnostics include \`low_completeness\` — check if events of this plotline are misassigned to other plotlines (→ REASSIGN them back), or if the plotline is genuinely weak (→ note in your review, don't invent events).

### Step 4: Look for duplication

Two plotlines with the same hero and adjacent goals—most likely one plotline with phases. Signs:

- Same hero, goals are causally linked (goal B is a consequence of goal A)
- Events of two plotlines alternate in the same episodes
- No conflict between the two plotlines—they don't contradict each other

If confirmed → MERGE.

If diagnostics include \`dominant\` — a plotline has more than half of all season events. Check if it's actually two plotlines collapsed into one (→ CREATE a second plotline + REASSIGN events to it).

### Step 5: Check orphaned events

Events with \`plotline_id: null\`—the previous step couldn't assign them. For each:

- Event belongs to an existing plotline (assignment error) → REASSIGN
- Multiple orphaned events form a pattern (one hero, one goal) → CREATE a new plotline

### Step 6: Check format consistency

The plotline structure should match the format:

- **Procedural**: exactly one case_of_the_week plotline. Max 5 total.
- **Hybrid**: one case_of_the_week + the rest serialized. Max 5 total.
- **Serial**: max 5 plotlines. Runners must span 3+ episodes.
- **Ensemble**: max 8 plotlines. Runners must span 3+ episodes.

If the structure doesn't match—either the format was determined incorrectly, or the plotlines need adjustment.

### Step 7: Assign ranks

Each plotline has a \`computed_rank\` assigned by code from event counts. Review it. For each plotline, assign your own rank (A, B, C, or null for runners) based on narrative importance — what the show is about, not how many events a plotline has.

Return your ranks in the \`ranks\` field — a mapping of plotline ID to rank.

# RULES

1. **If everything is fine—empty \`verdicts\` array.** Don't invent problems.
2. **Each verdict must be justified by theory** (Story DNA, format, arc) or data (span, diagnostics).
3. **REASSIGN references the exact event text** from input data. Do not rephrase.
4. **MERGE: source events are automatically moved to target.** No need to list each one.
5. **DROP: must specify where to move ALL events.** Code rejects DROP if any event remains unredistributed. Events are never removed or set to null.
6. **CREATE: must specify complete Story DNA** (hero, goal, obstacle, stakes) and which events belong to it.
7. **REFUNCTION: specify event text, episode, old function, new function.**
8. **Don't flag inferred plotlines** for missing functions or low event count—incomplete structure is expected for them. Flag solid plotlines with incomplete structure.
9. **DROP only phantoms.** DROP a plotline only if it has no events and doesn't exist in the series. A weak plotline in a bad script—that's data, not an error.

# OUTPUT

Think through each verdict before writing the JSON. Each verdict must be justified by data or theory — your review is checked by a human.

Response—strictly JSON, no markdown wrapping, no comments outside JSON.

\`\`\`json
{
  "verdicts": [
    {
      "action": "MERGE",
      "source": "plotline_x",
      "target": "plotline_y",
      "reason": "one sentence—why"
    },
    {
      "action": "REASSIGN",
      "event": "exact event text",
      "episode": "S01E06",
      "from": null,
      "to": "plotline_z",
      "reason": "one sentence"
    },
    {
      "action": "CREATE",
      "plotline": {
        "id": "new_plotline_id",
        "name": "Hero: Theme",
        "hero": "cast_id",
        "goal": "...",
        "obstacle": "...",
        "stakes": "...",
        "type": "serialized",
        "nature": "character-led"
      },
      "reassign_events": [
        {"event": "exact event text", "episode": "S01E03"},
        {"event": "exact event text", "episode": "S01E06"}
      ],
      "reason": "one sentence"
    },
    {
      "action": "DROP",
      "target": "plotline_id",
      "redistribute": [
        {"event": "exact event text", "episode": "S01E02", "to": "other_plotline_id"}
      ],
      "reason": "one sentence"
    },
    {
      "action": "REFUNCTION",
      "event": "exact event text",
      "episode": "S01E05",
      "old_function": "escalation",
      "new_function": "crisis",
      "reason": "one sentence"
    }
  ],
  "ranks": {
    "empire": "A",
    "family": "B",
    "investigation": "C"
  },
  "notes": "brief comment on the quality of the original analysis (1–2 sentences)"
}
\`\`\`

### Verdict Types

| action | required fields |
|--------|-----------------|
| \`MERGE\` | \`source\`, \`target\`, \`reason\` |
| \`REASSIGN\` | \`event\`, \`episode\`, \`from\`, \`to\`, \`reason\` |
| \`CREATE\` | \`plotline\`, \`reassign_events\`, \`reason\` |
| \`DROP\` | \`target\`, \`redistribute\`, \`reason\` |
| \`REFUNCTION\` | \`event\`, \`episode\`, \`old_function\`, \`new_function\`, \`reason\` |

# VALIDATION

Code will check:
- JSON schema: all required fields for each verdict type
- \`target\`/\`source\` reference existing plotline ids
- \`to\` in REASSIGN references an existing id (or an id from CREATE in the same verdict set)
- \`event\` in REASSIGN/DROP/CREATE/REFUNCTION exactly matches event text in input data
- \`new_function\`—valid function enum
- \`plotline\` in CREATE contains all required fields

Code cannot check: whether your verdicts improve the analysis, whether merges are justified, whether refunctions are correct—that's your job.`;

const _PROMPT_PASS4 = `# ROLE
You are a story editor looking at the complete season. All events have been identified and assigned to plotlines. Your job is to determine each event's role in the plotline's season-long arc.

# CONTEXT

You receive: show title, season, plotlines with Story DNA, and all events grouped by plotline in episode order. Each event already has a \`function\` — its role within its episode. You assign \`plot_fn\` — its role in the season arc.

# GLOSSARY

${_GLOSSARY}

# TASK

For each plotline, read its events in episode order. Assign \`plot_fn\` to every event — what role does this event play in the plotline's arc across the entire season?

The episode's arc function may differ from the episode function. An event that was the climax of episode 3 might be an escalation in the season arc — the plotline is still building at that point.

\`inciting_incident\` occurs once per plotline across the season — the event that sets the plotline in motion.

Assign \`plot_fn\` to EVERY event. Do not skip any.

# OUTPUT

Think through the arc of each plotline before writing. You are assigning functions to a season-long story — consider where each event falls in the beginning, middle, and end of that story. Your assignments are reviewed by a human.

Response — strictly JSON, no markdown wrapping.

\`\`\`json
{
  "arc_functions": [
    {"plotline": "empire", "episode": "S01E01", "event": "exact event text from input", "plot_fn": "setup"},
    {"plotline": "empire", "episode": "S01E01", "event": "exact event text from input", "plot_fn": "inciting_incident"},
    {"plotline": "empire", "episode": "S01E02", "event": "exact event text from input", "plot_fn": "escalation"}
  ]
}
\`\`\`

One entry per event. Use exact event text from the input — do not rephrase. Include the plotline ID so code can match events correctly.

# VALIDATION

Code will check:
- Every event from the input has a corresponding entry in arc_functions
- Each \`plot_fn\` is a valid function: setup, inciting_incident, escalation, turning_point, crisis, climax, resolution
- Each \`event\` text exactly matches an event from the input
- Each \`plotline\` references an existing plotline ID`;

// --- Post-processing helpers (simplified browser versions) ---

function _computeSpan(plotlines, episodes) {
  for (const pl of plotlines) {
    const epSet = new Set();
    for (const ep of episodes) {
      for (const ev of ep.events) {
        if (ev.plotline_id === pl.id) epSet.add(ep.episode);
      }
    }
    pl.span = [...epSet].sort();
  }
}

function _computeRanks(plotlines, episodes, context) {
  // Count events per plotline
  const counts = {};
  let total = 0;
  for (const ep of episodes) {
    for (const ev of ep.events) {
      if (ev.plotline_id) {
        counts[ev.plotline_id] = (counts[ev.plotline_id] || 0) + 1;
        total++;
      }
    }
  }

  // Assign A/B/C based on proportion of total events
  for (const pl of plotlines) {
    const count = counts[pl.id] || 0;
    const share = total > 0 ? count / total : 0;
    if (pl.type === 'runner') {
      pl.computed_rank = null;
    } else if (share >= 0.25) {
      pl.computed_rank = 'A';
    } else if (share >= 0.10) {
      pl.computed_rank = 'B';
    } else {
      pl.computed_rank = 'C';
    }
    pl.rank = pl.computed_rank;
  }
}

function _applyVerdicts(verdicts, plotlines, episodes) {
  // Simplified verdict application for browser pipeline
  for (const v of verdicts) {
    if (v.action === 'MERGE') {
      // Move all events from source to target
      for (const ep of episodes) {
        for (const ev of ep.events) {
          if (ev.plotline_id === v.source) {
            ev.plotline_id = v.target;
          }
        }
      }
      // Remove source plotline
      const idx = plotlines.findIndex(p => p.id === v.source);
      if (idx >= 0) plotlines.splice(idx, 1);

    } else if (v.action === 'REASSIGN') {
      for (const ep of episodes) {
        if (ep.episode === v.episode) {
          for (const ev of ep.events) {
            if (ev.event === v.event) {
              ev.plotline_id = v.to;
              break;
            }
          }
          break;
        }
      }

    } else if (v.action === 'CREATE') {
      const newPl = Object.assign({}, v.plotline, {
        computed_rank: null,
        reviewed_rank: null,
        span: [],
      });
      plotlines.push(newPl);
      for (const re of (v.reassign_events || [])) {
        for (const ep of episodes) {
          if (ep.episode === re.episode) {
            for (const ev of ep.events) {
              if (ev.event === re.event) {
                ev.plotline_id = v.plotline.id;
                break;
              }
            }
            break;
          }
        }
      }

    } else if (v.action === 'DROP') {
      for (const re of (v.redistribute || [])) {
        for (const ep of episodes) {
          if (ep.episode === re.episode) {
            for (const ev of ep.events) {
              if (ev.event === re.event) {
                ev.plotline_id = re.to;
                break;
              }
            }
            break;
          }
        }
      }
      const idx = plotlines.findIndex(p => p.id === v.target);
      if (idx >= 0) plotlines.splice(idx, 1);

    } else if (v.action === 'REFUNCTION') {
      for (const ep of episodes) {
        if (ep.episode === v.episode) {
          for (const ev of ep.events) {
            if (ev.event === v.event) {
              ev.function = v.new_function;
              break;
            }
          }
          break;
        }
      }
    }
  }
}

function _applyArcFunctions(arcFunctions, episodes) {
  // Apply plot_fn to events in place
  let count = 0;
  for (const af of arcFunctions) {
    for (const ep of episodes) {
      if (ep.episode === af.episode) {
        for (const ev of ep.events) {
          if (ev.event === af.event) {
            ev.plot_fn = af.plot_fn;
            count++;
            break;
          }
        }
        break;
      }
    }
  }
  return count;
}

// --- Individual pass runners ---

async function _runPass0(synopses, seriesName, season, provider, apiKey, onChunk) {
  const sample = synopses.slice(0, 3);
  const data = {
    show: seriesName,
    season: season,
    sample_synopses: sample.map(s => ({ episode: s.episode, text: s.text })),
  };
  const userMessage = JSON.stringify(data);
  const text = await callLLM(_PROMPT_PASS0, userMessage, provider, apiKey, onChunk);
  return _parseJSONResponse(text);
}

async function _runPass1(synopses, seriesName, season, context, provider, apiKey, onChunk) {
  const data = {
    show: seriesName,
    season: season,
    format: context.format,
    is_ensemble: context.format === 'ensemble',
    story_engine: context.story_engine,
    synopses: synopses.map(s => ({ episode: s.episode, text: s.text })),
  };
  const userMessage = JSON.stringify(data);
  const text = await callLLM(_PROMPT_PASS1, userMessage, provider, apiKey, onChunk);
  return _parseJSONResponse(text);
}

async function _runPass2Episode(synopsis, seriesName, season, context, cast, plotlines, provider, apiKey, onChunk) {
  const data = {
    show: seriesName,
    season: season,
    episode: synopsis.episode,
    format: context.format,
    story_engine: context.story_engine,
    cast: cast.map(c => ({ id: c.id, name: c.name, aliases: c.aliases || [] })),
    plotlines: plotlines.map(p => ({
      id: p.id,
      name: p.name,
      hero: p.hero,
      goal: p.goal,
      obstacle: p.obstacle,
      stakes: p.stakes,
      type: p.type,
      rank: p.rank || null,
      confidence: p.confidence,
    })),
    synopsis: synopsis.text,
  };
  const userMessage = JSON.stringify(data);
  const text = await callLLM(_PROMPT_PASS2, userMessage, provider, apiKey, onChunk);
  return _parseJSONResponse(text);
}

async function _runPass3(seriesName, season, context, cast, plotlines, episodes, provider, apiKey, onChunk) {
  const payload = {
    show: seriesName,
    season: season,
    format: context.format,
    is_ensemble: context.format === 'ensemble',
    story_engine: context.story_engine,
    cast: cast.map(c => ({ id: c.id, name: c.name })),
    plotlines: plotlines.map(p => ({
      id: p.id,
      name: p.name,
      hero: p.hero,
      goal: p.goal,
      obstacle: p.obstacle,
      stakes: p.stakes,
      type: p.type,
      computed_rank: p.computed_rank,
      nature: p.nature,
      confidence: p.confidence,
      span: p.span,
    })),
    episodes: episodes.map(ep => ({
      episode: ep.episode,
      theme: ep.theme,
      events: ep.events.map(e => ({
        event: e.event,
        plotline_id: e.plotline_id,
        function: e.function,
        characters: e.characters,
        also_affects: e.also_affects,
      })),
    })),
  };
  const userMessage = JSON.stringify(payload);
  const text = await callLLM(_PROMPT_PASS3, userMessage, provider, apiKey, onChunk);
  return _parseJSONResponse(text);
}

async function _runPass4Plotline(seriesName, season, plotline, episodes, provider, apiKey, onChunk) {
  // Build user message for one plotline's events (matches Python _build_plotline_message)
  const events = [];
  for (const ep of episodes) {
    for (const ev of ep.events) {
      if (ev.plotline_id === plotline.id) {
        events.push({ episode: ep.episode, function: ev.function, event: ev.event });
      }
    }
  }
  if (events.length === 0) return null;

  const lines = [
    `Show: ${seriesName}, Season ${season}`,
    '',
    `Plotline ID: ${plotline.id} — ${plotline.name} (hero=${plotline.hero}, goal=${plotline.goal})`,
    'Events:',
  ];
  for (const e of events) {
    lines.push(`  [${e.episode}] (${e.function}) ${e.event}`);
  }

  const userMessage = lines.join('\n');
  const text = await callLLM(_PROMPT_PASS4, userMessage, provider, apiKey, onChunk);
  return _parseJSONResponse(text);
}

// --- Main pipeline ---

async function runPipeline(synopses, seriesName, provider, apiKey, onProgress) {
  // synopses = [{episode: "S01E01", text: "..."}, ...]
  // onProgress = function(message, passNumber, totalPasses)
  const totalPasses = 5;

  // Derive season from first episode code
  const season = parseInt(synopses[0].episode.slice(1, 3), 10);

  // Pass 0: detect context
  onProgress('Pass 1/5: detecting format and story engine...', 1, totalPasses);
  const pass0Result = await _runPass0(synopses, seriesName, season, provider, apiKey);
  const context = {
    format: pass0Result.format,
    story_engine: pass0Result.story_engine,
    genre: pass0Result.genre || '',
    is_anthology: !!pass0Result.is_anthology,
  };

  // Pass 1: extract cast and plotlines
  onProgress('Pass 2/5: identifying cast and plotlines...', 2, totalPasses);
  const pass1Result = await _runPass1(synopses, seriesName, season, context, provider, apiKey);
  const cast = pass1Result.cast || [];
  const plotlines = pass1Result.plotlines || [];

  // Pass 2: assign events for each episode (sequential — one API call per episode)
  onProgress('Pass 3/5: breaking down episodes...', 3, totalPasses);
  const episodes = [];
  for (let i = 0; i < synopses.length; i++) {
    onProgress(
      `Pass 3/5: episode ${i + 1}/${synopses.length} (${synopses[i].episode})...`,
      3, totalPasses,
    );
    const epResult = await _runPass2Episode(
      synopses[i], seriesName, season, context, cast, plotlines, provider, apiKey,
    );
    episodes.push({
      episode: epResult.episode || synopses[i].episode,
      events: epResult.events || [],
      theme: epResult.theme || '',
      interactions: epResult.interactions || [],
    });
  }

  // Post-processing: compute span and ranks
  _computeSpan(plotlines, episodes);
  _computeRanks(plotlines, episodes, context);

  // Pass 3: structural review
  onProgress('Pass 4/5: reviewing structure...', 4, totalPasses);
  const pass3Result = await _runPass3(
    seriesName, season, context, cast, plotlines, episodes, provider, apiKey,
  );
  const verdicts = pass3Result.verdicts || [];
  const llmRanks = pass3Result.ranks || {};

  if (verdicts.length > 0) {
    _applyVerdicts(verdicts, plotlines, episodes);
    _computeSpan(plotlines, episodes);
  }

  // Apply LLM rank overrides
  for (const pl of plotlines) {
    const llmRank = llmRanks[pl.id];
    if (llmRank && llmRank !== pl.computed_rank) {
      pl.reviewed_rank = llmRank;
    }
    pl.rank = pl.reviewed_rank || pl.computed_rank;
  }

  // Pass 4: arc functions (one call per plotline)
  onProgress('Pass 5/5: assigning arc functions...', 5, totalPasses);
  for (let i = 0; i < plotlines.length; i++) {
    const pl = plotlines[i];
    onProgress(
      `Pass 5/5: plotline ${i + 1}/${plotlines.length} (${pl.name})...`,
      5, totalPasses,
    );
    const result = await _runPass4Plotline(
      seriesName, season, pl, episodes, provider, apiKey,
    );
    if (result && result.arc_functions) {
      _applyArcFunctions(result.arc_functions, episodes);
    }
  }

  onProgress('Done!', totalPasses, totalPasses);

  // Build final result in the same format as bb_s01.json
  return {
    context: {
      series: seriesName,
      season: `S${String(season).padStart(2, '0')}`,
      format: context.format,
      story_engine: context.story_engine,
      genre: context.genre,
      is_anthology: context.is_anthology,
    },
    cast: cast,
    plotlines: plotlines,
    episodes: episodes,
  };
}

// --- Synopsis file upload and parsing ---

function _parseEpisodeCode(filename) {
  // Extract S01E01-style codes from filenames like "S01E01.txt" or "Breaking Bad S01E01.txt"
  const match = filename.match(/S(\d{2})E(\d{2})/i);
  if (match) return `S${match[1]}E${match[2]}`;
  return null;
}

async function _readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

async function _handleSynopsisUpload(files) {
  const provider = Store.getProvider();
  const apiKey = Store.getKey();

  if (!provider || !apiKey) {
    alert('Please configure your API key first (click LLM in the toolbar).');
    return;
  }

  // Parse files into synopses
  const synopses = [];
  const errors = [];
  for (const file of files) {
    const episode = _parseEpisodeCode(file.name);
    if (!episode) {
      errors.push(file.name);
      continue;
    }
    const text = await _readFileAsText(file);
    if (text.trim()) {
      synopses.push({ episode, text: text.trim() });
    }
  }

  if (errors.length > 0) {
    alert(
      `Could not parse episode code from: ${errors.join(', ')}\n` +
      'Filenames must contain SxxExx (e.g. S01E01.txt).'
    );
  }

  if (synopses.length === 0) {
    alert('No valid synopsis files found.');
    return;
  }

  // Sort by episode code
  synopses.sort((a, b) => a.episode.localeCompare(b.episode));

  // Derive series name from first filename (strip episode code and extension)
  let seriesName = files[0].name
    .replace(/S\d{2}E\d{2}/i, '')
    .replace(/\.txt$/i, '')
    .trim()
    .replace(/[_-]+$/, '')
    .trim();
  if (!seriesName) seriesName = 'Untitled Series';

  // Show progress UI
  _showPipelineProgress();

  try {
    const result = await runPipeline(synopses, seriesName, provider, apiKey, (message, pass, total) => {
      _updatePipelineProgress(message, pass, total);
    });

    // Save and display result
    const name = `${seriesName} S${String(parseInt(synopses[0].episode.slice(1, 3), 10)).padStart(2, '0')}`;
    Store.saveResult(name, result);
    _populateSeriesDropdown();

    const select = document.getElementById('series-select');
    if (select) select.value = name;

    _switchSeries(name);
    _setTab('grid');
    _hidePipelineProgress();

  } catch (err) {
    _hidePipelineProgress();
    console.error('Pipeline error:', err);
    alert(`Pipeline failed: ${err.message}`);
  }
}

// --- Pipeline progress UI ---

function _showPipelineProgress() {
  let overlay = document.getElementById('pipeline-progress');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'pipeline-progress';
    overlay.className = 'pipeline-progress-overlay';
    overlay.innerHTML = `
      <div class="pipeline-progress-box">
        <h3>Running pipeline...</h3>
        <div class="pipeline-progress-bar-container">
          <div id="pipeline-progress-bar" class="pipeline-progress-bar"></div>
        </div>
        <p id="pipeline-progress-text">Starting...</p>
      </div>
    `;
    document.body.appendChild(overlay);
  }
  overlay.classList.remove('hidden');
}

function _updatePipelineProgress(message, pass, total) {
  const text = document.getElementById('pipeline-progress-text');
  const bar = document.getElementById('pipeline-progress-bar');
  if (text) text.textContent = message;
  if (bar) bar.style.width = `${(pass / total) * 100}%`;
}

function _hidePipelineProgress() {
  const overlay = document.getElementById('pipeline-progress');
  if (overlay) overlay.classList.add('hidden');
}
