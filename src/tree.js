/**
 * WJ DB Studio — object explorer tree.
 * Connections > Databases > (Tables, Views, Procedures, Functions, Triggers, Events)
 * (c) 2026 Weeradech Jessadarom — MIT
 */
import { $, $$, el, ic, toast, showContextMenu, confirmBox } from './utils.js';
import { t } from './i18n.js';
import { state, connMeta } from './state.js';
import { openConnectionDialog } from './connections.js';

let hooks = null;
const connState = new Map(); // id -> {connected, expanded, dbs}

// connection lost (keepalive detected) -> mark node disconnected
window.addEventListener('db-lost', (e) => {
  const cs = connState.get(e.detail.connId);
  if (cs) {
    cs.connected = false; cs.err = true; cs.dbs = null;
    if (cs.expandedDbs) cs.expandedDbs.clear();
  }
  if (hooks) {
    hooks.onConnectStatus(e.detail.connId, null);
    renderTree();
  }
});

export function initTree(h) {
  hooks = h;
  renderTree();
}

export function refreshTree(reload = false, filter = '') {
  renderTree(filter);
  if (reload) {
    for (const [id, cs] of connState) {
      if (cs.connected) { // refresh expanded dbs
        cs.expandedDbs && cs.expandedDbs.clear();
      }
    }
  }
}

export function isConnecting(id) {
  const cs = connState.get(id);
  return cs ? cs.connecting : false;
}

/* ============ render root ============ */
function renderTree(filter = '') {
  const tree = $('#tree');
  tree.innerHTML = '';
  const f = (filter || '').toLowerCase();

  if (!state.connections.length) {
    tree.append(el('div', { class: 'tree-empty', text: t('conn.empty') }));
    return;
  }

  const conns = [...state.connections].sort((a, b) =>
    a.group === b.group ? a.name.localeCompare(b.name) : String(a.group).localeCompare(String(b.group)));

  let lastGroup = null;
  for (const meta of conns) {
    if (f && !(meta.name + ' ' + meta.host + ' ' + (meta.group || '')).toLowerCase().includes(f)) continue;
    if (meta.group && meta.group !== lastGroup) {
      tree.append(el('div', { class: 'trow', style: { color: 'var(--text-faint)', fontSize: '10.5px', textTransform: 'uppercase', letterSpacing: '.5px', cursor: 'default', padding: '6px 6px 2px' } },
        ic('folder', 'ticon ic-dim'), el('span', { class: 'tlabel', text: meta.group })));
      lastGroup = meta.group;
    } else if (!meta.group && lastGroup !== '') {
      lastGroup = '';
    }
    tree.append(renderConn(meta));
  }
}

/* ============ connection node ============ */
function renderConn(meta) {
  const cs = connState.get(meta.id) || { connected: false };
  connState.set(meta.id, cs);
  const color = cs.connected ? (cs.err ? 'var(--danger)' : 'var(--ok)') : 'var(--text-faint)';
  const info = cs.connected && state.active.get(meta.id);

  const row = el('div', {
    class: 'trow',
    onmousedown: () => selectRow(row),
    ondblclick: () => toggleConn(meta, row, kids),
    oncontextmenu: (e) => { e.preventDefault(); connMenu(e, meta); },
  },
    el('span', { class: 'chev' + (cs.connected ? ' open' : ''), html: ic('chevron-right').innerHTML }),
    ic(cs.connected ? 'server' : 'connect', 'ticon ' + (cs.connected ? 'ic-ok' : 'ic-dim')),
    el('span', { class: 'tlabel', text: meta.name }),
    info ? el('span', { class: 'tbadge', text: (info.info.flavor || '') + ' ' + (info.info.version || '') }) : null,
    el('span', { class: 'conn-dot', style: { background: color } }));

  const kids = el('div', { class: 'tkids', style: { display: cs.connected ? '' : 'none' } });

  if (cs.connecting) {
    kids.append(el('div', { class: 'trow', style: { color: 'var(--text-faint)' } }, ic('clock', 'ticon ic-dim'), el('span', { class: 'tlabel', text: t('tree.connecting') })));
  } else if (cs.connected && cs.dbs) {
    renderDbList(meta, cs, kids);
  }

  row.addEventListener('click', (e) => {
    if (e.target.closest('.chev') || e.detail === 2) toggleConn(meta, row, kids);
  });

  const node = el('div', { class: 'tnode' }, row, kids);
  return node;
}

