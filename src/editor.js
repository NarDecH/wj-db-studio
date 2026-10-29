/**
 * WJ DB Studio — SQL editor: highlight, autocomplete, execution, results.
 * (c) 2026 Weeradech Jessadarom — MIT
 */
import { $, el, ic, toast, copyText, showContextMenu, downloadBlob, nowStamp } from './utils.js';
import { t, explainError } from './i18n.js';
import { state, requireConn, currentDb, cacheFor } from './state.js';
import { openTab, logResult, renderHistory } from './app.js';
import { DataGrid } from './grid.js';

/* ================= syntax highlighting ================= */
const KEYWORDS = `SELECT FROM WHERE AND OR NOT NULL IS IN LIKE BETWEEN ORDER GROUP BY HAVING LIMIT OFFSET AS ON JOIN
INNER LEFT RIGHT FULL OUTER CROSS UNION ALL DISTINCT INSERT INTO VALUES UPDATE SET DELETE CREATE ALTER DROP TABLE DATABASE
SCHEMA VIEW INDEX PRIMARY KEY FOREIGN REFERENCES CONSTRAINT UNIQUE AUTO_INCREMENT ENGINE CHARSET COLLATE DEFAULT COMMENT
IF EXISTS TRUNCATE RENAME TO BEGIN COMMIT ROLLBACK START TRANSACTION LOCK UNLOCK SHOW DESCRIBE EXPLAIN USE GRANT REVOKE
CASCADE RESTRICT PROCEDURE FUNCTION TRIGGER EVENT CALL DELIMITER CASE WHEN THEN ELSE END WHILE FOR RETURN LEAVE ITERATE
STORED TEMPORARY MEMORY INNODB MYISAM ARIA ROW_FORMAT UNSIGNED ZEROFILL BINARY GENERATED VIRTUAL STORED ALWAYS ASC DESC
CONCURRENT LOW_PRIORITY HIGH_PRIORITY DELAYED DUPLICATE PARTITION VALUES SUBPARTITION ALGORITHM CHARACTER SET INTERVAL
CURRENT_TIMESTAMP LOCALTIME LOCALTIMESTAMP NOW SQL_NO_CACHE SQL_CACHE STRAIGHT_JOIN NATURAL USING FORCE IGNORE
SEPARATOR DETERMINISTIC READS MODIFIES SQL DATA SECURITY DEFINER INVOKER COMMENT BEFORE AFTER EACH ROW STATEMENT
OUT INOUT HANDLER FOUND EXIT UNDO ITERATE REPEAT LOOP RETURN TRUE FALSE UNKNOWN DIV MOD XOR ISolation LEVEL
READ WRITE COMMITTED UNCOMMITTED REPEATABLE SERIALIZABLE GET DIAGNOSTICS SIGNAL RESIGNAL CONDITION SQLEXCEPTION SQLWARNING
PREPARE EXECUTE DEALLOCATE PREPARE FROM CHANGE COLUMN ADD MODIFY AFTER FIRST`.split(/\s+/).filter(Boolean);

const FUNCTIONS = `COUNT SUM AVG MIN MAX CONCAT SUBSTRING SUBSTR LENGTH CHAR_LENGTH UPPER LOWER TRIM REPLACE ROUND CEIL FLOOR
ABS MOD POW SQRT EXP LN LOG RAND SIGN DATE TIME DATETIME TIMESTAMP YEAR MONTH DAY HOUR MINUTE SECOND DATE_FORMAT
DATE_ADD DATE_SUB DATEDIFF TIMEDIFF UNIX_TIMESTAMP FROM_UNIXTIME STR_TO_DATE IF IFNULL NULLIF COALESCE CASE CAST CONVERT
GROUP_CONCAT JSON_OBJECT JSON_ARRAY JSON_EXTRACT JSON_UNQUOTE JSON_VALID MD5 SHA1 SHA2 AES_ENCRYPT AES_DECRYPT UUID
LAST_INSERT_ID ROW_COUNT FOUND_ROWS NOW CURDATE CURTIME SYSDATE VERSION DATABASE USER CONNECTION_ID BENCHMARK SLEEP
INET_ATON INET_NTOA FORMAT FIELD ELT INSERT LOCATE POSITION INSTR LPAD RPAD LEFT RIGHT MID REPEAT SPACE STRCMP
CONV BIN OCT HEX UNHEX COMPRESS UNCOMPRESS CRC32 ISNULL EXISTS`.split(/\s+/).filter(Boolean);

