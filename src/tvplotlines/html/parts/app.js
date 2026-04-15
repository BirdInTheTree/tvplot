// App init — Store, screen routing, toolbar, series switching, JSON import.

// --- localStorage manager ---

const Store = {
  getKey: () => localStorage.getItem('tvplotlines_api_key'),
  getProvider: () => localStorage.getItem('tvplotlines_provider'),
  getSystem: () => localStorage.getItem('tvplotlines_system') || 'hollywood',
  setSystem: (system) => localStorage.setItem('tvplotlines_system', system),
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
  removeResult: (name) => {
    const results = Store.getResults();
    delete results[name];
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

// --- Screen routing ---

/** @type {string} Current active tab: 'grid' or 'analytics' */
let _activeTab = 'grid';
/** @type {object|null} Currently loaded plotlines data */
let _currentData = null;
/** @type {string|null} Name of the currently loaded series */
let _currentSeriesName = null;

function showScreen(name) {
  document.querySelectorAll('.screen').forEach(el => el.classList.remove('active'));
  const target = document.getElementById('screen-' + name);
  if (target) target.classList.add('active');
}

// --- Dark mode ---

function toggleDark() {
  const isDark = document.documentElement.classList.toggle('dark');
  Store.saveSetting('dark', isDark);
  _updateDarkIcon();
}

function _restoreDarkMode() {
  const settings = Store.getSettings();
  if (settings.dark) {
    document.documentElement.classList.add('dark');
  }
  _updateDarkIcon();
}

function _updateDarkIcon() {
  const btn = document.getElementById('btn-dark');
  if (!btn) return;
  const isDark = document.documentElement.classList.contains('dark');
  btn.textContent = isDark ? '\u2600' : '\u263E';
  btn.title = isDark ? 'Switch to light mode' : 'Switch to dark mode';
}

// --- Demo data ---

function _loadDemoData() {
  const el = document.getElementById('demo-data');
  if (!el || !el.textContent.trim()) return null;
  try {
    return JSON.parse(el.textContent);
  } catch (e) {
    console.error('Failed to parse demo data:', e);
    return null;
  }
}

// --- Series management ---

function _seriesName(data) {
  // Derive a display name from data metadata
  const ctx = data.context || {};
  if (ctx.series && ctx.season) return ctx.series + ' ' + ctx.season;
  if (ctx.series) return ctx.series;
  return null;
}

function _populateSeriesDropdown() {
  const select = document.getElementById('series-select');
  if (!select) return;

  const currentValue = select.value;
  select.innerHTML = '';

  // Demo option (always available if demo data exists)
  const demoData = _loadDemoData();
  if (demoData) {
    const opt = document.createElement('option');
    opt.value = '__demo__';
    opt.textContent = _seriesName(demoData) || 'Demo';
    select.appendChild(opt);
  }

  // Saved results from Store
  const results = Store.getResults();
  for (const name of Object.keys(results).sort()) {
    const opt = document.createElement('option');
    opt.value = name;
    opt.textContent = name;
    select.appendChild(opt);
  }

  // Restore selection
  if (currentValue && select.querySelector(`option[value="${CSS.escape(currentValue)}"]`)) {
    select.value = currentValue;
  } else if (_currentSeriesName) {
    select.value = _currentSeriesName;
  }

  // Hide dropdown if only one option
  select.style.display = select.options.length <= 1 ? 'none' : '';
}

function _switchSeries(name) {
  let data;
  if (name === '__demo__') {
    data = _loadDemoData();
  } else {
    const results = Store.getResults();
    data = results[name];
  }

  if (!data) return;

  _currentSeriesName = name;
  _currentData = data;
  Store.saveSetting('lastSeries', name);

  _renderCurrentView();
}

function _renderCurrentView() {
  if (!_currentData) return;

  const gridContainer = document.getElementById('grid-container');
  const analyticsContainer = document.getElementById('analytics-container');
  const gridTitle = document.getElementById('grid-title');

  const displayName = _currentSeriesName === '__demo__'
    ? (_seriesName(_currentData) || 'Demo')
    : _currentSeriesName;

  if (gridTitle) gridTitle.textContent = displayName;

  if (_activeTab === 'grid' && gridContainer) {
    renderGrid(_currentData, gridContainer);
  } else if (_activeTab === 'analytics' && analyticsContainer) {
    renderAnalytics(_currentData, analyticsContainer);
  }
}

// --- Tab switching ---

function _setTab(tab) {
  _activeTab = tab;

  // Update tab button states
  const btnGrid = document.getElementById('btn-tab-grid');
  const btnAnalytics = document.getElementById('btn-tab-analytics');
  if (btnGrid) btnGrid.classList.toggle('btn-nav-active', tab === 'grid');
  if (btnAnalytics) btnAnalytics.classList.toggle('btn-nav-active', tab === 'analytics');

  _renderCurrentView();
  showScreen(tab === 'grid' ? 'grid' : 'analytics');
}

// --- JSON import (file input + drag & drop) ---

function _importJSON(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      const name = _seriesName(data) || file.name.replace(/\.json$/i, '');
      Store.saveResult(name, data);
      _populateSeriesDropdown();

      const select = document.getElementById('series-select');
      if (select) select.value = name;

      _switchSeries(name);
      _setTab('grid');
    } catch (err) {
      alert('Invalid JSON file');
    }
  };
  reader.readAsText(file);
}

