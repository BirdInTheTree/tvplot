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

// Default output ceilings. Individual calls may override via `options.maxTokens`.
// Anthropic sonnet-4 supports up to 64000; OpenAI gpt-4o caps at 16384.
const _DEFAULT_MAX_TOKENS_ANTHROPIC = 16384;
const _DEFAULT_MAX_TOKENS_OPENAI = 16384;

async function callAnthropic(systemPrompt, userMessage, apiKey, onChunk, maxTokens) {
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
      max_tokens: maxTokens || _DEFAULT_MAX_TOKENS_ANTHROPIC,
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

async function callOpenAI(systemPrompt, userMessage, apiKey, onChunk, maxTokens) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      max_tokens: maxTokens || _DEFAULT_MAX_TOKENS_OPENAI,
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

// `options.maxTokens` overrides the provider default. Keeping it as a
// trailing object means existing callers (positional onChunk only) still work.
async function callLLM(systemPrompt, userMessage, provider, apiKey, onChunk, options) {
  const maxTokens = options && options.maxTokens;
  if (provider === 'anthropic') {
    return callAnthropic(systemPrompt, userMessage, apiKey, onChunk, maxTokens);
  }
  return callOpenAI(systemPrompt, userMessage, apiKey, onChunk, maxTokens);
}

// --- JSON parsing from LLM responses ---
//
// Failure modes this function is designed to survive (examples collected from
// real paid responses that blew up before the repair ladder existed):
//
//   1. Markdown fences with trailing commentary:
//        ```json\n{"episodes":[...]}\n```\n\nI hope this helps!
//   2. Unescaped newline inside a string value:
//        {"episode":"S01E01","text":"A line.\nAnother line."}
//   3. Unescaped tab inside a string value:
//        {"text":"col1\tcol2"}
//   4. Truncation at max_tokens (partial final episode, broken closing braces).
//      In that case the outer object won't parse; per-episode salvage recovers
//      the N episodes that did finish.
//   5. Trailing prose without fences:
//        {"episodes":[...]}\n\nNote: episode 7 is a clip show.

function _extractOutermostObject(text) {
  // Walk the text char-by-char, tracking string context so braces inside
  // strings don't affect nesting depth. Returns the balanced {...} substring
  // or null if no balanced object is found.
  const start = text.indexOf('{');
  if (start < 0) return null;

  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (escape) { escape = false; continue; }
    if (inString) {
      if (ch === '\\') { escape = true; continue; }
      if (ch === '"') { inString = false; }
      continue;
    }
    if (ch === '"') { inString = true; continue; }
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return null;
}

function _escapeControlCharsInStrings(text) {
  // Walk chars, escape raw newlines/tabs/CRs that appear *inside* string
  // literals. Structural whitespace (between tokens) is left alone.
  let out = '';
  let inString = false;
  let escape = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (escape) {
      out += ch;
      escape = false;
      continue;
    }
    if (inString) {
      if (ch === '\\') { out += ch; escape = true; continue; }
      if (ch === '"') { inString = false; out += ch; continue; }
      if (ch === '\n') { out += '\\n'; continue; }
      if (ch === '\r') { out += '\\r'; continue; }
      if (ch === '\t') { out += '\\t'; continue; }
      out += ch;
      continue;
    }
    if (ch === '"') { inString = true; out += ch; continue; }
    out += ch;
  }
  return out;
}

function _salvageEpisodes(text) {
  // Last-ditch: find individual episode objects and parse each in isolation.
  // Better to give the user 8 of 10 episodes than zero.
  const pattern = /\{\s*"episode"\s*:\s*"S\d+E\d+"[\s\S]*?\}/g;
  const matches = text.match(pattern) || [];
  const episodes = [];
  for (const chunk of matches) {
    try {
      const ep = JSON.parse(chunk);
      if (ep && ep.episode) episodes.push(ep);
    } catch (_) {
      // Try escaping control chars inside this one object
      try {
        const ep = JSON.parse(_escapeControlCharsInStrings(chunk));
        if (ep && ep.episode) episodes.push(ep);
      } catch (_) { /* skip unrecoverable chunk */ }
    }
  }
  return episodes.length > 0 ? { episodes } : null;
}

