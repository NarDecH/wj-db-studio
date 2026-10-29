'use strict';
/**
 * WJ DB Studio — persistent configuration & connection store.
 * Everything lives in a single JSON file under Electron userData.
 * Passwords are encrypted with Electron safeStorage (DPAPI on Windows).
 * (c) 2026 Weeradech Jessadarom — MIT
 */
const { app, safeStorage } = require('electron');
const fs = require('fs');
const path = require('path');

const DEFAULTS = {
  version: 1,
  settings: {
    language: 'th',            // 'th' | 'en'
    theme: 'dark',             // 'dark' | 'light'
    fontSize: 13,
    editorFontSize: 14,
    maxRows: 500,              // grid page size
    queryTimeout: 30,          // seconds
    autoUpdate: true,
    confirmDestructive: true,  // ask before DROP/TRUNCATE/DELETE
    showToolTips: true,
    autoComplete: true,
    sqlLog: true,              // record every executed statement to local log file
    sqlLogDays: 30,            // retention for sql logs
    sessionDatabase: true,     // remember last selected db per connection
  },
  connections: [],             // saved connection profiles
  history: [],                 // executed SQL (capped)
  snippets: [],                // saved SQL snippets
  tourDone: false,
};

const HISTORY_LIMIT = 300;

class Store {
  constructor() {
    this.file = path.join(app.getPath('userData'), 'config.json');
    this.data = null;
    this.load();
  }

  load() {
    let loaded = null;
    try {
      loaded = JSON.parse(fs.readFileSync(this.file, 'utf8'));
    } catch {
      loaded = {};
    }
    // Deep-merge over defaults so new keys appear after upgrade
    this.data = {
      ...DEFAULTS,
      ...loaded,
      settings: { ...DEFAULTS.settings, ...(loaded.settings || {}) },
      connections: Array.isArray(loaded.connections) ? loaded.connections : [],
      history: Array.isArray(loaded.history) ? loaded.history : [],
      snippets: Array.isArray(loaded.snippets) ? loaded.snippets : [],
    };
  }

  save() {
    const tmp = this.file + '.tmp';
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    fs.writeFileSync(tmp, JSON.stringify(this.data, null, 2), 'utf8');
    fs.renameSync(tmp, this.file);
  }

  // ---- settings ----
  getSettings() { return { ...this.data.settings }; }

  setSettings(patch) {
    this.data.settings = { ...this.data.settings, ...(patch || {}) };
    this.save();
    return this.getSettings();
  }

  // ---- connections ----
  listConnections() {
    // Never ship raw secrets; renderer gets a flag only.
    return this.data.connections.map(c => ({
      ...c,
      password: undefined,
      passwordStored: !!c.passwordEnc,
    }));
  }

  saveConnection(conn) {
    const list = this.data.connections;
    const idx = list.findIndex(c => c.id === conn.id);
    const existing = idx >= 0 ? list[idx] : null;
    const clean = {
      id: conn.id || 'c_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
      name: String(conn.name || 'Connection').slice(0, 80),
      group: String(conn.group || '').slice(0, 60),
      host: String(conn.host || '127.0.0.1').slice(0, 200),
      port: parseInt(conn.port, 10) || 3306,
      user: String(conn.user || 'root').slice(0, 100),
      ssl: !!conn.ssl,
      sslVerify: !!conn.sslVerify,
      sslCa: conn.sslCa ? String(conn.sslCa) : '',
      readOnly: !!conn.readOnly,
      ssh: {
        enabled: !!(conn.ssh && conn.ssh.enabled),
        host: conn.ssh ? String(conn.ssh.host || '') : '',
        port: conn.ssh ? parseInt(conn.ssh.port, 10) || 22 : 22,
        user: conn.ssh ? String(conn.ssh.user || '') : '',
        privateKeyPath: conn.ssh ? String(conn.ssh.privateKeyPath || '') : '',
      },
      createdAt: existing ? existing.createdAt : new Date().toISOString(),
      lastUsed: new Date().toISOString(),
    };
    // Password policy: keep old encrypted value unless a new password was provided.
    if (typeof conn.password === 'string' && conn.password.length > 0) {
      clean.passwordEnc = this._encrypt(conn.password);
    } else if (conn.clearPassword) {
      clean.passwordEnc = '';
    } else if (existing) {
      clean.passwordEnc = existing.passwordEnc || '';
    } else {
      clean.passwordEnc = '';
    }
    if (conn.ssh && typeof conn.ssh.password === 'string' && conn.ssh.password.length > 0) {
      clean.ssh.passwordEnc = this._encrypt(conn.ssh.password);
    } else if (existing && existing.ssh && existing.ssh.passwordEnc) {
      clean.ssh.passwordEnc = existing.ssh.passwordEnc;
    } else {
      clean.ssh.passwordEnc = '';
    }
    if (idx >= 0) list[idx] = clean; else list.push(clean);
    this.save();
    return { ...clean, password: undefined, passwordStored: !!clean.passwordEnc, ssh: { ...clean.ssh, password: undefined, passwordStored: !!clean.ssh.passwordEnc } };
  }

