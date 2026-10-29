/**
 * WJ DB Studio — inline SVG icon set (24px grid, stroke style, currentColor).
 * Each section of the app has a clear, distinct icon.
 * (c) 2026 Weeradech Jessadarom — MIT
 */
const S = (inner, vb = '0 0 24 24') =>
  `<svg viewBox="${vb}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="100%" height="100%">${inner}</svg>`;

export const ICONS = {
  home: S('<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M9.5 21v-6h5v6"/>'),
  plug: S('<path d="M9 3v5M15 3v5"/><path d="M6.5 8h11v3a5.5 5.5 0 0 1-11 0V8z"/><path d="M12 16.5V21"/>'),
  code: S('<path d="m8 7-5 5 5 5M16 7l5 5-5 5M13 4l-2.5 16"/>'),
  import: S('<path d="M12 3v11m0 0 4-4m-4 4-4-4"/><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/>'),
  export: S('<path d="M12 14V3m0 0 4 4m-4-4-4 4"/><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/>'),
  backup: S('<path d="M12 3a8 8 0 0 0-8 8c0 2.5 1.1 4.7 3 6.2V21h10v-3.8A8 8 0 0 0 12 3z"/><path d="M9 21v-3h6v3"/><path d="M12 7v4l2.5 2.5"/>'),
  server: S('<rect x="4" y="4" width="16" height="7" rx="1.5"/><rect x="4" y="13" width="16" height="7" rx="1.5"/><path d="M8 7.5h.01M8 16.5h.01"/>'),
  user: S('<circle cx="12" cy="8" r="3.5"/><path d="M5 20a7 7 0 0 1 14 0"/>'),
  gear: S('<circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 0-.14-1.4l2-1.55-2-3.46-2.36.95A7 7 0 0 0 14 5.1L13.6 2.6h-4L9.2 5.1a7 7 0 0 0-2.5 1.44l-2.36-.95-2 3.46 2 1.55A7 7 0 0 0 4.2 12"/>'),
  help: S('<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.6 2.6 0 1 1 3.8 2.3c-.8.5-1.3 1-1.3 1.9"/><path d="M12 17h.01"/>'),
  search: S('<circle cx="11" cy="11" r="6.5"/><path d="m20 20-3.8-3.8"/>'),
  refresh: S('<path d="M20 11a8 8 0 1 0-1.6 6"/><path d="M20 5v6h-6"/>'),
  plus: S('<path d="M12 5v14M5 12h14"/>'),
  x: S('<path d="M6 6l12 12M18 6 6 18"/>'),
  trash: S('<path d="M4 7h16M10 4h4M6.5 7l1 13h9l1-13"/><path d="M10 11v6M14 11v6"/>'),
  edit: S('<path d="M4 20h4L20 8l-4-4L4 16v4z"/><path d="m14 6 4 4"/>'),
  database: S('<ellipse cx="12" cy="5.5" rx="8" ry="3"/><path d="M4 5.5V18.5c0 1.66 3.58 3 8 3s8-1.34 8-3V5.5"/><path d="M4 12c0 1.66 3.58 3 8 3s8-1.34 8-3"/>'),
  table: S('<rect x="4" y="4" width="16" height="16" rx="1.5"/><path d="M4 9.5h16M9.5 9.5V20"/>'),
  view: S('<rect x="4" y="5" width="16" height="14" rx="1.5"/><path d="M4 10h16M4 14.5h16M8 5v14" opacity=".55"/>'),
  key: S('<circle cx="8" cy="14" r="4"/><path d="m11 11 8-8m-3 3 2.5 2.5M16 7l2 2"/>'),
  index: S('<path d="M4 6h16M4 12h10M4 18h7"/><path d="m17 14 3 3-3 3"/>'),
  bolt: S('<path d="M13 3 5 13h6l-1 8 8-11h-6l1-7z"/>'),
  clock: S('<circle cx="12" cy="12" r="8.5"/><path d="M12 7v5l3.5 2"/>'),
  bookmark: S('<path d="M7 3h10a1 1 0 0 1 1 1v17l-6-4.5L6 21V4a1 1 0 0 1 1-1z"/>'),
  history: S('<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/><path d="M4 12H2m20 0h-2" opacity=".5"/>'),
  info: S('<circle cx="12" cy="12" r="9"/><path d="M12 11v5"/><path d="M12 8h.01"/>'),
  warn: S('<path d="M12 3 2.5 20h19L12 3z"/><path d="M12 9.5v4.5"/><path d="M12 17h.01"/>'),
  error: S('<circle cx="12" cy="12" r="9"/><path d="m9 9 6 6M15 9l-6 6"/>'),
  ok: S('<circle cx="12" cy="12" r="9"/><path d="m8 12.5 2.5 2.5L16 9.5"/>'),
  play: S('<path d="M7 4.5v15l12-7.5-12-7.5z"/>'),
  stop: S('<rect x="6" y="6" width="12" height="12" rx="1"/>'),
  save: S('<path d="M5 3h11l3 3v15H5V3z"/><path d="M8 3v5h7V3"/><rect x="8" y="13" width="8" height="6"/>'),
  folder: S('<path d="M3 6a1 1 0 0 1 1-1h5l2 2.5h9a1 1 0 0 1 1 1V19a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6z"/>'),
  chart: S('<path d="M4 20V4"/><path d="M4 20h16"/><rect x="7" y="12" width="3" height="8"/><rect x="12" y="8" width="3" height="12"/><rect x="17" y="4" width="3" height="16"/>'),
  filter: S('<path d="M4 5h16l-6.5 7.5V19l-3-1.8v-4.7L4 5z"/>'),
  chevron: S('<path d="m9 6 6 6-6 6"/>'),
  'chevron-down': S('<path d="m6 9 6 6 6-6"/>'),
  'chevron-right': S('<path d="m9 6 6 6-6 6"/>'),
  'chevron-left': S('<path d="m15 6-6 6 6 6"/>'),
  dbplus: S('<ellipse cx="12" cy="5.5" rx="8" ry="3"/><path d="M4 5.5V18.5c0 1.66 3.58 3 8 3s8-1.34 8-3V5.5"/><path d="M4 12c0 1.66 3.58 3 8 3s8-1.34 8-3"/><path d="M12 9.5v5M9.5 12h5"/>'),
  proc: S('<rect x="5" y="5" width="14" height="14" rx="2"/><path d="M9 9h6v6H9z"/><path d="M9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3"/>'),
  trigger: S('<path d="M12 3v6m0 0-4 5h3l-1 7 5-8h-3l1.5-10" transform="translate(1.5 1)"/>'),
  event: S('<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 9h16M8 3v4M16 3v4"/><path d="m10.5 13.5 1.2 1.2 2.3-2.4" transform="translate(0 1.5)"/>'),
  users: S('<circle cx="9" cy="8.5" r="3"/><path d="M3.5 19a5.5 5.5 0 0 1 11 0"/><circle cx="16.5" cy="9.5" r="2.3"/><path d="M15.5 14.5a4.5 4.5 0 0 1 5 4.5"/>'),
  lock: S('<rect x="5.5" y="10.5" width="13" height="9.5" rx="1.5"/><path d="M8.5 10.5V7.5a3.5 3.5 0 0 1 7 0v3"/>'),
  globe: S('<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18 14 14 0 0 1 0-18z"/>'),
  copy: S('<rect x="9" y="9" width="11" height="11" rx="1.5"/><path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1"/>'),
  download: S('<path d="M12 3v11m0 0 4-4m-4 4-4-4"/><path d="M5 20h14"/>'),
  upload: S('<path d="M12 14V3m0 0 4 4m-4-4-4 4"/><path d="M5 20h14"/>'),
  file: S('<path d="M6 3h8l4 4v14H6V3z"/><path d="M14 3v4h4"/>'),
  sql: S('<ellipse cx="12" cy="6" rx="7.5" ry="2.8"/><path d="M4.5 6v12c0 1.55 3.36 2.8 7.5 2.8s7.5-1.25 7.5-2.8V6"/><path d="M4.5 12c0 1.55 3.36 2.8 7.5 2.8s7.5-1.25 7.5-2.8"/>'),
  wand: S('<path d="m5 19 9.5-9.5m0 0L17 7l-2-2-2.5 2.5M19 5l1-1"/><path d="M15 3.5 15.7 5 17 5.7 15.7 6.4 15 7.7l-.7-1.3L13 5.7l1.3-.7.7-1.5z"/><path d="M19.5 9.5l.5 1.1 1.1.5-1.1.5-.5 1.1-.5-1.1-1.1-.5 1.1-.5.5-1.1z"/>'),
  dot: S('<circle cx="12" cy="12" r="4" fill="currentColor" stroke="none"/>'),
  panel: S('<rect x="3.5" y="4.5" width="17" height="15" rx="1.5"/><path d="M3.5 15h17"/>'),
  connect: S('<path d="M7 10a5 5 0 0 1 10 0v3a5 5 0 0 1-10 0v-3z"/><path d="M9.5 6V3.5M14.5 6V3.5M12 18v2.5"/>'),
  disconnect: S('<path d="M7 10a5 5 0 0 1 8.5-3.5"/><path d="M17 10v3a5 5 0 0 1-7 4.6"/><path d="M9.5 6V3.5M12 18v2.5"/><path d="m15 15 5 5"/>'),
  moon: S('<path d="M20 13.5A8 8 0 0 1 10.5 4 8 8 0 1 0 20 13.5z"/>'),
  sun: S('<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5 5l1.4 1.4M17.6 17.6 19 19M19 5l-1.4 1.4M6.4 17.6 5 19"/>'),
  menu: S('<path d="M4 6h16M4 12h16M4 18h16"/>'),
  arrowLeft: S('<path d="M19 12H5m0 0 6-6m-6 6 6 6"/>'),
  arrowRight: S('<path d="M5 12h14m0 0-6-6m6 6-6 6"/>'),
  first: S('<path d="M6 5v14M19 6l-7 6 7 6"/>'),
  last: S('<path d="M18 5v14M5 6l7 6-7 6"/>'),
  prev: S('<path d="m14 6-6 6 6 6"/>'),
  next: S('<path d="m10 6 6 6-6 6"/>'),
  check: S('<path d="m5 12.5 4.5 4.5L19 7.5"/>'),
  pencil: S('<path d="M4 20h4L20 8l-4-4L4 16v4z"/>'),
  star: S('<path d="m12 3.5 2.6 5.3 5.9.9-4.3 4.1 1 5.9-5.2-2.8-5.2 2.8 1-5.9L3.5 9.7l5.9-.9L12 3.5z"/>'),
  flag: S('<path d="M6 21V4"/><path d="M6 4h12l-2.5 4L18 12H6"/>'),
  monitor: S('<rect x="3" y="4" width="18" height="12" rx="1.5"/><path d="M9 20h6M12 16v4"/>'),
  doc: S('<path d="M6 3h8l4 4v14H6V3z"/><path d="M14 3v4h4M9 12h6M9 15.5h6"/>'),
  bug: S('<circle cx="12" cy="13" r="5"/><path d="M12 8V6m-4.5 2L6 6.5M16.5 8 18 6.5M4.5 13H7m10 0h2.5M6 18l1.5-1.5M18 18l-1.5-1.5M12 8a5 5 0 0 0-5 5"/>'),
  key2: S('<circle cx="15.5" cy="9" r="4.5"/><path d="m12.5 12-7 7m0 0 2 2m-2-2 2.5-2.5" transform="translate(-1 -1)"/>'),
  compare: S('<rect x="3" y="4" width="8" height="16" rx="1.5"/><rect x="13" y="4" width="8" height="16" rx="1.5"/><path d="M11 12h2"/>'),
  minus: S('<path d="M5 12h14"/>'),
  format: S('<path d="M4 5h16M7 9h10M7 13h10M4 17h16" opacity=".85"/>'),
  refreshDb: S('<ellipse cx="12" cy="5.5" rx="8" ry="3"/><path d="M4 5.5V18.5c0 1.66 3.58 3 8 3a13 13 0 0 0 3-.35"/><path d="M20 5.5v6"/><path d="M17 20a4.5 4.5 0 1 0-3.5-7.3"/><path d="M17 17.5v2.5m0-2.5h-2.5" transform="translate(0 -0.5)"/>'),
};

/** Render an icon into an element or as HTML string. */
export function iconHTML(name) {
  return ICONS[name] || ICONS.dot;
}

export function decorateIcons(root = document) {
  root.querySelectorAll('[data-icon]').forEach(el => {
    const name = el.getAttribute('data-icon');
    if (!el.dataset.iconDone && ICONS[name]) {
      el.innerHTML = iconHTML(name);
      el.dataset.iconDone = '1';
    }
  });
}