function _parseJSONResponse(text) {
  // Strip markdown fences.
  let cleaned = text.trim();
  const fenceMatch = cleaned.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
  if (fenceMatch) cleaned = fenceMatch[1].trim();

  // Stage 1: fast path.
  try { return JSON.parse(cleaned); } catch (_) { /* fall through */ }

  // Stage 2: outermost balanced {...} — handles trailing commentary.
  const balanced = _extractOutermostObject(cleaned);
  if (balanced) {
    try {
      const parsed = JSON.parse(balanced);
      console.warn('[_parseJSONResponse] recovered via outermost-object extraction');
      return parsed;
    } catch (_) { /* fall through */ }

    // Stage 3: escape unescaped control chars inside strings.
    try {
      const parsed = JSON.parse(_escapeControlCharsInStrings(balanced));
      console.warn('[_parseJSONResponse] recovered via control-char escaping');
      return parsed;
    } catch (_) { /* fall through */ }
  }

  // Same stage 3 but over the full cleaned text (no balanced object found).
  try {
    const parsed = JSON.parse(_escapeControlCharsInStrings(cleaned));
    console.warn('[_parseJSONResponse] recovered via control-char escaping (no balanced object)');
    return parsed;
  } catch (_) { /* fall through */ }

  // Stage 4: salvage individual episode objects from {"episodes":[...]}.
  const salvaged = _salvageEpisodes(cleaned);
  if (salvaged) {
    console.warn(`[_parseJSONResponse] recovered ${salvaged.episodes.length} episode(s) via per-episode salvage`);
    return salvaged;
  }

  // Nothing worked — rethrow a useful error. Caller is responsible for having
  // preserved the raw text before calling us (see _generateSynopses).
  throw new SyntaxError('Could not parse LLM response as JSON after repair attempts');
}

// --- Embedded prompts (inlined by build.py from prompts/{system}/*.md) ---
// _PROMPTS is defined above the APP_JS block.
const _PROMPT_PASS0 = _PROMPTS.hollywood.pass0;
const _PROMPT_PASS1 = _PROMPTS.hollywood.pass1;
const _PROMPT_PASS2 = _PROMPTS.hollywood.pass2;
const _PROMPT_PASS3 = _PROMPTS.hollywood.pass3;
const _PROMPT_PASS4 = _PROMPTS.hollywood.pass4;


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

// Elapsed-time state. Single setInterval keyed by _progressTimerId; _progressStart
// holds the ms timestamp when the overlay was last shown.
let _progressTimerId = null;
let _progressStart = 0;

function _formatElapsed(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function _tickElapsed() {
  const el = document.getElementById('pipeline-progress-elapsed');
  if (el) el.textContent = `Elapsed ${_formatElapsed(Date.now() - _progressStart)}`;
}

function _showPipelineProgress() {
  let overlay = document.getElementById('pipeline-progress');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'pipeline-progress';
    overlay.className = 'pipeline-progress-overlay';
    overlay.innerHTML = `
      <div class="pipeline-progress-box">
        <h3>Running pipeline</h3>
        <p id="pipeline-progress-step" class="pipeline-progress-step">Preparing…</p>
        <div class="pipeline-progress-bar-container">
          <div id="pipeline-progress-bar" class="pipeline-progress-bar"></div>
        </div>
        <p class="pipeline-progress-message">
          <span class="pipeline-progress-spinner" aria-hidden="true"></span>
          <span id="pipeline-progress-text">Starting…</span>
        </p>
        <p id="pipeline-progress-elapsed" class="pipeline-progress-elapsed">Elapsed 00:00</p>
        <p class="pipeline-progress-hint">Typical run: 2–5 min for a 10-episode season.</p>
      </div>
    `;
    document.body.appendChild(overlay);
  }
  overlay.classList.remove('hidden');

  // Restart the elapsed timer every time the overlay is shown so pauses
  // (e.g. the synopses review modal) don't leak seconds into the next run.
  _progressStart = Date.now();
  if (_progressTimerId !== null) clearInterval(_progressTimerId);
  _tickElapsed();
  _progressTimerId = setInterval(_tickElapsed, 1000);
}

function _updatePipelineProgress(message, pass, total) {
  const text = document.getElementById('pipeline-progress-text');
  const bar = document.getElementById('pipeline-progress-bar');
  const step = document.getElementById('pipeline-progress-step');
  if (text) text.textContent = message;
  if (bar) bar.style.width = `${(pass / total) * 100}%`;
  if (step) {
    // pass==0 is reserved for the synopsis-generation phase that precedes the
    // pipeline proper — no step number yet.
    step.textContent = pass > 0 ? `Step ${pass} of ${total}` : 'Preparing synopses';
  }
}