const TYPES = `INT INTEGER TINYINT SMALLINT MEDIUMINT BIGINT FLOAT DOUBLE DECIMAL NUMERIC BIT BOOL BOOLEAN DATE DATETIME
TIMESTAMP TIME YEAR CHAR VARCHAR TINYTEXT TEXT MEDIUMTEXT LONGTEXT BINARY VARBINARY BLOB TINYBLOB MEDIUMBLOB LONGBLOB
ENUM SET JSON GEOMETRY POINT LINESTRING POLYGON MULTIPOINT`.split(/\s+/).filter(Boolean);

const KW_RE = new RegExp(`^(${[...KEYWORDS, ...TYPES].join('|')})$`, 'i');
const FN_RE = new RegExp(`^(${FUNCTIONS.join('|')})(\\s*\\()?$`, 'i');

/** Tokenize SQL text to colored HTML (escape-safe). */
export function highlightSQL(src) {
  let out = '';
  let i = 0;
  const n = src.length;
  const push = (cls, text) => { out += cls ? `<span class="${cls}">${text}</span>` : text; };
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

  while (i < n) {
    const ch = src[i];
    // line comments
    if ((ch === '-' && src[i + 1] === '-') || ch === '#') {
      let j = i;
      while (j < n && src[j] !== '\n') j++;
      push('tk-com', esc(src.slice(i, j))); i = j; continue;
    }
    // block comments
    if (ch === '/' && src[i + 1] === '*') {
      let j = src.indexOf('*/', i + 2);
      j = j === -1 ? n : j + 2;
      push('tk-com', esc(src.slice(i, j))); i = j; continue;
    }
    // strings
    if (ch === "'" || ch === '"') {
      let j = i + 1;
      while (j < n) {
        if (src[j] === '\\') { j += 2; continue; }
        if (src[j] === ch) { if (src[j + 1] === ch) { j += 2; continue; } j++; break; }
        j++;
      }
      push('tk-str', esc(src.slice(i, j))); i = j; continue;
    }
    // identifiers / backticks
    if (ch === '`') {
      let j = src.indexOf('`', i + 1);
      j = j === -1 ? n : j + 1;
      push('tk-bt', esc(src.slice(i, j))); i = j; continue;
    }
    // numbers
    if (/\d/.test(ch) || (ch === '.' && /\d/.test(src[i + 1] || ''))) {
      let j = i;
      while (j < n && /[\d.eE+\-xXa-fA-F_]/.test(src[j])) {
        // stop +- unless part of exponent/hex
        if ((src[j] === '+' || src[j] === '-') && !/[eE]/.test(src[j - 1])) break;
        j++;
      }
      push('tk-num', esc(src.slice(i, j))); i = j; continue;
    }
    // words
    if (/[A-Za-z_@\$]/.test(ch)) {
      let j = i;
      while (j < n && /[\w\.\$]/.test(src[j])) j++;
      const word = src.slice(i, j);
      if (KW_RE.test(word)) push('tk-kw', esc(word));
      else if (FN_RE.test(word)) push('tk-fn', esc(word));
      else push('tk-id', esc(word));
      i = j; continue;
    }
    // operators & punctuation
    if (/[=<>!+\-*/%(),;.&|~^]/.test(ch)) {
      let j = i;
      while (j < n && /[=<>!+\-*/%(),;.&|~^]/.test(src[j])) j++;
      push('tk-op', esc(src.slice(i, j))); i = j; continue;
    }
    out += esc(ch); i++;
  }
  return out + '\n';
}

