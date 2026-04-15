# API Reference

## get_plotlines()

Main entry point. Extracts plotlines from a season of TV synopses via an LLM pipeline.

```python
from tvplot import get_plotlines

result = get_plotlines(
    show="House",
    season=1,
    episodes={                       # dict[str, str]: episode_id → synopsis
        "S01E01": "Dr. House takes on a kindergarten teacher...",
        "S01E02": "A teenage swimmer collapses...",
        # ...
    },
    system="hollywood",          # "hollywood" (default) | "narratology"
    prior=None,                  # TVPlotlinesResult from previous season
    llm_provider="anthropic",    # "anthropic" | "openai" | "ollama" | "deepseek" | "groq" | any OpenAI-compatible
    model=None,                  # specific model or provider default
    base_url=None,               # override endpoint (for Ollama, Together, etc.)
    pass2_mode="batch",          # "batch" | "parallel" | "sequential" (hollywood only)
    batch_id=None,               # resume a batch by ID
    context=None,                # SeriesContext or auto-detect (skips Pass 0)
    cast=None,                   # provide cast + plotlines to skip Pass 1
    plotlines=None,
    breakdowns=None,             # pre-assigned events to skip Pass 2
    suggested_plotlines=None,    # seed from write-synopses output
    skip_review=False,           # skip the structural-review pass
    callback=None,               # PipelineCallback subclass
)
```

### Analysis systems

| System | Passes | Model | Plotline shape emitted |
|--------|--------|-------|------------------------|
| `hollywood` (default) | 5 (0→1→2→3→4) | Story DNA + Freytag's seven functions | `hero`, `goal`, `obstacle`, `stakes` |
| `narratology` | 6 (context→fabula→actants→story→arc→review) | Bal/Todorov/Greimas/Bremond — actant model | Actants map onto `hero`, `goal`, `obstacle`, `stakes` so the return type stays identical |

Both systems return the same `TVPlotlinesResult`, so downstream tools (the HTML viewer, exports) work unchanged either way.

### Multi-season processing

Pass the result of the previous season to maintain character and plotline ID continuity:

```python
r1 = get_plotlines("Breaking Bad", 1, {"S01E01": "...", "S01E02": "...", ...})
r2 = get_plotlines("Breaking Bad", 2, {"S02E01": "...", ...}, prior=r1)
r3 = get_plotlines("Breaking Bad", 3, {"S03E01": "...", ...}, prior=r2)
```

When `prior` is provided:

- Pass 0 is skipped (reuses `prior.context`)
- Pass 1 receives prior cast and plotlines, reusing IDs for continuing characters and plotlines
- Not supported for anthology format (anthology seasons are independent by definition)
- Currently wired for the `hollywood` system; `narratology` treats each season independently in this release

## TVPlotlinesResult

Returned by `get_plotlines()`.

| Field       | Type                     | Description                                               |
| ----------- | ------------------------ | --------------------------------------------------------- |
| `context`   | `SeriesContext`          | Detected series context (format, story engine, genre)     |
| `cast`      | `list[CastMember]`       | Main cast members assigned to plotlines                   |
| `plotlines` | `list[Plotline]`         | Discovered plotlines                                      |
| `episodes`  | `list[EpisodeBreakdown]` | Per-episode breakdowns with events assigned to plotlines  |
| `usage`     | `str`                    | Human-readable token usage summary                        |

## Data models

### Plotline

A narrative thread. Actant fields (narratology) land in the same slots:

| Field            | Type        | Description                                             |
| ---------------- | ----------- | ------------------------------------------------------- |
| `id`             | `str`       | Unique plotline identifier                              |
| `name`           | `str`       | e.g. "Walt: Empire"                                     |
| `hero`           | `str`       | Character who drives it (narratology: `who_chases`)     |
| `goal`           | `str`       | What the driver wants (narratology: `what_they_chase`)  |
| `obstacle`       | `str`       | What stands in the way (narratology: `stands_in_the_way` joined, or `bigger_force`) |
| `stakes`         | `str`       | What happens if the driver fails / who wins if it works |
| `rank`           | `str`       | A (main), B (secondary), C (tertiary); None for runners |
| `computed_rank`  | `str`       | Rank from event counts (code-assigned)                  |
| `reviewed_rank`  | `str\|None` | Rank from the review pass, if it disagrees              |
| `type`           | `str`       | `case_of_the_week` / `serialized` / `runner`            |
| `nature`         | `str`       | `plot-led` / `character-led` / `theme-led`              |
| `confidence`     | `str`       | `solid` / `partial` / `inferred`                        |
| `span`           | `list[str]` | Episodes where the plotline appears (computed)          |

### Event

A single narrative beat within an episode:

