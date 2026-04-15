---
type: plan
project: tvplotlines
status: active
---

# tvplotlines Standalone HTML App — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** One downloadable HTML file that displays tvplotlines results (grid + analytics), runs the 5-pass LLM pipeline in-browser, and exports to JSON/XLS/TXT/Final Draft.

**Architecture:** Single HTML file with inline CSS, JS, and demo data. No frameworks, no CDN (except SheetJS inline). All state in localStorage. LLM calls go directly from browser to Anthropic/OpenAI API.

**Tech Stack:** Vanilla JS, CSS (ported from tvplotlines-app style.css), SheetJS (inline, for XLS export)

**Source of truth:** Existing tvplotlines-app code — CSS, grid structure, analytics calculations, color palettes. Port, don't rewrite.

---

## File Map

All work happens in one directory: `/Users/nvashko/Projects/1-projects/tvplotlines/`

| File | Purpose |
|------|---------|
| `src/tvplotlines/html/viewer.html` | The standalone HTML file (deliverable) |
| `src/tvplotlines/html/build.py` | Build script: assembles viewer.html from parts + injects demo data |
| `src/tvplotlines/html/parts/style.css` | CSS (ported from tvplotlines-app, developed separately for readability) |
| `src/tvplotlines/html/parts/grid.js` | Grid rendering (port of grid.html Jinja2 → JS) |
| `src/tvplotlines/html/parts/analytics.js` | Analytics rendering + calculations (port of analytics.py + analytics.html) |
| `src/tvplotlines/html/parts/export.js` | Export: JSON, XLS, TXT, FDX |
| `src/tvplotlines/html/parts/pipeline.js` | LLM pipeline: 5 passes, API calls, streaming |
| `src/tvplotlines/html/parts/app.js` | Router, localStorage, onboarding, UI orchestration |
| `src/tvplotlines/html/parts/shell.html` | HTML skeleton (all screens markup) |
| `tests/test_html_build.py` | Tests for build script |
| `examples/results/bb_s01.json` | Demo data (already exists) |

**Why separate parts + build:** Developing in one 2MB HTML is painful. Parts are separate files during development; `build.py` concatenates them into the final `viewer.html`. The build is simple string assembly — no webpack, no bundler.

---

## Sub-projects (in order)

1. **Каркас + грид + аналитика** (Tasks 1-5) — read-only viewer with demo data
2. **Экспорт** (Tasks 6-7) — JSON, XLS, TXT, FDX
3. **LLM-пайплайн** (Tasks 8-10) — run pipeline in browser
4. **Онбординг** (Tasks 11-12) — welcome screen, animated demo
5. **CLI интеграция** (Task 13) — `tvplotlines run --html`

---

## Task 1: Build script + HTML shell

**Files:**
- Create: `src/tvplotlines/html/build.py`
- Create: `src/tvplotlines/html/parts/shell.html`
- Create: `tests/test_html_build.py`

- [ ] **Step 1: Write test for build script**

```python
# tests/test_html_build.py
import subprocess
import tempfile
from pathlib import Path

def test_build_produces_html():
    result = subprocess.run(
        ["python", "src/tvplotlines/html/build.py", "--output", "/tmp/test_viewer.html"],
        capture_output=True, text=True
    )
    assert result.returncode == 0
    html = Path("/tmp/test_viewer.html").read_text()
    assert "<!DOCTYPE html>" in html
    assert "<style>" in html
    assert "<script>" in html
    assert "demo-data" in html
```

- [ ] **Step 2: Run test — verify it fails**

Run: `python -m pytest tests/test_html_build.py::test_build_produces_html -v`
Expected: FAIL — file not found

- [ ] **Step 3: Create shell.html**

```html
<!-- src/tvplotlines/html/parts/shell.html -->
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>tvplotlines</title>
<style>
/* {{STYLE}} */
</style>
</head>
<body>
  <div id="app">
    <div id="screen-welcome" class="screen"></div>
    <div id="screen-grid" class="screen" style="display:none"></div>
    <div id="screen-analytics" class="screen" style="display:none"></div>
  </div>
  <div id="modal-container"></div>
  <script type="application/json" id="demo-data">
  /* {{DEMO_DATA}} */
  </script>
  <script>
  /* {{APP_JS}} */
  </script>
</body>
</html>
```

- [ ] **Step 4: Create build.py**