/* ================= autocomplete ================= */
async function buildCompleter(connId, db) {
  const kw = KEYWORDS.map(w => ({ label: w, kind: 'kw', insert: w }));
  const fn = FUNCTIONS.map(w => ({ label: w + '()', kind: 'fn', insert: w + '()', back: 1 }));
  const ty = TYPES.map(w => ({ label: w, kind: 'kw', insert: w }));
  const items = [...kw, ...fn, ...ty];
  const c = cacheFor(connId);
  const curDb = db || currentDb(connId);
  if (curDb) {
    try {
      if (!c.tables.has(curDb)) {
        const objs = await window.wjds.listObjects(connId, curDb);
        c.tables.set(curDb, [...objs.tables, ...objs.views].map(x => x.name));
      }
      for (const tb of c.tables.get(curDb) || []) {
        items.push({ label: tb, kind: 'tbl', insert: tb });
        if (!c.columns.has(tb)) {
          const cols = await window.wjds.tableColumns(connId, curDb, tb).catch(() => []);
          c.columns.set(tb, cols.map(x => x.name));
        }
        for (const col of c.columns.get(tb)) {
          items.push({ label: col, kind: 'col', insert: col, note: tb });
        }
      }
    } catch { /* offline: keywords only */ }
  }
  return items;
}

/* ================= view ================= */
export function openEditor(opts = {}) {
  let connId = opts.connId, db = opts.db;
  if (!connId) {
    try { const c = requireConn(); connId = c.id; db = db || currentDb(connId); }
    catch { return; }
  }
  const meta = state.connections.find(c => c.id === connId);
  return openTab({
    type: 'query', key: `query:${connId}:${db || ''}:${Math.random().toString(36).slice(2, 6)}`,
    title: (meta ? meta.name : 'SQL') + (db ? ' · ' + db : ''),
    icon: 'code',
    render: (tab, view) => buildEditorView(tab, view, connId, db),
  });
}

