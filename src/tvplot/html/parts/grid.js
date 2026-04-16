// Grid rendering — plotline x episode table with filters and detail modal.

const RANK_ORDER = { A: 0, B: 1, C: 2, runner: 3 };
const FUNCTION_LABELS = {
  setup: 'Setup',
  escalation: 'Escalation',
  turning_point: 'Turning Point',
  seed: 'Seed',
  climax: 'Climax',
  resolution: 'Resolution',
  cliffhanger: 'Cliffhanger',
  inciting_incident: 'Inciting Incident',
};

function isGuest(charId) {
  return charId.startsWith('guest:');
}

function resolveCharacterName(charId, cast) {
  if (charId.startsWith('guest:')) return charId.slice(6);
  for (const member of cast) {
    if (member.id === charId) return member.name;
  }
  return charId;
}

/**
 * Collect unique characters per plotline, sorted by frequency.
 *
 * Args:
 *   episodes: array of episode objects with events.
 *   plotlineId: plotline id to filter by.
 *
 * Returns:
 *   Array of character id strings, most frequent first.
 */
function plotlineCharacters(episodes, plotlineId) {
  const counts = {};
  for (const ep of episodes) {
    for (const ev of ep.events || []) {
      // Support both field names: plotline_id (actual data) and storyline (spec)
      const evPlotline = ev.plotline_id || ev.storyline;
      if (evPlotline === plotlineId) {
        for (const c of ev.characters || []) {
          counts[c] = (counts[c] || 0) + 1;
        }
      }
    }
  }
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([id]) => id);
}

/**
 * Build lookup: eventGrid[plotlineId][episodeCode] = [events].
 */
function buildEventGrid(episodes) {
  const grid = {};
  for (const ep of episodes) {
    for (const ev of ep.events || []) {
      const plId = ev.plotline_id || ev.storyline || null;
      if (!plId) continue;
      if (!grid[plId]) grid[plId] = {};
      if (!grid[plId][ep.episode]) grid[plId][ep.episode] = [];
      grid[plId][ep.episode].push(ev);
    }
  }
  return grid;
}

/**
 * Collect events with no plotline assignment.
 * Returns: { episodeCode: [events] }
 */
function buildUnassigned(episodes) {
  const result = {};
  for (const ep of episodes) {
    for (const ev of ep.events || []) {
      const plId = ev.plotline_id || ev.storyline || null;
      if (!plId) {
        if (!result[ep.episode]) result[ep.episode] = [];
        result[ep.episode].push(ev);
      }
    }
  }
  return result;
}

/**
 * Extract unique seasons from episode codes.
 */
function extractSeasons(episodes) {
  const seasons = new Set();
  for (const ep of episodes) {
    const match = ep.episode.match(/^S(\d+)/);
    if (match) seasons.add(match[1]);
  }
  return [...seasons].sort();
}

/**
 * Collect all unique function types present in the data.
 */
function collectFunctions(episodes) {
  const fns = new Set();
  for (const ep of episodes) {
    for (const ev of ep.events || []) {
      const displayFn = ev.plot_fn || ev.function;
      if (displayFn) fns.add(displayFn);
    }
  }
  return [...fns];
}

/**
 * Collect all unique characters across all events.
 */
function collectAllCharacters(episodes, cast) {
  const chars = new Set();
  for (const ep of episodes) {
    for (const ev of ep.events || []) {
      for (const c of ev.characters || []) {
        chars.add(c);
      }
    }
  }
  return [...chars].map(id => ({
    id,
    name: resolveCharacterName(id, cast),
    is_guest: isGuest(id),
  })).sort((a, b) => a.name.localeCompare(b.name));
}

// --- Filter state ---
let _activeFilters = { season: null, characters: new Set(), functions: new Set() };
let _allCharacters = [];
let _allFunctions = [];