function _setupDropZone() {
  const zone = document.getElementById('drop-zone');
  const fileUpload = document.getElementById('file-upload');
  if (!zone) return;

  zone.addEventListener('dragover', (e) => {
    e.preventDefault();
    zone.classList.add('drop-zone-active');
  });
  zone.addEventListener('dragleave', () => {
    zone.classList.remove('drop-zone-active');
  });
  zone.addEventListener('drop', (e) => {
    e.preventDefault();
    zone.classList.remove('drop-zone-active');
    const files = [...e.dataTransfer.files];
    _handleDroppedFiles(files);
    _hideDropZone();
  });

  if (fileUpload) {
    fileUpload.addEventListener('change', (e) => {
      const files = [...e.target.files];
      if (files.length > 0) {
        _handleDroppedFiles(files);
        _hideDropZone();
      }
      fileUpload.value = '';
    });
  }
}

function _showDropZone() {
  const zone = document.getElementById('drop-zone');
  if (zone) zone.classList.remove('hidden');
}

function _hideDropZone() {
  const zone = document.getElementById('drop-zone');
  if (zone) zone.classList.add('hidden');
}

// --- File handling (JSON or TXT synopses) ---

function _handleDroppedFiles(files) {
  if (files.length === 1 && files[0].name.endsWith('.json')) {
    _importJSON(files[0]);
    return;
  }

  // Treat as synopsis .txt files — run through pipeline
  const txtFiles = files.filter(f => f.name.endsWith('.txt'));
  if (txtFiles.length > 0) {
    Store.markOnboardingSeen();
    _handleSynopsisUpload(txtFiles);
    return;
  }

  // Single JSON or unknown
  if (files.length === 1) {
    _importJSON(files[0]);
  } else {
    alert('Drop .json (plotlines result) or .txt files (synopses with SxxExx in filename).');
  }
}

// --- LLM Settings dialog ---