function buildEditorView(tab, view, connId, db) {
  let running = false;
  let lastSQL = '';
  let completer = null;

  /* --- editor --- */
  const hl = el('pre', { class: 'ed-hl', 'aria-hidden': 'true' });
  const ta = el('textarea', {
    class: 'ed-text', spellcheck: 'false', wrap: 'off',
    placeholder: t('ed.empty'),
  });
  const edWrap = el('div', { class: 'ed-wrap' }, hl, ta);

  ta.addEventListener('input', () => { sync(); updateStatus(); autoCompleteMaybe(); });
  ta.addEventListener('scroll', () => { hl.scrollTop = ta.scrollTop; hl.scrollLeft = ta.scrollLeft; });
  ta.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 'Enter') { e.preventDefault(); exec(e.shiftKey); }
    else if (e.ctrlKey && (e.key === 'o' || e.key === 'O')) { e.preventDefault(); doOpenFile(); }
    else if (e.ctrlKey && (e.key === 's' || e.key === 'S')) { e.preventDefault(); doSaveFile(); }
    else if (e.ctrlKey && e.key === ' ') { e.preventDefault(); autoComplete(true); }
    else if (e.key === 'Tab' && acPopupHidden()) { e.preventDefault(); insertAtCursor('  '); }
    else if (e.key === '/' && e.ctrlKey) {
      e.preventDefault();
      toggleComment();
    }
  });
  ta.addEventListener('keyup', (e) => { if (['ArrowUp', 'ArrowDown'].includes(e.key)) updateStatus(); });

  function sync() {
    hl.innerHTML = highlightSQL(ta.value) + '\n';
    hl.scrollTop = ta.scrollTop; hl.scrollLeft = ta.scrollLeft;
  }
  function insertAtCursor(text, back = 0) {
    const s = ta.selectionStart, e = ta.selectionEnd;
    ta.value = ta.value.slice(0, s) + text + ta.value.slice(e);
    const pos = s + text.length - back;
    ta.setSelectionRange(pos, pos);
    ta.focus();
    sync();
  }
  function toggleComment() {
    const s = ta.value;
    const start = s.lastIndexOf('\n', ta.selectionStart - 1) + 1;
    const end = s.indexOf('\n', ta.selectionEnd);
    const segEnd = end === -1 ? s.length : end;
    const seg = s.slice(start, segEnd);
    const commented = seg.trimStart().startsWith('-- ');
    const next = commented ? seg.replace(/^(\s*)-- /gm, '$1') : seg.replace(/^(\s*)/gm, '$1-- ');
    ta.value = s.slice(0, start) + next + s.slice(segEnd);
    ta.setSelectionRange(start, start + next.length);
    sync();
  }
  function updateStatus() {
    const pos = ta.value.slice(0, ta.selectionStart);
    const line = pos.split('\n').length;
    const col = pos.length - pos.lastIndexOf('\n');
    tab.setTitleNode(el('span', { class: 'tlabel', text: tab.title + `  Ln ${line}, Col ${col}` }));
  }

  tab.payload = {
    getSQL: () => ta.value,
    setSQL: (v) => { ta.value = v; sync(); },
  };

  /* --- autocomplete popup --- */
  let ac = null; // {items, sel, popupEl, prefix, startPos}
  function acPopupHidden() { return !ac; }

  async function autoComplete(force = false) {
    if (!state.settings.autoComplete && !force) return;
    if (!completer) completer = buildCompleter(connId, db);
    const items = await completer;
    const pos = ta.selectionStart;
    const before = ta.value.slice(0, pos);
    const m = before.match(/([A-Za-z_][\w$]*)$/);
    const prefix = m ? m[1] : '';
    if (!force && prefix.length < 2) { closeAC(); return; }
    const pfx = prefix.toLowerCase();
    let matches = items.filter(x => x.label.toLowerCase().startsWith(pfx));
    if (matches.length > 60) matches = matches.filter(x => x.label.toLowerCase().slice(0, 3) === pfx.slice(0, 3));
    matches = matches.slice(0, 40);
    if (!matches.length || (matches.length === 1 && matches[0].label.toLowerCase() === pfx)) { closeAC(); return; }
    showAC(matches, prefix, pos);
  }
  function autoCompleteMaybe() {
    clearTimeout(autoCompleteMaybe._h);
    autoCompleteMaybe._h = setTimeout(() => autoComplete(false), 320);
  }
  function showAC(items, prefix, pos) {
    closeAC();
    const popup = el('div', { class: 'ac-popup' });
    let sel = 0;
    const kindIcon = { kw: 'code', fn: 'proc', tbl: 'table', col: 'key' };
    const kindCls = { kw: 'ic-acc', fn: 'ic-proc', tbl: 'ic-tbl', col: 'ic-key' };
    function paint() {
      popup.innerHTML = '';
      items.forEach((it, i) => {
        const row = el('div', { class: 'ac-item' + (i === sel ? ' sel' : '') },
          ic(kindIcon[it.kind] || 'dot', 'ticon ' + (kindCls[it.kind] || '')),
          el('span', { text: it.label }),
          it.note ? el('small', { text: it.note }) : null,
          el('small', { text: it.kind.toUpperCase() }));
        row.addEventListener('mousedown', (e) => { e.preventDefault(); pick(i); });
        popup.append(row);
      });
      const selEl = popup.children[sel];
      if (selEl) selEl.scrollIntoView({ block: 'nearest' });
    }
    function pick(i) {
      const it = items[i];
      const p = pos - prefix.length;
      ta.value = ta.value.slice(0, p) + it.insert + ta.value.slice(pos);
      const np = p + it.insert.length - (it.back || 0);
      ta.setSelectionRange(np, np);
      closeAC(); ta.focus(); sync();
    }
    popup.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') { sel = (sel + 1) % items.length; paint(); e.preventDefault(); }
      else if (e.key === 'ArrowUp') { sel = (sel - 1 + items.length) % items.length; paint(); e.preventDefault(); }
      else if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); pick(sel); }
      else if (e.key === 'Escape') closeAC();
    });
    const r = ta.getBoundingClientRect();
    // approximate caret position by measuring via mirror
    const mirror = el('div', { style: { position: 'absolute', visibility: 'hidden', whiteSpace: 'pre', fontFamily: 'var(--font-mono)', fontSize: 'var(--edfs, 14px)', padding: '10px 14px', lineHeight: '1.55' }, text: ta.value.slice(0, pos) });
    document.body.append(mirror);
    const mr = mirror.getBoundingClientRect();
    let x = r.left + Math.min(mr.width % (r.width - 40) + (Math.floor(mr.width / (r.width - 40)) * 0), r.width - 300);
    x = r.left + (mr.width % Math.max(1, r.width - 60));
    const lineCount = (ta.value.slice(0, pos).match(/\n/g) || []).length;
    let y = r.top + 10 + lineCount * 14 * 1.55 - ta.scrollTop;
    mirror.remove();
    y = Math.min(y, window.innerHeight - 280);
    popup.style.left = Math.max(8, Math.min(x, window.innerWidth - 300)) + 'px';
    popup.style.top = (y + 22) + 'px';
    document.body.append(popup);
    ac = { popup, items, sel, pick, paint };
    paint();
    // route arrow keys from textarea to popup
    const origKey = ta._acHandler;
    ta.addEventListener('keydown', ta._acHandler = (e) => {
      if (!ac) return;
      if (['ArrowDown', 'ArrowUp', 'Enter', 'Tab', 'Escape'].includes(e.key)) {
        popup.dispatchEvent(new KeyboardEvent('keydown', { key: e.key }));
        e.preventDefault(); e.stopPropagation();
      }
    }, { capture: true });
  }
  function closeAC() {
    if (ac) { ac.popup.remove(); ac = null; }
    if (ta._acHandler) { ta.removeEventListener('keydown', ta._acHandler, { capture: true }); ta._acHandler = null; }
  }
  ta.addEventListener('blur', () => setTimeout(closeAC, 150));

  /* --- format --- */
  function formatSQL(sql) {
    const keywords = ['SELECT', 'FROM', 'WHERE', 'AND', 'OR', 'INNER JOIN', 'LEFT JOIN', 'RIGHT JOIN', 'CROSS JOIN', 'GROUP BY', 'ORDER BY', 'HAVING', 'LIMIT', 'UNION', 'UNION ALL', 'INSERT INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE FROM', 'ON', 'JOIN', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END'];
    let s = sql.replace(/\s+/g, ' ');
    for (const k of keywords) {
      s = s.replace(new RegExp('\\s*' + k.replace(/ /g, '\\s+') + '\\s', 'gi'), (m) => {
        const isSub = ['AND', 'OR', 'ON', 'WHEN', 'THEN', 'ELSE'].includes(k.toUpperCase());
        return (isSub ? '\n  ' : '\n') + k.toUpperCase() + ' ';
      });
    }
    s = s.replace(/,\s*(?![^(]*\))/g, ',\n  ');
    return s.trim();
  }

  /* --- toolbar & layout --- */
  const runBtn = el('button', { class: 'mini-btn' }, ic('play'), el('span', { text: t('ed.execute') }));
  const runSelBtn = el('button', { class: 'mini-btn' }, ic('bolt'), el('span', { text: t('ed.execSel') }));
  const explainBtn = el('button', { class: 'mini-btn', title: t('ed.explain') }, ic('chart'), el('span', { text: 'EXPLAIN' }));
  const analyzeBtn = el('button', { class: 'mini-btn', title: t('ed.analyze') }, ic('bolt'), el('span', { text: 'ANALYZE' }));
  const openBtn = el('button', { class: 'mini-btn', title: t('ed.open') }, ic('folder'));
  const saveBtn = el('button', { class: 'mini-btn', title: t('ed.savefile') }, ic('save'));
  const fmtBtn = el('button', { class: 'mini-btn' }, ic('format'), el('span', { text: t('ed.format') }));
  const snippetBtn = el('button', { class: 'mini-btn' }, ic('bookmark'), el('span', { text: t('ed.saveSnippet') }));
  const clearBtn = el('button', { class: 'mini-btn icon-only', html: ic('x').innerHTML, title: 'Clear' });

  runBtn.addEventListener('click', () => exec(false));
  runSelBtn.addEventListener('click', () => exec(true));
  explainBtn.addEventListener('click', () => runExplain(false));
  analyzeBtn.addEventListener('click', () => runExplain(true));
  openBtn.addEventListener('click', doOpenFile);
  saveBtn.addEventListener('click', doSaveFile);
  fmtBtn.addEventListener('click', () => { ta.value = formatSQL(ta.value); sync(); });
  snippetBtn.addEventListener('click', () => snippetDialog({ sql: ta.value || ta.selectionStart !== ta.selectionEnd ? ta.value.slice(ta.selectionStart, ta.selectionEnd) || ta.value : ta.value }));
  clearBtn.addEventListener('click', () => { ta.value = ''; currentFile = ''; sync(); });

  const results = el('div', { class: 'results' });
  view.append(
    el('div', { class: 'sqlview' },
      el('div', { class: 'ed-toolbar' }, runBtn, runSelBtn, el('span', { class: 'st-sep' }), explainBtn, analyzeBtn,
        el('span', { class: 'st-sep' }), openBtn, saveBtn, fmtBtn, snippetBtn, el('span', { class: 'st-sep' }), clearBtn,
        el('span', { style: { flex: '1' } }),
        el('span', { class: 'muted', style: { fontSize: '11px' }, text: (db ? '🗄 ' + db : '') })),
      edWrap,
      results));

  setTimeout(() => { ta.focus(); sync(); }, 40);
  tab.onRefresh = () => {};
  tab.onClose = () => { closeAC(); };

  /* --- execution --- */
  function currentSQL(selectionOnly) {
    let sql = selectionOnly ? ta.value.slice(ta.selectionStart, ta.selectionEnd) : ta.value;
    if (!selectionOnly && ta.selectionStart !== ta.selectionEnd) sql = ta.value.slice(ta.selectionStart, ta.selectionEnd);
    return sql.trim();
  }

  function firstStatement(text) {
    const s = text.replace(/;\s*$/, '');
    const parts = s.split(';').map(x => x.trim()).filter(Boolean);
    return parts[0] || s.trim();
  }

  async function exec(selectionOnly) {
    const sql = currentSQL(selectionOnly);
    if (sql) await executeSql(sql);
  }

  async function runExplain(analyze) {
    let stmt = firstStatement(currentSQL(false));
    if (!stmt) return;
    if (/^EXPLAIN\b/i.test(stmt)) stmt = stmt.replace(/^EXPLAIN\s+(ANALYZE\s+)?/i, '');
    if (/^ANALYZE\b/i.test(stmt)) stmt = stmt.replace(/^ANALYZE\s+/i, '');
    // MariaDB: `ANALYZE stmt` — MySQL 8+: `EXPLAIN ANALYZE stmt`
    const info = state.active.get(connId)?.info;
    const isMaria = /mariadb/i.test(info?.flavor || '');
    const prefix = analyze ? (isMaria ? 'ANALYZE ' : 'EXPLAIN ANALYZE ') : 'EXPLAIN ';
    await executeSql(prefix + stmt, t('ed.explain'));
  }

  async function executeSql(sql, label) {
    if (running) return;
    if (state.settings.confirmDestructive && /^\s*(UPDATE|DELETE)\b/i.test(sql) && !/\bWHERE\b/i.test(sql)) {
      const go = await import('./utils.js').then(u => u.confirmBox(t('ed.nowhere.title'), t('ed.nowhere.body'), true));
      if (!go) return;
    }
    running = true;
    lastSQL = sql;
    runBtn.disabled = true;
    runBtn.innerHTML = ic('clock').outerHTML + el('span', { text: (label || t('ed.execute')) + ' — ' + t('ed.running') }).outerHTML;
    results.innerHTML = '';

    try {
      const res = await window.wjds.dbQuery(connId, sql, null, { timeoutSec: state.settings.queryTimeout, db });
      showResults(res);
      pushHistory(sql, true, res.ms);
    } catch (err) {
      const ex = explainError(err);
      logResult('✗ ' + ex.msg, false, ex.hint);
      results.append(el('div', { class: 'res-msg', style: { color: 'var(--danger)' }, text: ex.msg },
        ex.hint ? el('div', { style: { color: 'var(--text-dim)', whiteSpace: 'pre-line', marginTop: '6px' }, text: '💡 ' + ex.hint }) : null));
      pushHistory(sql, false, 0);
    }
    running = false;
    runBtn.disabled = false;
    runBtn.innerHTML = ic('play').outerHTML + el('span', { text: t('ed.execute') }).outerHTML;
  }

  function showResults(res) {
    const { results: sets, ms } = res;
    let totalRows = 0;
    const hasMulti = sets.length > 1;
    const tabBar = el('div', { class: 'res-tabs' });
    const bodyWrap = el('div', { style: { flex: '1', minHeight: '0', position: 'relative' } });
    results.append(tabBar, bodyWrap);

    sets.forEach((set, i) => {
      const isSelect = set.fields && set.fields.length > 0 && !(set.rows && set.rows.length === 0 && set.fields.length === 0 && res.results.affected !== undefined);
      let affected = null;
      if (!set.fields || !set.fields.length) {
        // DML result — mysql2 okPacket normalizes to rows=[] fields=[]; get affected from message?
      }
      const tabBtn = el('div', { class: 'res-tab' + (i === 0 ? ' active' : '') },
        `Result ${i + 1}${set.fields && set.fields.length ? ` · ${set.rows.length}` : ''}`);
      tabBar.append(tabBtn);
      const pane = el('div', { style: { position: 'absolute', inset: '0', display: i === 0 ? 'flex' : 'none', flexDirection: 'column' } });
      bodyWrap.append(pane);
      tabBtn.addEventListener('click', () => {
        tabBar.querySelectorAll('.res-tab').forEach(x => x.classList.remove('active'));
        tabBtn.classList.add('active');
        [...bodyWrap.children].forEach(p => p.style.display = 'none');
        pane.style.display = 'flex';
      });

      if (set.fields && set.fields.length) {
        totalRows += set.rows.length;
        const grid = new DataGrid(pane, {});
        grid.setData(set.fields, set.rows);
        const bar = el('div', { style: { display: 'flex', gap: '6px', padding: '6px 10px', borderTop: '1px solid var(--border)', background: 'var(--bg1)', alignItems: 'center' } },
          el('span', { class: 'muted', text: `${fmtRows(set.rows.length)} · ${ms} ms` }),
          el('span', { style: { flex: '1' } }),
          el('button', { class: 'mini-btn', onclick: () => exportSet(set) }, ic('export'), el('span', { text: t('grid.export') })));
        pane.append(bar);
      } else {
        pane.append(el('div', { class: 'res-msg', text: 'OK' }));
      }
    });

    logResult(`✓ ${sets.length} statement(s), ${fmtRows(totalRows)} row(s) · ${ms} ms`, true);
    window.wjds.appTime?.();
    setStatusTimeSafe(ms);
    pushHistory(lastSQL, true, ms);
  }

  function fmtRows(n) { return n + ' row' + (n === 1 ? '' : 's'); }

  /* --- open / save .sql files --- */
  let currentFile = '';

  async function doOpenFile() {
    const f = await window.wjds.pickFile({ title: t('ed.open'), filters: [{ name: 'SQL', extensions: ['sql', 'txt'] }, { name: 'All', extensions: ['*'] }] });
    if (!f) return;
    try {
      const content = await window.wjds.readFile(f, 50);
      ta.value = content;
      currentFile = f;
      sync();
      toast(t('ed.opened', { f: f.split(/[\\/]/).pop() }), 'ok');
    } catch (err) { toast(t('msg.error'), 'err', err.message); }
  }

  async function doSaveFile() {
    let f = currentFile;
    try {
      if (!f) {
        f = await window.wjds.pickSaveFile({ title: t('ed.savefile'), defaultPath: 'query.sql', filters: [{ name: 'SQL', extensions: ['sql'] }] });
        if (!f) return;
        if (!/\.sql$/i.test(f)) f += '.sql';
      }
      await window.wjds.writeFile(f, ta.value);
      currentFile = f;
      tab.setTitle(f.split(/[\\/]/).pop());
      toast(t('msg.savedfile', { f }), 'ok');
    } catch (err) { toast(t('msg.error'), 'err', err.message); }
  }

  function setStatusTimeSafe(ms) {
    import('./app.js').then(m => m.setStatusTime(ms));
  }

  function exportSet(set) {
    import('./importer.js').then(m => {
      const rows = set.rows, fields = set.fields;
      m.exportRowsDialog(fields, rows, 'result_' + (db || 'query'));
    });
  }

  async function pushHistory(sql, ok, ms) {
    try {
      await window.wjds.addHistory({ sql: sql.slice(0, 4000), ok, ms, database: db || '' });
    } catch { /* non-fatal */ }
  }
}