function _applyFilters(container) {
  const table = container.querySelector('.timeline-grid');
  if (!table) return;

  const { season, characters, functions } = _activeFilters;
  const hasCharFilter = characters.size > 0;
  const hasFnFilter = functions.size > 0;

  // Season filter: show/hide episode columns
  const headerCells = table.querySelectorAll('thead th');
  const columnVisible = [];
  headerCells.forEach((th, idx) => {
    if (idx === 0) { columnVisible.push(true); return; } // sticky col always visible
    const epCode = th.querySelector('.ep-code');
    if (!epCode) { columnVisible.push(true); return; }
    const code = epCode.textContent;
    const match = code.match(/^S(\d+)/);
    const visible = !season || (match && match[1] === season);
    th.style.display = visible ? '' : 'none';
    columnVisible.push(visible);
  });

  // Apply column visibility to body cells
  const rows = table.querySelectorAll('tbody tr');
  rows.forEach(tr => {
    const cells = tr.querySelectorAll('td');
    cells.forEach((td, idx) => {
      if (idx < columnVisible.length) {
        td.style.display = columnVisible[idx] ? '' : 'none';
      }
    });
  });

  // Event card visibility: character and function filters
  const cards = table.querySelectorAll('.event-card');
  cards.forEach(card => {
    const cardChars = (card.dataset.characters || '').split(',').filter(Boolean);
    const cardFn = card.dataset.function || '';

    let visible = true;
    if (hasCharFilter) {
      visible = cardChars.some(c => characters.has(c));
    }
    if (visible && hasFnFilter) {
      visible = functions.has(cardFn);
    }
    card.style.display = visible ? '' : 'none';
  });

  // Update legend active states
  const legendContainer = container.closest('#screen-grid') || container.parentElement;
  if (legendContainer) {
    const legendWrap = legendContainer.querySelector('.legend');
    if (legendWrap) {
      if (hasFnFilter) {
        legendWrap.classList.add('legend-filtering');
      } else {
        legendWrap.classList.remove('legend-filtering');
      }
      legendWrap.querySelectorAll('.legend-filter').forEach(item => {
        const fn = item.dataset.function;
        if (fn) {
          item.classList.toggle('legend-active', functions.has(fn));
        }
      });
    }
  }
}

function _renderFilters(data, container) {
  const episodes = data.episodes || [];
  const cast = data.cast || [];
  const seasons = extractSeasons(episodes);
  _allFunctions = collectFunctions(episodes);
  _allCharacters = collectAllCharacters(episodes, cast);

  const wrapper = document.createElement('div');
  wrapper.className = 'sticky-top';

  const filtersDiv = document.createElement('div');
  filtersDiv.className = 'filters';

  // Season dropdown (only if multiple seasons)
  if (seasons.length > 1) {
    const select = document.createElement('select');
    select.className = 'filter-select';
    const allOpt = document.createElement('option');
    allOpt.value = '';
    allOpt.textContent = 'All seasons';
    select.appendChild(allOpt);
    for (const s of seasons) {
      const opt = document.createElement('option');
      opt.value = s;
      opt.textContent = `Season ${parseInt(s, 10)}`;
      select.appendChild(opt);
    }
    select.addEventListener('change', () => {
      _activeFilters.season = select.value || null;
      _applyFilters(container);
    });
    filtersDiv.appendChild(select);
  }

  // Character checkboxes dropdown
  if (_allCharacters.length > 0) {
    const details = document.createElement('details');
    details.className = 'filter-dropdown';
    const summary = document.createElement('summary');
    summary.textContent = 'Characters';
    details.appendChild(summary);

    const list = document.createElement('div');
    list.className = 'filter-list';
    for (const ch of _allCharacters) {
      const label = document.createElement('label');
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.value = ch.id;
      cb.addEventListener('change', () => {
        if (cb.checked) {
          _activeFilters.characters.add(ch.id);
        } else {
          _activeFilters.characters.delete(ch.id);
        }
        _applyFilters(container);
      });
      label.appendChild(cb);
      const span = document.createElement('span');
      span.textContent = ` ${ch.name}`;
      if (ch.is_guest) span.className = 'guest-char';
      label.appendChild(span);
      list.appendChild(label);
    }
    details.appendChild(list);
    filtersDiv.appendChild(details);
  }

  wrapper.appendChild(filtersDiv);

  // Function legend (clickable chips)
  if (_allFunctions.length > 0) {
    const legend = document.createElement('div');
    legend.className = 'legend';
    for (const fn of _allFunctions) {
      const chip = document.createElement('span');
      chip.className = `legend-item legend-filter fn-${fn}`;
      chip.dataset.function = fn;
      chip.textContent = FUNCTION_LABELS[fn] || fn;
      chip.addEventListener('click', () => {
        if (_activeFilters.functions.has(fn)) {
          _activeFilters.functions.delete(fn);
        } else {
          _activeFilters.functions.add(fn);
        }
        _applyFilters(container);
      });
      legend.appendChild(chip);
    }
    wrapper.appendChild(legend);
  }

  return wrapper;
}