```python
# src/tvplotlines/html/build.py
"""Assemble standalone HTML viewer from parts."""
import argparse
import json
from pathlib import Path

PARTS_DIR = Path(__file__).parent / "parts"
DEMO_DATA = Path(__file__).parent.parent.parent.parent / "examples" / "results" / "bb_s01.json"

def build(output_path: str, data_path: str | None = None):
    shell = (PARTS_DIR / "shell.html").read_text()
    style = (PARTS_DIR / "style.css").read_text() if (PARTS_DIR / "style.css").exists() else "/* placeholder */"

    js_files = ["grid.js", "analytics.js", "export.js", "pipeline.js", "app.js"]
    js_parts = []
    for name in js_files:
        path = PARTS_DIR / name
        if path.exists():
            js_parts.append(f"// --- {name} ---\n{path.read_text()}")
        else:
            js_parts.append(f"// --- {name} --- placeholder")
    all_js = "\n\n".join(js_parts)

    data_file = Path(data_path) if data_path else DEMO_DATA
    demo_json = data_file.read_text() if data_file.exists() else "{}"

    html = shell
    html = html.replace("/* {{STYLE}} */", style)
    html = html.replace("/* {{DEMO_DATA}} */", demo_json)
    html = html.replace("/* {{APP_JS}} */", all_js)

    Path(output_path).write_text(html)
    print(f"Built: {output_path}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", default="viewer.html")
    parser.add_argument("--data", default=None)
    args = parser.parse_args()
    build(args.output, args.data)
```

- [ ] **Step 5: Run test — verify it passes**

Run: `python -m pytest tests/test_html_build.py::test_build_produces_html -v`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/tvplotlines/html/ tests/test_html_build.py
git commit -m "feat: add HTML viewer build script and shell"
```

---

## Task 2: CSS — port from tvplotlines-app

**Files:**
- Create: `src/tvplotlines/html/parts/style.css`
- Reference: `/Users/nvashko/Projects/1-projects/tvplotlines-app/src/tvplotlines_app/static/style.css`

- [ ] **Step 1: Copy and adapt CSS**

Copy `style.css` from tvplotlines-app. Changes needed:
- Remove HTMX-specific styles (`.htmx-indicator`, `[hx-get]` cursor rules)
- Remove edit-mode styles (`.merge-mode`, `.split-modal`, edit modal styles) — v1 is read-only
- Keep ALL of: color palette (light + Catppuccin Mocha dark), function colors (`fn-*`), rank badges (`rank-*`), tension variables (`--ana-tension-*`), grid layout (`.timeline-grid`, `.sticky-col`, `.sticky-top`), analytics (`.ana-*`), dark mode toggle
- Add: screen routing (`.screen { display: none } .screen.active { display: block }`), welcome screen styles, onboarding styles
- Per spec: "минимализм, почти олдскульный дизайн первого интернета, но чисто" — keep existing clean palette, strip decorative elements
- VERIFY: every element must read equally well in light and dark themes

- [ ] **Step 2: Build and open in browser**

```bash
python src/tvplotlines/html/build.py --output /tmp/viewer.html && open /tmp/viewer.html
```

Visually verify: dark mode toggle works, no broken colors.

- [ ] **Step 3: Commit**

```bash
git add src/tvplotlines/html/parts/style.css
git commit -m "feat: port CSS from tvplotlines-app for standalone viewer"
```

---

## Task 3: Grid rendering — port from tvplotlines-app

**Files:**
- Create: `src/tvplotlines/html/parts/grid.js`
- Reference: `/Users/nvashko/Projects/1-projects/tvplotlines-app/src/tvplotlines_app/templates/partials/grid.html`
- Reference: `/Users/nvashko/Projects/1-projects/tvplotlines-app/src/tvplotlines_app/helpers.py`

- [ ] **Step 1: Write grid.js**

Port the Jinja2 template to a JS function `renderGrid(data, container)` that:
- Takes tvplotlines result JSON and a DOM container
- Builds the `<table class="timeline-grid">` structure
- Preserves exact class names: `event-cell`, `event-card fn-{function}`, `rank-badge rank-{rank}`, `plotline-cell`, `plotline-characters`, `guest-char`, `header-cell`, `sticky-col`, `unassigned-row`
- Event grid lookup: pre-build `eventGrid[plotlineId][episodeCode] = [events]` map
- Character resolution: port `resolve_character_name()` — strip `guest:` prefix, `is_guest()` check
- Plotline sort: `RANK_ORDER = {A: 0, B: 1, C: 2, runner: 3}`
- Click on event card → read-only detail modal (show event text, function, characters)
- Filter bar: season dropdown, character checkboxes, function chips (client-side show/hide via CSS classes, same as existing app)

Key preserved patterns from tvplotlines-app:
- `rank.toLowerCase()` for CSS class (data has uppercase "A", CSS uses `.rank-a`)
- `fn-${ev.function}` class directly from data values
- Guest characters: `c.startsWith('guest:')` → italic styling

- [ ] **Step 2: Create minimal app.js for testing**

```javascript
// src/tvplotlines/html/parts/app.js
const demoData = JSON.parse(document.getElementById('demo-data').textContent);

