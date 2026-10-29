/**
 * WJ DB Studio — import / export / backup dialogs.
 * (c) 2026 Weeradech Jessadarom — MIT
 */
import { el, ic, toast, showModal, confirmBox } from './utils.js';
import { t } from './i18n.js';
import { requireConn, currentDb } from './state.js';
import { downloadBlob, nowStamp } from './utils.js';

/* ================= IMPORT ================= */
export function importDialog(connId, db, table) {
  let conn;
  try { conn = connId ? { id: connId } : requireConn(); } catch { return; }
  const cid = connId || conn.id;
  db = db || currentDb(cid);

  const fileInput = el('input', { type: 'text', placeholder: 'C:\\path\\file.csv', style: { flex: '1' } });
  const browse = el('button', { class: 'mini-btn', onclick: pickFile }, ic('folder'), '…');
  async function pickFile() {
    const f = await window.wjds.pickFile({
      filters: [
        { name: 'Data files', extensions: ['csv', 'tsv', 'txt', 'json', 'sql', 'xlsx', 'xls'] },
        { name: 'All', extensions: ['*'] },
      ],
    });
    if (f) { fileInput.value = f; guessKind(); }
  }

  const kindSel = el('select', {},
    el('option', { value: 'csv', text: 'CSV / TSV' }),
    el('option', { value: 'xlsx', text: 'Excel (.xlsx / .xls)' }),
    el('option', { value: 'json', text: 'JSON (array)' }),
    el('option', { value: 'sql', text: 'SQL script (.sql)' }));
  const delimSel = el('select', {},
    el('option', { value: ',', text: ',' }),
    el('option', { value: ';', text: ';' }),
    el('option', { value: '\t', text: 'TAB' }),
    el('option', { value: '|', text: '|' }));
  const headersChk = el('input', { type: 'checkbox' }); headersChk.checked = true;
  const truncChk = el('input', { type: 'checkbox' });
  const createChk = el('input', { type: 'checkbox' });
  const dbInput = el('input', { type: 'text', value: db || '' });
  const tableInput = el('input', { type: 'text', value: table || '' });

  function guessKind() {
    const f = fileInput.value.toLowerCase();
    if (f.endsWith('.json')) kindSel.value = 'json';
    else if (f.endsWith('.sql')) kindSel.value = 'sql';
    else if (f.endsWith('.xlsx') || f.endsWith('.xls')) kindSel.value = 'xlsx';
    else if (f.endsWith('.tsv')) { kindSel.value = 'csv'; delimSel.value = '\t'; }
    else kindSel.value = 'csv';
    toggleCsvFields();
  }
  function toggleCsvFields() {
    const isCsv = kindSel.value === 'csv';
    delimSel.disabled = !isCsv;
    headersChk.disabled = !isCsv;
  }
  kindSel.addEventListener('change', toggleCsvFields);

  const runBtn = el('button', { class: 'btn primary', onclick: doImport }, ic('import'), el('span', { text: t('imp.run') }));
  const progress = el('div', { class: 'res-msg', style: { display: 'none' } });

  const r = showModal({
    title: t('imp.title'), icon: 'import', width: '560px',
    body: el('div', { class: 'form' },
      el('div', { class: 'form-row' }, el('label', { text: t('imp.file') }), el('div', { style: { display: 'flex', gap: '6px' } }, fileInput, browse)),
      el('div', { class: 'form-row' }, el('label', { text: t('exp.format') }), kindSel),
      el('div', { class: 'form-grid2' },
        el('div', {}, fieldLabel(t('bk.db')), dbInput),
        el('div', {}, fieldLabel(t('imp.target')), tableInput)),
      el('div', { class: 'form-row' }, el('label', { text: t('imp.delim') }), delimSel),
      el('label', { class: 'check' }, headersChk, el('span', { text: t('imp.headers') })),
      el('label', { class: 'check' }, truncChk, el('span', { text: t('imp.truncate') })),
      el('label', { class: 'check' }, createChk, el('span', { text: t('imp.createtable') })),
      progress),
    footer: [
      el('button', { class: 'btn', onclick: () => r.close(), text: t('conn.cancel') }),
      runBtn,
    ],
  });

  async function doImport() {
    const file = fileInput.value.trim();
    const database = dbInput.value.trim();
    const tbl = tableInput.value.trim();
    if (!file) { toast('เลือกไฟล์ก่อน / Pick a file', 'err'); return; }
    if (kindSel.value !== 'sql' && (!database || !tbl)) { toast('ระบุ database และตารางปลายทาง', 'err'); return; }
    runBtn.disabled = true;
    progress.style.display = '';
    progress.textContent = '⏳ ' + t('msg.running');
    try {
      let out;
      if (kindSel.value === 'csv') {
        out = await window.wjds.importCsv({ connId: cid, filePath: file, db: database, table: tbl, delimiter: delimSel.value, firstRowHeaders: headersChk.checked, truncateFirst: truncChk.checked, createTable: createChk.checked });
      } else if (kindSel.value === 'xlsx') {
        out = await window.wjds.importXlsx({ connId: cid, filePath: file, db: database, table: tbl, truncateFirst: truncChk.checked, createTable: createChk.checked });
      } else if (kindSel.value === 'json') {
        out = await window.wjds.importJson({ connId: cid, filePath: file, db: database, table: tbl, truncateFirst: truncChk.checked });
      } else {
        out = await window.wjds.runSqlFile({ connId: cid, filePath: file });
      }
      const msg = kindSel.value === 'sql'
        ? `✓ ${out.done}/${out.statements} statements` + (out.errors ? `, ${out.errors} errors` : '')
        : `✓ ${t('imp.done', { n: out.count })}`;
      progress.textContent = msg;
      toast(msg, out.errors ? 'err' : 'ok');
      import('./app.js').then(m => m.logResult(msg, !out.errors));
      import('./tree.js').then(m => m.refreshTree());
    } catch (err) {
      progress.textContent = '✗ ' + err.message;
      toast(t('msg.error'), 'err', err.message);
    }
    runBtn.disabled = false;
  }
}