function selectRow(row) {
  $$('#tree .trow.selected').forEach(r => r.classList.remove('selected'));
  row.classList.add('selected');
}

async function toggleConn(meta, row, kids) {
  const cs = connState.get(meta.id);
  if (cs.connecting) return;
  if (!cs.connected) {
    cs.connecting = true;
    renderTree();
    try {
      const info = await window.wjds.dbConnect(meta.id);
      if (info.ok) {
        cs.connected = true; cs.err = false;
        try { cs.dbs = await window.wjds.listDatabases(meta.id); }
        catch { cs.dbs = []; }
        hooks.onConnectStatus(meta.id, info.info);
        toast(t('msg.connected', { name: meta.name }), 'ok');
      } else {
        cs.connected = false; cs.err = true;
        hooks.onConnectStatus(meta.id, null);
        toast(t('conn.testfail'), 'err', info.error);
      }
    } catch (err) {
      cs.err = true;
      toast(t('conn.testfail'), 'err', err.message);
    }
    cs.connecting = false;
    renderTree();
  }
  // When connected: clicking again does NOT disconnect —
  // use the context menu ("ตัดการเชื่อมต่อ") to disconnect.
}

function connMenu(e, meta) {
  const cs = connState.get(meta.id);
  const items = [];
  if (!cs.connected) {
    items.push({ label: t('ctx.query') + ' (' + t('tb.newconn') + ')', icon: 'connect', action: () => { const cs2 = connState.get(meta.id); cs2.connecting = false; toggleConn(meta); } });
  } else {
    items.push({ label: t('ctx.refresh'), icon: 'refresh', action: () => { cs.dbs = null; renderTree(); } });
    items.push({
      label: t('ctx.disconnect'), icon: 'disconnect', action: async () => {
        await window.wjds.dbDisconnect(meta.id);
        cs.connected = false; cs.dbs = null; cs.expandedDbs = new Set();
        hooks.onConnectStatus(meta.id, null);
        renderTree();
      },
    });
  }
  items.push('-');
  items.push({ label: t('conn.edit'), icon: 'edit', action: () => openConnectionDialog({ conn: meta, onSaved: () => renderTree() }) });
  items.push({
    label: 'Duplicate', icon: 'copy', action: async () => {
      const copy = { ...meta, id: undefined, name: meta.name + ' copy', password: undefined };
      await window.wjds.saveConnection(copy);
      await reloadConnections();
      renderTree();
    },
  });
  items.push({ label: t('ctx.query'), icon: 'code', action: () => import('./editor.js').then(m => m.openEditor({ connId: meta.id })) });
  items.push({ label: t('bk.title'), icon: 'backup', action: () => import('./importer.js').then(m => m.backupDialog(meta.id)) });
  items.push('-');
  items.push({
    label: t('conn.delete'), icon: 'trash', danger: true, action: async () => {
      if (!(await confirmBox(t('conn.delete'), t('conn.confirmDelete'), true))) return;
      await window.wjds.dbDisconnect(meta.id);
      await window.wjds.deleteConnection(meta.id);
      hooks.onConnectStatus(meta.id, null);
      await reloadConnections();
      renderTree();
    },
  });
  showContextMenu(e.clientX, e.clientY, items);
}

async function reloadConnections() {
  state.connections = await window.wjds.listConnections();
}

/* ============ database list ============ */
async function renderDbList(meta, cs, kids) {
  if (!cs.dbs) {
    try { cs.dbs = await window.wjds.listDatabases(meta.id); }
    catch (err) { kids.append(el('div', { class: 'trow ic-err' }, el('span', { class: 'tlabel', text: err.message }))); return; }
  }
  const curDb = state.currentDb.get(meta.id);
  for (const db of cs.dbs) {
    kids.append(renderDb(meta, cs, db, db.name === curDb));
  }
  // "new database" action row
  kids.append(el('div', {
    class: 'trow', style: { color: 'var(--text-faint)' },
    onclick: () => createDbDialog(meta, cs),
  }, ic('plus', 'ticon ic-dim'), el('span', { class: 'tlabel', text: t('tree.newdb') })));
}