function showScreen(name) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById('screen-' + name).classList.add('active');
}

// Dark mode toggle — preserved from tvplotlines-app
function toggleDark() {
  document.documentElement.classList.toggle('dark');
  localStorage.setItem('theme',
    document.documentElement.classList.contains('dark') ? 'dark' : 'light');
}

// Init
(function init() {
  if (localStorage.getItem('theme') === 'dark') {
    document.documentElement.classList.add('dark');
  }
  renderGrid(demoData, document.getElementById('screen-grid'));
  showScreen('grid');
})();
```

- [ ] **Step 3: Build and test visually**

```bash
python src/tvplotlines/html/build.py --output /tmp/viewer.html && open /tmp/viewer.html
```

Verify: grid displays Breaking Bad data, colors match tvplotlines-app, sticky columns work, filters work, dark mode preserves readability.

- [ ] **Step 4: Commit**

```bash
git add src/tvplotlines/html/parts/grid.js src/tvplotlines/html/parts/app.js
git commit -m "feat: port grid rendering from tvplotlines-app to standalone JS"
```

---

## Task 4: Analytics rendering — port from tvplotlines-app

**Files:**
- Create: `src/tvplotlines/html/parts/analytics.js`
- Reference: `/Users/nvashko/Projects/1-projects/tvplotlines-app/src/tvplotlines_app/analytics.py`
- Reference: `/Users/nvashko/Projects/1-projects/tvplotlines-app/src/tvplotlines_app/templates/analytics.html`

- [ ] **Step 1: Write analytics.js**

Two parts:

**A) Computation** — port `analytics.py` to JS:
- `FUNCTION_TENSION = {resolution: 0.5, setup: 1, seed: 1, escalation: 2, turning_point: 3, climax: 4, cliffhanger: 4}`
- `RANK_ORDER = {A: 0, B: 1, C: 2, runner: 3}`
- `computeScorecard(data)` — plotlines with span dots, event counts, arc summaries
- `computeArcMap(data)` — episodes × plotlines tension grid. Tension level thresholds: `≤1.2→1, ≤2.0→2, ≤2.8→3, ≤3.5→4, else→5`
- `computePulse(data)` — per-episode stacked bars
- `computeConvergence(data)` — interaction timeline
- `computeCharacters(data)` — character event counts, filter `count < 2`
- Arc summary: dominant function at 40% threshold, priority order `["climax", "crisis", "turning_point"]`

**B) Rendering** — port `analytics.html` Jinja2 to JS:
- `renderAnalytics(data, container)` builds all 5 sections
- Preserve exact CSS classes: `ana-scorecard`, `ana-span-bar`, `ana-span-dot`, `ana-arcmap`, `ana-tension-cell`, `ana-pulse-bar`, `ana-conv-type ana-conv-{type}`, `ana-char-bar`
- Arc map: `grid-template-columns: 140px repeat(N, 1fr)`, circle size `16 + (28 * events / maxEvents)`
- Pulse: bar width `total / maxTotal * 100`%
- Character: bar width `count / maxCount * 100`%

- [ ] **Step 2: Add analytics navigation to app.js**

Add toolbar button "Analytics" that calls `renderAnalytics(demoData, container)` and switches screen. Add "Grid" button on analytics screen.

- [ ] **Step 3: Build and test visually**

```bash
python src/tvplotlines/html/build.py --output /tmp/viewer.html && open /tmp/viewer.html
```

Verify: all 5 analytics sections render, arc map colors match tension levels, dark mode works on all elements.

- [ ] **Step 4: Commit**

```bash
git add src/tvplotlines/html/parts/analytics.js
git commit -m "feat: port analytics from tvplotlines-app to standalone JS"
```

---

## Task 5: Router + localStorage + toolbar

**Files:**
- Modify: `src/tvplotlines/html/parts/app.js`
- Modify: `src/tvplotlines/html/parts/shell.html`

- [ ] **Step 1: Implement localStorage manager**

```javascript
const Store = {
  getKey: () => localStorage.getItem('tvplotlines_api_key'),
  setKey: (provider, key) => {
    localStorage.setItem('tvplotlines_provider', provider);
    localStorage.setItem('tvplotlines_api_key', key);
  },
  getResults: () => JSON.parse(localStorage.getItem('tvplotlines_results') || '{}'),
  saveResult: (name, data) => {
    const results = Store.getResults();
    results[name] = data;
    localStorage.setItem('tvplotlines_results', JSON.stringify(results));
  },
  getSettings: () => JSON.parse(localStorage.getItem('tvplotlines_settings') || '{}'),
  saveSetting: (key, val) => {
    const s = Store.getSettings();
    s[key] = val;
    localStorage.setItem('tvplotlines_settings', JSON.stringify(s));
  },
  hasSeenOnboarding: () => localStorage.getItem('tvplotlines_onboarding_seen') === 'true',
  markOnboardingSeen: () => localStorage.setItem('tvplotlines_onboarding_seen', 'true'),
};
```

- [ ] **Step 2: Implement toolbar in shell.html**

Toolbar with: series dropdown, Grid/Analytics tabs, export buttons, dark mode toggle, "Load synopses" button, "Onboarding" button, "LLM settings" button.

- [ ] **Step 3: Implement series switching**

Series dropdown populated from `Store.getResults()` + demo data. Switching re-renders grid and analytics.

- [ ] **Step 4: Build and test**

```bash
python src/tvplotlines/html/build.py --output /tmp/viewer.html && open /tmp/viewer.html
```

Verify: navigation works, dark mode persists across reload, series switching re-renders.

- [ ] **Step 5: Commit**

```bash
git add src/tvplotlines/html/parts/app.js src/tvplotlines/html/parts/shell.html
git commit -m "feat: add router, localStorage, toolbar for standalone viewer"
```

---

## Task 6: Export — JSON, XLS, TXT

**Files:**
- Create: `src/tvplotlines/html/parts/export.js`

- [ ] **Step 1: JSON export**

```javascript
function exportJSON(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
  downloadBlob(blob, filename + '.json');
}

