// Export functions — JSON, TXT, CSV, Final Draft .fdx

// --- Shared helpers ---

function _downloadBlob(blob, filename) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

function _escapeXml(s) {
  if (!s) return '';
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function _escapeCsv(s) {
  if (!s) return '';
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

function _exportFilename(data) {
  const ctx = data.context || {};
  if (ctx.series && ctx.season) return ctx.series.replace(/\s+/g, '_') + '_' + ctx.season;
  if (ctx.series) return ctx.series.replace(/\s+/g, '_');
  return 'tvplotlines_export';
}

function _resolveCharName(charId, cast) {
  if (!charId) return '';
  if (charId.startsWith('guest:')) return charId.slice(6);
  for (const c of cast) {
    if (c.id === charId) return c.name;
  }
  return charId;
}

// --- JSON ---

function exportJSON(data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  _downloadBlob(blob, _exportFilename(data) + '.json');
}

// --- TXT ---

function exportTXT(data) {
  const cast = data.cast || [];
  const plotlines = data.plotlines || [];
  const episodes = data.episodes || [];
  const ctx = data.context || {};
  const lines = [];

  // Header
  const title = [ctx.series, ctx.season].filter(Boolean).join(' ');
  if (title) lines.push(title);
  if (ctx.genre) lines.push('Genre: ' + ctx.genre);
  if (ctx.story_engine) lines.push('Story engine: ' + ctx.story_engine);
  lines.push('');

  // Plotlines summary
  lines.push('=== PLOTLINES ===');
  for (const pl of plotlines) {
    lines.push('');
    lines.push(`[${pl.rank}] ${pl.name}`);
    if (pl.goal) lines.push('  Goal: ' + pl.goal);
    if (pl.obstacle) lines.push('  Obstacle: ' + pl.obstacle);
    if (pl.stakes) lines.push('  Stakes: ' + pl.stakes);
    if (pl.type) lines.push('  Type: ' + pl.type);
    if (pl.span) lines.push('  Span: ' + pl.span.join(', '));
  }
  lines.push('');

  // Episodes with events
  lines.push('=== EPISODES ===');
  for (const ep of episodes) {
    lines.push('');
    const heading = ep.theme ? ep.episode + ' — ' + ep.theme : ep.episode;
    lines.push('--- ' + heading + ' ---');

    // Group events by plotline
    const byPlotline = {};
    for (const ev of (ep.events || [])) {
      const plId = ev.plotline_id || ev.storyline || 'unknown';
      if (!byPlotline[plId]) byPlotline[plId] = [];
      byPlotline[plId].push(ev);
    }

    for (const pl of plotlines) {
      const events = byPlotline[pl.id];
      if (!events || events.length === 0) continue;

      lines.push('');
      lines.push(`  ${pl.name} [${pl.rank}]`);
      for (const ev of events) {
        const chars = (ev.characters || []).map(c => _resolveCharName(c, cast)).join(', ');
        lines.push(`    [${ev.function}] ${ev.event}`);
        if (chars) lines.push(`      Characters: ${chars}`);
      }
    }
  }

  const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
  _downloadBlob(blob, _exportFilename(data) + '.txt');
}

// --- CSV (fallback for XLS — no external dependency) ---

function exportCSV(data) {
  const cast = data.cast || [];
  const plotlines = data.plotlines || [];
  const episodes = data.episodes || [];
  const plMap = {};
  for (const pl of plotlines) plMap[pl.id] = pl;

  // Events sheet as CSV
  const rows = [['Episode', 'Plotline', 'Rank', 'Function', 'Event', 'Characters'].map(_escapeCsv).join(',')];

  for (const ep of episodes) {
    for (const ev of (ep.events || [])) {
      const plId = ev.plotline_id || ev.storyline || '';
      const pl = plMap[plId] || {};
      const chars = (ev.characters || []).map(c => _resolveCharName(c, cast)).join('; ');
      rows.push([
        ep.episode,
        pl.name || plId,
        pl.rank || '',
        ev.function || '',
        ev.event || '',
        chars,
      ].map(_escapeCsv).join(','));
    }
  }

  // Add plotlines summary after a blank line
  rows.push('');
  rows.push(['Name', 'Rank', 'Type', 'Goal', 'Obstacle', 'Stakes', 'Span'].map(_escapeCsv).join(','));
  for (const pl of plotlines) {
    rows.push([
      pl.name || '',
      pl.rank || '',
      pl.type || '',
      pl.goal || '',
      pl.obstacle || '',
      pl.stakes || '',
      (pl.span || []).join('; '),
    ].map(_escapeCsv).join(','));
  }

  const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
  _downloadBlob(blob, _exportFilename(data) + '.csv');
}

// --- Final Draft .fdx ---

function exportFDX(data) {
  const cast = data.cast || [];
  const plotlines = data.plotlines || [];
  const episodes = data.episodes || [];

  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<FinalDraft DocumentType="Script" Template="No" Version="6">\n';
  xml += '<Content>\n';

  for (const ep of episodes) {
    const heading = ep.theme ? ep.episode + ' \u2014 ' + ep.theme : ep.episode;
    xml += `<Paragraph Type="Scene Heading"><Text>${_escapeXml(heading)}</Text></Paragraph>\n`;

    // Group events by plotline, preserving plotline order
    for (const pl of plotlines) {
      const events = (ep.events || []).filter(e => (e.plotline_id || e.storyline) === pl.id);
      if (events.length === 0) continue;

      xml += `<Paragraph Type="Action"><Text Font="Bold">${_escapeXml(pl.name)} [${_escapeXml(pl.rank)}]</Text></Paragraph>\n`;
      for (const ev of events) {
        const chars = (ev.characters || []).map(c => _resolveCharName(c, cast)).join(', ');
        let line = `[${ev.function}] ${ev.event}`;
        if (chars) line += ` (${chars})`;
        xml += `<Paragraph Type="Action"><Text>${_escapeXml(line)}</Text></Paragraph>\n`;
      }
    }
  }

  xml += '</Content>\n</FinalDraft>';
  const blob = new Blob([xml], { type: 'application/xml' });
  _downloadBlob(blob, _exportFilename(data) + '.fdx');
}

// --- Export dropdown ---

function _toggleExportMenu(triggerBtn) {
  const menu = document.getElementById('export-menu');
  if (!menu) return;

  const wasHidden = menu.classList.contains('hidden');
  menu.classList.toggle('hidden');

  if (wasHidden && triggerBtn) {
    // Position below the clicked button
    const rect = triggerBtn.getBoundingClientRect();
    menu.style.top = rect.bottom + 4 + 'px';
    menu.style.right = (window.innerWidth - rect.right) + 'px';

    const close = (e) => {
      if (!menu.contains(e.target) && !e.target.classList.contains('btn-export-trigger')) {
        menu.classList.add('hidden');
        document.removeEventListener('click', close);
      }
    };
    setTimeout(() => document.addEventListener('click', close), 0);
  }
}

function _handleExport(format) {
  const menu = document.getElementById('export-menu');
  if (menu) menu.classList.add('hidden');

  if (!_currentData) {
    alert('No data loaded');
    return;
  }

  switch (format) {
    case 'json': exportJSON(_currentData); break;
    case 'txt': exportTXT(_currentData); break;
    case 'csv': exportCSV(_currentData); break;
    case 'fdx': exportFDX(_currentData); break;
    case 'pdf': exportPDF(); break;
  }
}

// PDF: generate a data-driven vector PDF via jsPDF, lazily loaded from CDN.
// Falls back to the browser print stack if the library can't be fetched
// (e.g. offline). Either way the user gets a PDF.
async function exportPDF() {
  if (!_currentData) { alert('No data loaded'); return; }
  try {
    await _loadJsPDF();
  } catch (err) {
    console.warn('jsPDF load failed, falling back to print:', err);
    window.print();
    return;
  }
  try {
    _buildPDF(_currentData);
  } catch (err) {
    console.error('PDF build failed:', err);
    alert(`Couldn't build PDF: ${err.message}. Falling back to print.`);
    window.print();
  }
}

function _loadJsPDF() {
  if (window.jspdf && window.jspdf.jsPDF) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js';
    s.onload = () => (window.jspdf && window.jspdf.jsPDF) ? resolve() : reject(new Error('jsPDF not attached'));
    s.onerror = () => reject(new Error('network error fetching jsPDF'));
    document.head.appendChild(s);
  });
}

