/**
 * WJ DB Studio — data grid + table data view (browse & edit).
 * (c) 2026 Weeradech Jessadarom — MIT
 */
import { $, el, ic, toast, fmtNum, copyText, showContextMenu, confirmBox, downloadBlob, nowStamp } from './utils.js';
import { t } from './i18n.js';
import { state } from './state.js';
import { logResult } from './app.js';

/* ============================================================
   Reusable DataGrid (display component)
   ============================================================ */
export class DataGrid {
  /**
   * container: element
   * opts: { onCellDblClick(rowIdx, colName, value), onRowContext(e, rowIdx), selectable }
   */
  constructor(container, opts = {}) {
    this.container = container;
    this.opts = opts;
    this.fields = [];
    this.rows = [];
    this.sortCol = null;
    this.sortDir = 'asc';
    this.el = el('div', { class: 'res-grid-wrap' });
    container.append(this.el);
  }

  setData(fields, rows) {
    this.fields = fields || [];
    this.rows = rows || [];
    this.render();
  }

  render() {
    this.el.innerHTML = '';
    if (!this.fields.length) {
      this.el.append(el('div', { class: 'res-msg', text: t('grid.noresults') }));
      return;
    }
    const table = el('table', { class: 'dgrid' });
    const thead = el('thead');
    const trh = el('tr', {}, el('th', { class: 'rownum', text: '#' }));
    for (const f of this.fields) {
      const th = el('th', { text: f.name }, this.sortCol === f.name ? el('span', { class: 'sort', text: this.sortDir === 'asc' ? '▲' : '▼' }) : null);
      th.addEventListener('click', () => {
        if (this.sortCol === f.name) this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
        else { this.sortCol = f.name; this.sortDir = 'asc'; }
        if (this.opts.onSort) this.opts.onSort(this.sortCol, this.sortDir);
        else { // local sort
          const dir = this.sortDir === 'asc' ? 1 : -1;
          this.rows.sort((a, b) => {
            const va = a[f.name], vb = b[f.name];
            if (va === null) return -dir; if (vb === null) return dir;
            return va < vb ? -dir : va > vb ? dir : 0;
          });
          this.render();
        }
      });
      trh.append(th);
    }
    thead.append(trh);
    table.append(thead);

    const tbody = el('tbody');
    this.rows.forEach((row, i) => {
      const tr = el('tr', {}, el('td', { class: 'rownum', text: String(i + 1) }));
      for (const f of this.fields) {
        const v = row[f.name];
        const td = el('td', { text: this.fmt(v) });
        if (v === null) td.classList.add('null');
        else if (typeof v === 'number') td.classList.add('num');
        else if (typeof v === 'string' && /^-?\d+(\.\d+)?$/.test(v) && f.type && /INT|DEC|NUM|FIX/i.test(f.type)) td.classList.add('num');
        if (this.opts.onCellDblClick) {
          td.addEventListener('dblclick', () => this.opts.onCellDblClick(i, f.name, v, td));
        }
        td.addEventListener('contextmenu', (e) => {
          e.preventDefault();
          showContextMenu(e.clientX, e.clientY, [
            { label: t('msg.copied') + ' — cell', icon: 'copy', action: () => copyText(v === null ? 'NULL' : String(v)) },
            { label: 'Row (JSON)', icon: 'copy', action: () => copyText(JSON.stringify(row, null, 2)) },
            ...(this.opts.onRowContext ? '-' : []),
          ]);
          if (this.opts.onRowContext) this.opts.onRowContext(e, i, row);
        });
        tr.append(td);
      }
      tr.addEventListener('mousedown', () => {
        this.el.querySelectorAll('tr.selected').forEach(x => x.classList.remove('selected'));
        tr.classList.add('selected');
        this.selectedRow = i;
      });
      tbody.append(tr);
    });
    table.append(tbody);
    this.el.append(table);
  }