function renderDb(meta, cs, db, isCurrent) {
  const expanded = (cs.expandedDbs ||= new Set()).has(db.name);
  const chev = el('span', { class: 'chev' + (expanded ? ' open' : ''), html: ic('chevron-right').innerHTML });
  const row = el('div', {
    class: 'trow' + (isCurrent ? ' selected' : ''),
    onmousedown: () => selectRow(row),
    onclick: (e) => {
      selectRow(row);
      hooks.onDbChange(meta.id, db.name);
      toggleDb(); // single click toggles expand/collapse (like DBeaver)
    },
    oncontextmenu: (e) => {
      e.preventDefault();
      showContextMenu(e.clientX, e.clientY, [
        { label: t('er.title'), icon: 'chart', action: () => import('./erdiagram.js').then(m => m.openERDiagram({ connId: meta.id, db: db.name })) },
        { label: t('ctx.query'), icon: 'code', action: () => import('./editor.js').then(m => m.openEditor({ connId: meta.id, db: db.name })) },
        { label: t('ctx.import'), icon: 'import', action: () => import('./importer.js').then(m => m.importDialog(meta.id, db.name)) },
        { label: t('ctx.export'), icon: 'export', action: () => import('./importer.js').then(m => m.backupDialog(meta.id, db.name)) },
        '-',
        { label: t('ctx.newtable'), icon: 'table', action: () => import('./designer.js').then(m => m.openDesigner({ connId: meta.id, db: db.name })) },
        {
          label: t('ctx.drop').replace('{type}', 'DB').replace('{name}', db.name), icon: 'trash', danger: true,
          action: async () => {
            if (!(await confirmBox(t('ctx.drop'), t('ctx.confirmDrop', { type: 'DATABASE', name: db.name }), true))) return;
            try {
              await window.wjds.dropObject({ connId: meta.id, type: 'database', name: db.name });
              cs.dbs = null; renderTree(); toast(t('ctx.dropped'), 'ok');
            } catch (err) { toast(t('msg.error'), 'err', err.message); }
          },
        },
      ]);
    },
  },
    chev,
    ic('database', 'ticon ic-db'),
    el('span', { class: 'tlabel', text: db.name }),
    el('span', { class: 'tbadge', text: db.tables }));

  const kids = el('div', { class: 'tkids', style: { display: expanded ? '' : 'none' } });
  if (expanded) fillDbChildren(meta, cs, db, kids);
  row._toggle = toggleDb;
  // Direct handler on the chevron: single click always toggles expand/collapse.
  chev.addEventListener('click', (e) => { e.stopPropagation(); toggleDb(); });

  async function toggleDb() {
    const set = (cs.expandedDbs ||= new Set());
    if (set.has(db.name)) { set.delete(db.name); kids.style.display = 'none'; row.querySelector('.chev').classList.remove('open'); }
    else {
      set.add(db.name);
      row.querySelector('.chev').classList.add('open');
      kids.style.display = '';
      if (!kids.dataset.filled) { fillDbChildren(meta, cs, db, kids); kids.dataset.filled = '1'; }
      else refreshDbChildren(meta, cs, db, kids);
    }
  }

  return el('div', { class: 'tnode' }, row, kids);
}

const OBJ_GROUPS = [
  ['tables', 'tree.tables', 'table', 'ic-tbl'],
  ['views', 'tree.views', 'view', 'ic-view'],
  ['procs', 'tree.procs', 'proc', 'ic-proc'],
  ['funcs', 'tree.funcs', 'proc', 'ic-proc'],
  ['triggers', 'tree.triggers', 'trigger', 'ic-warn'],
  ['events', 'tree.events', 'event', 'ic-acc'],
];

async function fillDbChildren(meta, cs, db, kids) {
  kids.innerHTML = '';
  for (const [attr, labelKey, icon, cls] of OBJ_GROUPS) {
    kids.append(await renderObjGroup(meta, cs, db, attr, labelKey, icon, cls));
  }
}

async function refreshDbChildren(meta, cs, db, kids) {
  await fillDbChildren(meta, cs, db, kids);
}