  deleteConnection(id) {
    this.data.connections = this.data.connections.filter(c => c.id !== id);
    this.save();
  }

  /** Full connection record for the DB layer (decrypted secrets included). */
  getConnectionSecret(id) {
    const c = this.data.connections.find(x => x.id === id);
    if (!c) return null;
    return {
      ...c,
      password: c.passwordEnc ? this._decrypt(c.passwordEnc) : '',
      ssh: {
        ...c.ssh,
        password: c.ssh && c.ssh.passwordEnc ? this._decrypt(c.ssh.passwordEnc) : '',
      },
    };
  }

  touchConnection(id) {
    const c = this.data.connections.find(x => x.id === id);
    if (c) { c.lastUsed = new Date().toISOString(); this.save(); }
  }

  // ---- history ----
  addHistory(entry) {
    // entry: {sql, connection, database, ok, ms, ts}
    this.data.history.unshift({
      ...entry,
      ts: entry.ts || new Date().toISOString(),
    });
    if (this.data.history.length > HISTORY_LIMIT) this.data.history.length = HISTORY_LIMIT;
    this.save();
  }

  listHistory() { return this.data.history.slice(0, HISTORY_LIMIT); }
  clearHistory() { this.data.history = []; this.save(); }

  // ---- snippets ----
  listSnippets() { return this.data.snippets; }
  saveSnippet(snippet) {
    const list = this.data.snippets;
    const item = {
      id: snippet.id || 's_' + Date.now().toString(36),
      name: String(snippet.name || 'Snippet').slice(0, 80),
      sql: String(snippet.sql || ''),
      createdAt: new Date().toISOString(),
    };
    const idx = list.findIndex(s => s.id === item.id);
    if (idx >= 0) list[idx] = item; else list.unshift(item);
    this.save();
    return item;
  }
  deleteSnippet(id) { this.data.snippets = this.data.snippets.filter(s => s.id !== id); this.save(); }

  // ---- misc ----
  setTourDone() { this.data.tourDone = true; this.save(); }

  // ---- session (restorable tabs) ----
  getSession() { return this.data.session || { tabs: [] }; }
  saveSession(session) { this.data.session = { tabs: (session.tabs || []).slice(0, 30) }; this.save(); }

  _encrypt(plain) {
    try {
      if (!safeStorage || !safeStorage.isEncryptionAvailable()) return '';
      return 'enc1:' + safeStorage.encryptString(plain).toString('base64');
    } catch { return ''; }
  }

  _decrypt(blob) {
    try {
      if (!blob || !blob.startsWith('enc1:')) return '';
      return safeStorage.decryptString(Buffer.from(blob.slice(5), 'base64'));
    } catch { return ''; }
  }
}

module.exports = { Store };
