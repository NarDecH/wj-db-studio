/**
 * WJ DB Studio — transfer a table between connections/databases.
 * (c) 2026 Weeradech Jessadarom — MIT
 */
import { el, ic, toast, showModal } from './utils.js';
import { t } from './i18n.js';
import { state, loadConnections, requireConn, currentDb } from './state.js';

export function transferDialog() {
  let source;
  try { source = requireConn(); } catch { return; }

  const conns = () => state.connections;
  const mkConnSel = (val) => {
    const s = el('select', {});
    for (const c of conns()) s.append(el('option', { value: c.id, text: c.name, selected: c.id === val }));
    return s;
  };
  const srcSel = mkConnSel(source.id);
  const dstSel = mkConnSel(source.id);
  const srcDb = el('input', { type: 'text', value: currentDb(source.id) || '' });
  const dstDb = el('input', { type: 'text', value: currentDb(source.id) || '' });
  const tableIn = el('input', { type: 'text', placeholder: 'customers' });
  const toTableIn = el('input', { type: 'text', placeholder: '(เหมือนเดิม)' });
  const dropChk = el('input', { type: 'checkbox' });

  const progress = el('div', { class: 'res-msg', style: { display: 'none' } });
  const r = showModal({
    title: t('tr.title'), icon: 'transfer', width: '620px',
    body: el('div', { class: 'form' },
      fieldLabel(t('tr.source')),
      el('div', { class: 'form-grid2' },
        el('div', {}, fieldLabel(t('conn.title')), srcSel),
        el('div', {}, fieldLabel(t('bk.db')), srcDb)),
      el('div', { class: 'form-row' }, el('label', { text: t('ds.tablename') }), tableIn),
      el('div', { style: { textAlign: 'center', color: 'var(--accent)' } }, ic('download')),
      fieldLabel(t('tr.target')),
      el('div', { class: 'form-grid2' },
        el('div', {}, fieldLabel(t('conn.title')), dstSel),
        el('div', {}, fieldLabel(t('bk.db')), dstDb)),
      el('div', { class: 'form-grid2' },
        el('div', {}, fieldLabel(t('ds.tablename') + ' (' + t('tr.target') + ')'), toTableIn),
        el('div', { style: { display: 'flex', alignItems: 'end' } }, el('label', { class: 'check' }, dropChk, el('span', { text: t('tr.drop') })))),
      progress),
    footer: [
      el('button', { class: 'btn', onclick: () => r.close(), text: t('conn.cancel') }),
      el('button', { class: 'btn primary', onclick: run }, ic('export'), el('span', { text: t('tr.run') })),
    ],
  });

  async function run() {
    const fromConnId = srcSel.value, toConnId = dstSel.value;
    const fromDb = srcDb.value.trim(), toD = dstDb.value.trim();
    const table = tableIn.value.trim(), toTable = toTableIn.value.trim() || tableIn.value.trim();
    if (!fromDb || !toD || !table) { toast(t('msg.error'), 'err', 'กรอก database/ตารางให้ครบ'); return; }
    // ensure both connections are alive
    for (const [cid, sel] of [[fromConnId, srcSel], [toConnId, dstSel]]) {
      if (!state.active.has(cid)) {
        const res = await window.wjds.dbConnect(cid);
        if (!res.ok) { toast(t('conn.testfail'), 'err', res.error); return; }
      }
    }
    progress.style.display = '';
    progress.textContent = '⏳ ' + t('msg.running');
    try {
      const out = await window.wjds.transferTable({ fromConnId, toConnId, fromDb, table, toDb: toD, toTable, dropTarget: dropChk.checked });
      progress.textContent = `✓ ${t('tr.done', { n: out.count, t: toD + '.' + toTable })}`;
      toast(t('tr.done', { n: out.count, t: toD + '.' + toTable }), 'ok');
      import('./app.js').then(m => m.logResult(`✓ TRANSFER ${fromDb}.${table} → ${toD}.${toTable}: ${out.count} rows`));
    } catch (err) {
      progress.textContent = '✗ ' + err.message;
      toast(t('msg.error'), 'err', err.message);
    }
  }
}

function fieldLabel(text) {
  return el('label', { style: { display: 'block', color: 'var(--text-dim)', fontSize: '11.5px', margin: '0 0 3px 2px' }, text });
}
