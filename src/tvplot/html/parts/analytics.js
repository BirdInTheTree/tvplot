// Analytics — computation and rendering for 5 analytics sections.
// Ported from tvplot-app analytics.py + analytics.html.

const FUNCTION_TENSION = {
  setup: 1, seed: 1, inciting_incident: 1.5,
  escalation: 2, turning_point: 3, crisis: 3.5,
  climax: 4, cliffhanger: 4, resolution: 0.5,
};

// RANK_ORDER is already defined in grid.js (loaded first)

// --- Computation ---

function _epNum(code) {
  return code.split('E').pop();
}

function _arcSummary(funcCounts) {
  const entries = Object.entries(funcCounts);
  if (entries.length === 0) return '';

  const total = entries.reduce((s, [, c]) => s + c, 0);
  entries.sort((a, b) => b[1] - a[1]);
  const dominant = entries[0];

  const parts = [];
  if (dominant[1] / total > 0.4) {
    parts.push(dominant[0] + '-heavy');
  }

  const highTension = ['climax', 'crisis', 'turning_point'];
  for (const fn of highTension) {
    const count = funcCounts[fn] || 0;
    if (count > 0) {
      parts.push(fn + ' (' + count + ')');
      break;
    }
  }

  if (parts.length === 0) {
    parts.push(dominant[0]);
  }
  return parts.join(', ');
}

function computeScorecard(data) {
  const plotlines = _sortedPlotlines(data);
  const episodes = data.episodes || [];
  const epCodes = episodes.map(ep => ep.episode);

  const result = [];
  for (const pl of plotlines) {
    const pid = pl.id;
    const funcCounts = {};
    for (const ep of episodes) {
      for (const ev of ep.events || []) {
        const evPl = ev.plotline_id || ev.storyline || ev.plotline;
        if (evPl === pid) {
          const fn = ev.function || 'unknown';
          funcCounts[fn] = (funcCounts[fn] || 0) + 1;
        }
      }
    }
    const eventCount = Object.values(funcCounts).reduce((s, c) => s + c, 0);
    result.push({
      id: pid,
      name: pl.name || pid,
      rank: pl.rank || '',
      span: pl.span || [],
      event_count: eventCount,
      arc_summary: _arcSummary(funcCounts),
    });
  }
  return { plotlines: result, episode_codes: epCodes };
}

function computeArcMap(data) {
  const plotlines = _sortedPlotlines(data);
  const episodes = data.episodes || [];

  const epLabels = episodes.map(ep => 'E' + _epNum(ep.episode));
  const themes = episodes.map(ep => ep.theme || '');

  const plRows = [];
  for (const pl of plotlines) {
    const pid = pl.id;
    const cells = [];
    for (const ep of episodes) {
      const funcs = [];
      for (const ev of ep.events || []) {
        const evPl = ev.plotline_id || ev.storyline || ev.plotline;
        if (evPl === pid) {
          funcs.push(ev.function || 'escalation');
        }
      }
      const eventCount = funcs.length;
      let tension = 0;
      if (eventCount > 0) {
        tension = funcs.reduce((s, f) => s + (FUNCTION_TENSION[f] || 2), 0) / eventCount;
      }
      cells.push({ tension: Math.round(tension * 10) / 10, events: eventCount });
    }
    plRows.push({
      id: pid,
      name: pl.name || pid,
      rank: pl.rank || '',
      cells: cells,
    });
  }
  return { episodes: epLabels, themes: themes, plotlines: plRows };
}

function computePulse(data) {
  const plotlines = data.plotlines || [];
  const episodes = data.episodes || [];
  const plNames = {};
  for (const p of plotlines) plNames[p.id] = p.name || p.id;

  const result = [];
  for (const ep of episodes) {
    const epNum = _epNum(ep.episode);
    const counts = {};
    for (const ev of ep.events || []) {
      const pid = ev.plotline_id || ev.storyline || ev.plotline;
      if (pid) counts[pid] = (counts[pid] || 0) + 1;
    }
    const segments = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([pid, c]) => ({
        plotline_id: pid,
        plotline_name: plNames[pid] || pid,
        count: c,
      }));
    const total = segments.reduce((s, seg) => s + seg.count, 0);
    result.push({
      episode: 'E' + epNum,
      theme: ep.theme || '',
      total: total,
      segments: segments,
    });
  }
  return result;
}