function downloadBlob(blob, filename) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}
```

- [ ] **Step 2: TXT export**

Structured text: series name, then per-episode sections with plotline events.

- [ ] **Step 3: XLS export with SheetJS**

Include SheetJS (xlsx.mini.min.js) inline. Build workbook with two sheets: "Events" (flat table) and "Plotlines" (summary).

- [ ] **Step 4: Wire export buttons in toolbar**

- [ ] **Step 5: Build, test all 3 exports**

```bash
python src/tvplotlines/html/build.py --output /tmp/viewer.html && open /tmp/viewer.html
```

Download each format, verify contents.

- [ ] **Step 6: Commit**

```bash
git add src/tvplotlines/html/parts/export.js
git commit -m "feat: add JSON, TXT, XLS export"
```

---

## Task 7: Export — Final Draft (.fdx)

**Files:**
- Modify: `src/tvplotlines/html/parts/export.js`

- [ ] **Step 1: Research FDX format**

FDX is XML. Root: `<FinalDraft DocumentType="Script" Version="6">`. Key elements:
- `<Content>` wraps `<Paragraph>` elements
- `<Paragraph Type="Action">` for beats/events
- `<Paragraph Type="Scene Heading">` for episode markers
- `<Text>` inside `<Paragraph>` for actual text

- [ ] **Step 2: Implement FDX export**

```javascript
function exportFDX(data, filename) {
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<FinalDraft DocumentType="Script" Template="No" Version="6">\n';
  xml += '<Content>\n';

  for (const ep of data.episodes) {
    // Episode heading
    xml += `<Paragraph Type="Scene Heading"><Text>${escapeXml(ep.episode + ' — ' + ep.theme)}</Text></Paragraph>\n`;

    // Group events by plotline
    for (const pl of data.plotlines) {
      const events = ep.events.filter(e => e.storyline === pl.id);
      if (events.length === 0) continue;
      xml += `<Paragraph Type="Action"><Text Font="Bold">${escapeXml(pl.name)} [${pl.rank}]</Text></Paragraph>\n`;
      for (const ev of events) {
        xml += `<Paragraph Type="Action"><Text>[${ev.function}] ${escapeXml(ev.event)}</Text></Paragraph>\n`;
      }
    }
  }

  xml += '</Content>\n</FinalDraft>';
  const blob = new Blob([xml], {type: 'application/xml'});
  downloadBlob(blob, filename + '.fdx');
}

