/**
 * WJ DB Studio — table designer (create / alter tables).
 * (c) 2026 Weeradech Jessadarom — MIT
 */
import { el, ic, toast, showModal, confirmBox } from './utils.js';
import { t } from './i18n.js';
import { openTab } from './app.js';
import { state } from './state.js';

const COMMON_TYPES = [
  'INT', 'BIGINT', 'TINYINT', 'SMALLINT', 'MEDIUMINT', 'DECIMAL(10,2)', 'FLOAT', 'DOUBLE',
  'VARCHAR(255)', 'VARCHAR(64)', 'CHAR(36)', 'TEXT', 'MEDIUMTEXT', 'LONGTEXT', 'TINYTEXT',
  'DATE', 'DATETIME', 'TIMESTAMP', 'TIME', 'YEAR', 'JSON', 'BLOB', 'LONGBLOB', 'ENUM(\'a\',\'b\')', 'BOOLEAN',
];

export function openDesigner({ connId, db, table = null } = {}) {
  if (!connId) { toast(t('msg.needconn'), 'err'); return; }
  const isNew = !table;
  openTab({
    type: 'designer', key: `designer:${connId}:${db}:${table || ':new:'}:${isNew ? Date.now() : ''}`,
    title: (isNew ? `New table · ${db}` : `${db}.${table}`), icon: 'edit',
    render: (tab, view) => buildDesigner(tab, view, connId, db, table, isNew),
  });
}