  fmt(v) {
    if (v === null || v === undefined) return 'NULL';
    if (Buffer && v && v.type === 'Buffer') return t('grid.blob', { n: v.length });
    if (typeof v === 'object' && v.toISOString) return v.toISOString().slice(0, 19).replace('T', ' ');
    return String(v);
  }
}

/* ============================================================
   Table data view (tab)
   ============================================================ */
export function openTableData({ connId, db, table, isView = false }) {
  import('./app.js').then((app) => {
    app.openTab({
      type: 'data', key: `data:${connId}:${db}:${table}`,
      title: `${db}.${table}`, icon: isView ? 'view' : 'table',
      render: (tab, view) => buildDataView(tab, view, connId, db, table, isView),
    });
  });
}

async function buildDataView(tab, view, connId, db, table, isView) {
  const settings = state.settings;
  let page = 0;
  const pageSize = settings.maxRows || 500;
  let where = '';
  let orderBy = null, orderDir = 'asc';
  let total = 0;
  let pks = [];
  let cols = [];

  // editing state
  let updates = [];   // {keys, values}
  let inserts = [];   // {values}
  let deletes = [];   // {keys}
  let rows = [], fields = [];
  const dirtyRows = new Set();

  /* toolbar */
  const filterInput = el('input', { type: 'text', placeholder: t('grid.filter') });
  filterInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') { where = filterInput.value; page = 0; load(); } });
  const filterBtn = el('button', { class: 'mini-btn', html: ic('filter').innerHTML, title: 'Apply filter' });
  filterBtn.addEventListener('click', () => { where = filterInput.value; page = 0; load(); });
  const clearBtn = el('button', { class: 'mini-btn', text: '✕', title: 'Clear filter' });
  clearBtn.addEventListener('click', () => { filterInput.value = ''; where = ''; page = 0; load(); });

  const saveBtn = el('button', { class: 'mini-btn', style: { display: 'none' } }, ic('save'), el('span', { text: t('grid.save') }), dirtyCountSpan());
  function dirtyCountSpan() { return el('span', { class: 'dirty-badge', id: tab.id + '-dirty' }); }
  const revertBtn = el('button', { class: 'mini-btn', style: { display: 'none' } }, ic('x'), el('span', { text: t('grid.revert') }));
  const addBtn = el('button', { class: 'mini-btn' }, ic('plus'), el('span', { text: t('grid.addrow') }));
  const delBtn = el('button', { class: 'mini-btn' }, ic('trash'), el('span', { text: t('grid.delrow') }));
  const refreshBtn = el('button', { class: 'mini-btn', html: ic('refresh').innerHTML });
  const exportBtn = el('button', { class: 'mini-btn' }, ic('export'), el('span', { text: t('grid.export') }));
  const npkHint = el('span', { class: 'muted', style: { fontSize: '11px' } });

  const pgInfo = el('span', { class: 'pginfo' });
  const bFirst = pagerBtn('first'), bPrev = pagerBtn('prev'), bNext = pagerBtn('next'), bLast = pagerBtn('last');
  function pagerBtn(kind) {
    const b = el('button', { class: 'mini-btn icon-only', html: ic(kind).innerHTML });
    b.addEventListener('click', () => {
      const pages = Math.max(1, Math.ceil(total / pageSize));
      if (kind === 'first') page = 0;
      if (kind === 'prev') page = Math.max(0, page - 1);
      if (kind === 'next') page = Math.min(pages - 1, page + 1);
      if (kind === 'last') page = pages - 1;
      load();
    });
    return b;
  }

  const gridWrap = el('div', { style: { flex: '1', minHeight: '0', display: 'flex', flexDirection: 'column' } });
  view.append(
    el('div', { class: 'grid-toolbar' },
      filterInput, filterBtn, clearBtn,
      el('span', { class: 'st-sep' }),
      refreshBtn, addBtn, delBtn, saveBtn, revertBtn, npkHint,
      el('span', { style: { flex: '1' } }),
      exportBtn,
      el('span', { class: 'pager' }, bFirst, bPrev, pgInfo, bNext, bLast)),
    gridWrap);

  const grid = new DataGrid(gridWrap, {
    onSort: (col, dir) => { orderBy = col; orderDir = dir; load(); },
    onCellDblClick: (rowIdx, colName, value, td) => startCellEdit(rowIdx, colName, value, td),
    onRowContext: (e, rowIdx, row) => rowMenu(e, rowIdx, row),
  });

  tab.onRefresh = load;

  async function init() {
    try {
      pks = await window.wjds.primaryKeys(connId, db, table);
      cols = await window.wjds.tableColumns(connId, db, table);
      if (!pks.length) {
        npkHint.textContent = t('grid.nopk');
      }
      await load();
    } catch (err) {
      gridWrap.append(el('div', { class: 'res-msg err', text: err.message }));
    }
  }

  async function load() {
    try {
      const res = await window.wjds.selectPage({ connId, db, table, where, orderBy, orderDir, offset: page * pageSize, limit: pageSize });
      rows = res.rows; fields = res.fields; total = res.total;
      renderGrid();
      pgInfo.textContent = `${t('grid.page')} ${page + 1} / ${Math.max(1, Math.ceil(total / pageSize))} · ${t('grid.total', { n: fmtNum(total) })}`;
      bFirst.disabled = bPrev.disabled = page === 0;
      bNext.disabled = bLast.disabled = (page + 1) >= Math.ceil(total / pageSize);
    } catch (err) {
      gridWrap.innerHTML = '';
      gridWrap.append(el('div', { class: 'res-msg', style: { color: 'var(--danger)' }, text: err.message }));
    }
  }

  function renderGrid() {
    grid.setData(fields, rows);
    updateDirtyBadge();
  }

  function updateDirtyBadge() {
    const n = updates.length + inserts.length + deletes.length;
    const badge = $('#' + tab.id + '-dirty');
    if (badge) badge.textContent = n ? String(n) : '';
    saveBtn.style.display = revertBtn.style.display = n ? '' : 'none';
  }

  /* ---------- cell editing ---------- */
  function startCellEdit(rowIdx, colName, value, td) {
    if (isView) return;
    const col = cols.find(c => c.name === colName);
    const input = el('input', { class: 'cell-edit' });
    input.value = value === null ? '' : String(value);
    td.innerHTML = '';
    td.append(input);
    td.classList.remove('null');
    input.focus();
    input.setSelectionRange(input.value.length, input.value.length);

    const commit = () => {
      const raw = input.value;
      const newVal = raw === '' ? null : coerce(raw, col);
      const oldVal = value;
      const row = rows[rowIdx];
      if (String(newVal) !== String(oldVal) || (newVal === null) !== (oldVal === null)) {
        const keys = rowKeys(row);
        if (!keys) { toast(t('grid.nopk'), 'err'); return; }
        // find existing update for the same row
        let u = updates.find(x => sameKeys(x.keys, keys));
        if (!u) { u = { keys, values: {} }; updates.push(u); }
        u.values[colName] = newVal;
        row[colName] = newVal;
        dirtyRows.add(rowIdx);
      }
      renderGrid();
    };
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); commit(); }
      else if (e.key === 'Escape') { renderGrid(); }
    });
    input.addEventListener('blur', commit);
  }

  function coerce(raw, col) {
    if (!col) return raw;
    if (/INT|DEC|NUM|FLOAT|DOUB|BIT/i.test(col.type)) {
      if (raw === '') return null;
      const n = Number(raw);
      return isNaN(n) ? raw : n;
    }
    return raw;
  }

  function rowKeys(row) {
    if (pks.length) {
      const keys = {};
      for (const k of pks) keys[k] = row[k];
      return keys;
    }
    // fallback: all columns
    const keys = {};
    for (const f of fields) keys[f.name] = row[f.name];
    return Object.values(keys).some(v => v !== null) ? keys : null;
  }
  function sameKeys(a, b) {
    return JSON.stringify(a) === JSON.stringify(b);
  }

  function rowMenu(e, rowIdx, row) {
    const keys = rowKeys(row);
    showContextMenu(e.clientX, e.clientY, [
      { label: t('grid.delrow'), icon: 'trash', danger: true, action: () => { if (keys) { deletes.push({ keys }); renderGrid(); } else toast(t('grid.nopk'), 'err'); } },
      { label: t('grid.null') + ' → ' + (grid.fields[1]?.name || ''), icon: 'dot', action: () => {} },
      { label: 'Copy row (JSON)', icon: 'copy', action: () => copyText(JSON.stringify(row, null, 2)) },
      { label: 'Copy as INSERT', icon: 'sql', action: () => copyText(buildInsert(row)) },
    ]);
  }

  function buildInsert(row) {
    const cols2 = fields.map(f => '`' + f.name + '`').join(', ');
    const vals = fields.map(f => {
      const v = row[f.name];
      if (v === null) return 'NULL';
      if (typeof v === 'number') return String(v);
      return `'${String(v).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
    }).join(', ');
    return `INSERT INTO \`${db}\`.\`${table}\` (${cols2}) VALUES (${vals});`;
  }

  addBtn.addEventListener('click', () => {
    const values = {};
    for (const c of cols) values[c.name] = null;
    inserts.push({ values });
    // reflect locally: append visual row then reload to keep it simple
    toast('New row pending — fill values and Apply', 'info');
    // open the first editable cell by appending an empty row locally
    rows.push(Object.fromEntries(fields.map(f => [f.name, '→ new'])));
    grid.setData(fields, rows);
    updateDirtyBadge();
    // open edit on the appended row (first column)
    setTimeout(() => {
      const trs = grid.el.querySelectorAll('tbody tr');
      const last = trs[trs.length - 1];
      if (last) {
        const td = last.children[1];
        if (td) startInsertEdit(rows.length - 1, fields[0]?.name, td);
      }
    }, 30);
  });

  function startInsertEdit(rowIdx, colName, td) {
    const col = cols.find(c => c.name === colName);
    const input = el('input', { class: 'cell-edit' });
    td.innerHTML = ''; td.append(input); input.focus();
    const commit = () => {
      const raw = input.value;
      const ins = inserts[0];
      if (ins) ins.values[colName] = raw === '' ? null : coerce(raw, col);
      rows[rowIdx][colName] = raw === '' ? 'NULL' : raw;
      updateDirtyBadge();
    };
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { commit(); load(); } });
    input.addEventListener('blur', commit);
  }

  delBtn.addEventListener('click', () => {
    if (grid.selectedRow == null) { toast('เลือกแถวก่อน / Select a row first', 'info'); return; }
    const keys = rowKeys(rows[grid.selectedRow]);
    if (!keys) { toast(t('grid.nopk'), 'err'); return; }
    deletes.push({ keys });
    updateDirtyBadge();
  });

  saveBtn.addEventListener('click', async () => {
    const n = updates.length + inserts.length + deletes.length;
    if (!n) return;
    if (state.settings.confirmDestructive && (deletes.length || updates.length)) {
      if (!(await confirmBox(t('grid.save'), t('grid.confirmsave', { n })))) return;
    }
    try {
      const stats = await window.wjds.applyChanges({ connId, db, table, pks, inserts, updates, deletes });
      logResult(`✓ ${t('grid.applied', { i: stats.inserted, u: stats.updated, d: stats.deleted })}`, true);
      updates = []; inserts = []; deletes = [];
      dirtyRows.clear();
      await load();
    } catch (err) {
      logResult('✗ ' + err.message, false);
      toast(t('msg.error'), 'err', err.message);
    }
  });

  revertBtn.addEventListener('click', () => {
    updates = []; inserts = []; deletes = [];
    load();
  });

  refreshBtn.addEventListener('click', load);

  exportBtn.addEventListener('click', () => {
    import('./importer.js').then(m => m.exportDialog(connId, {
      sql: `SELECT * FROM \`${db}\`.\`${table}\`` + (where ? ` WHERE ${where}` : ''),
      db, table,
    }));
  });

  await init();
}