function _buildPDF(data) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const margin = 12;
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  let y = margin;

  const ctx = data.context || {};
  const seriesLabel = [ctx.series, ctx.season].filter(Boolean).join(' · ') || 'tvplotlines';

  const line = (text, size, weight = 'normal', indent = 0, color = [30, 30, 30]) => {
    doc.setFont('helvetica', weight);
    doc.setFontSize(size);
    doc.setTextColor(color[0], color[1], color[2]);
    const wrapped = doc.splitTextToSize(text, pageW - margin * 2 - indent);
    for (const ln of wrapped) {
      if (y > pageH - margin - size / 2) { doc.addPage(); y = margin; }
      doc.text(ln, margin + indent, y);
      y += size * 0.45 + 0.8;
    }
  };
  const gap = (mm) => { y += mm; if (y > pageH - margin) { doc.addPage(); y = margin; } };

  // Title
  line(seriesLabel, 22, 'bold');
  if (ctx.format || ctx.genre || ctx.system) {
    line([ctx.format, ctx.genre, ctx.system && `system: ${ctx.system}`]
      .filter(Boolean).join('  ·  '), 10, 'normal', 0, [110, 110, 110]);
  }
  if (ctx.story_engine) { gap(2); line(ctx.story_engine, 11, 'italic', 0, [70, 70, 70]); }
  gap(6);

  // Plotlines
  const plotlines = data.plotlines || [];
  for (const p of plotlines) {
    if (y > pageH - 30) { doc.addPage(); y = margin; }
    const rank = p.rank ? `[${p.rank}] ` : '';
    line(`${rank}${p.name}`, 14, 'bold');
    const meta = [p.type, p.nature, p.confidence].filter(Boolean).join('  ·  ');
    if (meta) line(meta, 9, 'normal', 0, [130, 130, 130]);
    if (p.hero) line(`Hero: ${p.hero}`, 10, 'normal', 4);
    if (p.goal) line(`Goal: ${p.goal}`, 10, 'normal', 4);
    if (p.obstacle) line(`Obstacle: ${p.obstacle}`, 10, 'normal', 4);
    if (p.stakes) line(`Stakes: ${p.stakes}`, 10, 'normal', 4);

    // Events for this plotline
    const events = [];
    for (const ep of (data.episodes || [])) {
      for (const ev of (ep.events || [])) {
        if (ev.plotline_id === p.id) events.push({ ep: ep.episode, fn: ev.function, text: ev.event, arc: ev.plot_fn });
      }
    }
    if (events.length) {
      gap(1);
      for (const e of events) {
        const arcTag = e.arc ? ` / ${e.arc}` : '';
        line(`• [${e.ep}] (${e.fn}${arcTag}) ${e.text}`, 9, 'normal', 6, [50, 50, 50]);
      }
    }
    gap(4);
  }

  // Episodes section
  const episodes = data.episodes || [];
  if (episodes.length) {
    doc.addPage(); y = margin;
    line('Episodes', 18, 'bold');
    gap(2);
    for (const ep of episodes) {
      if (y > pageH - 20) { doc.addPage(); y = margin; }
      const head = ep.theme ? `${ep.episode} — ${ep.theme}` : ep.episode;
      line(head, 12, 'bold');
      for (const ev of (ep.events || [])) {
        const pl = ev.plotline_id ? `[${ev.plotline_id}]` : '[orphan]';
        line(`• ${pl} (${ev.function}) ${ev.event}`, 9, 'normal', 4, [60, 60, 60]);
      }
      gap(2);
    }
  }

  const filename = _exportFilename(data) + '.pdf';
  doc.save(filename);
}