async function buildDesigner(tab, view, connId, db, tableName, isNew) {
  const model = {
    name: tableName || '',
    engine: 'InnoDB',
    charset: 'utf8mb4',
    comment: '',
    pk: [],
    columns: [],   // {name, oldName, type, nullable, default, extra, comment, drop}
    indexes: [],   // {name, oldName, unique, columns[], drop}
    foreignKeys: [], // {name, oldName, columns[], refTable, refColumns[], onDelete, onUpdate, drop}
    pkChanged: false,
  };

  if (!isNew) {
    try {
      const cols = await window.wjds.tableColumns(connId, db, tableName);
      const ixs = await window.wjds.tableIndexes(connId, db, tableName);
      model.name = tableName;
      for (const c of cols) {
        model.columns.push({
          name: c.name, oldName: c.name, type: c.type.toUpperCase(),
          nullable: c.nullable, default: c.default === null ? '' : String(c.default),
          extra: /auto_increment/i.test(c.extra) ? 'auto_increment' : '',
          comment: c.comment || '',
        });
        if (c.key === 'PRI') model.pk.push(c.name);
      }
      const pkName = ixs.find(x => x.name === 'PRIMARY');
      const pkCols = pkName ? pkName.columns : model.pk;
      model.pk = [...pkCols];
      for (const ix of ixs) {
        if (ix.name === 'PRIMARY') continue;
        model.indexes.push({ name: ix.name, oldName: ix.name, unique: ix.unique, columns: [...ix.columns] });
      }
    } catch (err) {
      view.append(el('div', { class: 'res-msg', style: { color: 'var(--danger)' }, text: err.message }));
      return;
    }
  } else {
    model.columns.push({ name: 'id', type: 'INT UNSIGNED', nullable: false, default: '', extra: 'auto_increment', comment: '' });
    model.pk = ['id'];
    model.columns.push({ name: 'created_at', type: 'TIMESTAMP', nullable: false, default: 'CURRENT_TIMESTAMP', extra: '', comment: '' });
  }

  /* ---------- UI ---------- */
  const root = el('div', { class: 'designer' });

  // header row: table name, engine, charset
  const nameInput = el('input', { type: 'text', value: model.name, placeholder: 'table_name', style: { fontWeight: '600' } });
  const engineInput = el('input', { type: 'text', value: model.engine });
  const charsetInput = el('input', { type: 'text', value: model.charset });
  const commentInput = el('input', { type: 'text', value: model.comment });
  root.append(el('div', { class: 'ds-section' },
    el('h3', {}, ic('table'), t('ds.title'), el('span', { class: 'muted', text: '  ·  ' + db })),
    el('div', { class: 'ds-grid' },
      el('div', { class: 'ds-row' },
        el('div', {}, fieldLabel(t('ds.tablename')), nameInput),
        el('div', {}, fieldLabel(t('ds.engine')), engineInput),
        el('div', {}, fieldLabel(t('ds.charset')), charsetInput),
        el('div', { style: { gridColumn: 'span 3' } }, fieldLabel(t('ds.comment')), commentInput)))));

  // columns editor
  const colRows = el('div', { class: 'ds-grid' });
  const colHead = el('div', { class: 'ds-row ds-head' },
    el('span', { text: t('ds.colname') }), el('span', { text: t('ds.coltype') }),
    el('span', { text: t('ds.nullable') }), el('span', { text: t('ds.default') }),
    el('span', { text: t('ds.ai') }), el('span', { text: t('ds.comment') }), el('span'));
  colRows.append(colHead);
  root.append(el('div', { class: 'ds-section' },
    el('h3', {}, ic('table'), t('ds.columns'), colAddBtn()),
    colRows));

  function colAddBtn() {
    const b = el('button', { class: 'mini-btn', html: ic('plus').innerHTML + t('grid.addrow') });
    b.addEventListener('click', () => {
      model.columns.push({ name: '', type: 'VARCHAR(255)', nullable: true, default: '', extra: '', comment: '' });
      renderColumns();
    });
    return b;
  }

  function renderColumns() {
    colRows.innerHTML = '';
    colRows.append(colHead);
    model.columns.forEach((col, i) => {
      const nameI = el('input', { type: 'text', value: col.name, oninput: () => { col.name = nameI.value; } });
      const typeSel = el('input', { type: 'text', value: col.type, list: 'wjds-types', oninput: () => { col.type = typeSel.value.toUpperCase(); } });
      const nullChk = el('input', { type: 'checkbox' });
      nullChk.checked = col.nullable;
      nullChk.addEventListener('change', () => { col.nullable = nullChk.checked; });
      const defI = el('input', { type: 'text', value: col.default, oninput: () => { col.default = defI.value; } });
      const aiChk = el('input', { type: 'checkbox' });
      aiChk.checked = col.extra === 'auto_increment';
      aiChk.addEventListener('change', () => { col.extra = aiChk.checked ? 'auto_increment' : ''; });
      const comI = el('input', { type: 'text', value: col.comment, oninput: () => { col.comment = comI.value; } });
      const pkChk = el('input', { type: 'checkbox', title: t('ds.pk') });
      pkChk.checked = model.pk.includes(col.name || '__');
      pkChk.addEventListener('change', () => {
        model.pkChanged = true;
        if (pkChk.checked) { if (!model.pk.includes(col.name)) model.pk.push(col.name); }
        else model.pk = model.pk.filter(x => x !== col.name);
      });
      nameI.addEventListener('change', () => { pkChk.checked = model.pk.includes(col.name); });
      const del = el('button', { class: 'mini-btn icon-only', html: ic('trash').innerHTML, onclick: () => { col.drop = true; renderColumns(); } });
      const row = el('div', { class: 'ds-row', style: col.drop ? { opacity: '.4', textDecoration: 'line-through' } : {} },
        nameI, typeSel, nullChk, defI, aiChk, comI, del);
      colRows.append(row);
    });
  }

  // datalist for types
  const dl = el('datalist', { id: 'wjds-types' }, COMMON_TYPES.map(x => el('option', { value: x })));

  // indexes editor
  const ixRows = el('div', { class: 'ds-grid' });
  const ixHead = el('div', { class: 'ds-row ix ds-head' },
    el('span', { text: t('ds.indexname') }), el('span', { text: t('ds.uniq') }),
    el('span', { text: t('ds.columns') + ' (comma-separated)' }), el('span'));
  ixRows.append(ixHead);
  root.append(el('div', { class: 'ds-section' },
    el('h3', {}, ic('index'), t('ds.indexes'),
      (() => { const b = el('button', { class: 'mini-btn', html: ic('plus').innerHTML + 'Add' }); b.addEventListener('click', () => { model.indexes.push({ name: '', unique: false, columns: [] }); renderIndexes(); }); return b; })()),
    ixRows));

  function renderIndexes() {
    ixRows.innerHTML = ''; ixRows.append(ixHead);
    model.indexes.forEach((ix, i) => {
      const nameI = el('input', { type: 'text', value: ix.name, oninput: () => { ix.name = nameI.value; } });
      const uniqChk = el('input', { type: 'checkbox' });
      uniqChk.checked = ix.unique; uniqChk.addEventListener('change', () => { ix.unique = uniqChk.checked; });
      const colsI = el('input', { type: 'text', value: ix.columns.join(', '), oninput: () => { ix.columns = colsI.value.split(',').map(s => s.trim()).filter(Boolean); } });
      const del = el('button', { class: 'mini-btn icon-only', html: ic('trash').innerHTML, onclick: () => { ix.drop = true; renderIndexes(); } });
      ixRows.append(el('div', { class: 'ds-row ix', style: ix.drop ? { opacity: '.4', textDecoration: 'line-through' } : {} }, nameI, uniqChk, colsI, del));
    });
  }

  // FK editor
  const fkRows = el('div', { class: 'ds-grid' });
  const fkHead = el('div', { class: 'ds-row fk ds-head' },
    el('span', { text: t('ds.indexname') }), el('span', { text: 'Columns' }),
    el('span', { text: t('ds.ref') }), el('span', { text: t('ds.ondelete') }), el('span', { text: t('ds.onupdate') }), el('span'));
  fkRows.append(fkHead);
  root.append(el('div', { class: 'ds-section' },
    el('h3', {}, ic('key2'), t('ds.fks'),
      (() => { const b = el('button', { class: 'mini-btn', html: ic('plus').innerHTML + 'Add' }); b.addEventListener('click', () => { model.foreignKeys.push({ name: '', columns: [], refTable: '', refColumns: [], onDelete: 'RESTRICT', onUpdate: 'RESTRICT' }); renderFks(); }); return b; })()),
    fkRows));

  function renderFks() {
    fkRows.innerHTML = ''; fkRows.append(fkHead);
    model.foreignKeys.forEach((fk) => {
      const nameI = el('input', { type: 'text', value: fk.name, oninput: () => { fk.name = nameI.value; } });
      const colsI = el('input', { type: 'text', value: fk.columns.join(', '), placeholder: 'col1, col2', oninput: () => { fk.columns = colsI.value.split(',').map(s => s.trim()).filter(Boolean); } });
      const refI = el('input', { type: 'text', value: fk.refTable + (fk.refColumns.length ? '(' + fk.refColumns.join(',') + ')' : ''), placeholder: 'other_table(id)', oninput: () => {
        const m = refI.value.match(/^(\w+)\s*\(([^)]*)\)$/);
        if (m) { fk.refTable = m[1]; fk.refColumns = m[2].split(',').map(s => s.trim()).filter(Boolean); }
        else { fk.refTable = refI.value.trim(); fk.refColumns = []; }
      } });
      const odSel = el('select', {}, ['RESTRICT', 'CASCADE', 'SET NULL', 'NO ACTION'].map(x => el('option', { value: x, text: x, selected: fk.onDelete === x })));
      odSel.addEventListener('change', () => { fk.onDelete = odSel.value; });
      const ouSel = el('select', {}, ['RESTRICT', 'CASCADE', 'SET NULL', 'NO ACTION'].map(x => el('option', { value: x, text: x, selected: fk.onUpdate === x })));
      ouSel.addEventListener('change', () => { fk.onUpdate = ouSel.value; });
      const del = el('button', { class: 'mini-btn icon-only', html: ic('trash').innerHTML, onclick: () => { fk.drop = true; renderFks(); } });
      fkRows.append(el('div', { class: 'ds-row fk', style: fk.drop ? { opacity: '.4', textDecoration: 'line-through' } : {} }, nameI, colsI, refI, odSel, ouSel, del));
    });
  }

  renderColumns(); renderIndexes(); renderFks();

  // partitions editor (HASH/KEY/RANGE/LIST)
  const pType = el('select', {},
    el('option', { value: '', text: t('ds.partnone') }),
    ['HASH', 'KEY', 'RANGE', 'LIST'].map(x => el('option', { value: x, text: x, selected: model.partitions?.type === x })));
  if (model.partitions?.type) pType.value = model.partitions.type;
  const pExpr = el('input', { type: 'text', value: model.partitions?.expr || '', placeholder: 'customer_id / YEAR(created_at)' });
  const pCount = el('input', { type: 'number', value: model.partitions?.count || 4, min: '2', max: '1024' });
  const pValues = el('input', { type: 'text', value: (model.partitions?.values || []).map(v => v.name + '=' + v.value).join(', '), placeholder: 'p1=10, p2=20 (RANGE/LIST)' });
  const pRow = el('div', { class: 'form-grid3', style: { display: pType.value ? 'grid' : 'none' } }, pExpr, pCount, pValues);
  pType.addEventListener('change', () => { pRow.style.display = pType.value ? 'grid' : 'none'; });

  // actions
  const previewBtn = el('button', { class: 'btn', onclick: doPreview }, ic('code'), el('span', { text: t('ds.preview') }));
  const applyBtn = el('button', { class: 'btn primary', onclick: doApply }, ic('save'), el('span', { text: t('ds.apply') }));

  root.append(el('div', { class: 'ds-section' },
    el('h3', {}, ic('index'), t('ds.partitions')),
    el('div', { class: 'form-grid3' }, pType, pExpr, pCount),
    el('div', { style: { marginTop: '6px' } }, pValues),
    el('div', { class: 'muted', style: { fontSize: '11px', marginTop: '4px' }, text: t('ds.parthint') })));

  root.append(el('div', { style: { display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '12px' } }, previewBtn, applyBtn));
  root.append(dl);
  view.append(root);

  function collect() {
    model.name = nameInput.value.trim();
    model.engine = engineInput.value.trim();
    model.charset = charsetInput.value.trim();
    model.comment = commentInput.value.trim();
    model.db = db;
    model.create = isNew;
    model.partitions = pType.value ? {
      type: pType.value, expr: pExpr.value.trim(), count: parseInt(pCount.value, 10) || 0,
      values: pValues.value.split(',').map(s => { const [n, v] = s.split('='); return { name: (n || '').trim(), value: (v || '').trim() }; }),
    } : null;
    return model;
  }

  async function buildSQL() {
    return window.wjds.buildTableDDL(collect());
  }

  async function doPreview() {
    const sql = await buildSQL();
    const { showModal } = await import('./utils.js');
    showModal({
      title: 'SQL Preview', icon: 'code', width: '720px',
      body: el('div', { class: 'ds-code', text: sql || '-- no changes' }),
    });
  }

  async function doApply() {
    const sql = await buildSQL();
    if (!sql) { toast('-- no changes', 'info'); return; }
    if (!(await confirmBox(t('ds.apply'), sql, false))) return;
    try {
      await window.wjds.dbExec(connId, sql, { timeoutSec: 60 });
      toast(t('ds.applied'), 'ok');
      import('./app.js').then(m => m.logResult('✓ ' + sql.split('\n')[0] + ' …'));
      import('./tree.js').then(m => m.refreshTree());
      if (isNew) { tab.setTitle(nameInput.value.trim()); }
    } catch (err) {
      toast(t('msg.error'), 'err', err.message);
    }
  }
}

function fieldLabel(text) {
  return el('label', { style: { display: 'block', color: 'var(--text-dim)', fontSize: '11.5px', margin: '0 0 3px 2px' }, text });
}