function _hidePipelineProgress() {
  const overlay = document.getElementById('pipeline-progress');
  if (overlay) overlay.classList.add('hidden');
  if (_progressTimerId !== null) {
    clearInterval(_progressTimerId);
    _progressTimerId = null;
  }
}

// ──────────────────────────────────────────────────────────────
// End-to-end "Analyze a series" flow — user types show + season,
// LLM generates episode synopses from training memory, user previews
// and edits, pipeline runs on those synopses.
// ──────────────────────────────────────────────────────────────

const _ANALYZE_SYSTEM_PROMPT = `You generate detailed synopses for a TV series' season, one per aired episode, from your training knowledge.

RULES:
- Cover every episode that aired in the requested season, in order
- Use zero-padded episode ids: S01E01, S01E02, …
- 200–400 words per synopsis
- Every sentence is a transition: something changes. Skip description of states, atmosphere, style
- No interpretation, no inner monologue. Report what happened
- No literary metaphors. Literal actions only
- At least three plotlines per episode (A-story plus at least two more — personal arcs, institutional dynamics, runners)
- Preserve screen order — don't sort events by plotline
- Use only what aired. Don't invent scenes
- If you don't know this show well enough to produce accurate synopses, return {"error": "unknown show"}

OUTPUT: strict JSON with shape
{"episodes": [{"episode": "S01E01", "text": "..."}, ...]}

JSON HYGIENE: emit the JSON object and nothing else — no prose, no commentary, no markdown fences before or after. Inside string values, escape every double-quote as \\" and every newline as \\n; do not emit raw control characters inside strings.`;

async function _generateSynopses(show, season, provider, apiKey, onProgress) {
  const userMessage = JSON.stringify({ show, season });
  onProgress(`Asking ${provider === 'anthropic' ? 'Claude' : 'GPT'} for synopses of ${show} S${String(season).padStart(2, '0')}...`);
  // Anthropic sonnet-4 supports 64k output tokens; 32k gives generous headroom
  // for 10+ synopses (≈5k tokens typical) without risking truncation. OpenAI
  // gpt-4o is still capped at 16384 (the provider default).
  const maxTokens = provider === 'anthropic' ? 32000 : undefined;
  const response = await callLLM(
    _ANALYZE_SYSTEM_PROMPT, userMessage, provider, apiKey, null,
    { maxTokens },
  );

  // Persist the raw response BEFORE attempting to parse. Parse failures must
  // not silently destroy a response the user paid for — they can recover it
  // from DevTools → Application → Local Storage if we fail downstream.
  try {
    localStorage.setItem('tvplot_last_raw_synopses', JSON.stringify({
      show, season, rawText: response, timestamp: Date.now(), provider,
    }));
  } catch (_) { /* localStorage full or disabled — non-fatal */ }

  const parsed = _parseJSONResponse(response);
  if (parsed.error) {
    throw new Error(
      `The model doesn't know "${show}" well enough to produce synopses. ` +
      `Either try a more common title/season, or drag & drop .txt files via + Load.`
    );
  }
  if (!Array.isArray(parsed.episodes) || parsed.episodes.length === 0) {
    throw new Error('Model returned no episodes. Try again or upload synopses manually.');
  }
  return parsed.episodes;
}

