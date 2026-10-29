/**
 * WJ DB Studio — Find in database (search a value across tables).
 * (c) 2026 Weeradech Jessadarom — MIT
 */
import { el, ic, toast, showModal } from './utils.js';
import { t } from './i18n.js';
import { requireConn, currentDb } from './state.js';

export function findDialog() {
  let conn;
  try { conn = requireConn(); } catch { return; }
  const term = el('input', { type: 'text', placeholder: 'e.g. สมชาย / 5000 / somchai@…' });
  const dbIn = el('input', { type: 'text', value: currentDb(conn.id) || '' });
  const results = el('div', { style: { maxHeight: '52vh', overflow: 'auto' } });

  const r = showModal({
    title: t('find.title'), icon: 'search', width: '680px',
    body: el('div', { class: 'form' },
      el('div', { class: 'form-grid2' },
        el('div', {}, fieldLabel(t('find.term')), term),
        el('div', {}, fieldLabel(t('bk.db')), dbIn)),
      el('div', { style: { display: 'flex', justifyContent: 'flex-end' } },
        el('button', { class: 'btn primary', onclick: run }, ic('search'), el('span', { text: t('find.run') }))),
      results),
  });
  setTimeout(() => term.focus(), 60);
  term.addEventListener('keydown', (e) => { if (e.key === 'Enter') run(); });

  async function run() {
    const q = term.value.trim();
    const database = dbIn.value.trim();
    if (!q || !database) return;
    results.innerHTML = '';
    results.append(el('div', { class: 'res-msg', text: '⏳ ' + t('msg.running') }));
    try {
      const found = await window.wjds.findInDatabase({ connId: conn.id, db: database, term: q });
      results.innerHTML = '';
      if (!found.length) {
        results.append(el('div', { class: 'res-msg', text: t('find.none') }));
        return;
      }
      for (const hit of found) {
        results.append(el('h3', { style: { margin: '10px 0 4px', fontSize: '13px', color: 'var(--accent)' } },
          ic('table', 'ic-tbl'), el('span', { text: ' ' + database + '.' + hit.table }),
          el('span', { class: 'muted', text: `  (${hit.rows.length})` })));
        for (const row of hit.rows.slice(0, 10)) {
          const summary = hit.fields.map(f => `${f}=${row[f] === null ? 'NULL' : String(row[f]).slice(0, 40)}`).join('  ·  ');
          results.append(el('div', {
            class: 'bp-item', style: { whiteSpace: 'normal', lineHeight: '1.5' },
            onclick: () => { navigator.clipboard?.writeText(JSON.stringify(row, null, 2)); toast(t('msg.copied'), 'ok', null, 1200); },
            title: t('msg.copied'),
          }, el('span', { style: { fontFamily: 'var(--font-mono)', fontSize: '11.5px' }, text: summary })));
        }
      }
    } catch (err) {
      results.innerHTML = '';
      results.append(el('div', { class: 'res-msg', style: { color: 'var(--danger)' }, text: err.message }));
    }
  }
}

function fieldLabel(text) {
  return el('label', { style: { display: 'block', color: 'var(--text-dim)', fontSize: '11.5px', margin: '0 0 3px 2px' }, text });
}