/* ================= EXPORT (current query result rows) ================= */
export function exportRowsDialog(fields, rows, suggestedName = 'export') {
  const fmtSel = el('select', {},
    el('option', { value: 'xlsx', text: 'Excel (.xlsx)' }),
    el('option', { value: 'csv', text: 'CSV' }),
    el('option', { value: 'json', text: 'JSON' }),
    el('option', { value: 'sql', text: 'SQL INSERTs' }));
  const r = showModal({
    title: t('exp.title'), icon: 'export',
    body: el('div', { class: 'form' },
      el('div', { class: 'form-row' }, el('label', { text: t('exp.format') }), fmtSel),
      el('div', { class: 'res-msg', text: `${rows.length} rows × ${fields.length} columns` })),
    footer: [
      el('button', { class: 'btn', onclick: () => r.close(), text: t('conn.cancel') }),
      el('button', { class: 'btn primary', onclick: () => doExportRows() }, ic('download'), el('span', { text: t('exp.run') })),
    ],
  });

  async function doExportRows() {
    const fmt = fmtSel.value;
    r.close();
    let file = await window.wjds.pickSaveFile({
      title: t('exp.title'),
      defaultPath: suggestedName + '_' + nowStamp() + '.' + (fmt === 'xlsx' ? 'xlsx' : fmt),
      filters: [{ name: fmt.toUpperCase(), extensions: [fmt === 'xlsx' ? 'xlsx' : fmt] }],
    });
    if (!file) return;
    if (fmt !== 'xlsx' && !new RegExp('\\.' + fmt + '$', 'i').test(file)) file += '.' + fmt;
    try {
      let count;
      if (fmt === 'sql') {
        const esc = (v) => v === null || v === undefined ? 'NULL' : typeof v === 'number' ? String(v) : v instanceof Date ? `'${v.toISOString().slice(0, 19).replace('T', ' ')}'` : `'${String(v).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
        const content = rows.map(row => `INSERT INTO table_name (${fields.map(f => '`' + f.name + '`').join(', ')}) VALUES (${fields.map(f => esc(row[f.name])).join(', ')});`).join('\n');
        await window.wjds.writeFile(file, content);
        count = rows.length;
      } else {
        ({ count } = await window.wjds.exportRows({ fields, rows, format: fmt, filePath: file, sheetName: 'Result' }));
      }
      toast(t('exp.done', { n: count, f: file }), 'ok');
    } catch (err) {
      toast(t('msg.error'), 'err', err.message);
    }
  }
}

/* ================= EXPORT (server-side streamed to file) ================= */
export function exportDialog(connId, { sql, db, table }) {
  const fmtSel = el('select', {},
    el('option', { value: 'xlsx', text: 'Excel (.xlsx)' }),
    el('option', { value: 'csv', text: 'CSV' }),
    el('option', { value: 'json', text: 'JSON' }),
    el('option', { value: 'sql', text: 'SQL INSERTs (schema + data)' }));
  const fileInput = el('input', { type: 'text', style: { flex: '1' }, placeholder: 'output file' });
  const browse = el('button', { class: 'mini-btn', onclick: async () => {
    const f = await window.wjds.pickFile({ title: t('exp.title'), filters: [{ name: 'Data', extensions: ['xlsx', 'csv', 'json', 'sql'] }] });
    if (f) fileInput.value = f;
  } }, ic('folder'), '…');
  const progress = el('div', { class: 'res-msg', style: { display: 'none' } });

  const r = showModal({
    title: t('exp.title'), icon: 'export', width: '560px',
    body: el('div', { class: 'form' },
      el('div', { class: 'form-row' }, el('label', { text: t('exp.format') }), fmtSel),
      el('div', { class: 'form-row' }, el('label', { text: t('imp.file') }), el('div', { style: { display: 'flex', gap: '6px' } }, fileInput, browse)),
      el('div', { class: 'res-msg', text: 'SQL: ' + sql.slice(0, 120) }),
      progress),
    footer: [
      el('button', { class: 'btn', onclick: () => r.close(), text: t('conn.cancel') }),
      el('button', { class: 'btn primary', onclick: doExport }, ic('download'), el('span', { text: t('exp.run') })),
    ],
  });

  async function doExport() {
    let file = fileInput.value.trim();
    if (!file) { toast('ระบุไฟล์ปลายทาง', 'err'); return; }
    const fmt = fmtSel.value;
    if (!/\.(xlsx|csv|json|sql)$/i.test(file)) file += '.' + (fmt === 'xlsx' ? 'xlsx' : fmt);
    r.close();
    try {
      const out = await window.wjds.exportToFile({ connId, sql, format: fmt, filePath: file, db, table, includeDdl: fmt === 'sql' });
      toast(t('exp.done', { n: out.count, f: file }), 'ok');
    } catch (err) {
      toast(t('msg.error'), 'err', err.message);
    }
  }
}

/** Export entry point for the toolbar (uses active view's SQL). */
export function exportActive() {
  import('./app.js').then(async ({ activeTab }) => {
    const tab = activeTab();
    try {
      const conn = requireConn();
      if (tab && tab.type === 'query') {
        const sql = tab.payload.getSQL().trim();
        if (!sql) { toast(t('exp.noactive'), 'err'); return; }
        exportDialog(conn.id, { sql, db: currentDb(conn.id) });
      } else if (tab && tab.type === 'data') {
        exportDialog(tab.payload.connId || conn.id, { sql: `SELECT * FROM \`${tab.payload.db}\`.\`${tab.payload.table}\``, db: tab.payload.db, table: tab.payload.table });
      } else {
        toast(t('exp.noactive'), 'err');
      }
    } catch { return; }
  });
}

