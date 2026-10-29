/**
 * WJ DB Studio — SQL Log viewer (bottom panel).
 * Shows every statement executed through the app (from the local daily log files).
 * (c) 2026 Weeradech Jessadarom — MIT
 */
import { $, el, ic, toast, copyText } from './utils.js';
import { t } from './i18n.js';

const TYPE_ICON = { query: 'sql', exec: 'bolt', io: 'import', connect: 'connect', disconnect: 'disconnect' };
const TYPE_CLS = { query: 'ic-acc', exec: 'ic-proc', io: 'ic-dim', connect: 'ic-ok', disconnect: 'ic-dim' };

export async function renderSqlLog() {
  const list = $('#sqllog-list');
  if (!list) return;
  const filter = ($('#sqllog-filter')?.value || '').toLowerCase();
  const onlyErr = $('#sqllog-onlyerr')?.checked;

  const { file, entries } = await window.wjds.sqllogRead(400);
  list.innerHTML = '';

  const head = el('div', { class: 'muted', style: { fontSize: '11px', padding: '2px 8px 6px' }, text: file ? '📄 ' + file : '' });
  list.append(head);

  const shown = entries.filter(e => {
    if (onlyErr && e.ok !== false) return false;
    if (!filter) return true;
    const hay = `${e.sql} ${e.conn || ''} ${e.db || ''} ${e.type}`.toLowerCase();
    return hay.includes(filter);
  });

  if (!shown.length) {
    list.append(el('div', { class: 'bp-item', text: t('sqllog.empty') }));
    return;
  }

  for (const e of shown) {
    const okCls = e.ok ? 'ok' : 'err';
    const one = (e.sql || '').replace(/\s+/g, ' ');
    const time = (e.ts || '').slice(11, 23);
    const row = el('div', {
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
    list.append(row);
  }
}

export function initSqlLogUI() {
  $('#sqllog-refresh')?.addEventListener('click', renderSqlLog);
  $('#sqllog-folder')?.addEventListener('click', () => window.wjds.sqllogOpenFolder());
  $('#sqllog-filter')?.addEventListener('input', () => renderSqlLog());
  $('#sqllog-onlyerr')?.addEventListener('change', () => renderSqlLog());
}
