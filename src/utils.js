/**
 * WJ DB Studio — shared utilities.
 * (c) 2026 Weeradech Jessadarom — MIT
 */
import { ICONS, iconHTML } from './icons.js';

export { iconHTML };

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

export function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') node.className = v;
    else if (k === 'html') node.innerHTML = v;
    else if (k === 'text') node.textContent = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(node.style, v);
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2).toLowerCase(), v);
    else if (v !== null && v !== undefined && v !== false) node.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat()) {
    if (c === null || c === undefined || c === false) continue;
    node.append(c.nodeType ? c : document.createTextNode(String(c)));
  }
  return node;
}

export function ic(name, cls = '') {
  const span = el('span', { class: cls, html: ICONS[name] || ICONS.dot });
  return span;
}

export function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function fmtBytes(n) {
  if (n === null || n === undefined || isNaN(n)) return '—';
  const u = ['B', 'KB', 'MB', 'GB', 'TB'];
  let i = 0, v = Number(n);
  while (v >= 1024 && i < u.length - 1) { v /= 1024; i++; }
  return (i === 0 ? v : v.toFixed(1)) + ' ' + u[i];
}

export function fmtNum(n) {
  if (n === null || n === undefined || isNaN(n)) return '—';
  return Number(n).toLocaleString('en-US');
}

export function fmtUptime(sec) {
  sec = parseInt(sec, 10) || 0;
  const d = Math.floor(sec / 86400), h = Math.floor((sec % 86400) / 3600), m = Math.floor((sec % 3600) / 60);
  if (d) return `${d}d ${h}h ${m}m`;
  if (h) return `${h}h ${m}m`;
  return `${m}m ${sec % 60}s`;
}

export function debounce(fn, ms) {
  let h;
  return (...a) => { clearTimeout(h); h = setTimeout(() => fn(...a), ms); };
}

// ---------- toasts ----------
export function toast(msg, type = 'info', hint = null, ms = 3800) {
  const box = $('#toasts');
  const icon = type === 'ok' ? 'ok' : type === 'err' ? 'error' : 'info';
  const t = el('div', { class: 'toast ' + type },
    ic(icon, 'ticon'),
    el('div', {}, el('div', { text: msg }), hint ? el('div', { class: 'hint', text: hint }) : null));
  box.append(t);
  setTimeout(() => { t.style.opacity = '0'; t.style.transition = 'opacity .3s'; setTimeout(() => t.remove(), 320); }, ms);
  return t;
}

// ---------- modal ----------
export function showModal({ title, icon = 'doc', body, footer, width }) {
  const root = $('#modal-root');
  const back = el('div', { class: 'modal-backdrop' });
  const m = el('div', { class: 'modal', style: width ? { width } : {} },
    el('div', { class: 'modal-head' }, ic(icon, 'micon'), el('span', { text: title }),
      el('button', { class: 'mini-btn icon-only mclose', onclick: close, html: ICONS.x })),
    body ? el('div', { class: 'modal-body' }, body) : null,
    footer ? el('div', { class: 'modal-foot' }, footer) : null);
  back.append(m);
  back.addEventListener('mousedown', (e) => { if (e.target === back) close(); });
  root.append(back);
  function close() { back.remove(); }
  return { close, modal: m };
}

// ---------- confirm ----------
export async function confirmBox(title, message, danger = false) {
  return new Promise((resolve) => {
    const foot = [
      el('button', { class: 'btn', onclick: () => { r.close(); resolve(false); }, text: '✕' }),
      el('button', { class: 'btn ' + (danger ? 'danger' : 'primary'), onclick: () => { r.close(); resolve(true); }, text: '✓' }),
    ];
    const r = showModal({ title, icon: danger ? 'warn' : 'help', body: el('div', { text: message, style: { whiteSpace: 'pre-line', lineHeight: '1.7' } }), footer: foot });
  });
}

// ---------- context menu ----------
export function showContextMenu(x, y, items) {
  closeContextMenu();
  const root = $('#ctx-root');
  const menu = el('div', { class: 'ctx' });
  for (const it of items) {
    if (!it) continue;
    if (it === '-') { menu.append(el('div', { class: 'ctx-sep' })); continue; }
    menu.append(el('button', {
      class: 'ctx-item' + (it.danger ? ' danger' : ''),
      onclick: () => { closeContextMenu(); it.action && it.action(); },
    }, it.icon ? ic(it.icon, 'ticon') : null, el('span', { text: it.label })));
  }
  root.append(menu);
  const r = menu.getBoundingClientRect();
  menu.style.left = Math.min(x, window.innerWidth - r.width - 8) + 'px';
  menu.style.top = Math.min(y, window.innerHeight - r.height - 8) + 'px';
  setTimeout(() => {
    document.addEventListener('mousedown', onDoc, { capture: true, once: true });
  });
  function onDoc(e) { if (!menu.contains(e.target)) closeContextMenu(); }
  window.addEventListener('blur', closeContextMenu, { once: true });
  return menu;
}

export function closeContextMenu() {
  $('#ctx-root').innerHTML = '';
}

// ---------- global tooltip system (automatic help) ----------
export function initTooltips() {
  let tipEl = null, timer = null;
  document.addEventListener('mouseover', (e) => {
    const target = e.target.closest('[data-tip],[title]');
    if (!target) return;
    const text = target.getAttribute('data-tip') || target.getAttribute('title');
    if (!text) return;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
    clearTimeout(timer);
    timer = setTimeout(() => {
      hide();
      tipEl = el('div', { id: 'tooltip', text });
      document.body.append(tipEl);
      const r = target.getBoundingClientRect();
      const tr = tipEl.getBoundingClientRect();
      let x = r.left + r.width / 2 - tr.width / 2;
      let y = r.bottom + 7;
      if (y + tr.height > window.innerHeight - 8) y = r.top - tr.height - 7;
      x = Math.max(6, Math.min(x, window.innerWidth - tr.width - 8));
      tipEl.style.left = x + 'px';
      tipEl.style.top = y + 'px';
    }, 550);
  });
  document.addEventListener('mousedown', hide);
  document.addEventListener('mouseout', (e) => {
    if (e.target.closest('[data-tip],[title]')) { clearTimeout(timer); setTimeout(hide, 200); }
  });
  function hide() { clearTimeout(timer); if (tipEl) { tipEl.remove(); tipEl = null; } }
}

// ---------- clipboard ----------
export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = el('textarea', { style: { position: 'fixed', opacity: '0' } });
    ta.value = text;
    document.body.append(ta);
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  }
}

// ---------- download helper (results) ----------
export function downloadBlob(name, content, mime = 'text/plain') {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mime + ';charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = el('a', { href: url, download: name });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

export function nowStamp() {
  const d = new Date();
  const p = (x) => String(x).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}