| Field           | Type                | Description |
|-----------------|---------------------|-------------|
| `event`         | `str`               | What happens |
| `plotline_id`   | `str \| None`       | Which plotline it belongs to (None for orphans) |
| `function`      | `str`               | Episode-level role: `setup`, `inciting_incident`, `escalation`, `turning_point`, `crisis`, `climax`, `resolution` (narratology adds `recognition`) |
| `plot_fn`       | `str \| None`       | Season-level arc function; may differ from `function` — narratology's "texture" events leave it `None` |
| `characters`    | `list[str]`         | Cast IDs involved |
| `also_affects`  | `list[str] \| None` | Secondary plotline connections |

### SeriesContext

| Field         | Type   | Description                                                |
|---------------|--------|------------------------------------------------------------|
| `format`      | `str`  | `procedural` / `serial` / `hybrid` / `ensemble`            |
| `story_engine`| `str`  | One-sentence logline (narratology: also includes `breach`) |
| `genre`       | `str`  | Free-text genre                                            |
| `is_anthology`| `bool` | True for seasons-independent shows (True Detective, Fargo) |

### EpisodeBreakdown

| Field          | Type                 | Description |
|----------------|----------------------|-------------|
| `episode`      | `str`                | `S01E03` |
| `events`       | `list[Event]`        | In screen order |
| `theme`        | `str`                | One-sentence episode theme |
| `interactions` | `list[Interaction]`  | Between plotlines active this episode |

## Pass 2 modes (hollywood only)

| Mode         | Speed | Cost       | Use case                                                 |
| ------------ | ----- | ---------- | -------------------------------------------------------- |
| `batch`      | Slow  | 50% off    | Default — Anthropic batch API, cheaper for large seasons |
| `parallel`   | Fast  | Full price | All episodes at once via async                           |
| `sequential` | Slow  | Full price | One episode at a time — for debugging                    |

Narratology runs its per-episode passes (fabula, story) in `parallel` mode unconditionally.

## LLM providers

tvplot works with Anthropic (default) and any OpenAI-compatible API.

```bash
# Anthropic (default)
export ANTHROPIC_API_KEY=sk-ant-...
tvplot run house/

# OpenAI
export OPENAI_API_KEY=sk-...
tvplot run house/ --provider openai

# Ollama (local, free)
ollama pull qwen2.5:14b
tvplot run house/ --provider ollama

# DeepSeek
export DEEPSEEK_API_KEY=sk-...
tvplot run house/ --provider deepseek

# Any OpenAI-compatible endpoint
tvplot run house/ --provider openai \
    --base-url https://api.together.xyz/v1 \
    --model meta-llama/Llama-3-70b

# Pick the analysis system
tvplot run house/ --system narratology
```

In Python:

```python
result = get_plotlines(
    show="House", season=1,
    episodes={"S01E01": "synopsis...", "S01E02": "synopsis..."},
    llm_provider="ollama",
    model="qwen2.5:14b",
    base_url="http://localhost:11434/v1",
    system="narratology",
)
```

## CLI flags

```
tvplot run <files|dir> [options]

  --show NAME               Override inferred show title
  --season N                Override inferred season
  --system hollywood|narratology   Analysis system (default: hollywood)
  --provider PROVIDER       LLM provider
  --model NAME              Specific model
  --base-url URL            Custom OpenAI-compatible endpoint
  --pass2-mode MODE         parallel | batch | sequential (hollywood)
  --skip-review             Skip the structural-review pass
  --stop-after pass1        Save intermediate JSON after Pass 1
  --resume-from FILE        Resume from intermediate JSON
  --output PATH             Output JSON path
  --output-dir DIR          Save timestamped result into a directory
  --html                    Also emit a standalone HTML viewer
  --html-output PATH        Custom path for the HTML viewer
```

```
tvplot write-synopses SHOW [options]

  --season N                Season number (default: 1)
  --system hollywood|narratology   Which synopsis-writer prompt to use
  --lang LANG               Wikipedia language code (en, ru, …)
  --wiki-title TITLE        Exact Wikipedia page title
  --fandom-wiki NAME        Fandom subdomain override
  --no-fandom               Disable Fandom fetching
  --format FORMAT           procedural | serial | hybrid | ensemble
  --dry-run                 Fetch and parse only, don't call the LLM
  --no-glossary             Don't prepend glossary to the prompt
  -o DIR                    Output directory
```

## Format

tvplot classifies shows into four structural formats that determine how plotlines are extracted:

- **Procedural** — self-contained episode stories (House, CSI)
- **Serial** — continuous arcs across episodes (Breaking Bad, The Wire)
- **Hybrid** — case-of-week + serialized arcs (X-Files, Buffy)
- **Ensemble** — multiple equal-weight character arcs (Game of Thrones, This Is Us)
