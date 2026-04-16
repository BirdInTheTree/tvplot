// Analytics — 4 question-titled charts for the analytics view.
// Each chart answers one question (Kaushik principle).

// Plotline color palette — consistent identity across all charts.
// 12 colors to cover up to 12 plotlines; wraps via modulo.
const _PL_COLORS_LIGHT = [
  '#2563eb', '#f59e0b', '#ef4444', '#6b7280', '#8b5cf6', '#10b981',
  '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#14b8a6', '#a855f7',
];
const _PL_COLORS_DARK = [
  '#89b4fa', '#f9e2af', '#f38ba8', '#a6adc8', '#cba6f7', '#a6e3a1',
  '#f5c2e7', '#89dceb', '#a6e3a1', '#fab387', '#94e2d5', '#b4befe',
];

// Dramatic arc order for chart 2 rows
const _ARC_ORDER = [
  'setup', 'inciting_incident', 'escalation',
  'turning_point', 'climax', 'resolution',
];

const _ARC_LABELS = {
  setup: 'Setup',
  inciting_incident: 'Inciting Incident',
  escalation: 'Escalation',
  turning_point: 'Turning Point',
  climax: 'Climax',
  resolution: 'Resolution',
};

// --- Helpers ---

function _plColor(index) {
  const isDark = document.documentElement.classList.contains('dark');
  const palette = isDark ? _PL_COLORS_DARK : _PL_COLORS_LIGHT;
  return palette[index % palette.length];
}

