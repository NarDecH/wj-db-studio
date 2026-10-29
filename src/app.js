/**
 * WJ DB Studio — application shell: toolbar, tabs, panels, routing.
 * (c) 2026 Weeradech Jessadarom — MIT
 */
import { $, $$, el, ic, toast, initTooltips, debounce, nowStamp } from './utils.js';
import { decorateIcons } from './icons.js';
import { setLanguage, applyI18n, t } from './i18n.js';
import { state, loadSettings, saveSettings, loadConnections, connMeta, current } from './state.js';
import { initTree, refreshTree } from './tree.js';
import { openConnectionDialog, manageConnections, disconnectAll } from './connections.js';
import { renderHome } from './home.js';
import { openEditor, execActiveEditor } from './editor.js';
import { openTableData } from './grid.js';
import { openDesigner } from './designer.js';
import { importDialog, exportDialog, backupDialog, exportActive } from './importer.js';
import { openServerDashboard, openProcessList, openUsers } from './servertools.js';
import { showSettings, showAbout, showShortcuts } from './settings.js';
import { initHelp, toggleHelp, showHelp } from './help.js';
import { initUpdateBadge } from './updaterui.js';
import { initSqlLogUI, renderSqlLog } from './sqllogui.js';

export let version = '1.0.0';

/* ==================== tabs ==================== */
const tabs = new Map();
let tabSeq = 0;
let activeTabId = null;

export function openTab(def) {
  // focus existing similar tab (same type + key payload)
  const key = def.key || def.type;
  for (const [id, tab] of tabs) {
    if (tab.key === key) { activateTab(id); return tab; }
  }
  const id = 'tab_' + (++tabSeq);
  const viewEl = el('div', { class: 'view' });
  const tab = {
    id, type: def.type, key, payload: def.payload || {}, viewEl,
    title: def.title,
    setTitle: (s) => { labelEl.textContent = s; tab.title = s; },
    setTitleNode: (node) => { labelEl.innerHTML = ''; labelEl.append(node); },
  };
  const closeBtn = el('button', { class: 'tclose', html: ic('x').innerHTML, title: t('menu.closeTab') });
  closeBtn.addEventListener('mousedown', (e) => e.stopPropagation());
  closeBtn.addEventListener('click', (e) => { e.stopPropagation(); closeTab(id); });
  const labelEl = el('span', { class: 'tlabel', text: def.title });
  const tabBtn = el('div', { class: 'tab', role: 'tab' },
    ic(def.icon || 'doc', 'ticon'), labelEl, closeBtn);
  tabBtn.addEventListener('mousedown', () => activateTab(id));
  tabBtn.addEventListener('dblclick', () => {});
  tab.btn = tabBtn;

  $('#tabbar').append(tabBtn);
  $('#views').append(viewEl);
  tabs.set(id, tab);
  activateTab(id);
  def.render && def.render(tab, viewEl);
  scheduleSaveSession();
  return tab;
}

export function activateTab(id) {
  const tab = tabs.get(id);
  if (!tab) return;
  activeTabId = id;
  for (const [tid, t2] of tabs) {
    t2.btn.classList.toggle('active', tid === id);
    t2.viewEl.classList.toggle('active', tid === id);
  }
  if (tab.onActivate) tab.onActivate();
}

export function closeTab(id) {
  const tab = tabs.get(id);
  if (!tab) return;
  if (tab.onClose && tab.onClose() === false) return;
  tab.viewEl.remove();
  tab.btn.remove();
  tabs.delete(id);
  scheduleSaveSession();
  if (activeTabId === id) {
    const last = [...tabs.keys()].pop();
    if (last) activateTab(last);
    else openHome();
  }
}

export function activeTab() { return tabs.get(activeTabId) || null; }

/* ==================== session restore ==================== */
const saveSessionDebounced = debounce(() => {
  const list = [];
  for (const [, t2] of tabs) {
    if (t2.type === 'query') list.push({ type: 'query', title: t2.title, sql: (t2.payload.getSQL ? t2.payload.getSQL() : '') });
    else if (t2.type === 'data') list.push({ type: 'data', connId: t2.payload.connId, db: t2.payload.db, table: t2.payload.table, isView: !!t2.payload.isView });
    else if (['server', 'users', 'procs', 'vars'].includes(t2.type)) list.push({ type: t2.type, connId: t2.payload.connId });
  }
  window.wjds.saveSession({ tabs: list }).catch(() => {});
}, 900);
function scheduleSaveSession() { saveSessionDebounced(); }