/**
 * Show a read-only modal with event details.
 */
function _showEventModal(ev, cast) {
  const overlay = document.getElementById('modal-overlay');
  const body = document.getElementById('modal-body');
  if (!overlay || !body) return;

  const chars = (ev.characters || [])
    .map(c => {
      const name = resolveCharacterName(c, cast);
      return isGuest(c) ? `<em>${name}</em> (guest)` : name;
    })
    .join(', ');

  const displayFn = ev.plot_fn || ev.function;
  const fnLabel = FUNCTION_LABELS[displayFn] || displayFn || '—';

  body.innerHTML = `
    <div class="detail-field">
      <label>Event</label>
      <div class="value">${ev.event}</div>
    </div>
    <div class="detail-field">
      <label>Function</label>
      <div class="value"><span class="event-card fn-${displayFn}" style="display:inline-block">${fnLabel}</span></div>
    </div>
    <div class="detail-field">
      <label>Characters</label>
      <div class="value">${chars || '—'}</div>
    </div>
    ${ev.also_affects ? `
    <div class="detail-field">
      <label>Also affects</label>
      <div class="value">${ev.also_affects.join(', ')}</div>
    </div>` : ''}
  `;

  overlay.classList.remove('hidden');
}

/**
 * Render the plotline x episode grid into a container element.
 *
 * Args:
 *   data: tvplot result JSON object.
 *   container: DOM element to render into.
 */
