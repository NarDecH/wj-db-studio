/**
 * WJ DB Studio — schema compare (A vs B) with migration SQL.
 * (c) 2026 Weeradech Jessadarom — MIT
 */
import { el, ic, toast, showModal, copyText } from './utils.js';
import { t } from './i18n.js';
import { state, loadConnections } from './state.js';
import { openTab } from './app.js';

export function compareDialog() {
  const selA = connSel(), selB = connSel();
  const dbA = el('input', { type: 'text', placeholder: 'db_a' });
  const dbB = el('input', { type: 'text', placeholder: 'db_b' });
  const dropChk = el('input', { type: 'checkbox' });
  const r = showModal({
    title: t('cmp.title'), icon: 'compare', width: '560px',
    body: el('div', { class: 'form' },
      fieldLabel('A — ' + t('cmp.source')),
      el('div', { class: 'form-grid2' }, el('div', {}, selA), el('div', {}, dbA)),
      fieldLabel('B — ' + t('cmp.target')),
      el('div', { class: 'form-grid2' }, el('div', {}, selB), el('div', {}, dbB)),
      el('label', { class: 'check' }, dropChk, el('span', { text: t('cmp.drops') }))),
    footer: [
      el('button', { class: 'btn', onclick: () => r.close(), text: t('conn.cancel') }),
      el('button', { class: 'btn primary', onclick: () => { const a = selA.value, b = selB.value; if (dbA.value.trim() && dbB.value.trim()) { r.close(); openCompareTab(a, dbA.value.trim(), b, dbB.value.trim(), dropChk.checked); } } }, ic('compare'), el('span', { text: t('cmp.run') })),
    ],
  });
  setTimeout(() => dbA.focus(), 60);
}

function connSel() {
  const s = el('select', {});
  for (const c of state.connections) s.append(el('option', { value: c.id, text: c.name }));
  return s;
}

async function openCompareTab(connIdA, dbA, connIdB, dbB, includeDrops) {
  openTab({
    type: 'cmp', key: `cmp:${connIdA}:${dbA}:${connIdB}:${dbB}`,
    title: `${t('cmp.title')} · ${dbA} ⇄ ${dbB}`, icon: 'compare',
    payload: { connIdA, dbA, connIdB, dbB },
    render: (tab, view) => buildCompare(tab, view, connIdA, dbA, connIdB, dbB, includeDrops),
  });
}

const KIND_CLS = { 'col-add': 'ic-ok', 'col-mod': 'ic-warn', 'col-drop': 'ic-err', 'ix-add': 'ic-ok', 'ix-mod': 'ic-warn', 'ix-drop': 'ic-err' };

async function buildCompare(tab, view, connIdA, dbA, connIdB, dbB, includeDrops) {
  const status = el('div', { class: 'res-msg', text: '⏳ ' + t('msg.running') });
  const body = el('div', { style: { flex: '1', overflow: 'auto', padding: '14px 18px', userSelect: 'text' } });
  view.append(status, body);
  tab.onRefresh = () => buildCompare(tab, view, connIdA, dbA, connIdB, dbB, includeDrops);
  try {
    const mig = await window.wjds.buildMigrationSql({ connIdA, dbA, connIdB, dbB, includeDrops });
    status.remove();
    body.append(el('h2', {}, ic('compare'), el('span', { text: `${dbA} ⇄ ${dbB}` })));

    const summary = el('div', { class: 'stat-cards' });
    summary.append(
      el('div', { class: 'stat' }, el('div', { class: 'k', text: t('cmp.onlyA') }), el('div', { class: 'v', text: mig.onlyA.length })),
      el('div', { class: 'stat' }, el('div', { class: 'k', text: t('cmp.onlyB') }), el('div', { class: 'v', text: mig.onlyB.length })),
      el('div', { class: 'stat' }, el('div', { class: 'k', text: t('cmp.changed') }), el('div', { class: 'v', text: mig.changed.length })));
    body.append(summary);

    const box = el('div', { class: 'ddl-code', style: { maxHeight: '46vh' }, text: mig.sql || '-- identical' });
    body.append(el('h3', { style: { color: 'var(--text-dim)', fontSize: '12.5px' }, text: t('cmp.sql') }), box);
    body.append(el('div', { style: { display: 'flex', gap: '8px', marginTop: '10px' } },
      el('button', { class: 'btn', onclick: async () => { await copyText(mig.sql); toast(t('msg.copied'), 'ok'); } }, ic('copy'), 'Copy'),
      el('button', { class: 'btn', onclick: async () => {
        const f = await window.wjds.pickSaveFile({ title: t('cmp.save'), defaultPath: 'migration.sql', filters: [{ name: 'SQL', extensions: ['sql'] }] });
        if (f) { await window.wjds.writeFile(f, mig.sql); toast(t('msg.savedfile', { f }), 'ok'); }
      } }, ic('save'), el('span', { text: t('ed.savefile') }))));

    // detail list
    const list = el('div', { style: { marginTop: '14px' } });
    for (const t2 of mig.onlyA) list.append(el('div', {}, ic('plus', 'ticon ic-ok'), el('span', { text: ` ${dbA}.${t2} — ${t('cmp.onlyA')}` })));
    for (const t2 of mig.onlyB) list.append(el('div', {}, ic('minus', 'ticon ic-err'), el('span', { text: ` ${dbB}.${t2} — ${t('cmp.onlyB')}` })));
    for (const ch of mig.changed) {
      list.append(el('h3', { style: { margin: '10px 0 4px', color: 'var(--accent)', fontSize: '13px' }, text: ch.table }));
      for (const dt of ch.details) {
        list.append(el('div', {}, ic('dot', 'ticon ' + (KIND_CLS[dt.kind] || '')), el('span', { style: { fontFamily: 'var(--font-mono)', fontSize: '11.5px' }, text: ' ' + dt.text })));
      }
    }
    body.append(list);
  } catch (err) {
    status.textContent = '✗ ' + err.message;
    status.style.color = 'var(--danger)';
  }
}