async function restoreSession() {
  try {
    const sess = await window.wjds.getSession();
    const saved = sess.tabs || [];
    if (!saved.length) return;
    // auto-reconnect the most recent connection in the session
    const withConn = saved.find(x => x.connId);
    if (withConn && connMeta(withConn.connId)) {
      const res = await window.wjds.dbConnect(withConn.connId);
      if (res.ok) {
        state.active.set(withConn.connId, { meta: connMeta(withConn.connId), info: res.info });
        state.currentConnId = withConn.connId;
        setStatusConn(t('st.ready') + ' · ' + connMeta(withConn.connId).name, 'on');
        setStatusServer(res.info);
      }
    }
    for (const s of saved.slice(0, 12)) {
      try {
        if (s.type === 'query') {
          const tab = openEditor({ connId: s.connId || state.currentConnId, db: s.db });
          if (tab && s.sql) setTimeout(() => { tab.payload.setSQL(s.sql); }, 300);
        } else if (s.type === 'data' && s.connId) {
          openTableData({ connId: s.connId, db: s.db, table: s.table, isView: s.isView });
        } else if (s.type === 'server' && s.connId) openServerDashboard();
        else if (s.type === 'users' && s.connId) openUsers();
      } catch { /* skip bad entries */ }
    }
    if (saved.some(x => x.type !== 'home')) logMessage(`↺ ${t('menu.sessionrestored') || ''} (${saved.length})`.trim());
  } catch { /* ignore */ }
}

export function openHome() {
  const tab = openTab({
    type: 'home', key: 'home', title: t('tb.home'), icon: 'home',
    render: (tab, view) => renderHome(view),
  });
  return tab;
}

function refreshActive() {
  const tab = activeTab();
  if (!tab) return;
  if (tab.onRefresh) tab.onRefresh();
  else if (tab.type === 'home') renderHome(tab.viewEl);
  else refreshTree();
}

/* ==================== status bar ==================== */
export function setStatusConn(text, cls = '') {
  const dot = $('#st-conn .st-dot');
  dot.className = 'st-dot ' + (cls || 'off');
  $('#st-conn span:last-child').textContent = text;
}
export function setStatusServer(info) {
  $('#st-server').textContent = info ? `${info.label || info.flavor} ${info.version}` : '';
}
export function setStatusDb(db) { $('#st-db').textContent = db ? '🗄 ' + db : ''; }
export function setStatusTime(ms) { $('#st-time').textContent = ms != null ? `${ms} ms` : ''; }

/* ==================== messages panel ==================== */
export function logMessage(text, cls = 'dim') {
  const pane = $('#bp-messages');
  const time = new Date().toLocaleTimeString('en-GB', { hour12: false });
  pane.append(el('div', { class: 'msg-line ' + cls, text: `[${time}] ${text}` }));
  pane.scrollTop = pane.scrollHeight;
  while (pane.children.length > 500) pane.firstChild.remove();
}
export function logResult(text, ok = true, hint = null) {
  const pane = $('#bp-messages');
  const time = new Date().toLocaleTimeString('en-GB', { hour12: false });
  const line = el('div', { class: 'msg-line ' + (ok ? 'ok' : 'err'), style: { userSelect: 'text' } },
    `[${time}] `, el('span', { text }), hint ? el('div', { class: 'hint', style: { color: 'var(--text-dim)', whiteSpace: 'pre-line', paddingLeft: '44px' }, text: '💡 ' + hint }) : null);
  pane.append(line);
  pane.scrollTop = pane.scrollHeight;
}

/* ==================== bottom panel ==================== */
function initBottomPanel() {
  $$('.bp-tab').forEach(b => b.addEventListener('click', () => {
    $$('.bp-tab').forEach(x => x.classList.remove('active'));
    b.classList.add('active');
    $$('.bp-pane').forEach(p => p.classList.remove('active'));
    $('#bp-' + b.dataset.bp).classList.add('active');
    if (b.dataset.bp === 'history') renderHistory();
    if (b.dataset.bp === 'snippets') renderSnippets();
    if (b.dataset.bp === 'sqllog') renderSqlLog();
  }));
  $('#bp-toggle').addEventListener('click', () => {
    const bp = $('#bottompanel');
    bp.classList.toggle('collapsed');
    $('#bp-toggle').innerHTML = ic(bp.classList.contains('collapsed') ? 'chevron' : 'chevron-down').innerHTML;
  });
  $('#history-clear').addEventListener('click', async () => { await window.wjds.clearHistory(); renderHistory(); });
  $('#snippet-add').addEventListener('click', () => {
    const ed = activeTab();
    const sql = ed && ed.type === 'query' ? ed.payload.getSQL() : '';
    import('./editor.js').then(m => m.snippetDialog({ sql, onSaved: renderSnippets }));
  });
}