function _epNum(code) {
  return code.split('E').pop();
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

function _sortedPlotlines(data) {
  return [...(data.plotlines || [])].sort(
    (a, b) => (RANK_ORDER[a.rank] ?? 99) - (RANK_ORDER[b.rank] ?? 99)
  );
}

/**
 * Build a plotline-id → palette-index map, sorted by rank.
 */
function _plotlineColorMap(data) {
  const sorted = _sortedPlotlines(data);
  const map = {};
  sorted.forEach((pl, i) => { map[pl.id] = i; });
  return map;
}

/**
 * Build a plotline-id → name map.
 */
function _plotlineNameMap(data) {
  const map = {};
  for (const pl of data.plotlines || []) {
    map[pl.id] = pl.name || pl.id;
  }
  return map;
}

// --- Chart 1: Events per episode (stacked bar) ---

function _renderEventsPerEpisode(data, colorMap) {
  const section = _section('Сколько событий в каждой серии?');
  const episodes = data.episodes || [];
  const plotlines = _sortedPlotlines(data);
  const plNames = _plotlineNameMap(data);

  if (episodes.length === 0) return section;

  // Compute per-episode, per-plotline counts
  const epData = [];
  let maxTotal = 0;
  for (const ep of episodes) {
    const counts = {};
    for (const ev of ep.events || []) {
      const pid = ev.plotline_id || ev.storyline || ev.plotline;
      if (pid) counts[pid] = (counts[pid] || 0) + 1;
    }
    const total = Object.values(counts).reduce((s, c) => s + c, 0);
    if (total > maxTotal) maxTotal = total;
    epData.push({ code: ep.episode, counts, total });
  }

  if (maxTotal === 0) return section;

  const CHART_HEIGHT = 300;

  // Chart container
  const chart = document.createElement('div');
  chart.className = 'ana-stacked-chart';

  // Y-axis
  const yAxis = document.createElement('div');
  yAxis.className = 'ana-stacked-yaxis';
  const steps = 4;
  for (let i = steps; i >= 0; i--) {
    const label = document.createElement('div');
    label.className = 'ana-stacked-ylabel';
    label.textContent = Math.round(maxTotal * i / steps);
    yAxis.appendChild(label);
  }
  chart.appendChild(yAxis);

  // Bars area
  const barsWrap = document.createElement('div');
  barsWrap.className = 'ana-stacked-bars';

  for (const ep of epData) {
    const col = document.createElement('div');
    col.className = 'ana-stacked-col';

    const bar = document.createElement('div');
    bar.className = 'ana-stacked-bar';
    bar.style.height = (ep.total / maxTotal * CHART_HEIGHT) + 'px';

    // Stack segments bottom-to-top: A-plotline at bottom (first in sorted order)
    // Flex column-reverse so first child renders at bottom
    for (const pl of plotlines) {
      const count = ep.counts[pl.id] || 0;
      if (count === 0) continue;
      const seg = document.createElement('div');
      seg.className = 'ana-stacked-seg';
      seg.style.flex = count;
      seg.style.background = _plColor(colorMap[pl.id]);
      seg.title = (plNames[pl.id] || pl.id) + ': ' + count;
      // Show number if segment tall enough
      const segHeight = count / ep.total * (ep.total / maxTotal * CHART_HEIGHT);
      if (segHeight >= 20) {
        seg.textContent = count;
      }
      bar.appendChild(seg);
    }
    col.appendChild(bar);

    const label = document.createElement('div');
    label.className = 'ana-stacked-xlabel';
    label.textContent = 'E' + _epNum(ep.code);
    col.appendChild(label);

    barsWrap.appendChild(col);
  }
  chart.appendChild(barsWrap);
  section.appendChild(chart);

  // Legend
  const legend = document.createElement('div');
  legend.className = 'ana-legend-bar';
  for (const pl of plotlines) {
    const item = document.createElement('span');
    item.className = 'ana-legend-item';
    const swatch = document.createElement('span');
    swatch.className = 'ana-legend-swatch';
    swatch.style.background = _plColor(colorMap[pl.id]);
    item.appendChild(swatch);
    item.appendChild(document.createTextNode(pl.name || pl.id));
    legend.appendChild(item);
  }
  section.appendChild(legend);

  return section;
}

// --- Chart 2: Function distribution heatmap ---

function _renderFunctionDistribution(data) {
  const section = _section('Как функции распределены по сезону?');
  const episodes = data.episodes || [];

  if (episodes.length === 0) return section;

  // Compute counts: function × episode
  const grid = {};
  let maxCount = 0;
  for (const fn of _ARC_ORDER) grid[fn] = {};

  for (const ep of episodes) {
    for (const ev of ep.events || []) {
      const fn = ev.function || ev.plot_fn;
      if (!fn || !grid[fn]) continue;
      grid[fn][ep.episode] = (grid[fn][ep.episode] || 0) + 1;
      if (grid[fn][ep.episode] > maxCount) maxCount = grid[fn][ep.episode];
    }
  }

  const table = document.createElement('table');
  table.className = 'ana-heatmap';

  // Header row
  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');
  const thCorner = document.createElement('th');
  thCorner.textContent = 'Function';
  headerRow.appendChild(thCorner);
  for (const ep of episodes) {
    const th = document.createElement('th');
    th.textContent = 'E' + _epNum(ep.episode);
    headerRow.appendChild(th);
  }
  thead.appendChild(headerRow);
  table.appendChild(thead);

  // Body rows in arc order
  const tbody = document.createElement('tbody');
  for (const fn of _ARC_ORDER) {
    const tr = document.createElement('tr');
    const tdLabel = document.createElement('td');
    tdLabel.className = 'ana-heatmap-label';
    tdLabel.textContent = _ARC_LABELS[fn] || fn;
    tr.appendChild(tdLabel);

    for (const ep of episodes) {
      const td = document.createElement('td');
      td.className = 'ana-heatmap-cell';
      const count = (grid[fn] && grid[fn][ep.episode]) || 0;
      if (count > 0) {
        // Opacity scales from 0.2 (count=1) to 1.0 (count=maxCount)
        const intensity = maxCount > 1
          ? 0.2 + 0.8 * ((count - 1) / (maxCount - 1))
          : 0.5;
        td.style.setProperty('--heat-opacity', intensity.toFixed(2));
        td.classList.add('ana-heatmap-filled');
        td.textContent = count;
      }
      tr.appendChild(td);
    }
    tbody.appendChild(tr);
  }
  table.appendChild(tbody);
  section.appendChild(table);

  return section;
}

// --- Chart 3: Plotline intersection matrix ---

function _renderIntersectionMatrix(data, colorMap) {
  const section = _section('Где линии пересекаются?');
  const episodes = data.episodes || [];
  const plotlines = _sortedPlotlines(data);
  const plNames = _plotlineNameMap(data);
  const plIds = plotlines.map(pl => pl.id);

  // Build directed counts from also_affects
  const matrix = {};
  for (const src of plIds) {
    matrix[src] = {};
    for (const tgt of plIds) matrix[src][tgt] = 0;
  }

  let hasData = false;
  for (const ep of episodes) {
    for (const ev of ep.events || []) {
      const src = ev.plotline_id || ev.storyline || ev.plotline;
      const targets = ev.also_affects || [];
      if (!src || targets.length === 0) continue;
      for (const tgt of targets) {
        if (matrix[src] && matrix[src][tgt] !== undefined) {
          matrix[src][tgt]++;
          hasData = true;
        }
      }
    }
  }

  if (!hasData) {
    const note = document.createElement('p');
    note.className = 'ana-empty-note';
    note.textContent = 'No cross-plotline interactions found in this analysis.';
    section.appendChild(note);
    return section;
  }

  // Find max for color scaling
  let maxVal = 0;
  for (const src of plIds) {
    for (const tgt of plIds) {
      if (src !== tgt && matrix[src][tgt] > maxVal) maxVal = matrix[src][tgt];
    }
  }

  // Row totals (sends) and column totals (receives)
  const rowTotals = {};
  const colTotals = {};
  for (const id of plIds) { rowTotals[id] = 0; colTotals[id] = 0; }
  for (const src of plIds) {
    for (const tgt of plIds) {
      if (src === tgt) continue;
      rowTotals[src] += matrix[src][tgt];
      colTotals[tgt] += matrix[src][tgt];
    }
  }

  // Short name helper: strip "Hero: " prefix
  function shortName(id) {
    const name = plNames[id] || id;
    return name.includes(': ') ? name.split(': ').pop() : name;
  }

  const table = document.createElement('table');
  table.className = 'ana-matrix';

  // Header
  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');
  headerRow.appendChild(document.createElement('th')); // corner
  for (const tgt of plIds) {
    const th = document.createElement('th');
    th.textContent = shortName(tgt);
    headerRow.appendChild(th);
  }
  const thSends = document.createElement('th');
  thSends.className = 'ana-matrix-total';
  thSends.textContent = 'Sends';
  headerRow.appendChild(thSends);
  thead.appendChild(headerRow);
  table.appendChild(thead);

  // Body
  const tbody = document.createElement('tbody');
  for (const src of plIds) {
    const tr = document.createElement('tr');
    const tdLabel = document.createElement('td');
    tdLabel.className = 'ana-matrix-label';
    tdLabel.textContent = shortName(src);
    tr.appendChild(tdLabel);

    for (const tgt of plIds) {
      const td = document.createElement('td');
      td.className = 'ana-matrix-cell';
      if (src === tgt) {
        td.classList.add('ana-matrix-diag');
      } else {
        const val = matrix[src][tgt];
        if (val > 0) {
          const intensity = maxVal > 1
            ? 0.25 + 0.75 * ((val - 1) / (maxVal - 1))
            : 0.5;
          td.style.setProperty('--matrix-opacity', intensity.toFixed(2));
          td.classList.add('ana-matrix-filled');
          td.textContent = val;
        }
      }
      tr.appendChild(td);
    }

    // Row total
    const tdTotal = document.createElement('td');
    tdTotal.className = 'ana-matrix-total-cell';
    tdTotal.textContent = '\u2192 ' + rowTotals[src];
    tr.appendChild(tdTotal);
    tbody.appendChild(tr);
  }
  table.appendChild(tbody);

  // Footer row: column totals
  const tfoot = document.createElement('tfoot');
  const footRow = document.createElement('tr');
  const footCorner = document.createElement('td');
  footCorner.className = 'ana-matrix-label';
  footCorner.textContent = 'Receives';
  footRow.appendChild(footCorner);
  for (const tgt of plIds) {
    const td = document.createElement('td');
    td.className = 'ana-matrix-total-cell';
    td.textContent = '\u2193 ' + colTotals[tgt];
    footRow.appendChild(td);
  }
  footRow.appendChild(document.createElement('td')); // corner
  tfoot.appendChild(footRow);
  table.appendChild(tfoot);

  section.appendChild(table);
  return section;
}

// --- Chart 4: Character event load ---

function _renderCharacterLoad(data) {
  const section = _section('Кто несёт сюжет?');
  const episodes = data.episodes || [];
  const castMap = {};
  for (const c of data.cast || []) castMap[c.id] = c.name;

  // Count events per character
  const charEvents = {};
  for (const ep of episodes) {
    for (const ev of ep.events || []) {
      for (const cid of ev.characters || []) {
        charEvents[cid] = (charEvents[cid] || 0) + 1;
      }
    }
  }

  // Filter >=2, sort descending
  const sorted = Object.entries(charEvents)
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1]);

  if (sorted.length === 0) return section;

  const maxCount = sorted[0][1];
  const container = document.createElement('div');
  container.className = 'ana-charload';

  for (const [cid, count] of sorted) {
    const name = castMap[cid] || cid.replace('guest:', '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

    const row = document.createElement('div');
    row.className = 'ana-charload-row';

    const nameEl = document.createElement('div');
    nameEl.className = 'ana-charload-name';
    nameEl.textContent = name;
    row.appendChild(nameEl);

    const barWrap = document.createElement('div');
    barWrap.className = 'ana-charload-barwrap';
    const bar = document.createElement('div');
    bar.className = 'ana-charload-bar';
    bar.style.width = (count / maxCount * 100).toFixed(1) + '%';
    barWrap.appendChild(bar);
    row.appendChild(barWrap);

    const countEl = document.createElement('div');
    countEl.className = 'ana-charload-count';
    countEl.textContent = count;
    row.appendChild(countEl);

    container.appendChild(row);
  }

  section.appendChild(container);
  return section;
}

// --- Main entry point ---

/**
 * Render all 4 analytics charts into the given container.
 *
 * Args:
 *   data: tvplot result JSON object.
 *   container: DOM element to render into.
 */
function renderAnalytics(data, container) {
  container.innerHTML = '';

  // Series header
  const storyEngine = (data.context || {}).story_engine || '';
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

  const colorMap = _plotlineColorMap(data);

  container.appendChild(_renderEventsPerEpisode(data, colorMap));
  container.appendChild(_renderFunctionDistribution(data));
  container.appendChild(_renderIntersectionMatrix(data, colorMap));
  container.appendChild(_renderCharacterLoad(data));
}