/* ================= BACKUP ================= */
export function backupDialog(connId, db, singleTable) {
  let conn;
  try { conn = connId ? { id: connId } : requireConn(); } catch { return; }
  const cid = connId || conn.id;
  db = db || currentDb(cid);

  const dbInput = el('input', { type: 'text', value: db || '' });
  const tablesInput = el('input', { type: 'text', value: singleTable || '', placeholder: 'users, orders' });
  const schemaChk = el('input', { type: 'checkbox' }); schemaChk.checked = true;
  const dataChk = el('input', { type: 'checkbox' }); dataChk.checked = true;
  const viewsChk = el('input', { type: 'checkbox' }); viewsChk.checked = true;
  const fileInput = el('input', { type: 'text', style: { flex: '1' }, placeholder: 'backup.sql' });
  const browse = el('button', { class: 'mini-btn', onclick: async () => {
    const f = await window.wjds.pickFile({ title: t('bk.title'), filters: [{ name: 'SQL', extensions: ['sql'] }] });
    if (f) fileInput.value = f;
  } }, ic('folder'), '…');

  const r = showModal({
    title: t('bk.title'), icon: 'backup', width: '560px',
    body: el('div', { class: 'form' },
      el('div', { class: 'form-row' }, el('label', { text: t('bk.db') }), dbInput),
      el('div', { class: 'form-row' }, el('label', { text: t('bk.tables') }), tablesInput),
      el('label', { class: 'check' }, schemaChk, el('span', { text: t('bk.schema') })),
      el('label', { class: 'check' }, dataChk, el('span', { text: t('bk.data') })),
      el('label', { class: 'check' }, viewsChk, el('span', { text: t('bk.views') })),
      el('div', { class: 'form-row' }, el('label', { text: t('imp.file') }), el('div', { style: { display: 'flex', gap: '6px' } }, fileInput, browse))),
    footer: [
      el('button', { class: 'btn', onclick: () => r.close(), text: t('conn.cancel') }),
      el('button', { class: 'btn primary', onclick: doBackup }, ic('backup'), el('span', { text: t('bk.run') })),
    ],
  });

  async function doBackup() {
    const database = dbInput.value.trim();
    if (!database) { toast('ระบุฐานข้อมูล', 'err'); return; }
    let file = fileInput.value.trim();
    if (!file) file = `backup_${database}_${nowStamp()}.sql`;
    if (!/\.sql$/i.test(file)) file += '.sql';
    r.close();
    try {
      const out = await window.wjds.backup({
        connId: cid, db: database,
        tables: tablesInput.value.trim() ? tablesInput.value.split(',').map(s => s.trim()).filter(Boolean) : null,
        includeSchema: schemaChk.checked, includeData: dataChk.checked, includeViews: viewsChk.checked,
        filePath: file,
      });
      toast(t('bk.done', { f: out.filePath }), 'ok');
    } catch (err) {
      toast(t('msg.error'), 'err', err.message);
    }
  }
}

function fieldLabel(text) {
  return el('label', { style: { display: 'block', color: 'var(--text-dim)', fontSize: '11.5px', margin: '0 0 3px 2px' }, text });
}