export async function renderHistory() {
  const list = $('#history-list');
  list.innerHTML = '';
  const items = await window.wjds.getHistory();
  if (!items.length) { list.append(el('div', { class: 'bp-item', text: t('hist.empty') })); return; }
  for (const h of items.slice(0, 120)) {
    const one = (h.sql || '').replace(/\s+/g, ' ').slice(0, 110);
    list.append(el('div', {
      class: 'bp-item', title: t('hist.copy'),
      onclick: async () => {
        const tab = activeTab();
        if (tab && tab.type === 'query') tab.payload.setSQL(h.sql);
        await copyToClipboard(h.sql);
      },
    },
      el('span', { class: h.ok ? 'ok' : 'err', text: h.ok ? '✓ ' : '✗ ' }),
      el('span', { text: one }),
      el('span', { class: 'muted', text: `  ${h.ms || ''}ms ${(h.database || '') ? '· ' + h.database : ''}` })));
  }
}
async function copyToClipboard(text) {
  try { await navigator.clipboard.writeText(text); } catch {}
}

export function renderSnippets() {
  import('./editor.js').then(m => m.renderSnippetsList());
}

/* ==================== splitters ==================== */
function initSplitters() {
  const side = $('#sidebar');
  let dragging = false;
  $('#splitter').addEventListener('mousedown', (e) => { dragging = true; document.body.style.cursor = 'col-resize'; e.preventDefault(); });
  window.addEventListener('mousemove', (e) => {
    if (!dragging) return;
    const w = Math.max(180, Math.min(e.clientX, window.innerWidth * 0.46));
    side.style.width = w + 'px';
  });
  window.addEventListener('mouseup', () => { dragging = false; document.body.style.cursor = ''; });
}

/* ==================== toolbar ==================== */
function initToolbar() {
  $('#tb-home').addEventListener('click', openHome);
  $('#tb-newconn').addEventListener('click', () => openConnectionDialog({ onSaved: refreshTree }));
  $('#tb-newquery').addEventListener('click', () => openEditor());
  $('#tb-import').addEventListener('click', () => importDialog());
  $('#tb-export').addEventListener('click', () => exportActive());
  $('#tb-backup').addEventListener('click', () => backupDialog());
  $('#tb-find').addEventListener('click', () => import('./finddb.js').then(m => m.findDialog()));
  $('#tb-server').addEventListener('click', () => openServerDashboard());
  $('#tb-users').addEventListener('click', () => openUsers());
  $('#tb-help').addEventListener('click', () => toggleHelp());
  $('#tb-settings').addEventListener('click', () => showSettings(applyAll));
  $('#tb-theme').addEventListener('click', async () => {
    const next = state.settings.theme === 'light' ? 'dark' : 'light';
    await saveSettings({ theme: next });
    applySettings();
    $('#tb-theme').querySelector('.tb-ic').innerHTML = ic(next === 'light' ? 'sun' : 'moon').innerHTML;
  });
  $('#conn-add').addEventListener('click', () => openConnectionDialog({ onSaved: refreshTree }));
  $('#tree-refresh').addEventListener('click', () => refreshTree(true));
  $('#tree-filter').addEventListener('input', debounce(() => refreshTree(false, $('#tree-filter').value), 250));
}

/* ==================== keyboard ==================== */
function initKeys() {
  window.addEventListener('keydown', (e) => {
    if (e.key === 'F1') { e.preventDefault(); toggleHelp(); }
    else if (e.key === 'F5' && !e.ctrlKey) { e.preventDefault(); refreshActive(); }
    else if (e.ctrlKey && !e.shiftKey && e.key === 'Enter') { /* editor handles */ }
    else if (e.ctrlKey && e.key === 't' && !e.shiftKey) { e.preventDefault(); openEditor(); }
    else if (e.ctrlKey && e.key === 'w') { e.preventDefault(); if (activeTabId) closeTab(activeTabId); }
    else if (e.ctrlKey && e.key === ',') { e.preventDefault(); showSettings(applyAll); }
    else if (e.ctrlKey && e.key === '/') { e.preventDefault(); showShortcuts(); }
  });
}