/* ---------- snippet + history bridges (main store IPC) ---------- */
export async function snippetDialog({ sql = '', onSaved } = {}) {
  const { showModal } = await import('./utils.js');
  const name = el('input', { type: 'text', placeholder: 'My query' });
  const ta = el('textarea', { rows: '8', style: { width: '100%', fontFamily: 'var(--font-mono)', fontSize: '12.5px' }, text: sql });
  const r = showModal({
    title: t('ed.saveSnippet'), icon: 'bookmark',
    body: el('div', { class: 'form' },
      el('div', { class: 'form-row' }, el('label', { text: t('ds.colname') }), name),
      el('div', {}, ta)),
    footer: [
      el('button', { class: 'btn', onclick: () => r.close(), text: t('conn.cancel') }),
      el('button', { class: 'btn primary', onclick: async () => {
        await window.wjds.saveSnippet({ name: name.value || 'Snippet', sql: ta.value });
        toast(t('msg.copied') + ' ✓', 'ok');
        r.close();
        onSaved && onSaved();
      } }, ic('save'), t('conn.save')),
    ],
  });
}

export async function renderSnippetsList() {
  const list = $('#snippet-list');
  if (!list) return;
  list.innerHTML = '';
  const items = await window.wjds.listSnippets();
  if (!items.length) { list.append(el('div', { class: 'bp-item', text: '—' })); return; }
  for (const s of items) {
    list.append(el('div', {
      class: 'bp-item',
      title: s.sql.slice(0, 300),
      onclick: async () => {
        const { activeTab } = await import('./app.js');
        const tab = activeTab();
        if (tab && tab.type === 'query') tab.payload.setSQL(s.sql);
        else openEditor();
        await copyText(s.sql);
      },
      oncontextmenu: (e) => {
        e.preventDefault();
        showContextMenu(e.clientX, e.clientY, [
          { label: t('bp.clear'), icon: 'trash', danger: true, action: async () => { await window.wjds.deleteSnippet(s.id); renderSnippetsList(); } },
        ]);
      },
    }, ic('bookmark', 'ticon ic-acc'), el('span', { text: ' ' + s.name }),
      el('span', { class: 'muted', text: '  ' + s.sql.replace(/\s+/g, ' ').slice(0, 70) })));
  }
}

/** Show routine DDL in modal (from tree). */
export async function showRoutineDDL(connId, db, name, type) {
  const { showModal, toast } = await import('./utils.js');
  try {
    const r = await window.wjds.dbQuery(connId,
      `SELECT ROUTINE_DEFINITION FROM information_schema.ROUTINES WHERE ROUTINE_SCHEMA='${db.replace(/'/g, "''")}' AND ROUTINE_NAME='${name.replace(/'/g, "''")}' AND ROUTINE_TYPE='${type}'`);
    const def = r.results[0].rows[0]?.ROUTINE_DEFINITION || '--';
    showModal({ title: `${type} ${db}.${name}`, icon: 'proc', body: el('div', { class: 'ddl-code', text: def }), width: '720px' });
  } catch (err) { toast(t('msg.error'), 'err', err.message); }
}

/* Exec shortcut dispatcher from menu */
export function execActiveEditor(selectionOnly) {
  import('./app.js').then(({ activeTab }) => {
    const tab = activeTab();
    if (tab && tab.type === 'query') {
      const btn = tab.viewEl.querySelector('.ed-toolbar .mini-btn');
      btn && btn.click();
    }
  });
}