async function _analyzeSeries(show, season) {
  const provider = Store.getProvider();
  const apiKey = Store.getKey();

  if (!provider || !apiKey) {
    alert('Set your LLM provider and API key first — click "LLM" in the toolbar after this message.');
    // Tear down welcome chrome so the settings modal isn't behind it.
    _skipOnboarding();
    showScreen('welcome');
    setTimeout(_showLLMSettings, 100);
    return;
  }

  // Protect existing draft — starting a new analysis would silently overwrite
  // synopses the user already paid for. Ask first.
  const existingDraft = Store.getSynopsesDraft();
  if (existingDraft && existingDraft.show && existingDraft.synopses && existingDraft.synopses.length > 0) {
    const draftLabel = `${existingDraft.show} S${String(existingDraft.season).padStart(2, '0')}`;
    const replace = window.confirm(
      `You have unfinished synopses for ${draftLabel} (generated previously at API cost).\n\n` +
      `Starting a new analysis for ${show} S${String(season).padStart(2, '0')} will replace them. Continue?`,
    );
    if (!replace) return;
  }

  // Move from welcome screen into the viewer shell so the progress overlay
  // fits the normal layout. The grid may be empty (no data yet) — that's
  // fine, the progress overlay covers it until the pipeline finishes.
  _skipOnboarding();
  showScreen('grid');
  _showPipelineProgress();
  _updatePipelineProgress('Generating synopses from the model…', 0, 6);

  // One automatic retry: parse failures sometimes clear on a second sampling
  // from the model. More than one retry would silently burn the user's credits.
  let synopses;
  let attempt = 0;
  while (true) {
    try {
      const episodes = await _generateSynopses(show, season, provider, apiKey, (msg) => {
        _updatePipelineProgress(msg, 0, 6);
      });
      synopses = episodes.map(e => ({ episode: e.episode, text: String(e.text || '').trim() }));
      synopses = synopses.filter(s => s.episode && s.text);
      if (synopses.length === 0) throw new Error('All returned synopses were empty.');
      break;
    } catch (err) {
      _hidePipelineProgress();
      // Raw response is in localStorage (saved inside _generateSynopses before
      // parse). Surface that key in the message so the user can recover.
      const recovery =
        'Raw response saved to localStorage key `tvplot_last_raw_synopses` — ' +
        'contact support or open DevTools → Application → Local Storage to recover.';
      if (attempt === 0) {
        const retry = window.confirm(
          `Couldn't fetch synopses: ${err.message}\n\n${recovery}\n\n` +
          `Retry with another paid call to ${provider === 'anthropic' ? 'Claude' : 'GPT'}?`,
        );
        if (retry) {
          attempt++;
          _showPipelineProgress();
          _updatePipelineProgress('Retrying synopsis generation…', 0, 6);
          continue;
        }
      } else {
        alert(`Couldn't fetch synopses on retry either: ${err.message}\n\n${recovery}`);
      }
      // Route back to welcome so the user isn't stranded on an empty grid.
      showScreen('welcome');
      _renderResumeBanner && _renderResumeBanner();
      return;
    }
  }

  // Persist the draft BEFORE opening the review modal. This is the whole
  // point — if the tab reloads or the user hits Cancel by mistake, we
  // don't want them to pay the LLM again to regenerate these synopses.
  Store.saveSynopsesDraft(show, season, synopses);

  // Hide the progress overlay while the review modal is up — otherwise it
  // sits on top of the dialog showing a stale "Asking Claude…" message, which
  // is what users saw before this fix.
  _hidePipelineProgress();

  await _reviewAndRun(show, season, synopses, provider, apiKey);
}