/* ==================== menu actions ==================== */
function initMenuActions() {
  window.wjds.onMenuAction(async (action) => {
    switch (action) {
      case 'new-connection': openConnectionDialog({ onSaved: refreshTree }); break;
      case 'manage-connections': manageConnections(); break;
      case 'new-query': openEditor(); break;
      case 'close-tab': if (activeTabId) closeTab(activeTabId); break;
      case 'home': openHome(); break;
      case 'refresh': refreshActive(); break;
      case 'import': importDialog(); break;
      case 'export': exportActive(); break;
      case 'backup': backupDialog(); break;
      case 'execute': execActiveEditor(false); break;
      case 'execute-selection': execActiveEditor(true); break;
      case 'server-dashboard': openServerDashboard(); break;
      case 'process-list': openProcessList(); break;
      case 'user-manager': openUsers(); break;
      case 'settings': showSettings(applyAll); break;
      case 'help': showHelp(); break;
      case 'shortcuts': showShortcuts(); break;
      case 'about': showAbout(version); break;
      case 'check-updates': import('./updaterui.js').then(m => m.checkUpdatesFlow()); break;
      case 'open-sqllog': import('./sqllogui.js').then(m => { m.renderSqlLog(); document.querySelector('[data-bp="sqllog"]')?.click(); }); break;
      case 'transfer': import('./transfer.js').then(m => m.transferDialog()); break;
      case 'schema-compare': import('./schemacompare.js').then(m => m.compareDialog()); break;
      case 'export-connections': import('./connections.js').then(m => m.exportConnections()); break;
      case 'import-connections': import('./connections.js').then(m => m.importConnections()); break;
      case 'mock-data': import('./mockdata.js').then(m => m.mockDialog()); break;
      case 'connect-active': {
        const meta = connMeta(state.currentConnId);
        if (meta) await window.wjds.dbConnect(meta.id);
        break;
      }
    }
  });
}

/* ==================== theme / fonts / language ==================== */
export function applySettings() {
  const s = state.settings;
  document.documentElement.dataset.theme = s.theme === 'light' ? 'light' : 'dark';
  window.wjds.setThemeSource(s.theme);
  document.body.style.fontSize = s.fontSize + 'px';
  document.documentElement.style.setProperty('--edfs', s.editorFontSize + 'px');
  setLanguage(s.language);
  applyI18n();
  const themeIc = $('#tb-theme .tb-ic');
  if (themeIc) themeIc.innerHTML = ic(s.theme === 'light' ? 'sun' : 'moon').innerHTML;
}

async function applyAll() {
  applySettings();
  refreshTree(true);
}

/* ==================== boot ==================== */
async function boot() {
  version = await window.wjds.appVersion();
  await loadSettings();
  await loadConnections();
  applySettings();
  decorateIcons();
  initTooltips();
  initToolbar();
  initSplitters();
  initBottomPanel();
  initKeys();
  initMenuActions();
  initHelp();
  initSqlLogUI();
  initUpdateBadge();
  window.wjds.onDbEvent(async (payload) => {
    if (payload.type === 'lost') {
      const meta = connMeta(payload.connId);
      toast(t('msg.connlost', { name: meta ? meta.name : payload.connId }), 'err');
      logResult('✗ ' + t('msg.connlost', { name: meta ? meta.name : payload.connId }), false);
      window.dispatchEvent(new CustomEvent('db-lost', { detail: { connId: payload.connId } }));
    }
  });
  initTree({
    onConnectStatus: (id, info) => {
      const meta = connMeta(id);
      if (info) {
        state.active.set(id, { meta, info });
        state.currentConnId = id;
        setStatusConn(t('st.ready') + ' · ' + (meta ? meta.name : ''), 'on');
        setStatusServer(info);
      } else {
        state.active.delete(id);
        if (state.currentConnId === id) {
          state.currentConnId = null;
          setStatusConn(t('st.notconnected'));
          setStatusServer(null);
          setStatusDb(null);
        }
      }
    },
    onDbChange: (id, db) => {
      state.currentDb.set(id, db);
      if (id === state.currentConnId) setStatusDb(db);
    },
    openTableData, openDesigner, openEditor, openServerDashboard,
  });

  openHome();
  setStatusConn(t('st.notconnected'));
  $('#st-version').textContent = 'WJ DB Studio v' + version;

  // First run: welcome tour (automatic help)
  if (state.settings.tourDone === false) {
    import('./help.js').then(m => m.showTour());
  } else {
    restoreSession(); // reopen last tabs + connection
  }

  logMessage('WJ DB Studio v' + version + ' — © 2026 Weeradech Jessadarom');
}

window.addEventListener('DOMContentLoaded', boot);
