# Quickstart

## Install

```bash
pip install tvplot
export ANTHROPIC_API_KEY=sk-ant-...   # Anthropic (default)
# or
export OPENAI_API_KEY=sk-...          # OpenAI, DeepSeek, Groq, any OpenAI-compatible
```

## Prepare synopses

Write one `.txt` file per episode. Include the episode code (`S01E01`) in the filename. Put all files in a folder named after the show:

```
breaking-bad/
├── S01E01.txt
├── S01E02.txt
└── ...
```

## CLI — analyze a folder

```bash
tvplot run breaking-bad/
```

The show name is taken from the folder name. Override with `--show` if needed:

```bash
tvplot run got/ --show "Game of Thrones"
```

Pick the analysis system — `hollywood` (default, screenwriting model) or `narratology` (structuralist):

```bash
tvplot run breaking-bad/ --system narratology
```

Produce a standalone HTML viewer alongside the JSON (opens in any browser, no server needed):

```bash
tvplot run breaking-bad/ --html                       # writes …/breaking-bad.html
tvplot run breaking-bad/ --html-output tvplot.html    # custom path
```

## Standalone viewer — analyze from the browser

Build the viewer once, then ship the `.html` file anywhere:

```bash
python -m tvplot.html.build --output tvplot.html
open tvplot.html
```

In the viewer:

1. Click **LLM** in the toolbar → paste API key → pick provider (Anthropic/OpenAI) and analysis system (Hollywood/Narratology).
2. On the welcome screen, type a series name and season, click **Analyze**.
3. The viewer asks the model for episode synopses, shows them in an editable preview, then runs the pipeline in the browser.
4. Export as JSON, CSV, Final Draft (`.fdx`), or PDF.

If the model doesn't know the show, drop your own `.txt` files via **+ Load**.

## Python

```python
from tvplot import load_synopses_dir, get_plotlines

show, season, episodes = load_synopses_dir("breaking-bad/")
result = get_plotlines(show, season, episodes)

for plotline in result.plotlines:
    print(f"{plotline.rank} | {plotline.name} ({plotline.hero})")
```

Switch analysis systems:

```python
result = get_plotlines(
    show="Breaking Bad", season=1, episodes=synopses,
    system="narratology",                         # or "hollywood" (default)
)
```

## Configuration

```python
result = get_plotlines(
    show="Breaking Bad",
    season=1,
    episodes=synopses,
    system="hollywood",          # "hollywood" | "narratology"
    llm_provider="openai",       # or "anthropic" (default), "ollama", "deepseek", "groq"
    pass2_mode="batch",          # "parallel" | "batch" | "sequential" (hollywood only)
    skip_review=False,           # skip the structural-review pass
)
```

See [API Reference](api.md) for all options.
