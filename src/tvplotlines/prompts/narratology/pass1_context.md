# TASK

Read the first three episode synopses of a TV show and produce show-level context.

# INPUT

Show title, season number, and synopses for the first 3 episodes.

# WHAT TO PRODUCE

```json
{
  "show": "Breaking Bad",
  "season": 1,
  "format": "serial",
  "is_anthology": false,
  "protagonists": ["Walter White"],
  "story_schema": "A high school chemistry teacher diagnosed with lung cancer cooks meth to secure his family's future.",
  "breach": "Teachers don't cook meth.",
  "genre": "crime drama",
  "reasoning": "Episodes continue each other directly; one clear protagonist (Walt); no case-of-the-week."
}
```

# FIELDS

- **format** — `procedural` (each episode mainly a standalone case + some minor season arcs), `serial` (episodes continue each other, one protagonist), `hybrid` (case-of-the-week + serial arcs both significant), `ensemble` (serial-like, but several protagonists)
- **is_anthology** — true if seasons are independent (new cast, new story each season). True Detective, Fargo
- **protagonists** — list of the show's main characters by name (not ID — IDs come later). Empty list for true anthology where each season has new protagonists
- **story_schema** — one-sentence logline. The repeating dramatic mechanism. Focus on the verbs — what are characters doing each week. This is the mental template the viewer holds in mind to understand and anticipate each episode
- **breach** — the canonical expectation the show violates. One sentence. "Teachers don't cook meth", "Spies are competent", "Therapy is confidential"
- **genre** — free text
- **reasoning** — one or two sentences supporting the format/anthology call

# RULES

- Base classification on the synopses you receive, not on prior knowledge of the show
- Diagnostic for format:
  - E01 and E02 have different cases → `procedural` or `hybrid`
  - E02 continues E01's conflict without closing it → `serial` or `ensemble`
  - serial vs ensemble: can you name THE main character? If not → `ensemble`
- Don't default to `serial` because character arcs exist — `hybrid` means BOTH case-of-the-week AND serial arcs are significant
- **Choosing protagonists**: a protagonist is the character whose decisions and POV drive the show as a whole. Tests:
  1. Whose decisions push the show forward?
  2. Whose POV does the show favor — who do we follow when they're in a scene?
  3. Whose absence would change what the show is about?
  Serial format → usually one protagonist. Ensemble → 2–5 (Game of Thrones S1: Ned, Cersei, Daenerys, Tyrion). Procedural → usually one (House) or a small team treated as a unit. Theme-led shows (The Wire, Slow Horses) often have several with the institution as the real subject — list the human protagonists who carry POV most

# OUTPUT

Strict JSON, no markdown wrapping, no comments outside JSON.