function computeConvergence(data) {
  const plotlineMap = {};
  for (const p of data.plotlines || []) plotlineMap[p.id] = p;

  const episodes = data.episodes || [];
  const result = [];

  for (const ep of episodes) {
    const interactions = ep.interactions || [];
    if (interactions.length === 0) continue;

    const epNum = _epNum(ep.episode);
    const items = [];
    for (const inter of interactions) {
      const lineIds = inter.lines || [];
      const lineNames = lineIds.map(lid => {
        const pl = plotlineMap[lid];
        return pl ? (pl.name || lid) : lid;
      });
      items.push({
        type: inter.type || '',
        lines: lineNames,
        description: inter.description || '',
      });
    }
    result.push({
      episode: 'E' + epNum,
      theme: ep.theme || '',
      interactions: items,
    });
  }
  return result;
}

function computeCharacters(data) {
  const episodes = data.episodes || [];
  const castMap = {};
  for (const c of data.cast || []) castMap[c.id] = c.name;

  const charEvents = {};
  const charPlotlines = {};

  for (const ep of episodes) {
    for (const ev of ep.events || []) {
      const pid = ev.plotline_id || ev.storyline || ev.plotline || '';
      for (const cid of ev.characters || []) {
        charEvents[cid] = (charEvents[cid] || 0) + 1;
        if (pid) {
          if (!charPlotlines[cid]) charPlotlines[cid] = {};
          charPlotlines[cid][pid] = (charPlotlines[cid][pid] || 0) + 1;
        }
      }
    }
  }

  const result = [];
  const sorted = Object.entries(charEvents).sort((a, b) => b[1] - a[1]);
  for (const [cid, count] of sorted) {
    if (count < 2) continue;
    const name = castMap[cid] || cid.replace('guest:', '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    const plCounts = charPlotlines[cid] || {};
    const plSegments = Object.entries(plCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([pid, c]) => ({ plotline_id: pid, plotline_name: pid, count: c }));
    result.push({
      id: cid,
      name: name,
      event_count: count,
      plotline_count: Object.keys(plCounts).length,
      plotline_segments: plSegments,
    });
  }
  return result;
}

function _sortedPlotlines(data) {
  return [...(data.plotlines || [])].sort(
    (a, b) => (RANK_ORDER[a.rank] ?? 99) - (RANK_ORDER[b.rank] ?? 99)
  );
}

// --- Rendering ---

function _tensionLevel(t) {
  if (t <= 1.2) return 1;
  if (t <= 2.0) return 2;
  if (t <= 2.8) return 3;
  if (t <= 3.5) return 4;
  return 5;
}

/**
 * Render all 5 analytics sections into the given container.
 *
 * Args:
 *   data: tvplot result JSON object.
 *   container: DOM element to render into.
 */
function renderAnalytics(data, container) {
  const storyEngine = (data.context || {}).story_engine || '';
  const scorecard = computeScorecard(data);
  const arcMap = computeArcMap(data);
  const pulse = computePulse(data);
  const convergence = computeConvergence(data);
  const characters = computeCharacters(data);

  container.innerHTML = '';

  // Series header: name + story engine (logline) before all sections
  const seriesName = (data.context || {}).show_name || (typeof _currentSeriesName !== 'undefined' ? _currentSeriesName : '') || '';
  if (seriesName || storyEngine) {
    const header = document.createElement('div');
    header.className = 'ana-series-header';
    if (seriesName) {
      const h1 = document.createElement('h1');
      h1.className = 'ana-series-name';
      h1.textContent = seriesName;
      header.appendChild(h1);
    }
    if (storyEngine) {
      const logline = document.createElement('p');
      logline.className = 'ana-logline';
      logline.textContent = storyEngine;
      header.appendChild(logline);
    }
    container.appendChild(header);
  }

  container.appendChild(_renderScorecard(scorecard));
  container.appendChild(_renderArcMap(arcMap));
  container.appendChild(_renderPulse(pulse));
  container.appendChild(_renderConvergence(convergence));
  container.appendChild(_renderCharacters(characters));
}

function _renderScorecard(scorecard) {
  const section = _section('Season Scorecard');

  const table = document.createElement('table');
  table.className = 'ana-scorecard';

  const thead = document.createElement('thead');
  // Header row with episode numbers under Span
  const headerRow = document.createElement('tr');
  headerRow.innerHTML = '<th>Rank</th><th>Plotline</th><th>Span</th><th>Events</th><th>Arc</th>';
  thead.appendChild(headerRow);

  // Episode numbers row
  const epRow = document.createElement('tr');
  epRow.className = 'ana-scorecard-ep-row';
  epRow.innerHTML = '<th></th><th></th><th></th><th></th><th></th>';
  const epCell = epRow.children[2];
  const epLabels = document.createElement('div');
  epLabels.className = 'ana-span-labels';
  for (const ep of scorecard.episode_codes) {
    const lbl = document.createElement('span');
    lbl.className = 'ana-span-label';
    lbl.textContent = ep.split('E').pop();
    epLabels.appendChild(lbl);
  }
  epCell.appendChild(epLabels);
  thead.appendChild(epRow);

  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  for (const pl of scorecard.plotlines) {
    const tr = document.createElement('tr');

    // Rank
    const tdRank = document.createElement('td');
    const badge = document.createElement('span');
    badge.className = 'rank-badge rank-' + (pl.rank || '').toLowerCase();
    badge.textContent = pl.rank;
    tdRank.appendChild(badge);
    tr.appendChild(tdRank);

    // Name
    const tdName = document.createElement('td');
    tdName.className = 'ana-plotline-name';
    tdName.textContent = pl.name;
    tr.appendChild(tdName);

    // Span dots (labels are in thead)
    const tdSpan = document.createElement('td');
    const spanBar = document.createElement('div');
    spanBar.className = 'ana-span-bar';
    for (const ep of scorecard.episode_codes) {
      const dot = document.createElement('div');
      dot.className = 'ana-span-dot ' + (pl.span.includes(ep) ? 'active' : 'inactive');
      dot.title = ep;
      spanBar.appendChild(dot);
    }
    tdSpan.appendChild(spanBar);
    tr.appendChild(tdSpan);

    // Events
    const tdEvents = document.createElement('td');
    tdEvents.textContent = pl.event_count;
    tr.appendChild(tdEvents);

    // Arc
    const tdArc = document.createElement('td');
    tdArc.className = 'ana-arc-summary';
    tdArc.textContent = pl.arc_summary;
    tr.appendChild(tdArc);

    tbody.appendChild(tr);
  }
  table.appendChild(tbody);
  section.appendChild(table);
  return section;
}

function _renderArcMap(arcMap) {
  const section = _section('Arc Map');

  // Find max events for circle sizing
  let maxEvents = 1;
  for (const pl of arcMap.plotlines) {
    for (const cell of pl.cells) {
      if (cell.events > maxEvents) maxEvents = cell.events;
    }
  }

  // Legend
  const legend = document.createElement('div');
  legend.className = 'ana-legend';
  legend.innerHTML =
    '<span class="ana-legend-label">low tension</span>' +
    '<div class="ana-gradient">' +
      '<div class="ana-grad-step" style="background: var(--ana-tension-1);"></div>' +
      '<div class="ana-grad-step" style="background: var(--ana-tension-2);"></div>' +
      '<div class="ana-grad-step" style="background: var(--ana-tension-3);"></div>' +
      '<div class="ana-grad-step" style="background: var(--ana-tension-4);"></div>' +
      '<div class="ana-grad-step" style="background: var(--ana-tension-5);"></div>' +
    '</div>' +
    '<span class="ana-legend-label">high tension</span>' +
    '<span class="ana-legend-hint">circle size = event count</span>';
  section.appendChild(legend);

  // Grid
  const numEps = arcMap.episodes.length;
  const grid = document.createElement('div');
  grid.className = 'ana-arcmap';
  grid.style.gridTemplateColumns = '140px repeat(' + numEps + ', 1fr)';

  // Header row: empty corner + episode labels
  grid.appendChild(document.createElement('div'));
  for (const ep of arcMap.episodes) {
    const header = document.createElement('div');
    header.className = 'ana-arcmap-header';
    header.textContent = ep;
    grid.appendChild(header);
  }

  // Plotline rows
  for (const pl of arcMap.plotlines) {
    const label = document.createElement('div');
    label.className = 'ana-arcmap-label';
    const badgeSpan = document.createElement('span');
    badgeSpan.className = 'rank-badge rank-' + (pl.rank || '').toLowerCase();
    badgeSpan.textContent = pl.rank;
    label.appendChild(badgeSpan);
    // Trim prefix before ": " if present
    const shortName = pl.name.includes(': ') ? pl.name.split(': ').pop() : pl.name;
    label.appendChild(document.createTextNode(' ' + shortName));
    grid.appendChild(label);

    for (const cell of pl.cells) {
      const cellDiv = document.createElement('div');
      if (cell.events > 0) {
        const level = _tensionLevel(cell.tension);
        cellDiv.className = 'ana-arcmap-cell ana-tension-' + level;
        const size = Math.floor(16 + (28 * cell.events / maxEvents));
        const circle = document.createElement('div');
        circle.className = 'ana-arc-circle';
        circle.style.width = size + 'px';
        circle.style.height = size + 'px';
        circle.textContent = cell.events;
        cellDiv.appendChild(circle);
      } else {
        cellDiv.className = 'ana-arcmap-cell ana-tension-0';
        const empty = document.createElement('span');
        empty.className = 'ana-arc-empty';
        empty.innerHTML = '&mdash;';
        cellDiv.appendChild(empty);
      }
      grid.appendChild(cellDiv);
    }
  }

  // Theme row
  const themeLabel = document.createElement('div');
  themeLabel.className = 'ana-arcmap-theme-label';
  themeLabel.textContent = 'theme';
  grid.appendChild(themeLabel);
  for (const theme of arcMap.themes) {
    const themeDiv = document.createElement('div');
    themeDiv.className = 'ana-arcmap-theme';
    themeDiv.textContent = theme;
    grid.appendChild(themeDiv);
  }

  section.appendChild(grid);
  return section;
}

function _renderPulse(pulse) {
  const section = _section('Episode Pulse');

  let maxTotal = 1;
  for (const ep of pulse) {
    if (ep.total > maxTotal) maxTotal = ep.total;
  }

  for (const ep of pulse) {
    const row = document.createElement('div');
    row.className = 'ana-pulse-row';

    const epLabel = document.createElement('div');
    epLabel.className = 'ana-pulse-ep';
    epLabel.textContent = ep.episode;
    row.appendChild(epLabel);

    const wrap = document.createElement('div');
    wrap.className = 'ana-pulse-wrap';
    const bars = document.createElement('div');
    bars.className = 'ana-pulse-bars';
    bars.style.width = (ep.total / maxTotal * 100).toFixed(1) + '%';

    for (const seg of ep.segments) {
      const bar = document.createElement('div');
      bar.className = 'ana-pulse-bar';
      bar.style.flex = seg.count;
      bar.title = seg.plotline_name + ': ' + seg.count;
      if (seg.count >= 2) bar.textContent = seg.count;
      bars.appendChild(bar);
    }
    wrap.appendChild(bars);
    row.appendChild(wrap);

    const totalDiv = document.createElement('div');
    totalDiv.className = 'ana-pulse-total';
    totalDiv.textContent = ep.total;
    row.appendChild(totalDiv);

    section.appendChild(row);
  }

  // Legend: which color = which plotline
  const legend = document.createElement('div');
  legend.className = 'ana-pulse-legend';
  const allPlotlines = [];
  const seen = new Set();
  for (const ep of pulse) {
    for (const seg of ep.segments) {
      if (!seen.has(seg.plotline_name)) {
        seen.add(seg.plotline_name);
        allPlotlines.push(seg.plotline_name);
      }
    }
  }
  for (let i = 0; i < allPlotlines.length; i++) {
    const item = document.createElement('span');
    item.className = 'ana-pulse-legend-item';
    const swatch = document.createElement('span');
    swatch.className = 'ana-pulse-bar';
    swatch.style.display = 'inline-block';
    swatch.style.width = '12px';
    swatch.style.height = '12px';
    swatch.style.borderRadius = '2px';
    swatch.style.verticalAlign = 'middle';
    swatch.style.marginRight = '4px';
    // Use nth-child color by applying the index via a CSS variable
    swatch.style.background = _pulseColor(i);
    item.appendChild(swatch);
    item.appendChild(document.createTextNode(allPlotlines[i]));
    legend.appendChild(item);
  }
  section.appendChild(legend);

  return section;
}

function _renderConvergence(convergence) {
  const section = _section('Convergence Moments');

  const timeline = document.createElement('div');
  timeline.className = 'ana-conv-timeline';

  const line = document.createElement('div');
  line.className = 'ana-conv-line';
  timeline.appendChild(line);

  for (const ep of convergence) {
    const group = document.createElement('div');
    group.className = 'ana-conv-group';

    const epDiv = document.createElement('div');
    epDiv.className = 'ana-conv-ep';
    epDiv.innerHTML = ep.episode + ' &mdash; ' + _escapeHtml(ep.theme);
    group.appendChild(epDiv);

    for (const inter of ep.interactions) {
      const item = document.createElement('div');
      item.className = 'ana-conv-item';

      const typeSpan = document.createElement('span');
      typeSpan.className = 'ana-conv-type ana-conv-' + inter.type;
      typeSpan.textContent = inter.type.replace(/_/g, ' ');
      item.appendChild(typeSpan);

      const linesSpan = document.createElement('span');
      linesSpan.className = 'ana-conv-lines';
      linesSpan.textContent = inter.lines.join(' + ');
      item.appendChild(linesSpan);

      const descSpan = document.createElement('span');
      descSpan.className = 'ana-conv-desc';
      descSpan.textContent = inter.description;
      item.appendChild(descSpan);

      group.appendChild(item);
    }
    timeline.appendChild(group);
  }

  section.appendChild(timeline);
  return section;
}

function _renderCharacters(characters) {
  const section = _section('Character Weight');

  const maxCount = characters.length > 0 ? characters[0].event_count : 1;

  for (const ch of characters) {
    const row = document.createElement('div');
    row.className = 'ana-char-row';

    const name = document.createElement('div');
    name.className = 'ana-char-name';
    name.textContent = ch.name;
    row.appendChild(name);

    const barWrap = document.createElement('div');
    barWrap.className = 'ana-char-bar-wrap';
    const bar = document.createElement('div');
    bar.className = 'ana-char-bar';
    bar.style.width = (ch.event_count / maxCount * 100).toFixed(1) + '%';
    bar.textContent = ch.event_count;
    barWrap.appendChild(bar);
    row.appendChild(barWrap);

    const dots = document.createElement('div');
    dots.className = 'ana-char-dots';
    for (let i = 0; i < ch.plotline_count; i++) {
      const dot = document.createElement('div');
      dot.className = 'ana-char-dot';
      dots.appendChild(dot);
    }
    row.appendChild(dots);

    section.appendChild(row);
  }
  return section;
}

// --- Helpers ---

const _PULSE_COLORS_LIGHT = ['#2563eb', '#f59e0b', '#ef4444', '#6b7280', '#8b5cf6', '#10b981'];
const _PULSE_COLORS_DARK = ['#89b4fa', '#f9e2af', '#f38ba8', '#a6adc8', '#cba6f7', '#a6e3a1'];
function _pulseColor(i) {
  const isDark = document.documentElement.classList.contains('dark');
  const palette = isDark ? _PULSE_COLORS_DARK : _PULSE_COLORS_LIGHT;
  return palette[i % palette.length];
}

function _section(title) {
  const section = document.createElement('section');
  section.className = 'ana-section';
  const h2 = document.createElement('h2');
  h2.className = 'ana-title';
  h2.textContent = title;
  section.appendChild(h2);
  return section;
}

function _escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
