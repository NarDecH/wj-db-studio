/**
 * WJ DB Studio — mock data generator (fills a table by column-type heuristics).
 * (c) 2026 Weeradech Jessadarom — MIT
 */
import { el, ic, toast, showModal } from './utils.js';
import { t } from './i18n.js';
import { requireConn, currentDb } from './state.js';

const FIRST = ['Somchai', 'Somying', 'Malee', 'John', 'Anna', 'Peter', 'Somjai', 'Krit', 'Mary', 'Weeradech'];
const LAST = ['Jaidee', 'Smith', 'Rakthai', 'Brown', 'Suwan', 'Lee', 'Parker', 'Nakorn'];
const CITY = ['Bangkok', 'Chiang Mai', 'Phuket', 'New York', 'London', 'Tokyo', 'Khon Kaen', 'Paris'];
const WORDS = 'lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore'.split(' ');

function rand(a) { return a[Math.floor(Math.random() * a.length)]; }
function pickWord(n) { let s = []; for (let i = 0; i < n; i++) s.push(rand(WORDS)); return s.join(' '); }

function genFor(col) {
  const name = col.name.toLowerCase();
  const type = String(col.type || '').toUpperCase();
  const em = /EMAIL/.test(name);
  if (/^ENUM\(/.test(type)) {
    const opts = (type.match(/'((?:[^'\\]|\\.)*)'/g) || []).map(s => s.slice(1, -1));
    return opts.length ? rand(opts) : null;
  }
  if (/^(TINY|SMALL|MEDIUM)?INT/.test(type) || /^BIGINT/.test(type) || /BOOL/i.test(type)) {
    return Math.floor(Math.random() * 10000);
  }
  if (/^DEC|^NUM|^FIX/.test(type) || /^FLOAT|^DOUBLE|^REAL/.test(type)) {
    return +(Math.random() * 10000).toFixed(2);
  }
  if (/^DATE$/.test(type)) return `20${20 + Math.floor(Math.random() * 7)}-${String(1 + Math.floor(Math.random() * 12)).padStart(2, '0')}-${String(1 + Math.floor(Math.random() * 28)).padStart(2, '0')}`;
  if (/^DATETIME|^TIMESTAMP/.test(type)) return `20${20 + Math.floor(Math.random() * 7)}-${String(1 + Math.floor(Math.random() * 12)).padStart(2, '0')}-${String(1 + Math.floor(Math.random() * 28)).padStart(2, '0')} ${String(Math.floor(Math.random() * 24)).padStart(2, '0')}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}:00`;
  if (/CHAR|TEXT|STRING/i.test(type)) {
    if (em) return rand(FIRST).toLowerCase() + Math.floor(Math.random() * 999) + '@example.com';
    if (/NAME/.test(name)) return rand(FIRST) + ' ' + rand(LAST);
    if (/CITY|PROVINCE/.test(name)) return rand(CITY);
    if (/PHONE|TEL/.test(name)) return '08' + String(Math.floor(Math.random() * 100000000)).padStart(8, '0');
    if (/URL|LINK/.test(name)) return 'https://example.com/' + rand(WORDS);
    const size = type.match(/VARCHAR\((\d+)\)/);
    const max = size ? Math.min(parseInt(size[1], 10), 60) : 60;
    return pickWord(2 + Math.floor(Math.random() * 5)).slice(0, max);
  }
  return null;
}

export function mockDialog() {
  let conn;
  try { conn = requireConn(); } catch { return; }
  const cid = conn.id;
  const dbIn = el('input', { type: 'text', value: currentDb(cid) || '' });
  const tableIn = el('input', { type: 'text', placeholder: 'table_name' });
  const rowsIn = el('input', { type: 'number', value: 100, min: '1', max: '100000' });
  const truncChk = el('input', { type: 'checkbox' });
  const progress = el('div', { class: 'res-msg', style: { display: 'none' } });

  const r = showModal({
    title: t('mock.title'), icon: 'wand', width: '560px',
    body: el('div', { class: 'form' },
      el('div', { class: 'form-grid2' },
        el('div', {}, fieldLabel(t('bk.db')), dbIn),
        el('div', {}, fieldLabel(t('imp.target')), tableIn)),
      el('div', { class: 'form-grid2' },
        el('div', {}, fieldLabel(t('mock.rows')), rowsIn),
        el('div', { style: { display: 'flex', alignItems: 'end' } }, el('label', { class: 'check' }, truncChk, el('span', { text: t('imp.truncate') })))),
      el('div', { class: 'res-msg', text: t('mock.hint') }),
      progress),
    footer: [
      el('button', { class: 'btn', onclick: () => r.close(), text: t('conn.cancel') }),
      el('button', { class: 'btn primary', onclick: run }, ic('wand'), el('span', { text: t('mock.run') })),
    ],
  });

  async function run() {
    const db = dbIn.value.trim(), table = tableIn.value.trim(), n = parseInt(rowsIn.value, 10) || 100;
    if (!db || !table) { toast(t('msg.error'), 'err', 'กรอก database/ตาราง'); return; }
    progress.style.display = '';
    progress.textContent = '⏳ ' + t('msg.running');
    try {
      const out = await window.wjds.mockFillTable({ connId: cid, db, table, rows: n, truncateFirst: truncChk.checked });
      progress.textContent = `✓ ${t('mock.done', { n: out.count })}`;
      toast(t('mock.done', { n: out.count }), 'ok');
    } catch (err) {
      progress.textContent = '✗ ' + err.message;
      toast(t('msg.error'), 'err', err.message);
    }
  }
}

function fieldLabel(text) {
  return el('label', { style: { display: 'block', color: 'var(--text-dim)', fontSize: '11.5px', margin: '0 0 3px 2px' }, text });
}
