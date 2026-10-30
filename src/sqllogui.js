/**
 * WJ DB Studio — SQL Log viewer (bottom panel) with REAL-TIME live tail.
 * Every executed statement is pushed from the main process the moment it runs.
 * (c) 2026 Weeradech Jessadarom — MIT
 */
import { $, el, ic, toast, copyText, debounce } from './utils.js';
import { t } from './i18n.js';

const TYPE_ICON = { query: 'sql', exec: 'bolt', io: 'import', connect: 'connect', disconnect: 'disconnect' };
const TYPE_CLS = { query: 'ic-acc', exec: 'ic-proc', io: 'ic-dim', connect: 'ic-ok', disconnect: 'ic-dim' };

const live = [];                 // entries captured this session (newest first)
let sessionStart = null;         // dedupe boundary vs file entries
let pendingLive = 0;             // entries not yet painted

function makeRow(e) {
  const okCls = e.ok ? 'ok' : 'err';
  const one = (e.sql || '').replace(/\s+/g, ' ');
  const time = (e.ts || '').slice(11, 23);
  return el('div', {
    class: 'bp-item',
    title: one,
    onclick: () => { copyText(e.sql || '').then(() => toast(t('msg.copied'), 'ok', null, 1200)); },
  },
    el('span', { class: 'muted', text: time + ' ' }),
    ic(TYPE_ICON[e.type] || 'sql', 'ticon ' + (TYPE_CLS[e.type] || '')),
    el('span', { text: ' ' + (e.conn || '?') + (e.db ? ` · ${e.db}` : '') + '  ' }),
    el('span', { class: okCls, text: one.slice(0, 130) + (one.length > 130 ? '…' : '') }),
    el('span', { class: 'muted', text: `  ${e.rows != null ? e.rows + 'r' : ''}${e.ms != null ? ' · ' + e.ms + 'ms' : ''}` }),
    e.ok === false && e.error ? el('div', { class: 'err', style: { paddingLeft: '70px', fontSize: '11px' }, text: '↳ ' + e.error }) : null);
}

function matchFilter(e) {
  const filter = ($('#sqllog-filter')?.value || '').toLowerCase();
  const onlyErr = $('#sqllog-onlyerr')?.checked;
  if (onlyErr && e.ok !== false) return false;
  if (!filter) return true;
  return `${e.sql || ''} ${e.conn || ''} ${e.db || ''} ${e.type}`.toLowerCase().includes(filter);
}

export async function renderSqlLog() {
  const list = $('#sqllog-list');
  if (!list) return;
  const { file, entries } = await window.wjds.sqllogRead(400);
  list.innerHTML = '';

  const badge = el('span', {
    class: 'muted', style: { fontSize: '11px', color: 'var(--ok)', fontWeight: '700' },
    text: '● LIVE ' + live.length + (file ? '  ·  📄 ' + file : ''),
  });
  list.append(el('div', { style: { display: 'flex', gap: '10px', alignItems: 'center', padding: '2px 8px 6px' } }, badge));

  let shown = 0;
  for (const e of live) {           // real-time entries first
    if (!matchFilter(e)) continue;
    list.append(makeRow(e)); shown++;
  }
  for (const e of entries) {        // older file entries (skip ones already shown live)
    if (sessionStart && e.ts >= sessionStart) continue;
    if (!matchFilter(e)) continue;
    list.append(makeRow(e)); shown++;
  }
  if (!shown) list.append(el('div', { class: 'bp-item', text: t('sqllog.empty') }));
}

const repaintSoon = debounce(() => { renderSqlLog(); pendingLive = 0; }, 250);

function onLiveEntry(e) {
  if (!sessionStart) sessionStart = e.ts || new Date().toISOString();
  live.unshift(e);
  if (live.length > 200) live.pop();
  pendingLive++;
  const paneVisible = document.querySelector('[data-bp="sqllog"]')?.classList.contains('active');
  const list = $('#sqllog-list');
  if (paneVisible && list && matchFilter(e)) {
    // true real-time: prepend the row instantly
    list.insertBefore(makeRow(e), list.children[1] || null);
    pendingLive++;
    const badgeEl = list.querySelector('span');
    if (badgeEl) badgeEl.textContent = '● LIVE ' + live.length + (pendingLive > 1 ? '  (+' + pendingLive + ')' : '');
  } else {
    repaintSoon();
  }
}

export function initSqlLogUI() {
  $('#sqllog-refresh')?.addEventListener('click', () => { renderSqlLog(); });
  $('#sqllog-folder')?.addEventListener('click', () => window.wjds.sqllogOpenFolder());
  $('#sqllog-filter')?.addEventListener('input', () => renderSqlLog());
  $('#sqllog-onlyerr')?.addEventListener('change', () => renderSqlLog());
  sessionStart = new Date().toISOString();
  window.wjds.onSqlEntry(onLiveEntry);
}