function _showLLMSettings() {
  const modalOverlay = document.getElementById('modal-overlay');
  const modalBody = document.getElementById('modal-body');
  if (!modalOverlay || !modalBody) return;

  const provider = Store.getProvider() || 'anthropic';
  const apiKey = Store.getKey() || '';
  const system = Store.getSystem();

  modalBody.innerHTML = `
    <h3 style="margin-top:0">LLM Settings</h3>
    <div style="margin-bottom:12px">
      <label for="llm-provider" style="display:block;margin-bottom:4px;font-weight:600">Provider</label>
      <select id="llm-provider" style="width:100%;padding:6px;border-radius:4px;border:1px solid var(--border, #ccc)">
        <option value="anthropic" ${provider === 'anthropic' ? 'selected' : ''}>Anthropic (Claude)</option>
        <option value="openai" ${provider === 'openai' ? 'selected' : ''}>OpenAI (GPT-4o)</option>
      </select>
    </div>
    <div style="margin-bottom:12px">
      <label for="llm-api-key" style="display:block;margin-bottom:4px;font-weight:600">API Key</label>
      <input id="llm-api-key" type="password" value="${apiKey.replace(/"/g, '&quot;')}"
        placeholder="sk-... or sk-ant-..."
        style="width:100%;padding:6px;border-radius:4px;border:1px solid var(--border, #ccc);box-sizing:border-box">
    </div>
    <div style="margin-bottom:16px">
      <label for="llm-system" style="display:block;margin-bottom:4px;font-weight:600">Analysis system</label>
      <select id="llm-system" style="width:100%;padding:6px;border-radius:4px;border:1px solid var(--border, #ccc)">
        <option value="hollywood" ${system === 'hollywood' ? 'selected' : ''}>Hollywood — screenwriting (story DNA, Freytag)</option>
        <option value="narratology" disabled>Narratology — structuralist (coming soon)</option>
      </select>
      <div style="font-size:0.8em;color:#888;margin-top:4px">Narratology prompts are in place; the runtime is coming in v2.</div>
    </div>
    <button id="llm-save-btn" style="padding:6px 16px;border-radius:4px;cursor:pointer">Save</button>
    <span id="llm-save-status" style="margin-left:8px;color:green;display:none">Saved!</span>
  `;

  document.getElementById('llm-save-btn').addEventListener('click', () => {
    const p = document.getElementById('llm-provider').value;
    const k = document.getElementById('llm-api-key').value.trim();
    const s = document.getElementById('llm-system').value;
    Store.setKey(p, k);
    Store.setSystem(s);
    const status = document.getElementById('llm-save-status');
    if (status) {
      status.style.display = 'inline';
      setTimeout(() => { status.style.display = 'none'; }, 2000);
    }
  });

  modalOverlay.classList.remove('hidden');
}

// --- Onboarding animation ---

// Onboarding state — lets us cancel a running animation
let _onboardingAbort = null;

function _delay(ms) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    // Attach cancel hook so abort can reject immediately
    if (_onboardingAbort) {
      const prev = _onboardingAbort.onAbort;
      _onboardingAbort.onAbort = () => {
        clearTimeout(timer);
        if (prev) prev();
        reject(new Error('aborted'));
      };
    }
  });
}

function _showSubtitle(text) {
  _hideSubtitle();
  const el = document.createElement('div');
  el.className = 'onboarding-subtitle';
  el.id = 'onboarding-subtitle';
  el.textContent = text;
  document.body.appendChild(el);
}

function _hideSubtitle() {
  const el = document.getElementById('onboarding-subtitle');
  if (el) el.remove();
}

async function _animateTyping(element, text, speedMs) {
  element.value = '';
  for (const ch of text) {
    element.value += ch;
    await _delay(speedMs);
  }
}

function _highlightElement(selector) {
  const el = typeof selector === 'string' ? document.querySelector(selector) : selector;
  if (!el) return;
  el.classList.add('onboarding-highlight');
  setTimeout(() => el.classList.remove('onboarding-highlight'), 1200);
}

function _createCursor() {
  const cursor = document.createElement('div');
  cursor.className = 'onboarding-cursor';
  cursor.id = 'onboarding-cursor';
  // Start offscreen
  cursor.style.left = '-40px';
  cursor.style.top = '-40px';
  document.body.appendChild(cursor);
  return cursor;
}

function _removeCursor() {
  const el = document.getElementById('onboarding-cursor');
  if (el) el.remove();
}

async function _moveCursorTo(cursor, target) {
  const el = typeof target === 'string' ? document.querySelector(target) : target;
  if (!el) return;
  const rect = el.getBoundingClientRect();
  cursor.style.left = (rect.left + rect.width / 2) + 'px';
  cursor.style.top = (rect.top + rect.height / 2) + 'px';
  await _delay(700);
}

async function _simulateClick(cursor, target) {
  await _moveCursorTo(cursor, target);
  const el = typeof target === 'string' ? document.querySelector(target) : target;
  if (el) {
    _highlightElement(el);
    await _delay(300);
  }
}

/**
 * Gradually reveal grid cells with animation.
 * Hides all event cards, then reveals them one by one.
 */
