'use strict';
/**
 * WJ DB Studio — SQL activity log.
 * Every statement executed through the app is appended to a JSONL file
 * per day: <userData>/logs/sql-YYYY-MM-DD.log. Local only, never sent anywhere.
 * Values of parameterized statements are NOT written (placeholder text only).
 * (c) 2026 Weeradech Jessadarom — MIT
 */
const fs = require('fs');
const path = require('path');

const MAX_SQL_LEN = 4000;      // truncate huge statements in the file
const FLUSH_MS = 400;          // batch writes

class SQLLog {
  constructor({ userDataDir, store }) {
    this.dir = path.join(userDataDir, 'logs');
    this.store = store;
    this.queue = [];
    this.timer = null;
    fs.mkdirSync(this.dir, { recursive: true });
  }

  enabled() {
    const s = this.store.getSettings();
    return s.sqlLog !== false; // default on
  }

  /**
   * entry: {type:'query'|'exec'|'io'|'connect'|'disconnect', connId, conn,
   *         db, sql, ms, rows, ok, error}
   */
  write(entry) {
    if (!this.enabled()) return;
    const clean = {
      ts: new Date().toISOString(),
      type: entry.type || 'query',
      conn: String(entry.conn || entry.connId || '').slice(0, 80),
      db: entry.db ? String(entry.db).slice(0, 64) : '',
      sql: entry.sql ? String(entry.sql).slice(0, MAX_SQL_LEN) : '',
      ms: entry.ms != null ? entry.ms : null,
      rows: entry.rows != null ? entry.rows : null,
      ok: entry.ok !== false,
    };
    if (!clean.ok && entry.error) clean.error = String(entry.error).slice(0, 500);
    this.queue.push(JSON.stringify(clean));
    if (!this.timer) this.timer = setTimeout(() => this.flush(), FLUSH_MS);
  }

  flush() {
    clearTimeout(this.timer);
    this.timer = null;
    if (!this.queue.length) return;
    const lines = this.queue;
    this.queue = [];
    try {
      const file = this._todayFile();
      fs.appendFileSync(file, lines.join('\n') + '\n', 'utf8');
    } catch { /* logging must never break the app */ }
  }

  _todayFile() {
    const d = new Date();
    const p = (x) => String(x).padStart(2, '0');
    return path.join(this.dir, `sql-${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}.log`);
  }

  /** Read latest entries (today's file, or the most recent file). */
  read(limit = 400) {
    this.flush();
    let file = this._todayFile();
    if (!fs.existsSync(file)) {
      const files = this.list().sort();
      if (!files.length) return { file: null, entries: [] };
      file = path.join(this.dir, files[files.length - 1]);
    }
    try {
      const text = fs.readFileSync(file, 'utf8');
      const lines = text.split('\n').filter(Boolean);
      const entries = lines.slice(-limit).map(l => {
        try { return JSON.parse(l); } catch { return { ts: '', type: 'corrupt', sql: l.slice(0, 200) }; }
      });
      return { file: path.basename(file), entries: entries.reverse() };
    } catch {
      return { file: null, entries: [] };
    }
  }

  list() {
    try { return fs.readdirSync(this.dir).filter(f => /^sql-\d{4}-\d{2}-\d{2}\.log$/.test(f)); }
    catch { return []; }
  }

  /** Delete log files older than `days`. */
  prune(days = 30) {
    if (!days || days < 1) return;
    const cutoff = Date.now() - days * 86400000;
    for (const f of this.list()) {
      const m = f.match(/sql-(\d{4})-(\d{2})-(\d{2})\.log/);
      if (!m) continue;
      const t = new Date(`${m[1]}-${m[2]}-${m[3]}T00:00:00Z`).getTime();
      if (t < cutoff) { try { fs.unlinkSync(path.join(this.dir, f)); } catch {} }
    }
  }

  openFolder() { return this.dir; }
}

module.exports = { SQLLog };