function escapeXml(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
```

- [ ] **Step 3: Test — open in Final Draft or text editor**

- [ ] **Step 4: Commit**

```bash
git add src/tvplotlines/html/parts/export.js
git commit -m "feat: add Final Draft .fdx export"
```

---

## Task 8: LLM pipeline — API client

**Files:**
- Create: `src/tvplotlines/html/parts/pipeline.js`
- Reference: `src/tvplotlines/prompts_en/pass0.md` through `pass4.md`

- [ ] **Step 1: Implement API client**

```javascript
async function callLLM(systemPrompt, userMessage, provider, apiKey, onChunk) {
  if (provider === 'anthropic') {
    return callAnthropic(systemPrompt, userMessage, apiKey, onChunk);
  } else {
    return callOpenAI(systemPrompt, userMessage, apiKey, onChunk);
  }
}

async function callAnthropic(systemPrompt, userMessage, apiKey, onChunk) {
  const resp = await fetch('https://api.anthropic.com/v1/messages', {
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
      system: systemPrompt,
      messages: [{role: 'user', content: userMessage}],
      stream: true,
    }),
  });
  // Parse SSE stream, call onChunk for progress, return full text
  // ... (full SSE parsing implementation)
}
```

- [ ] **Step 2: Test with real API key**

Build, open HTML, enter API key, verify a simple test call works.

- [ ] **Step 3: Commit**

```bash
git add src/tvplotlines/html/parts/pipeline.js
git commit -m "feat: add LLM API client for browser (Anthropic + OpenAI)"
```

---

## Task 9: LLM pipeline — 5 passes

**Files:**
- Modify: `src/tvplotlines/html/parts/pipeline.js`
- Reference: `src/tvplotlines/prompts_en/pass0.md` through `pass4.md`, `glossary.md`

- [ ] **Step 1: Embed prompts**

Read all prompt files from `src/tvplotlines/prompts_en/`. Embed as JS string constants in pipeline.js. Replace `{GLOSSARY}` placeholder with glossary content at build time.

- [ ] **Step 2: Implement 5-pass orchestrator**

```javascript
async function runPipeline(synopses, seriesName, provider, apiKey, onProgress) {
  onProgress('Pass 1/5: extracting characters...');
  const pass0Result = await runPass0(synopses, provider, apiKey);

  onProgress('Pass 2/5: identifying plotlines...');
  const pass1Result = await runPass1(synopses, pass0Result, provider, apiKey);

  // ... passes 2-4, each building on previous results

  onProgress('Done!');
  return finalResult;
}
```

Each pass: build user message from synopses + previous results, call LLM, parse JSON response.

- [ ] **Step 3: Implement file upload UI**

Drag & drop zone + file picker button. Read .txt files via FileReader API. Parse filenames for episode codes (e.g., `S01E01.txt`).

- [ ] **Step 4: Wire pipeline to UI**

Upload files → show progress bar → run pipeline → save to localStorage → render grid.

- [ ] **Step 5: Test end-to-end with real API key and sample synopses**

- [ ] **Step 6: Commit**

```bash
git add src/tvplotlines/html/parts/pipeline.js
git commit -m "feat: port 5-pass LLM pipeline to browser JS"
```

---

## Task 10: LLM settings modal

**Files:**
- Modify: `src/tvplotlines/html/parts/app.js`
- Modify: `src/tvplotlines/html/parts/shell.html`

- [ ] **Step 1: Implement settings modal**

- Provider selector: Claude / OpenAI buttons
- API key field (password type, show/hide toggle)
- Step-by-step instructions with screenshots placeholder (links to external video)
- "Save" stores to localStorage
- "Skip" closes modal

- [ ] **Step 2: Show on first use**

If no API key in localStorage and not skipped → show after welcome/onboarding.

- [ ] **Step 3: Add "LLM Settings" button to toolbar**

- [ ] **Step 4: Build and test**

- [ ] **Step 5: Commit**

```bash
git add src/tvplotlines/html/parts/app.js src/tvplotlines/html/parts/shell.html
git commit -m "feat: add LLM settings modal with provider selection"
```

---

## Task 11: Welcome screen

**Files:**
- Modify: `src/tvplotlines/html/parts/app.js`
- Modify: `src/tvplotlines/html/parts/shell.html`
- Modify: `src/tvplotlines/html/parts/style.css`

- [ ] **Step 1: Implement welcome screen**

- Japanese minimalism background
- "Play me" button (centered)
- "Skip →" in appropriate position
- If `Store.hasSeenOnboarding()` → skip directly to grid

- [ ] **Step 2: Update init logic**

```javascript
(function init() {
  // Theme
  if (localStorage.getItem('theme') === 'dark') {
    document.documentElement.classList.add('dark');
  }
  // Route
  if (!Store.hasSeenOnboarding()) {
    showScreen('welcome');
  } else {
    loadLastSeries();
    showScreen('grid');
  }
})();
```

- [ ] **Step 3: Build and test**

- [ ] **Step 4: Commit**

```bash
git add src/tvplotlines/html/parts/
git commit -m "feat: add welcome screen with Play me button"
```

---

## Task 12: Onboarding animation

**Files:**
- Modify: `src/tvplotlines/html/parts/app.js`
- Modify: `src/tvplotlines/html/parts/style.css`

- [ ] **Step 1: Implement onboarding sequence**

Coded animation on real app screens (not video):

```javascript
async function runOnboarding() {
  // 1. Welcome screen → skip button animates click
  await animateClick('skip');
  await delay(500);

  // 2. LLM modal appears → Claude selected → key typed
  showLLMModal();
  await delay(1000);
  await animateSelect('claude');
  await animateTyping('api-key-input', 'sk-ant-•••••••••');
  await animateClick('save-key');
  await delay(500);

  // 3. File upload zone appears → files appear
  await delay(500);
  await animateFileDrop(['S01E01.txt', 'S01E02.txt', 'S01E03.txt']);
  await delay(500);

  // 4. Pipeline runs — progress shows passes 1-5
  for (let i = 1; i <= 5; i++) {
    showProgress(`Pass ${i}/5: ${passNames[i]}...`);
    await delay(1500);
    // Reveal corresponding parts of the grid gradually
    revealGridPass(i, demoData);
  }

  // 5. Show analytics tab
  await delay(1000);
  await animateClick('analytics-tab');
  await delay(2000);

  // 6. Show export buttons
  await animateHighlight('export-buttons');
  await delay(1500);

  // 7. End — show "Connect your LLM" modal
  Store.markOnboardingSeen();
  showLLMModal();
}
```

- [ ] **Step 2: Add animation helpers**

`animateClick`, `animateTyping`, `animateFileDrop`, `animateHighlight`, `revealGridPass` — CSS transitions + JS timeouts. Subtitles/tooltips appear alongside each step.

- [ ] **Step 3: Add "Watch onboarding" button to menu**

Resets `tvplotlines_onboarding_seen` and replays.

- [ ] **Step 4: Build and test full onboarding flow**

- [ ] **Step 5: Commit**

```bash
git add src/tvplotlines/html/parts/
git commit -m "feat: add coded onboarding animation with Breaking Bad demo"
```

---

## Task 13: CLI integration — `tvplotlines run --html`

**Files:**
- Modify: `src/tvplotlines/cli.py`
- Modify: `src/tvplotlines/html/build.py`

- [ ] **Step 1: Add --html flag to CLI**

In `cli.py`, add `--html` option to the `run` command. After pipeline completes, if `--html` is set, call `build.py` with the result JSON.

- [ ] **Step 2: Implement in build.py**

`build(output_path, data_path)` already accepts custom data. CLI passes result JSON path.

- [ ] **Step 3: Test end-to-end**

```bash
tvplotlines run examples/synopses/bb/ --html --output bb_viewer.html
open bb_viewer.html
```

Verify: HTML opens with user's data instead of demo.

- [ ] **Step 4: Commit**

```bash
git add src/tvplotlines/cli.py src/tvplotlines/html/build.py
git commit -m "feat: add --html flag to CLI for standalone viewer export"
```

---

## Cross-file consistency checklist

- [ ] `FUNCTION_TENSION` values identical in `analytics.js` and original `analytics.py`
- [ ] Tension level thresholds (≤1.2→1, etc.) identical in `analytics.js` and original template
- [ ] CSS class names (`fn-*`, `rank-*`, `ana-*`) identical in `style.css` and JS rendering
- [ ] `RANK_ORDER` identical in `grid.js` and `analytics.js`
- [ ] Dark mode: every element readable in both themes
- [ ] Guest character detection: `guest:` prefix handling identical to `helpers.py`
- [ ] Demo data (`bb_s01.json`) loads correctly and matches grid rendering