async function _revealGridGradually() {
  const cards = document.querySelectorAll('#grid-container .event-card');
  // Hide all first
  cards.forEach(card => {
    card.classList.add('onboarding-cell-hidden');
  });
  await _delay(200);

  // Reveal in batches of 3 for speed
  const batchSize = 3;
  for (let i = 0; i < cards.length; i += batchSize) {
    for (let j = i; j < Math.min(i + batchSize, cards.length); j++) {
      cards[j].classList.remove('onboarding-cell-hidden');
      cards[j].classList.add('onboarding-cell-reveal');
    }
    await _delay(60);
  }
}

/**
 * Main onboarding sequence.
 * Drives real UI components to demonstrate the full workflow.
 */
async function runOnboarding() {
  // Set up abort controller for skip-during-animation
  _onboardingAbort = { onAbort: null };

  const cursor = _createCursor();

  try {
    // Step 1: Welcome screen — show subtitle, then "click" Skip
    _showSubtitle('This is the welcome screen. Let\'s walk through the full workflow.');
    await _delay(2500);

    _showSubtitle('First, let\'s configure the LLM connection.');
    await _simulateClick(cursor, '#btn-skip');
    await _delay(600);

    // Transition to grid screen (we need it for the toolbar)
    const demoData = _loadDemoData();
    if (demoData) _switchSeries('__demo__');
    _setTab('grid');
    await _delay(400);

    // Step 2: LLM settings modal
    _showSubtitle('Click "LLM" to open settings and choose your provider.');
    await _simulateClick(cursor, '#btn-llm-settings');
    _showLLMSettings();
    await _delay(1000);

    // Animate provider selection
    _showSubtitle('Select Claude as your LLM provider...');
    const providerSelect = document.getElementById('llm-provider');
    if (providerSelect) {
      await _moveCursorTo(cursor, providerSelect);
      providerSelect.value = 'anthropic';
      _highlightElement(providerSelect);
    }
    await _delay(1200);

    // Animate API key typing
    _showSubtitle('Type your API key (this is a demo — no real key needed).');
    const apiKeyInput = document.getElementById('llm-api-key');
    if (apiKeyInput) {
      await _moveCursorTo(cursor, apiKeyInput);
      apiKeyInput.type = 'text';
      await _animateTyping(apiKeyInput, 'sk-ant-api03-demo...', 50);
      apiKeyInput.type = 'password';
    }
    await _delay(800);

    // Click save
    _showSubtitle('Save your settings.');
    await _simulateClick(cursor, '#llm-save-btn');
    const saveBtn = document.getElementById('llm-save-btn');
    if (saveBtn) saveBtn.click();
    await _delay(1200);

    // Close modal
    const modalOverlay = document.getElementById('modal-overlay');
    if (modalOverlay) modalOverlay.classList.add('hidden');
    await _delay(500);

    // Step 3: File upload zone
    _showSubtitle('Now upload your synopsis files. Click "+ Load" to open the drop zone.');
    await _simulateClick(cursor, '#btn-load');
    _showDropZone();
    await _delay(1000);

    // Simulate file appearing via button
    _showSubtitle('Choose files — one via the button...');
    const dropBox = document.querySelector('.drop-zone-box');
    if (dropBox) {
      await _moveCursorTo(cursor, '.drop-zone-box label.btn');
      const chip1 = document.createElement('div');
      chip1.className = 'onboarding-file-chip';
      chip1.textContent = 'S01E01.txt';
      dropBox.appendChild(chip1);
    }
    await _delay(1200);

    // Simulate drag-drop file appearing
    _showSubtitle('...and more via drag & drop.');
    if (dropBox) {
      const fileNames = ['S01E02.txt', 'S01E03.txt', 'S01E04.txt', 'S01E05.txt', 'S01E06.txt', 'S01E07.txt'];
      for (const name of fileNames) {
        const chip = document.createElement('div');
        chip.className = 'onboarding-file-chip';
        chip.textContent = name;
        dropBox.appendChild(chip);
        await _delay(150);
      }
    }
    await _delay(1000);

    // Close drop zone
    _hideDropZone();
    await _delay(400);

    // Step 4: Pipeline runs — simulate progress
    _showSubtitle('The pipeline analyzes your synopses in 5 passes.');
    _showPipelineProgress();
    await _delay(800);

    const passLabels = [
      'Pass 1/5: detecting format and story engine...',
      'Pass 2/5: identifying cast and plotlines...',
      'Pass 3/5: breaking down episodes...',
      'Pass 4/5: reviewing structure...',
      'Pass 5/5: assigning arc functions...',
    ];
    for (let i = 0; i < passLabels.length; i++) {
      _updatePipelineProgress(passLabels[i], i + 1, 5);
      _showSubtitle(passLabels[i]);
      await _delay(1200);
    }
    _updatePipelineProgress('Done!', 5, 5);
    await _delay(600);
    _hidePipelineProgress();
    await _delay(400);

    // Step 5: Show grid result with gradual reveal
    _showSubtitle('The grid shows plotlines vs episodes with color-coded events.');
    _setTab('grid');
    await _delay(400);
    await _revealGridGradually();
    await _delay(2000);

    // Highlight some grid features
    _showSubtitle('Click any event card to see details. Use filters to focus on specific characters or functions.');
    _highlightElement('.sticky-top');
    await _delay(2500);

    // Step 5b: Switch to analytics
    _showSubtitle('Switch to Analytics for deeper insights.');
    await _simulateClick(cursor, '#btn-tab-analytics');
    _setTab('analytics');
    await _delay(1500);

    // Scroll through analytics sections
    const sections = document.querySelectorAll('#analytics-container .ana-section');
    const sectionLabels = [
      'Season Scorecard — plotline ranks, spans, and arc shapes.',
      'Arc Map — tension levels across episodes.',
      'Episode Pulse — event distribution per episode.',
      'Convergence Moments — where plotlines intersect.',
      'Character Weight — who drives the story.',
    ];
    for (let i = 0; i < Math.min(sections.length, sectionLabels.length); i++) {
      _showSubtitle(sectionLabels[i]);
      sections[i].scrollIntoView({ behavior: 'smooth', block: 'center' });
      _highlightElement(sections[i]);
      await _delay(2500);
    }

    // Step 6: Export buttons
    _showSubtitle('Export your results as JSON, TXT, CSV, or Final Draft.');
    // Scroll back to top to see toolbar
    window.scrollTo({ top: 0, behavior: 'smooth' });
    await _delay(600);

    // Find an export button on analytics screen
    const exportBtn = document.querySelector('#screen-analytics .btn-export-trigger');
    if (exportBtn) {
      await _simulateClick(cursor, exportBtn);
      _toggleExportMenu(exportBtn);
      await _delay(2000);
      // Close the menu
      const menu = document.getElementById('export-menu');
      if (menu) menu.classList.add('hidden');
    }
    await _delay(500);

    // Step 7: End — switch to grid, show real LLM modal
    _showSubtitle('That\'s it! Now connect your own LLM to start analyzing.');
    _setTab('grid');
    await _delay(1500);
    _hideSubtitle();
    _removeCursor();

    Store.markOnboardingSeen();
    // Show real LLM settings modal so user can enter their key
    _showLLMSettings();

  } catch (e) {
    if (e.message === 'aborted') {
      // User skipped during animation — clean up silently
    } else {
      console.error('Onboarding error:', e);
    }
  } finally {
    _hideSubtitle();
    _removeCursor();
    _onboardingAbort = null;
    // Remove any leftover file chips
    document.querySelectorAll('.onboarding-file-chip').forEach(el => el.remove());
  }
}