function renderGrid(data, container) {
  const episodes = data.episodes || [];
  const cast = data.cast || [];
  const plotlines = [...(data.plotlines || [])].sort(
    (a, b) => (RANK_ORDER[a.rank] ?? 99) - (RANK_ORDER[b.rank] ?? 99)
  );

  const eventGrid = buildEventGrid(episodes);
  const unassigned = buildUnassigned(episodes);
  const hasUnassigned = Object.keys(unassigned).length > 0;

  // Reset filter state
  _activeFilters = { season: null, characters: new Set(), functions: new Set() };

  container.innerHTML = '';

  // Filters
  const filtersEl = _renderFilters(data, container);
  container.appendChild(filtersEl);

  // Grid wrapper
  const gridWrap = document.createElement('div');
  gridWrap.className = 'grid-container';

  // Table
  const table = document.createElement('table');
  table.className = 'timeline-grid';

  // Thead
  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');

  const thPlotline = document.createElement('th');
  thPlotline.className = 'sticky-col header-cell';
  thPlotline.textContent = 'Plotline';
  headerRow.appendChild(thPlotline);

  for (const ep of episodes) {
    const th = document.createElement('th');
    th.className = 'header-cell';
    const codeDiv = document.createElement('div');
    codeDiv.className = 'ep-code';
    codeDiv.textContent = ep.episode;
    th.appendChild(codeDiv);

    if (ep.theme) {
      const themeDiv = document.createElement('div');
      themeDiv.className = 'ep-theme';
      const truncated = ep.theme.length > 60 ? ep.theme.slice(0, 60) + '\u2026' : ep.theme;
      themeDiv.textContent = 'Theme: ' + truncated;
      th.appendChild(themeDiv);
    }
    headerRow.appendChild(th);
  }
  thead.appendChild(headerRow);
  table.appendChild(thead);

  // Tbody
  const tbody = document.createElement('tbody');

  for (const pl of plotlines) {
    const tr = document.createElement('tr');

    // Plotline cell
    const tdPl = document.createElement('td');
    tdPl.className = 'sticky-col plotline-cell';
    tdPl.dataset.plotlineId = pl.id;

    const nameDiv = document.createElement('div');
    nameDiv.className = 'plotline-name';
    nameDiv.textContent = pl.name;
    tdPl.appendChild(nameDiv);

    const rankSpan = document.createElement('span');
    rankSpan.className = `rank-badge rank-${pl.rank.toLowerCase()}`;
    rankSpan.textContent = pl.rank;
    tdPl.appendChild(rankSpan);

    // Characters for this plotline
    const plChars = plotlineCharacters(episodes, pl.id);
    if (plChars.length > 0) {
      const charsDiv = document.createElement('div');
      charsDiv.className = 'plotline-characters';
      const charSpans = plChars.map(c => {
        const name = resolveCharacterName(c, cast);
        if (isGuest(c)) return `<span class="guest-char">${name}</span>`;
        return `<span>${name}</span>`;
      });
      charsDiv.innerHTML = charSpans.join(', ');
      tdPl.appendChild(charsDiv);
    }
    tr.appendChild(tdPl);

    // Episode cells
    for (const ep of episodes) {
      const events = (eventGrid[pl.id] && eventGrid[pl.id][ep.episode]) || [];
      const td = document.createElement('td');
      td.className = events.length > 0 ? 'event-cell' : 'event-cell empty-cell';

      for (const ev of events) {
        const displayFn = ev.plot_fn || ev.function;
        const card = document.createElement('div');
        card.className = `event-card fn-${displayFn}`;
        card.textContent = ev.event;
        // Store data for filtering
        card.dataset.characters = (ev.characters || []).join(',');
        card.dataset.function = displayFn || '';
        card.addEventListener('click', () => _showEventModal(ev, cast));
        td.appendChild(card);
      }
      tr.appendChild(td);
    }
    tbody.appendChild(tr);
  }

  // Unassigned row
  if (hasUnassigned) {
    const tr = document.createElement('tr');
    tr.className = 'unassigned-row';

    const tdLabel = document.createElement('td');
    tdLabel.className = 'sticky-col plotline-cell';
    const labelDiv = document.createElement('div');
    labelDiv.className = 'plotline-name unassigned-label';
    labelDiv.textContent = 'Unassigned';
    tdLabel.appendChild(labelDiv);
    tr.appendChild(tdLabel);

    for (const ep of episodes) {
      const orphans = unassigned[ep.episode] || [];
      const td = document.createElement('td');
      td.className = orphans.length > 0 ? 'event-cell' : 'event-cell empty-cell';

      for (const ev of orphans) {
        const displayFn = ev.plot_fn || ev.function;
        const card = document.createElement('div');
        card.className = `event-card fn-${displayFn} unassigned-event`;
        card.textContent = ev.event;
        card.dataset.characters = (ev.characters || []).join(',');
        card.dataset.function = displayFn || '';
        card.addEventListener('click', () => _showEventModal(ev, cast));
        td.appendChild(card);
      }
      tr.appendChild(td);
    }
    tbody.appendChild(tr);
  }

  table.appendChild(tbody);
  gridWrap.appendChild(table);
  container.appendChild(gridWrap);
}
