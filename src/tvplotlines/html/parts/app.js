// App init — screen routing, dark mode, demo data loading.

function showScreen(name) {
  document.querySelectorAll('.screen').forEach(el => el.classList.remove('active'));
  const target = document.getElementById('screen-' + name);
  if (target) target.classList.add('active');
}

function toggleDark() {
  const root = document.documentElement;
  const isDark = root.classList.toggle('dark');
  localStorage.setItem('tvplotlines-dark', isDark ? '1' : '0');
}

function _restoreDarkMode() {
  const pref = localStorage.getItem('tvplotlines-dark');
  if (pref === '1') {
    document.documentElement.classList.add('dark');
  }
}

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

function _initApp() {
  _restoreDarkMode();

  const container = document.getElementById('grid-container');
  const demoData = _loadDemoData();

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

  // Navigation buttons
  const btnDemo = document.getElementById('btn-demo');
  const btnBackWelcome = document.getElementById('btn-back-welcome');
  const btnBackGrid = document.getElementById('btn-back-grid');
  const btnAnalytics = document.getElementById('btn-analytics');
  const fileUpload = document.getElementById('file-upload');
  const gridTitle = document.getElementById('grid-title');

  // Track loaded data for analytics navigation
  let _currentData = null;

  function loadData(data, title) {
    if (!container) return;
    _currentData = data;
    renderGrid(data, container);
    if (gridTitle) gridTitle.textContent = title || 'Plotlines';
    showScreen('grid');
  }

  if (btnDemo) {
    btnDemo.addEventListener('click', () => {
      if (demoData) loadData(demoData, 'Demo: Breaking Bad S01');
    });
  }

  if (fileUpload) {
    fileUpload.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const data = JSON.parse(reader.result);
          loadData(data, file.name.replace('.json', ''));
        } catch (err) {
          alert('Invalid JSON file');
        }
      };
      reader.readAsText(file);
    });
  }

  if (btnBackWelcome) {
    btnBackWelcome.addEventListener('click', () => showScreen('welcome'));
  }
  if (btnBackGrid) {
    btnBackGrid.addEventListener('click', () => showScreen('grid'));
  }
  if (btnAnalytics) {
    btnAnalytics.addEventListener('click', () => {
      if (_currentData) {
        const analyticsContainer = document.getElementById('analytics-container');
        if (analyticsContainer) renderAnalytics(_currentData, analyticsContainer);
      }
      showScreen('analytics');
    });
  }

  // Auto-load demo if data is present and URL has #demo
  if (demoData && window.location.hash === '#demo') {
    loadData(demoData, 'Demo: Breaking Bad S01');
  }
}

// Run on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', _initApp);
} else {
  _initApp();
}