function _skipOnboarding() {
  // Abort running onboarding if any
  if (_onboardingAbort && _onboardingAbort.onAbort) {
    _onboardingAbort.onAbort();
  }
  _hideSubtitle();
  _removeCursor();
  _hidePipelineProgress();
  _hideDropZone();
  // Close modal if open
  const modal = document.getElementById('modal-overlay');
  if (modal) modal.classList.add('hidden');

  Store.markOnboardingSeen();
  _switchSeries('__demo__');
  _setTab('grid');
}

// --- Init ---

function _initApp() {
  _restoreDarkMode();

  // Modal close
  const modalOverlay = document.getElementById('modal-overlay');
  const modalClose = document.getElementById('modal-close');
  if (modalClose) {
    modalClose.addEventListener('click', () => modalOverlay.classList.add('hidden'));
  }
  if (modalOverlay) {
    modalOverlay.addEventListener('click', (e) => {
      if (e.target === modalOverlay) modalOverlay.classList.add('hidden');
    });
  }

  // Drop zone
  _setupDropZone();
  const dropZoneClose = document.getElementById('drop-zone-close');
  if (dropZoneClose) dropZoneClose.addEventListener('click', _hideDropZone);
  // Close drop zone on click outside the box
  const dropZone = document.getElementById('drop-zone');
  if (dropZone) dropZone.addEventListener('click', (e) => {
    if (e.target === dropZone) _hideDropZone();
  });

  // Toolbar buttons
  const btnDark = document.getElementById('btn-dark');
  const btnLoad = document.getElementById('btn-load');
  const btnTabGrid = document.getElementById('btn-tab-grid');
  const btnTabAnalytics = document.getElementById('btn-tab-analytics');
  const seriesSelect = document.getElementById('series-select');
  const btnExport = document.getElementById('btn-export');
  const btnOnboarding = document.getElementById('btn-onboarding');
  const btnLLM = document.getElementById('btn-llm-settings');

  if (btnDark) btnDark.addEventListener('click', toggleDark);
  if (btnLoad) btnLoad.addEventListener('click', _showDropZone);
  if (btnTabGrid) btnTabGrid.addEventListener('click', () => _setTab('grid'));
  if (btnTabAnalytics) btnTabAnalytics.addEventListener('click', () => _setTab('analytics'));

  if (seriesSelect) {
    seriesSelect.addEventListener('change', () => _switchSeries(seriesSelect.value));
  }

  // Export dropdown — all .btn-export-trigger buttons open the shared menu
  if (btnExport) btnExport.addEventListener('click', () => _toggleExportMenu(btnExport));
  document.querySelectorAll('.btn-export-trigger').forEach(btn => {
    if (btn === btnExport) return; // Already wired above
    btn.addEventListener('click', () => _toggleExportMenu(btn));
  });
  if (btnLLM) btnLLM.addEventListener('click', _showLLMSettings);
  if (btnOnboarding) btnOnboarding.addEventListener('click', () => {
    showScreen('welcome');
    // After showing welcome, let user click Play/Skip again
  });

  // Welcome screen buttons
  const btnPlay = document.getElementById('btn-play');
  const btnSkip = document.getElementById('btn-skip');
  const analyzeForm = document.getElementById('analyze-form');

  if (btnPlay) btnPlay.addEventListener('click', runOnboarding);
  if (btnSkip) {
    btnSkip.addEventListener('click', (e) => {
      e.preventDefault();
      _skipOnboarding();
    });
  }
  if (analyzeForm) {
    analyzeForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const show = document.getElementById('analyze-show').value.trim();
      const season = parseInt(document.getElementById('analyze-season').value, 10);
      if (!show || !season) return;
      _analyzeSeries(show, season);
    });
  }

  // Populate dropdown and determine initial view
  _populateSeriesDropdown();

  const settings = Store.getSettings();
  const hasSeenOnboarding = Store.hasSeenOnboarding();
  const demoData = _loadDemoData();
  const savedResults = Store.getResults();
  const hasSavedData = Object.keys(savedResults).length > 0;

  // Handle #demo URL hash — always go to grid
  if (demoData && window.location.hash === '#demo') {
    Store.markOnboardingSeen();
    _switchSeries('__demo__');
    _setTab('grid');
    return;
  }

  // First visit — show welcome screen
  if (!hasSeenOnboarding) {
    showScreen('welcome');
    return;
  }

  // Returning visit — go straight to grid
  let seriesName = settings.lastSeries || null;

  // Validate that lastSeries still exists
  if (seriesName && seriesName !== '__demo__' && !savedResults[seriesName]) {
    seriesName = null;
  }

  // Fall back to demo or first saved result
  if (!seriesName) {
    if (demoData) {
      seriesName = '__demo__';
    } else if (hasSavedData) {
      seriesName = Object.keys(savedResults).sort()[0];
    }
  }

  if (seriesName) {
    const select = document.getElementById('series-select');
    if (select) select.value = seriesName;
    _switchSeries(seriesName);
    _setTab('grid');
  } else {
    showScreen('welcome');
  }
}

// Run on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', _initApp);
} else {
  _initApp();
}