// Shared tail used by _analyzeSeries and _resumeFromDraft: review modal,
// then pipeline. Draft lifecycle:
//   - cancel in review       → clear (user said "I don't want this")
//   - pipeline success       → clear
//   - pipeline failure/throw → keep (user may want to retry without re-paying)
async function _reviewAndRun(show, season, synopses, provider, apiKey) {
  const confirmed = await _confirmSynopses(show, season, synopses);
  if (!confirmed) {
    // Synopses were generated at API cost — ask to keep by default (OK = save,
    // Cancel = discard). Safe-by-default: accidental Enter preserves the draft.
    const save = window.confirm(
      `Save the generated synopses for ${show} S${String(season).padStart(2, '0')}?\n\n` +
      `They were produced by a paid LLM call. Saving lets you resume later without regenerating.`,
    );
    if (!save) Store.clearSynopsesDraft();
    return;
  }

  _showPipelineProgress();
  _updatePipelineProgress('Starting pipeline…', 1, 6);

  try {
    const result = await runPipeline(confirmed, show, provider, apiKey, (message, pass, total) => {
      // Shift progress by 1 so synopsis-generation counts as pass 0/6
      _updatePipelineProgress(message, pass + 1, total + 1);
    });

    const name = `${show} S${String(season).padStart(2, '0')}`;
    Store.saveResult(name, result);
    Store.clearSynopsesDraft();
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

// Entry point from the welcome-screen Resume banner. Skips generation —
// synopses already live in the draft — and goes straight to review + pipeline.
async function _resumeFromDraft() {
  const draft = Store.getSynopsesDraft();
  if (!draft) return;

  const provider = Store.getProvider();
  const apiKey = Store.getKey();
  if (!provider || !apiKey) {
    alert('Set your LLM provider and API key first — click "LLM" in the toolbar after this message.');
    _skipOnboarding();
    showScreen('welcome');
    setTimeout(_showLLMSettings, 100);
    return;
  }

  _skipOnboarding();
  showScreen('grid');

  await _reviewAndRun(draft.show, draft.season, draft.synopses, provider, apiKey);
}

// Preview & edit modal for the generated synopses. Returns the edited synopses
// array or null if the user cancels.
function _confirmSynopses(show, season, synopses) {
  return new Promise((resolve) => {
    const overlay = document.getElementById('modal-overlay');
    const body = document.getElementById('modal-body');
    if (!overlay || !body) { resolve(synopses); return; }

    const rows = synopses.map((s, i) => `
      <details ${i < 2 ? 'open' : ''} style="margin-bottom:10px;border:1px solid var(--border,#ddd);border-radius:6px">
        <summary style="padding:8px 12px;cursor:pointer;font-weight:600">${s.episode} — ${s.text.slice(0, 80).replace(/</g, '&lt;')}…</summary>
        <textarea data-episode="${s.episode}" style="width:100%;min-height:160px;padding:8px;border:none;border-top:1px solid var(--border,#eee);background:transparent;color:inherit;font:inherit;resize:vertical">${s.text.replace(/</g, '&lt;')}</textarea>
      </details>
    `).join('');

    body.innerHTML = `
      <h3 style="margin-top:0">Review synopses — ${show} S${String(season).padStart(2, '0')}</h3>
      <p style="color:#666;font-size:0.85em;margin-bottom:12px">
        Generated ${synopses.length} synopses. Edit anything that looks wrong, then run the pipeline.
      </p>
      <div style="max-height:55vh;overflow-y:auto;padding-right:4px">${rows}</div>
      <div style="margin-top:16px;display:flex;gap:8px;justify-content:flex-end">
        <button id="analyze-cancel" style="padding:6px 14px;border-radius:4px;cursor:pointer">Cancel</button>
        <button id="analyze-run" style="padding:6px 14px;border-radius:4px;cursor:pointer;background:#1a1a1a;color:#fff;border:none">Run pipeline →</button>
      </div>
    `;
    overlay.classList.remove('hidden');

    const close = (value) => {
      overlay.classList.add('hidden');
      resolve(value);
    };

    const readEdited = () => Array.from(body.querySelectorAll('textarea[data-episode]')).map(ta => ({
      episode: ta.dataset.episode,
      text: ta.value.trim(),
    })).filter(s => s.text);

    // Keep the persisted draft in sync with in-modal edits so a reload or
    // crash mid-review doesn't lose the user's corrections.
    let saveTimer = null;
    body.querySelectorAll('textarea[data-episode]').forEach(ta => {
      ta.addEventListener('input', () => {
        if (saveTimer) clearTimeout(saveTimer);
        saveTimer = setTimeout(() => {
          Store.saveSynopsesDraft(show, season, readEdited());
        }, 500);
      });
    });

    document.getElementById('analyze-cancel').addEventListener('click', () => {
      if (saveTimer) clearTimeout(saveTimer);
      close(null);
    });
    document.getElementById('analyze-run').addEventListener('click', () => {
      if (saveTimer) clearTimeout(saveTimer);
      const edited = readEdited();
      Store.saveSynopsesDraft(show, season, edited);
      close(edited);
    });
  });
}

// ══════════════════════════════════════════════════════════════════
// Narratology pipeline — mirrors src/tvplot/narratology.py.
// Result shape is hollywood-compatible: actant fields are mapped onto
// hero/goal/obstacle/stakes so the grid + analytics render unchanged.
// ══════════════════════════════════════════════════════════════════

const _VALID_FUNCTIONS_NAR = new Set([
  'setup', 'inciting_incident', 'escalation', 'turning_point',
  'crisis', 'climax', 'resolution', 'recognition',
]);

function _plotlinesSummaryForNar(plotlines) {
  return plotlines.map(p => ({
    id: p.id, name: p.name,
    who_chases: p.hero, what_they_chase: p.goal,
  }));
}

async function _runNarPass1Context(show, season, synopses, provider, apiKey) {
  const payload = {
    show, season,
    sample_synopses: synopses.slice(0, 3).map(s => ({ episode: s.episode, text: s.text })),
  };
  const text = await callLLM(_PROMPTS.narratology.pass1_context, JSON.stringify(payload), provider, apiKey);
  return _parseJSONResponse(text);
}

async function _runNarPass2Fabula(show, season, context, synopsis, provider, apiKey) {
  const payload = {
    show, season, episode: synopsis.episode,
    context: { format: context.format, story_schema: context.story_engine, genre: context.genre },
    synopsis: synopsis.text,
  };
  const text = await callLLM(_PROMPTS.narratology.pass2_fabula, JSON.stringify(payload), provider, apiKey);
  return _parseJSONResponse(text);
}

async function _runNarPass3Actants(show, season, context, castIds, flatEvents, provider, apiKey) {
  const payload = {
    show, season,
    context: {
      format: context.format, story_schema: context.story_engine,
      genre: context.genre, is_anthology: !!context.is_anthology,
    },
    cast: castIds.slice().sort(),
    events: flatEvents,
  };
  const text = await callLLM(_PROMPTS.narratology.pass3_actants, JSON.stringify(payload), provider, apiKey);
  return _parseJSONResponse(text);
}

async function _runNarPass4Story(show, season, context, plotlines, episode, events, provider, apiKey) {
  const payload = {
    show, season, episode,
    context: { format: context.format, story_schema: context.story_engine },
    plotlines: _plotlinesSummaryForNar(plotlines),
    events,
  };
  const text = await callLLM(_PROMPTS.narratology.pass4_story, JSON.stringify(payload), provider, apiKey);
  return _parseJSONResponse(text);
}

async function _runNarPass5Arc(show, season, plotline, events, provider, apiKey) {
  const payload = {
    show, season,
    plotline: { id: plotline.id, name: plotline.name, who_chases: plotline.hero, what_they_chase: plotline.goal },
    events,
  };
  const text = await callLLM(_PROMPTS.narratology.pass5_arc, JSON.stringify(payload), provider, apiKey);
  return _parseJSONResponse(text);
}

async function _runNarPass6Review(show, season, context, plotlineSummary, eventsFlat, provider, apiKey) {
  const payload = {
    show, season,
    context: { format: context.format, story_schema: context.story_engine },
    plotlines: plotlineSummary,
    events: eventsFlat,
  };
  const text = await callLLM(_PROMPTS.narratology.pass6_review, JSON.stringify(payload), provider, apiKey);
  return _parseJSONResponse(text);
}

function _applyNarratologyVerdicts(verdicts, plotlines, episodes) {
  const byId = new Map(plotlines.map(p => [p.id, p]));
  const dropped = new Set();
  for (const v of verdicts) {
    const kind = v.kind;
    if (kind === 'MERGE') {
      const targets = v.targets || [];
      if (targets.length < 2) continue;
      const [keep, ...rest] = targets;
      for (const other of rest) {
        if (other === keep || !byId.has(other)) continue;
        for (const ep of episodes) for (const ev of ep.events) {
          if (ev.plotline_id === other) ev.plotline_id = keep;
        }
        dropped.add(other);
      }
    } else if (kind === 'DROP') {
      for (const t of (v.targets || [])) {
        for (const ep of episodes) for (const ev of ep.events) {
          if (ev.plotline_id === t) ev.plotline_id = null;
        }
        dropped.add(t);
      }
    } else if (kind === 'REASSIGN') {
      const eid = v.event_id || '';
      if (!eid.includes('#')) continue;
      const [targetEp, idxStr] = eid.split('#');
      const idx = parseInt(idxStr, 10) - 1;
      for (const ep of episodes) {
        if (ep.episode !== targetEp) continue;
        if (idx >= 0 && idx < ep.events.length && v.to_plotline) {
          ep.events[idx].plotline_id = v.to_plotline;
        }
      }
    } else if (kind === 'REFUNCTION') {
      const eid = v.event_id || '';
      if (!eid.includes('#') || !v.new_function) continue;
      const [targetEp, idxStr] = eid.split('#');
      const idx = parseInt(idxStr, 10) - 1;
      for (const ep of episodes) {
        if (ep.episode !== targetEp) continue;
        if (idx >= 0 && idx < ep.events.length) ep.events[idx].function = v.new_function;
      }
    }
  }
  return plotlines.filter(p => !dropped.has(p.id));
}

async function runPipelineNarratology(synopses, seriesName, provider, apiKey, onProgress) {
  const totalPasses = 6;
  const season = parseInt(synopses[0].episode.slice(1, 3), 10);

  // Pass 1 — context
  onProgress('Pass 1/6: narratology context (breach, story schema)…', 1, totalPasses);
  const p1 = await _runNarPass1Context(seriesName, season, synopses, provider, apiKey);
  const context = {
    format: p1.format,
    story_engine: p1.breach
      ? `${p1.story_schema} Breach: ${p1.breach}`
      : p1.story_schema,
    genre: p1.genre || '',
    is_anthology: !!p1.is_anthology,
  };
  const protagonists = Array.isArray(p1.protagonists) ? p1.protagonists : [];

  // Pass 2 — fabula (parallel per episode)
  onProgress('Pass 2/6: fabula (events, cast)…', 2, totalPasses);
  const p2Results = await Promise.all(
    synopses.map(s => _runNarPass2Fabula(seriesName, season, context, s, provider, apiKey))
  );
  const eventsByEp = {};
  const castIds = new Set();
  for (let i = 0; i < synopses.length; i++) {
    const ep = synopses[i].episode;
    eventsByEp[ep] = (p2Results[i].events || []).map((e, idx) => ({
      id: e.id || `${ep}#${String(idx + 1).padStart(2, '0')}`,
      description: e.description,
      characters: e.characters || [],
    }));
    for (const cid of (p2Results[i].cast_appearances || [])) castIds.add(cid);
    for (const ev of eventsByEp[ep]) for (const cid of ev.characters) castIds.add(cid);
  }

  const cast = [];
  const seenCast = new Set();
  for (const cid of Array.from(castIds).sort()) {
    if (cid.startsWith('guest:')) continue;
    const name = cid.replace(/[_-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    cast.push({ id: cid, name, aliases: [] });
    seenCast.add(cid);
  }
  for (const prot of protagonists) {
    const pid = prot.toLowerCase().replace(/\s+/g, '_');
    if (!seenCast.has(pid)) cast.push({ id: pid, name: prot, aliases: [] });
  }

  // Pass 3 — actants
  onProgress('Pass 3/6: actants (who chases what)…', 3, totalPasses);
  const flatEvents = [];
  for (const ep of Object.keys(eventsByEp)) {
    for (const e of eventsByEp[ep]) flatEvents.push({ ...e, episode: ep });
  }
  const p3 = await _runNarPass3Actants(
    seriesName, season, context, cast.map(c => c.id), flatEvents, provider, apiKey,
  );
  const plotlines = (p3.plotlines || []).map(p => {
    const stands = p.stands_in_the_way || [];
    const obstacle = stands.length ? stands.join(', ') : (p.bigger_force || '');
    const winner = p.who_wins_if_it_works || p.who_chases || '';
    return {
      id: p.id, name: p.name,
      hero: p.who_chases || '',
      goal: p.what_they_chase || '',
      obstacle,
      stakes: `If wins: ${winner}`,
      type: p.type || 'serialized',
      nature: p.nature || 'character-led',
      confidence: p.confidence || 'partial',
      span: [], computed_rank: null, reviewed_rank: null, rank: null,
    };
  });

  // Pass 4 — story (parallel per episode)
  onProgress('Pass 4/6: story functions per episode…', 4, totalPasses);
  const sortedEps = Object.keys(eventsByEp).sort();
  const p4Results = await Promise.all(
    sortedEps.map(ep => _runNarPass4Story(seriesName, season, context, plotlines, ep, eventsByEp[ep], provider, apiKey))
  );
  const episodes = [];
  const eventsById = new Map();
  for (const ep of sortedEps) for (const e of eventsByEp[ep]) eventsById.set(e.id, { ...e, episode: ep });

  for (let i = 0; i < sortedEps.length; i++) {
    const ep = sortedEps[i];
    const data = p4Results[i];
    const eventsOut = [];
    for (const e of (data.events || [])) {
      const src = eventsById.get(e.id);
      if (!src) continue;
      let fn = e.function || 'setup';
      if (!_VALID_FUNCTIONS_NAR.has(fn)) fn = 'setup';
      eventsOut.push({
        event: src.description,
        plotline_id: e.plotline_id || null,
        function: fn,
        characters: src.characters || [],
        also_affects: (e.also_affects && e.also_affects.length) ? e.also_affects : null,
        plot_fn: null,
      });
    }
    const interactions = (data.interactions || []).map(it => ({
      type: it.kind || 'thematic_rhyme',
      lines: it.plotlines || [],
      description: it.description || '',
    }));
    episodes.push({ episode: ep, theme: data.theme || '', events: eventsOut, interactions });
  }

  _computeSpan(plotlines, episodes);
  _computeRanks(plotlines, episodes, context);

  // Pass 5 — arc (parallel per plotline)
  onProgress('Pass 5/6: season-level arc functions…', 5, totalPasses);
  const plotEvents = new Map();
  for (const ep of episodes) for (const ev of ep.events) {
    if (!ev.plotline_id) continue;
    if (!plotEvents.has(ev.plotline_id)) plotEvents.set(ev.plotline_id, []);
    plotEvents.get(ev.plotline_id).push({ ep, ev });
  }
  const activePlotlines = plotlines.filter(p => plotEvents.has(p.id));
  const p5Inputs = activePlotlines.map(p => {
    const events = plotEvents.get(p.id).map(({ ep, ev }, i) => ({
      id: `${ep.episode}#${String(i + 1).padStart(2, '0')}`,
      episode: ep.episode,
      description: ev.event,
      function: ev.function,
    }));
    return { plotline: p, events };
  });
  const p5Results = await Promise.all(
    p5Inputs.map(input => _runNarPass5Arc(seriesName, season, input.plotline, input.events, provider, apiKey))
  );
  for (let i = 0; i < activePlotlines.length; i++) {
    const events = p5Results[i].events || [];
    const refs = plotEvents.get(activePlotlines[i].id);
    for (const item of events) {
      if (!item.id || !item.id.includes('#')) continue;
      const [, idxStr] = item.id.split('#');
      const idx = parseInt(idxStr, 10) - 1;
      if (idx < 0 || idx >= refs.length) continue;
      const { ev } = refs[idx];
      ev.plot_fn = (item.kind === 'texture') ? null : (item.arc_function || null);
    }
  }

  // Pass 6 — review
  onProgress('Pass 6/6: structural review + ranks…', 6, totalPasses);
  const plotlineSummary = plotlines.map(p => ({
    id: p.id, name: p.name,
    who_chases: p.hero, what_they_chase: p.goal,
    event_count: episodes.reduce((n, ep) => n + ep.events.filter(e => e.plotline_id === p.id).length, 0),
  }));
  const eventsFlat6 = [];
  for (const ep of episodes) {
    ep.events.forEach((ev, i) => {
      eventsFlat6.push({
        id: `${ep.episode}#${String(i + 1).padStart(2, '0')}`,
        episode: ep.episode, description: ev.event,
        plotline_id: ev.plotline_id, function: ev.function,
        arc_function: ev.plot_fn,
      });
    });
  }
  const p6 = await _runNarPass6Review(seriesName, season, context, plotlineSummary, eventsFlat6, provider, apiKey);
  const verdicts = p6.verdicts || [];
  const keptPlotlines = _applyNarratologyVerdicts(verdicts, plotlines, episodes);
  for (const r of (p6.ranks || [])) {
    const pl = keptPlotlines.find(p => p.id === r.plotline_id);
    if (pl && ['A', 'B', 'C'].includes(r.rank)) {
      pl.reviewed_rank = r.rank;
      pl.rank = r.rank;
    }
  }
  _computeSpan(keptPlotlines, episodes);
  _computeRanks(keptPlotlines, episodes, context);
  for (const p of keptPlotlines) p.rank = p.reviewed_rank || p.computed_rank;

  onProgress('Done!', totalPasses, totalPasses);

  return {
    context: {
      series: seriesName,
      season: `S${String(season).padStart(2, '0')}`,
      format: context.format,
      story_engine: context.story_engine,
      genre: context.genre,
      is_anthology: context.is_anthology,
      system: 'narratology',
    },
    cast,
    plotlines: keptPlotlines,
    episodes,
  };
}

// Dispatcher — picks between the two pipelines based on Store.getSystem().
const _originalRunPipeline = runPipeline;
runPipeline = function (synopses, seriesName, provider, apiKey, onProgress) {
  const system = (typeof Store !== 'undefined' && Store.getSystem) ? Store.getSystem() : 'hollywood';
  if (system === 'narratology') {
    return runPipelineNarratology(synopses, seriesName, provider, apiKey, onProgress);
  }
  return _originalRunPipeline(synopses, seriesName, provider, apiKey, onProgress);
};
