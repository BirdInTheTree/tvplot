// App init — Store, screen routing, toolbar, series switching, JSON import.

// --- localStorage manager ---

const Store = {
  getKey: () => localStorage.getItem('tvplotlines_api_key'),
  getProvider: () => localStorage.getItem('tvplotlines_provider'),
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

  modalBody.innerHTML = `
    <h3 style="margin-top:0">LLM Settings</h3>
    <div style="margin-bottom:12px">
      <label for="llm-provider" style="display:block;margin-bottom:4px;font-weight:600">Provider</label>
      <select id="llm-provider" style="width:100%;padding:6px;border-radius:4px;border:1px solid var(--border, #ccc)">
        <option value="anthropic" ${provider === 'anthropic' ? 'selected' : ''}>Anthropic (Claude)</option>
        <option value="openai" ${provider === 'openai' ? 'selected' : ''}>OpenAI (GPT-4o)</option>
      </select>
    </div>
    <div style="margin-bottom:16px">
      <label for="llm-api-key" style="display:block;margin-bottom:4px;font-weight:600">API Key</label>
      <input id="llm-api-key" type="password" value="${apiKey.replace(/"/g, '&quot;')}"
        placeholder="sk-... or sk-ant-..."
        style="width:100%;padding:6px;border-radius:4px;border:1px solid var(--border, #ccc);box-sizing:border-box">
    </div>
    <button id="llm-save-btn" style="padding:6px 16px;border-radius:4px;cursor:pointer">Save</button>
    <span id="llm-save-status" style="margin-left:8px;color:green;display:none">Saved!</span>
  `;

  document.getElementById('llm-save-btn').addEventListener('click', () => {
    const p = document.getElementById('llm-provider').value;
    const k = document.getElementById('llm-api-key').value.trim();
    Store.setKey(p, k);
    const status = document.getElementById('llm-save-status');
    if (status) {
      status.style.display = 'inline';
      setTimeout(() => { status.style.display = 'none'; }, 2000);
    }
  });

  modalOverlay.classList.remove('hidden');
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
  });

  // Welcome screen buttons
  const btnDemo = document.getElementById('btn-demo');
  if (btnDemo) {
    btnDemo.addEventListener('click', () => {
      Store.markOnboardingSeen();
      _switchSeries('__demo__');
      _setTab('grid');
    });
  }

  // Welcome file upload also uses _importJSON
  const welcomeUpload = document.getElementById('welcome-file-upload');
  if (welcomeUpload) {
    welcomeUpload.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        Store.markOnboardingSeen();
        _importJSON(file);
      }
      welcomeUpload.value = '';
    });
  }

  // Populate dropdown and determine initial view
  _populateSeriesDropdown();

  const settings = Store.getSettings();
  const hasSeenOnboarding = Store.hasSeenOnboarding();
  const demoData = _loadDemoData();
  const savedResults = Store.getResults();
  const hasSavedData = Object.keys(savedResults).length > 0;

  // Welcome screen will be implemented in Task 11.
  // For now, always go straight to grid with demo data.

  // Determine which series to load
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

  // Handle #demo URL hash
  if (demoData && window.location.hash === '#demo') {
    _switchSeries('__demo__');
    _setTab('grid');
  }
}

// Run on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', _initApp);
} else {
  _initApp();
}