async function renderObjGroup(meta, cs, db, attr, labelKey, icon, cls) {
  const node = el('div', { class: 'tnode' });
  const groupRow = el('div', { class: 'trow', style: { color: 'var(--text-dim)' } },
    el('span', { class: 'chev leaf', html: ic('chevron-right').innerHTML }),
    ic(icon, 'ticon ' + cls),
    el('span', { class: 'tlabel', text: t(labelKey) }),
    el('span', { class: 'tbadge', text: db.tables != null && attr === 'tables' ? '' : '' }));
  const groupKids = el('div', { class: 'tkids', style: { display: 'none' } });
  let items = null;

  groupRow.addEventListener('click', async () => {
    const open = groupKids.style.display !== 'none';
    groupKids.style.display = open ? 'none' : '';
    groupRow.querySelector('.chev').classList.toggle('open', !open);
    groupRow.querySelector('.chev').classList.toggle('leaf', open);
    if (!open && !items) {
      try { items = await fetchGroup(); }
      catch (err) { toast(t('msg.error'), 'err', err.message); items = []; }
      groupKids.innerHTML = '';
      renderItems();
    }
  });

  async function fetchGroup() {
    switch (attr) {
      case 'tables': return (await window.wjds.listObjects(meta.id, db.name)).tables;
      case 'views': return (await window.wjds.listObjects(meta.id, db.name)).views;
      case 'procs': return (await window.wjds.listRoutines(meta.id, db.name)).filter(r => r.type === 'PROCEDURE');
      case 'funcs': return (await window.wjds.listRoutines(meta.id, db.name)).filter(r => r.type === 'FUNCTION');
      case 'triggers': return await window.wjds.listTriggers(meta.id, db.name);
      case 'events': return await window.wjds.listEvents(meta.id, db.name);
    }
    return [];
  }

  function renderItems() {
    const f = ($('#tree-filter')?.value || '').toLowerCase();
    for (const item of items) {
      const name = item.name;
      if (f && !name.toLowerCase().includes(f)) continue;
      const irow = el('div', {
        class: 'trow', onmousedown: () => selectRow(irow),
        oncontextmenu: (e) => { e.preventDefault(); itemMenu(e, meta, db, attr, item); },
        ondblclick: () => openItem(item),
      },
        el('span', { class: 'chev leaf', html: ic('chevron-right').innerHTML }),
        ic(icon, 'ticon ' + cls),
        el('span', { class: 'tlabel', text: name }),
        item.rows != null ? el('span', { class: 'tbadge', text: item.rows >= 0 ? item.rows : '' }) : null);
      irow.addEventListener('click', () => selectRow(irow));
      groupKids.append(irow);
    }
    if (!groupKids.children.length) {
      groupKids.append(el('div', { class: 'trow', style: { color: 'var(--text-faint)', cursor: 'default' } }, el('span', { class: 'tlabel', text: '—' })));
    }
  }

  function openItem(item) {
    if (attr === 'tables' || attr === 'views') {
      hooks.openTableData({ connId: meta.id, db: db.name, table: item.name, isView: attr === 'views' });
    } else if (attr === 'procs' || attr === 'funcs') {
      import('./editor.js').then(m => m.showRoutineDDL(meta.id, db.name, item.name, item.type));
    }
  }

  node.append(groupRow, groupKids);
  return node;
}

