/**
 * WJ DB Studio — read-only ER diagram (tables + FK relationships).
 * (c) 2026 Weeradech Jessadarom — MIT
 */
import { el, ic, toast } from './utils.js';
import { t } from './i18n.js';
import { openTab } from './app.js';

export function openERDiagram({ connId, db }) {
  if (!connId || !db) { toast(t('msg.needconn'), 'err'); return; }
  openTab({
    type: 'er', key: `er:${connId}:${db}`,
    title: `ER · ${db}`, icon: 'chart', payload: { connId, db },
    render: (tab, view) => buildER(tab, view, connId, db),
  });
}

async function buildER(tab, view, connId, db) {
  const status = el('div', { class: 'res-msg', text: '⏳ ' + t('msg.running') });
  const svgWrap = el('div', { style: { flex: '1', overflow: 'auto', background: 'var(--bg0)', padding: '14px' } });
  let zoom = 1;
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.style.minWidth = '100%';
  const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  svg.append(g);
  svgWrap.append(svg);
  view.append(
    el('div', { class: 'ed-toolbar' },
      el('span', { style: { fontWeight: '600' }, text: `${t('er.title')} — ${db}` }),
      el('span', { style: { flex: '1' } }),
      el('button', { class: 'mini-btn icon-only', title: '−', onclick: () => setZoom(zoom - 0.15), text: '−' }),
      el('button', { class: 'mini-btn icon-only', title: '+', onclick: () => setZoom(zoom + 0.15), text: '+' })),
    status, svgWrap);
  function setZoom(z) {
    zoom = Math.max(0.35, Math.min(2, z));
    g.setAttribute('transform', `scale(${zoom})`);
    svg.setAttribute('width', Math.ceil(erWidth * zoom));
    svg.setAttribute('height', Math.ceil(erHeight * zoom));
  }

  let erWidth = 800, erHeight = 600;
  try {
    const tables = (await window.wjds.listObjects(connId, db)).tables.slice(0, 40);
    const fks = (await window.wjds.listForeignKeys(connId, db)).filter(f => tables.some(x => x.name === f.REFERENCED_TABLE_NAME));
    status.remove();

    // layout: vertical columns of boxes
    const boxW = 200, perRow = Math.min(5, Math.max(2, Math.ceil(Math.sqrt(tables.length))));
    const colY = new Array(perRow).fill(20);
    const pos = new Map();
    const boxH = new Map();
    const shown = new Map();
    for (let i = 0; i < tables.length; i++) {
      const name = tables[i].name;
      const cols = (await window.wjds.tableColumns(connId, db, name)).slice(0, 9);
      shown.set(name, cols);
      const col = i % perRow;
      const h = 30 + cols.length * 15 + 8;
      boxH.set(name, h);
      pos.set(name, { x: 30 + col * (boxW + 70), y: colY[col] });
      colY[col] += h + 46;
    }
    erWidth = 60 + perRow * (boxW + 70);
    erHeight = Math.max(...colY, 400);
    svg.setAttribute('width', erWidth); svg.setAttribute('height', erHeight);
    svg.setAttribute('viewBox', `0 0 ${erWidth} ${erHeight}`);

    const NS = 'http://www.w3.org/2000/svg';
    const mk = (tag, attrs) => { const n = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v); return n; };

    // edges first (under boxes)
    const colYOf = (table, colName) => {
      const cols = shown.get(table) || [];
      const idx = cols.findIndex(c => c.name === colName);
      return pos.get(table).y + 26 + (idx >= 0 ? idx : 0) * 15 + 7;
    };
    for (const fk of fks) {
      const a = pos.get(fk.TABLE_NAME), b = pos.get(fk.REFERENCED_TABLE_NAME);
      if (!a || !b) continue;
      const x1 = a.x + boxW, y1 = colYOf(fk.TABLE_NAME, fk.COLUMN_NAME);
      const x2 = b.x, y2 = colYOf(fk.REFERENCED_TABLE_NAME, fk.REFERENCED_COLUMN_NAME);
      const mx = (x1 + x2) / 2;
      g.append(mk('path', {
        d: `M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`,
        stroke: '#4f8cff', 'stroke-width': 1.4, fill: 'none', opacity: 0.75,
      }));
    }

    // table boxes
    for (const name of pos.keys()) {
      const { x, y } = pos.get(name);
      const h = boxH.get(name);
      const grp = mk('g', {});
      grp.append(mk('rect', { x, y, width: boxW, height: h, rx: 9, fill: 'var(--bg2)', stroke: '#3a4a6b', 'stroke-width': 1.2 }));
      grp.append(mk('rect', { x, y, width: boxW, height: 24, rx: 9, fill: 'rgba(79,140,255,.18)' }));
      const title = mk('text', { x: x + 10, y: y + 16, fill: 'var(--text)', 'font-size': 12, 'font-weight': 700, 'font-family': 'var(--font-ui)' });
      title.textContent = name;
      grp.append(title);
      const cols = shown.get(name);
      cols.forEach((c, i) => {
        const isPk = c.key === 'PRI';
        const ln = mk('text', { x: x + 10, y: y + 40 + i * 15, fill: isPk ? '#f2c14e' : 'var(--text-dim)', 'font-size': 10.5, 'font-family': 'var(--font-mono)' });
        ln.textContent = (isPk ? '🔑 ' : '') + c.name + ' · ' + c.type;
        grp.append(ln);
      });
      if ((boxH.get(name) || 0) > 0 && cols.length === 9 && boxH.get(name) > 30 + 10 * 15) {
        // more columns exist
        const more = mk('text', { x: x + 10, y: y + h - 6, fill: 'var(--text-faint)', 'font-size': 10 });
        more.textContent = '…';
        grp.append(more);
      }
      g.append(grp);
    }
    setZoom(1);
  } catch (err) {
    status.textContent = '✗ ' + err.message;
    status.style.color = 'var(--danger)';
  }
}