function itemMenu(e, meta, db, attr, item) {
  const items = [];
  if (attr === 'tables' || attr === 'views') {
    items.push({ label: t('ctx.selectdata'), icon: 'table', action: () => hooks.openTableData({ connId: meta.id, db: db.name, table: item.name }) });
    items.push({ label: t('ctx.altertable'), icon: 'edit', action: () => hooks.openDesigner({ connId: meta.id, db: db.name, table: item.name }) });
    items.push({ label: t('ctx.ddlview'), icon: 'code', action: () => showDDL(meta.id, db.name, item.name) });
    items.push({ label: t('ctx.rename'), icon: 'pencil', action: () => renameDialog(meta.id, db.name, item.name) });
    items.push('-');
    items.push({ label: t('ctx.import'), icon: 'import', action: () => import('./importer.js').then(m => m.importDialog(meta.id, db.name, item.name)) });
    items.push({ label: t('ctx.dumpdata'), icon: 'backup', action: () => import('./importer.js').then(m => m.backupDialog(meta.id, db.name, item.name)) });
    if (attr === 'tables') {
      items.push('-');
      items.push({
        label: t('ctx.truncate'), icon: 'warn', danger: true, action: async () => {
          if (!(await confirmBox(t('ctx.truncate'), t('ctx.confirmTrunc', { name: db.name + '.' + item.name }), true))) return;
          try { await window.wjds.truncateTable({ connId: meta.id, db: db.name, name: item.name }); toast(t('ctx.dropped'), 'ok'); }
          catch (err) { toast(t('msg.error'), 'err', err.message); }
        },
      });
    }
    items.push('-');
    items.push({
      label: t('ctx.drop'), icon: 'trash', danger: true, action: async () => {
        if (!(await confirmBox(t('ctx.drop'), t('ctx.confirmDrop', { type: attr === 'views' ? 'VIEW' : 'TABLE', name: item.name }), true))) return;
        try {
          await window.wjds.dropObject({ connId: meta.id, type: attr === 'views' ? 'view' : 'table', db: db.name, name: item.name });
          renderTree(); toast(t('ctx.dropped'), 'ok');
        } catch (err) { toast(t('msg.error'), 'err', err.message); }
      },
    });
  } else {
    items.push({ label: t('ctx.ddlview'), icon: 'code', action: () => showRoutineDDL(meta.id, db.name, item.name, item.type || 'PROCEDURE') });
    items.push({
      label: t('ctx.drop'), icon: 'trash', danger: true, action: async () => {
        const type = attr === 'procs' ? 'procedure' : attr === 'funcs' ? 'function' : attr === 'triggers' ? 'trigger' : 'event';
        if (!(await confirmBox(t('ctx.drop'), t('ctx.confirmDrop', { type: type.toUpperCase(), name: item.name }), true))) return;
        try {
          await window.wjds.dropObject({ connId: meta.id, type, db: db.name, name: item.name });
          renderTree(); toast(t('ctx.dropped'), 'ok');
        } catch (err) { toast(t('msg.error'), 'err', err.message); }
      },
    });
  }
  showContextMenu(e.clientX, e.clientY, items);
}

export async function showDDL(connId, db, table) {
  const { showModal } = await import('./utils.js');
  try {
    const ddl = await window.wjds.tableDDL(connId, db, table);
    const body = el('div', { class: 'ddl-wrap' },
      el('div', { class: 'ddl-code', text: ddl || '--' }),
      el('div', { style: { display: 'flex', gap: '8px', justifyContent: 'flex-end' } },
        el('button', { class: 'btn', onclick: async () => { await navigator.clipboard.writeText(ddl); toast(t('msg.copied'), 'ok'); } }, ic('copy'), 'Copy')));
    showModal({ title: `${db}.${table}`, icon: 'code', body, width: '760px' });
  } catch (err) { toast(t('msg.error'), 'err', err.message); }
}

export async function renameDialog(connId, db, oldName) {
  const { showModal, toast: t2 } = await import('./utils.js');
  const inp = el('input', { type: 'text', value: oldName });
  const r = showModal({
    title: t('ctx.rename'), icon: 'pencil', width: '420px',
    body: el('div', { class: 'form' }, el('div', { class: 'form-row' }, el('label', { text: t('ds.tablename') }), inp)),
    footer: [
      el('button', { class: 'btn', onclick: () => r.close(), text: t('conn.cancel') }),
      el('button', { class: 'btn primary', onclick: async () => {
        const newName = inp.value.trim();
        if (!newName || newName === oldName) return;
        try {
          await window.wjds.renameObject({ connId, db, table: oldName, newName });
          toast('✓ ' + oldName + ' → ' + newName, 'ok');
          r.close();
          renderTree();
        } catch (err) { t2(t('msg.error'), 'err', err.message); }
      } }, ic('ok'), el('span', { text: t('conn.save') })),
    ],
  });
  setTimeout(() => inp.focus(), 60);
}

function createDbDialog(meta, cs) {
  import('./connections.js').then(m => m.createDatabaseDialog(meta, () => { cs.dbs = null; renderTree(); }));
}

/* re-export for keyboard shortcut refresh (F5 keeps expanded db fresh) */
export { fillDbChildren as _fillDbChildren };
