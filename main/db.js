'use strict';
/**
 * WJ DB Studio — MySQL / MariaDB engine layer.
 * Pools, introspection, DDL, data editing, import/export/backup (streamed).
 * (c) 2026 Weeradech Jessadarom — MIT
 */
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const net = require('net');

class DBManager {
  constructor(store, sqllog, notify) {
    this.store = store;
    this.sqllog = sqllog || null;
    this.notify = notify || (() => {});
    this.pools = new Map();      // connId -> mysql2 pool
    this.tunnels = new Map();    // connId -> ssh tunnel {client, server, port}
    this.flags = new Map();      // connId -> { readOnly }
    this.keepalive = new Map();  // connId -> interval
    this.seq = 0;
  }

  static RO_OK = /^\s*(SELECT|SHOW|DESCRIBE|DESC|EXPLAIN|ANALYZE|USE|SET|WITH|HELP|DO)\b/i;

  _isReadOnly(connId) { return !!this.flags.get(connId)?.readOnly; }

  clearKeepAlive(connId) {
    const t = this.keepalive.get(connId);
    if (t) { clearInterval(t); this.keepalive.delete(connId); }
  }

  /** Central SQL audit hook — every statement passes through here. */
  _log(type, connId, sql, ms, rows, ok, error, db) {
    if (!this.sqllog) return;
    const meta = this.store ? this.store.data.connections.find(c => c.id === connId) : null;
    this.sqllog.write({
      type, connId, conn: meta ? meta.name : connId, db,
      sql, ms, rows, ok, error,
    });
  }

  // ================= connection =================

  async connect(connId) {
    if (this.pools.has(connId)) return this.serverInfo(connId);
    const secret = this.store.getConnectionSecret(connId);
    if (!secret) throw new Error('Unknown connection id: ' + connId);

    let host = secret.host;
    let port = secret.port;

    // Optional SSH tunnel (local forward)
    if (secret.ssh && secret.ssh.enabled && secret.ssh.host) {
      const tunnel = await this._openTunnel(secret);
      host = '127.0.0.1';
      port = tunnel.port;
      this.tunnels.set(connId, tunnel);
    }

    const poolOpts = {
      host,
      port,
      user: secret.user,
      password: secret.password || undefined,
      connectionLimit: 8,
      connectTimeout: 10000,
      waitForConnections: true,
      dateStrings: ['DATE', 'DATETIME', 'TIMESTAMP'],
      charset: 'utf8mb4_general_ci',
      multipleStatements: true,
      timezone: 'Z',
      ...(secret.ssl ? {
        ssl: secret.sslCa
          ? { ca: fs.readFileSync(secret.sslCa), rejectUnauthorized: false, minVersion: 'TLSv1.2' }
          : { rejectUnauthorized: false, minVersion: 'TLSv1.2' },
      } : {}),
    };

    const pool = mysql.createPool(poolOpts);
    // Validate the credentials right away
    await pool.query('SELECT 1');
    this.pools.set(connId, pool);
    this.flags.set(connId, { readOnly: !!secret.readOnly });
    this.store.touchConnection(connId);
    // keep-alive: detect dead connections every 30s
    this.clearKeepAlive(connId);
    this.keepalive.set(connId, setInterval(() => {
      const p = this.pools.get(connId);
      if (!p) return;
      p.query('SELECT 1').catch(async () => {
        await this.close(connId);
        this.notify('db:event', { type: 'lost', connId });
      });
    }, 30000));
    const info = await this.serverInfo(connId);
    this._log('connect', connId, `-- connect ${info.flavor} ${info.version} @ ${secret.host}:${secret.port}${secret.readOnly ? ' [READ-ONLY]' : ''}`, null, null, true, null, null);
    return info;
  }

  async _openTunnel(secret) {
    const { Client } = require('ssh2');
    const ssh = secret.ssh;
    return new Promise((resolve, reject) => {
      const client = new Client();
      const fail = (err) => { try { client.end(); } catch {} reject(new Error('SSH: ' + (err.message || err))); };
      client.on('error', fail);
      client.on('ready', () => {
        const server = net.createServer((local) => {
          client.forwardOut('127.0.0.1', 0, secret.host, secret.port, (err, stream) => {
            if (err) { local.destroy(); return; }
            local.pipe(stream).pipe(local);
          });
        });
        server.listen(0, '127.0.0.1', () => {
          resolve({ client, server, port: server.address().port });
        });
        server.on('error', fail);
      });
      const auth = ssh.privateKeyPath
        ? { host: ssh.host, port: ssh.port, username: ssh.user, privateKey: fs.readFileSync(ssh.privateKeyPath), passphrase: ssh.password || undefined }
        : { host: ssh.host, port: ssh.port, username: ssh.user, password: ssh.password || '' };
      client.connect({ ...auth, readyTimeout: 15000, keepaliveInterval: 10000 });
    });
  }

  async close(connId) {
    this._log('disconnect', connId, '-- disconnect', null, null, true, null, null);
    this.clearKeepAlive(connId);
    this.flags.delete(connId);
    const pool = this.pools.get(connId);
    if (pool) { try { await pool.end(); } catch {} this.pools.delete(connId); }
    const tunnel = this.tunnels.get(connId);
    if (tunnel) {
      try { tunnel.server.close(); } catch {}
      try { tunnel.client.end(); } catch {}
      this.tunnels.delete(connId);
    }
  }

  async closeAll() { for (const id of [...this.pools.keys()]) await this.close(id); }

  pool(connId) {
    const p = this.pools.get(connId);
    if (!p) throw new Error('Not connected (no pool for ' + connId + ')');
    return p;
  }

  // ================= query helpers =================

  /** Normalize mysql2 result(s) into [{rows, fields}] */
  _normalize([rows, fields]) {
    if (!fields) return [{ rows: [], fields: [] }];
    if (Array.isArray(fields) && fields.length > 0 && Array.isArray(fields[0])) {
      // multiple statements
      const fsArr = fields, rsArr = Array.isArray(rows) ? rows : [];
      return fsArr.map((f, i) => ({ rows: Array.isArray(rsArr[i]) ? rsArr[i] : [], fields: f || [] }));
    }
    return [{ rows: rows || [], fields }];
  }

  async query(connId, sql, params = null, opts = {}) {
    if (this._isReadOnly(connId) && !DBManager.RO_OK.test(sql)) {
      throw new Error('🔒 This connection is READ-ONLY (SELECT/SHOW/EXPLAIN only)');
    }
    const pool = this.pool(connId);
    const t0 = Date.now();
    const qopts = { timeout: (opts.timeoutSec || 30) * 1000 };
    try {
      let results;
      if (params) {
        const [rows, fields] = await pool.query({ ...qopts, sql, values: params });
        results = this._normalize([rows, fields]);
      } else {
        const [rows, fields] = await pool.query({ ...qopts, sql });
        results = this._normalize([rows, fields]);
      }
      const ms = Date.now() - t0;
      const rowCount = results.reduce((n, r) => n + (r.rows ? r.rows.length : 0), 0);
      this._log('query', connId, sql, ms, rowCount, true, null, opts.db);
      return { results, ms };
    } catch (err) {
      if (!opts._retry && /PROTOCOL_CONNECTION_LOST|ECONNRESET|Not connected|Connection lost|EPIPE/i.test(err.message || '')) {
        try { await this.close(connId); await this.connect(connId); } catch {}
        return this.query(connId, sql, params, { ...opts, _retry: true });
      }
      this._log('query', connId, sql, Date.now() - t0, null, false, err.message, opts.db);
      throw err;
    }
  }

  async exec(connId, sql, opts = {}) {
    if (this._isReadOnly(connId) && !DBManager.RO_OK.test(sql)) {
      throw new Error('🔒 This connection is READ-ONLY (SELECT/SHOW/EXPLAIN only)');
    }
    const pool = this.pool(connId);
    const t0 = Date.now();
    try {
      const [res] = await pool.query({ sql, timeout: (opts.timeoutSec || 60) * 1000 });
      const ms = Date.now() - t0;
      this._log('exec', connId, sql, ms, res.affectedRows ?? null, true, null, opts.db);
      return { affected: res.affectedRows ?? null, insertId: res.insertId ?? null, ms };
    } catch (err) {
      if (!opts._retry && /PROTOCOL_CONNECTION_LOST|ECONNRESET|Not connected|Connection lost|EPIPE/i.test(err.message || '')) {
        try { await this.close(connId); await this.connect(connId); } catch {}
        return this.exec(connId, sql, { ...opts, _retry: true });
      }
      this._log('exec', connId, sql, Date.now() - t0, null, false, err.message, opts.db);
      throw err;
    }
  }

  // ================= identifiers & escaping =================

  static escId(name) {
    if (name === null || name === undefined) return 'NULL';
    return '`' + String(name).replace(/`/g, '``') + '`';
  }

  static escValue(v) {
    if (v === null || v === undefined) return 'NULL';
    if (typeof v === 'number') return Number.isFinite(v) ? String(v) : 'NULL';
    if (typeof v === 'boolean') return v ? '1' : '0';
    if (Buffer.isBuffer(v)) return 'X' + DBManager.hexLiteral(v);
    if (typeof v === 'object' && v.toISOString) { // Date
      return "'" + v.toISOString().slice(0, 19).replace('T', ' ') + "'";
    }
    let s = String(v);
    s = s.replace(/[\\]/g, '\\\\').replace(/'/g, "\\'").replace(/\0/g, '\\0')
         .replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\x1a/g, '\\Z');
    return "'" + s + "'";
  }

  static hexLiteral(buf) {
    let out = "'";
    for (const b of buf) out += b.toString(16).padStart(2, '0');
    return out + "'";
  }

  static qRef(db, table, col) {
    let s = DBManager.escId(db);
    if (table !== undefined) s += '.' + DBManager.escId(table);
    if (col !== undefined) s += '.' + DBManager.escId(col);
    return s;
  }

  // ================= introspection =================

  async serverInfo(connId) {
    const r = await this.query(connId,
      "SELECT VERSION() AS v, @@version_comment AS vc, @@hostname AS hn, @@port AS port, @@lower_case_table_names AS lctn", {}, { timeoutSec: 10 });
    const row = r.results[0].rows[0] || {};
    let status = {};
    try {
      const s = await this.query(connId, "SHOW GLOBAL STATUS WHERE Variable_name IN ('Uptime','Threads_connected','Questions')", {}, { timeoutSec: 10 });
      status = Object.fromEntries(s.results[0].rows.map(x => [x.Variable_name, x.Value]));
    } catch {}
    const server = this._detectFlavor(row.v, row.vc);
    return {
      version: row.v || '?',
      comment: row.vc || '',
      hostname: row.hn || '',
      port: row.port,
      flavor: server.flavor,
      uptimeSec: parseInt(status.Uptime || '0', 10),
      threads: parseInt(status.Threads_connected || '0', 10),
      questions: parseInt(status.Questions || '0', 10),
    };
  }

  _detectFlavor(version, comment) {
    const v = (version || '') + ' ' + (comment || '');
    if (/mariadb/i.test(v)) return { flavor: 'MariaDB', label: 'MariaDB' };
    if (/percona/i.test(v)) return { flavor: 'MySQL', label: 'MySQL (Percona)' };
    if (/aurora/i.test(v)) return { flavor: 'MySQL', label: 'MySQL (Aurora)' };
    return { flavor: 'MySQL', label: 'MySQL' };
  }

  async listDatabases(connId) {
    const r = await this.query(connId,
      "SELECT SCHEMA_NAME AS name, COALESCE(SUM(T.DATA_LENGTH+T.INDEX_LENGTH),0) AS size, COUNT(T.TABLE_NAME) AS tables " +
      "FROM information_schema.SCHEMATA S LEFT JOIN information_schema.TABLES T ON T.TABLE_SCHEMA=S.SCHEMA_NAME " +
      "GROUP BY SCHEMA_NAME ORDER BY SCHEMA_NAME", {}, { timeoutSec: 15 });
    return r.results[0].rows.map(x => ({ name: x.name, size: Number(x.size || 0), tables: Number(x.tables || 0) }));
  }

  async listObjects(connId, db) {
    const r = await this.query(connId,
      "SELECT TABLE_NAME, TABLE_TYPE, ENGINE, TABLE_ROWS, ROUND((DATA_LENGTH+INDEX_LENGTH)) AS size, TABLE_COMMENT " +
      "FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? ORDER BY TABLE_NAME", [db], { timeoutSec: 15 });
    const tables = [], views = [];
    for (const x of r.results[0].rows) {
      (x.TABLE_TYPE === 'VIEW' ? views : tables).push({
        name: x.TABLE_NAME, engine: x.ENGINE || '', rows: Number(x.TABLE_ROWS || 0),
        size: Number(x.size || 0), comment: x.TABLE_COMMENT || '',
      });
    }
    return { tables, views };
  }

  async listRoutines(connId, db) {
    const r = await this.query(connId,
      "SELECT ROUTINE_NAME, ROUTINE_TYPE, DTD_IDENTIFIER, CREATED FROM information_schema.ROUTINES " +
      "WHERE ROUTINE_SCHEMA = ? ORDER BY ROUTINE_TYPE, ROUTINE_NAME", [db], { timeoutSec: 15 });
    return r.results[0].rows.map(x => ({
      name: x.ROUTINE_NAME, type: x.ROUTINE_TYPE, returns: x.DTD_IDENTIFIER || '', created: x.CREATED,
    }));
  }

  async listTriggers(connId, db) {
    const r = await this.query(connId,
      "SELECT TRIGGER_NAME, EVENT_MANIPULATION, EVENT_OBJECT_TABLE, ACTION_TIMING FROM information_schema.TRIGGERS " +
      "WHERE TRIGGER_SCHEMA = ? ORDER BY TRIGGER_NAME", [db], { timeoutSec: 15 });
    return r.results[0].rows.map(x => ({
      name: x.TRIGGER_NAME, event: x.EVENT_MANIPULATION, table: x.EVENT_OBJECT_TABLE, timing: x.ACTION_TIMING,
    }));
  }

  async listEvents(connId, db) {
    try {
      const r = await this.query(connId,
        "SELECT EVENT_NAME, STATUS, EVENT_TYPE FROM information_schema.EVENTS WHERE EVENT_SCHEMA = ? ORDER BY EVENT_NAME",
        [db], { timeoutSec: 15 });
      return r.results[0].rows.map(x => ({ name: x.EVENT_NAME, status: x.STATUS, type: x.EVENT_TYPE }));
    } catch { return []; }
  }

  async tableColumns(connId, db, table) {
    const r = await this.query(connId,
      "SELECT COLUMN_NAME, ORDINAL_POSITION, COLUMN_TYPE, COLUMN_KEY, IS_NULLABLE, COLUMN_DEFAULT, EXTRA, " +
      "CHARACTER_SET_NAME, COLLATION_NAME, COLUMN_COMMENT, COLUMN_TYPE " +
      "FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=? AND TABLE_NAME=? ORDER BY ORDINAL_POSITION",
      [db, table], { timeoutSec: 15 });
    return r.results[0].rows.map(x => ({
      name: x.COLUMN_NAME, pos: x.ORDINAL_POSITION, type: x.COLUMN_TYPE, key: x.COLUMN_KEY,
      nullable: x.IS_NULLABLE === 'YES', default: x.COLUMN_DEFAULT, extra: x.EXTRA || '',
      charset: x.CHARACTER_SET_NAME || '', comment: x.COLUMN_COMMENT || '',
    }));
  }

  async tableIndexes(connId, db, table) {
    const r = await this.query(connId, 'SHOW INDEX FROM ' + DBManager.qRef(db, table), {}, { timeoutSec: 15 });
    const map = new Map();
    for (const row of r.results[0].rows) {
      const name = row.Key_name;
      if (!map.has(name)) map.set(name, { name, unique: row.Non_unique === 0, columns: [], seqMap: new Map() });
      map.get(name).seqMap.set(row.Seq_in_index, row.Column_name);
    }
    for (const ix of map.values()) {
      ix.columns = [...ix.seqMap.values()]; // Seq order
      delete ix.seqMap;
    }
    return [...map.values()];
  }

  async tableDDL(connId, db, table) {
    const r = await this.query(connId, 'SHOW CREATE TABLE ' + DBManager.qRef(db, table), {}, { timeoutSec: 15 });
    const row = r.results[0].rows[0];
    return row ? (row['Create Table'] || row['Create View'] || '') : '';
  }

  /** Foreign keys across a database (for ER diagram). */
  async listForeignKeys(connId, db) {
    const r = await this.query(connId,
      "SELECT TABLE_NAME, COLUMN_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME, CONSTRAINT_NAME " +
      "FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA=? AND REFERENCED_TABLE_NAME IS NOT NULL " +
      "ORDER BY TABLE_NAME", [db], { timeoutSec: 15 });
    return r.results[0].rows;
  }

  async tableStats(connId, db, table) {    const r = await this.query(connId,
      "SELECT ENGINE, TABLE_ROWS, DATA_LENGTH, INDEX_LENGTH, DATA_FREE, TABLE_COLLATION, CREATE_TIME, UPDATE_TIME, TABLE_COMMENT " +
      "FROM information_schema.TABLES WHERE TABLE_SCHEMA=? AND TABLE_NAME=?", [db, table], { timeoutSec: 15 });
    const x = r.results[0].rows[0] || {};
    return {
      engine: x.ENGINE || '', rows: Number(x.TABLE_ROWS || 0), dataLength: Number(x.DATA_LENGTH || 0),
      indexLength: Number(x.INDEX_LENGTH || 0), dataFree: Number(x.DATA_FREE || 0),
      collation: x.TABLE_COLLATION || '', createTime: x.CREATE_TIME || '', updateTime: x.UPDATE_TIME || '',
      comment: x.TABLE_COMMENT || '',
    };
  }

  async primaryKeys(connId, db, table) {
    const r = await this.query(connId, 'SHOW KEYS FROM ' + DBManager.qRef(db, table), {}, { timeoutSec: 15 });
    const pks = r.results[0].rows.filter(x => x.Key_name === 'PRIMARY').sort((a, b) => a.Seq_in_index - b.Seq_in_index);
    return pks.map(x => x.Column_name);
  }

  // ================= data browsing =================

  async selectPage(connId, { db, table, where, orderBy, orderDir, offset, limit }) {
    const tbl = DBManager.qRef(db, table);
    let sql = 'SELECT * FROM ' + tbl;
    if (where && String(where).trim()) sql += '\nWHERE ' + where;
    if (orderBy) sql += '\nORDER BY ' + DBManager.escId(orderBy) + (orderDir === 'desc' ? ' DESC' : ' ASC');
    sql += '\nLIMIT ? OFFSET ?';
    const r = await this.query(connId, sql, [limit, offset], { timeoutSec: 30 });
    let countSql = 'SELECT COUNT(*) AS n FROM ' + tbl + (where && where.trim() ? ' WHERE ' + where : '');
    const c = await this.query(connId, countSql, [], { timeoutSec: 30 });
    return {
      rows: r.results[0].rows,
      fields: r.results[0].fields.map(f => ({ name: f.name, type: f.columnType, orgName: f.orgName })),
      total: Number(c.results[0].rows[0]?.n || 0),
      ms: r.ms,
    };
  }

  /**
   * Apply data-grid edits (inserts/updates/deletes) with parameterized SQL.
   * rows: { inserts: [ {values: {col: val}} ], updates: [ {keys: {}, values: {}} ], deletes: [ {keys: {}} ] }
   */
  async applyChanges(connId, { db, table, pks, inserts, updates, deletes }) {
    if (this._isReadOnly(connId)) throw new Error('🔒 This connection is READ-ONLY');
    const tbl = DBManager.qRef(db, table);
    const stats = { inserted: 0, updated: 0, deleted: 0 };
    const isWhere = (keys) => {
      const cols = Object.keys(keys);
      if (!cols.length) throw new Error('Empty key set for edit');
      return cols.map(c => DBManager.escId(c) + ' <=> ?').join(' AND ');
    };
    const keyParams = (keys) => colsOf(keys).map(c => keys[c]);
    function colsOf(o) { return Object.keys(o); }

    for (const del of deletes || []) {
      const delSql = 'DELETE FROM ' + tbl + ' WHERE ' + isWhere(del.keys) + ' LIMIT 1';
      const [res] = await this.pool(connId).query(delSql, keyParams(del.keys));
      stats.deleted += res.affectedRows;
      this._log('exec', connId, delSql + `  -- params: ${colsOf(del.keys).length} value(s), values not logged`, null, res.affectedRows, true, null, db);
    }
    for (const upd of updates || []) {
      const setCols = Object.keys(upd.values);
      if (!setCols.length) continue;
      const sql = 'UPDATE ' + tbl + ' SET ' + setCols.map(c => DBManager.escId(c) + ' = ?').join(', ')
        + ' WHERE ' + isWhere(upd.keys) + ' LIMIT 1';
      const [res] = await this.pool(connId).query(sql, [...setCols.map(c => upd.values[c]), ...keyParams(upd.keys)]);
      stats.updated += res.affectedRows;
      this._log('exec', connId, sql + `  -- params: ${setCols.length + colsOf(upd.keys).length} value(s), values not logged`, null, res.affectedRows, true, null, db);
    }
    for (const ins of inserts || []) {
      const cols = Object.keys(ins.values);
      if (!cols.length) continue;
      const sql = 'INSERT INTO ' + tbl + ' (' + cols.map(c => DBManager.escId(c)).join(', ') + ') VALUES (' + cols.map(() => '?').join(', ') + ')';
      const [res] = await this.pool(connId).query(sql, cols.map(c => ins.values[c]));
      stats.inserted += res.affectedRows;
      this._log('exec', connId, sql + `  -- params: ${cols.length} value(s), values not logged`, null, res.affectedRows, true, null, db);
    }
    return stats;
  }

  // ================= DDL operations =================

  async dropObject(connId, { type, db, name }) {
    const ref = type === 'database' ? DBManager.escId(name) : DBManager.qRef(db, name);
    const verbs = {
      table: 'DROP TABLE', view: 'DROP VIEW', procedure: 'DROP PROCEDURE',
      function: 'DROP FUNCTION', trigger: 'DROP TRIGGER', event: 'DROP EVENT', database: 'DROP DATABASE',
    };
    const verb = verbs[type];
    if (!verb) throw new Error('Unsupported drop type: ' + type);
    await this.exec(connId, verb + ' ' + ref);
    return true;
  }

  async truncateTable(connId, { db, name }) {
    await this.exec(connId, 'TRUNCATE TABLE ' + DBManager.qRef(db, name));
    return true;
  }

  async renameObject(connId, { db, table, newName }) {
    await this.exec(connId, 'RENAME TABLE ' + DBManager.qRef(db, table) + ' TO ' + DBManager.qRef(db, newName));
    return true;
  }

  async createDatabase(connId, { name, charset, collation }) {
    let sql = 'CREATE DATABASE ' + DBManager.escId(name);
    if (charset) sql += ' CHARACTER SET ' + charset;
    if (collation) sql += ' COLLATE ' + collation;
    await this.exec(connId, sql);
    return true;
  }

  async listCharsets(connId) {
    const r = await this.query(connId,
      "SELECT CHARSET AS charset, COALESCE(MAX(DESCRIPTION),'') AS descr FROM information_schema.COLLATIONS GROUP BY CHARSET ORDER BY CHARSET", {}, { timeoutSec: 10 });
    const charsets = r.results[0].rows;
    const r2 = await this.query(connId, "SELECT CHARACTER_SET_NAME AS charset, COLLATION_NAME AS collation, IS_DEFAULT='Yes' AS isdef FROM information_schema.COLLATIONS ORDER BY charset, isdef DESC, collation", {}, { timeoutSec: 10 });
    return { charsets, collations: r2.results[0].rows };
  }

  /** Designer payload -> SQL. payload: {db, create?:bool, name, newName?, engine, charset, comment,
   *  columns:[{name, oldName?, type, nullable, default, extra(auto_increment|on-update|generated), unsigned, comment}],
   *  pk: [cols], indexes:[{name, oldName?, unique, columns}], foreignKeys:[{name, oldName?, columns, refTable, refColumns, onDelete, onUpdate}] } */
  buildTableDDL(p) {
    const tbl = DBManager.qRef(p.db, p.name);
    if (p.create) {
      const lines = p.columns.map(c => this._colDef(c));
      if (p.pk && p.pk.length) lines.push('PRIMARY KEY (' + p.pk.map(DBManager.escId).join(', ') + ')');
      for (const ix of p.indexes || []) lines.push(this._indexDef(ix, true));
      for (const fk of p.foreignKeys || []) lines.push(this._fkDef(fk, true));
      let sql = 'CREATE TABLE ' + tbl + ' (\n  ' + lines.join(',\n  ') + '\n)';
      if (p.engine) sql += '\nENGINE=' + p.engine;
      if (p.charset) sql += ' DEFAULT CHARSET=' + p.charset;
      if (p.comment) sql += " COMMENT=" + DBManager.escValue(p.comment);
      return sql;
    }
    const alters = [];
    for (const c of p.columns) {
      if (!c.oldName && !c.drop) alters.push('ADD COLUMN ' + this._colDef(c));
      else if (c.drop) alters.push('DROP COLUMN ' + DBManager.escId(c.oldName));
      else alters.push('CHANGE COLUMN ' + DBManager.escId(c.oldName) + ' ' + this._colDef(c));
    }
    if (p.pkChanged) {
      alters.push('DROP PRIMARY KEY');
      if (p.pk && p.pk.length) alters.push('ADD PRIMARY KEY (' + p.pk.map(DBManager.escId).join(', ') + ')');
    }
    for (const ix of p.indexes || []) {
      if (ix.drop) alters.push('DROP INDEX ' + DBManager.escId(ix.oldName));
      else if (!ix.oldName) alters.push('ADD ' + this._indexDef(ix, true));
      else alters.push('DROP INDEX ' + DBManager.escId(ix.oldName) + ', ADD ' + this._indexDef(ix, true));
    }
    for (const fk of p.foreignKeys || []) {
      if (fk.drop) alters.push('DROP FOREIGN KEY ' + DBManager.escId(fk.oldName));
      else if (!fk.oldName) alters.push('ADD ' + this._fkDef(fk, true));
      else alters.push('DROP FOREIGN KEY ' + DBManager.escId(fk.oldName) + ', ADD ' + this._fkDef(fk, true));
    }
    if (p.newName && p.newName !== p.name) alters.push('RENAME TO ' + DBManager.qRef(p.db, p.newName));
    if (!alters.length) return '';
    let sql = 'ALTER TABLE ' + tbl + '\n  ' + alters.join(',\n  ');
    const tail = [];
    if (p.engine) tail.push('ENGINE=' + p.engine);
    if (p.charset) tail.push('DEFAULT CHARSET=' + p.charset);
    if (tail.length) sql += ',\n  ' + tail.join(', ');
    return sql;
  }

  _colDef(c) {
    let s = DBManager.escId(c.name) + ' ' + c.type;
    if (c.nullable === false) s += ' NOT NULL';
    if (c.default !== undefined && c.default !== null && String(c.default).length > 0) {
      const d = String(c.default);
      if (/^CURRENT_TIMESTAMP(\(\))?$/i.test(d) || /^NULL$/i.test(d) || /^(GENERATED|BIT)\b/i.test(d)) s += ' DEFAULT ' + d.toUpperCase().replace('()','()');
      else s += ' DEFAULT ' + DBManager.escValue(d);
    } else if (c.nullable !== false && c.default === null) {
      // explicit no default
    }
    if (c.extra === 'auto_increment') s += ' AUTO_INCREMENT';
    if (c.comment) s += ' COMMENT ' + DBManager.escValue(c.comment);
    return s;
  }

  _indexDef(ix, withName) {
    const kind = ix.unique ? 'UNIQUE ' : '';
    return (kind + (withName && ix.name ? 'INDEX ' + DBManager.escId(ix.name) + ' ' : '') + '(' + ix.columns.map(DBManager.escId).join(', ') + ')');
  }

  _fkDef(fk, withName) {
    let s = 'CONSTRAINT ' + (withName && fk.name ? DBManager.escId(fk.name) + ' ' : '') + 'FOREIGN KEY ('
      + fk.columns.map(DBManager.escId).join(', ') + ') REFERENCES '
      + DBManager.escId(fk.refTable) + ' (' + fk.refColumns.map(DBManager.escId).join(', ') + ')';
    if (fk.onDelete) s += ' ON DELETE ' + fk.onDelete;
    if (fk.onUpdate) s += ' ON UPDATE ' + fk.onUpdate;
    return s;
  }

  // ================= data transfer =================

  /** Copy a table (schema if needed + all rows) between connections/databases. */
  async transferTable({ fromConnId, toConnId, fromDb, table, toDb, toTable, dropTarget = false, batchSize = 300 }) {
    if (fromConnId === toConnId && fromDb === toDb && table === (toTable || table)) {
      throw new Error('Source and target are the same table');
    }
    if (this._isReadOnly(toConnId)) throw new Error('🔒 Target connection is READ-ONLY');
    const target = toTable || table;
    const srcRef = DBManager.qRef(fromDb, table);
    const dstRef = DBManager.qRef(toDb, target);

    let created = false;
    const chk = await this.query(toConnId,
      "SELECT COUNT(*) n FROM information_schema.TABLES WHERE TABLE_SCHEMA=? AND TABLE_NAME=?", [toDb, target], { db: toDb });
    const exists = Number(chk.results[0].rows[0]?.n || 0) > 0;
    if (dropTarget && exists) {
      await this.exec(toConnId, 'DROP TABLE ' + dstRef, { db: toDb });
    }
    if (!exists || dropTarget) {
      const ddl = await this.tableDDL(fromConnId, fromDb, table);
      await this.exec(toConnId, ddl, { db: toDb });
      created = true;
    }

    const cols = (await this.tableColumns(fromConnId, fromDb, table)).map(c => c.name);
    const pool = this.pool(fromConnId);
    const conn = await pool.getConnection();
    let count = 0;
    try {
      const query = conn.connection.query('SELECT * FROM ' + srcRef);
      const stream = query.stream();
      let batch = [];
      const flush = async () => {
        if (!batch.length) return;
        const values = batch.map(row => '(' + cols.map(c => DBManager.escValue(row[c])).join(', ') + ')').join(',\n');
        await this.exec(toConnId,
          'INSERT INTO ' + dstRef + ' (' + cols.map(DBManager.escId).join(', ') + ') VALUES\n' + values,
          { db: toDb, _retry: true });
        count += batch.length;
        batch = [];
      };
      for await (const row of stream) { batch.push(row); if (batch.length >= batchSize) await flush(); }
      await flush();
    } finally {
      conn.release();
    }
    this._log('io', fromConnId, `-- TRANSFER ${srcRef} -> ${dstRef} (${count} rows, schema ${created ? 'created' : 'reused'})`, null, count, true, null, fromDb);
    return { count, created };
  }

  // ================= server admin =================

  /** Search a value across tables of a database (LIKE on text cols, equality on numeric). */
  async findInDatabase(connId, { db, term, tables = null, limitPerTable = 20, maxTables = 80 }) {
    const objs = await this.listObjects(connId, db);
    const targets = tables && tables.length ? objs.tables.filter(t => tables.includes(t.name)) : objs.tables.slice(0, maxTables);
    const isNum = /^-?\d+(\.\d+)?$/.test(term);
    const out = [];
    for (const t of targets) {
      try {
        const cols = await this.tableColumns(connId, db, t.name);
        const conds = [];
        for (const c of cols) {
          if (/CHAR|TEXT|ENUM|SET/i.test(c.type)) conds.push(DBManager.escId(c.name) + ' LIKE ?');
          else if (isNum && /INT|DEC|NUM|FLOAT|DOUB/i.test(c.type)) conds.push(DBManager.escId(c.name) + ' = ?');
        }
        if (!conds.length) continue;
        const r = await this.query(connId,
          `SELECT * FROM ${DBManager.qRef(db, t.name)} WHERE ${conds.join(' OR ')} LIMIT ${limitPerTable}`,
          conds.map(() => '%' + term + '%'), { db, timeoutSec: 10 });
        if (r.results[0].rows.length) {
          out.push({ table: t.name, rows: r.results[0].rows.slice(0, limitPerTable), fields: r.results[0].fields.map(f => f.name) });
        }
      } catch { /* skip problematic table */ }
    }
    this._log('query', connId, `-- FIND IN DATABASE '${term}' in ${db} (${out.length} table(s) matched)`, null, null, true, null, db);
    return out;
  }

  async processList(connId) {
    const r = await this.query(connId, 'SHOW FULL PROCESSLIST', {}, { timeoutSec: 10 });
    return r.results[0].rows;
  }

  async killProcess(connId, id, queryOnly = false) {
    await this.exec(connId, (queryOnly ? 'KILL QUERY ' : 'KILL ') + parseInt(id, 10));
    return true;
  }

  async variables(connId, kind = 'variables', search = '') {
    const cmd = kind === 'status' ? 'SHOW GLOBAL STATUS' : 'SHOW GLOBAL VARIABLES';
    const r = await this.query(connId, cmd, {}, { timeoutSec: 15 });
    let rows = r.results[0].rows.map(x => ({ name: x.Variable_name, value: x.Value }));
    if (search) {
      const s = search.toLowerCase();
      rows = rows.filter(x => x.name.toLowerCase().includes(s) || String(x.value).toLowerCase().includes(s));
    }
    return rows;
  }

  async databasesInfo(connId) {
    return this.listDatabases(connId);
  }

  // ================= users & privileges =================

  async users(connId) {
    const r = await this.query(connId, "SELECT User, Host, plugin AS auth_plugin FROM mysql.user ORDER BY User, Host", {}, { timeoutSec: 10 });
    return r.results[0].rows;
  }

  async userGrants(connId, user, host) {
    const r = await this.query(connId, 'SHOW GRANTS FOR ' + DBManager.escValue(user) + '@' + DBManager.escValue(host), {}, { timeoutSec: 10 });
    return r.results[0].rows.map(x => Object.values(x)[0]);
  }

  async createUser(connId, { user, host, password }) {
    await this.exec(connId, 'CREATE USER ' + DBManager.escValue(user) + '@' + DBManager.escValue(host)
      + ' IDENTIFIED BY ' + DBManager.escValue(password || ''));
    return true;
  }

  async alterUserPassword(connId, { user, host, password }) {
    await this.exec(connId, 'ALTER USER ' + DBManager.escValue(user) + '@' + DBManager.escValue(host)
      + ' IDENTIFIED BY ' + DBManager.escValue(password || ''));
    return true;
  }

  async dropUser(connId, { user, host }) {
    await this.exec(connId, 'DROP USER ' + DBManager.escValue(user) + '@' + DBManager.escValue(host));
    return true;
  }

  async grant(connId, { user, host, privs, database, table, withGrant }) {
    const target = database === '*' ? '*.*' : (table ? DBManager.qRef(database, table) : DBManager.qRef(database, '*'));
    const p = (privs && privs.length) ? privs.join(', ') : 'USAGE';
    await this.exec(connId, 'GRANT ' + p + ' ON ' + target + ' TO '
      + DBManager.escValue(user) + '@' + DBManager.escValue(host)
      + (withGrant ? ' WITH GRANT OPTION' : ''));
    await this.exec(connId, 'FLUSH PRIVILEGES');
    return true;
  }

  // ================= export (streamed) =================

  async exportToFile(connId, { sql, format, filePath, db, table, includeDdl, batchSize = 400 }) {
    // xlsx: build in memory (guarded), everything else streams
    if (format === 'xlsx') {
      const { writeRowsXlsx } = require('./xlsxio');
      const pool = this.pool(connId);
      const conn = await pool.getConnection();
      try {
        const query = conn.connection.query({ sql });
        const stream = query.stream();
        const rows = [];
        let count = 0, fields = null;
        for await (const row of stream) {
          count++;
          if (!fields) fields = Object.keys(row);
          rows.push(row);
        }
        if (db && table && includeDdl !== false) {
          // prepend DDL as a second sheet
          const ddl = await this.tableDDL(connId, db, table);
          const XLSX = require('xlsx');
          const wb = XLSX.utils.book_new();
          writeRowsXlsx(fields.map(n => ({ name: n })), rows, filePath, table || 'Data');
          // append DDL sheet
          const wb2 = XLSX.readFile(filePath);
          const ws = XLSX.utils.aoa_to_sheet(ddl.split('\n').map(l => [l]));
          XLSX.utils.book_append_sheet(wb2, ws, 'DDL');
          XLSX.writeFile(wb2, filePath);
        } else {
          writeRowsXlsx((fields || []).map(n => ({ name: n })), rows, filePath, table || 'Data');
        }
        this._log('io', connId, `-- EXPORT xlsx${db && table ? ' ' + db + '.' + table : ''} (${count} rows) -> ${filePath}`, null, count, true, null, db);
        return { count, format, filePath };
      } finally { conn.release(); }
    }

    const pool = this.pool(connId);
    const conn = await pool.getConnection();
    let count = 0;
    try {
      const out = fs.createWriteStream(filePath, { encoding: 'utf8' });
      const write = (s) => new Promise((res, rej) => { if (!out.write(s)) out.once('drain', res); else res(); });

      const query = conn.connection.query({ sql });
      const stream = query.stream({ highWaterMark: 1024 * 256 });
      let fields = null;

      for await (const row of stream) {
        if (!fields) fields = query.stream ? null : null; // fields filled below via event
        count++;
        if (format === 'csv') {
          if (count === 1) {
            fields = Object.keys(row);
            await write(csvLine(fields) + '\n');
          }
          await write(csvLine(fields.map(f => row[f])) + '\n');
        } else if (format === 'json') {
          if (count === 1) await write('[\n');
          if (count > 1) await write(',\n');
          await write('  ' + JSON.stringify(row));
          if (count % 500 === 0) await write('');
        } else if (format === 'sql') {
          if (count === 1) {
            fields = Object.keys(row);
            if (includeDdl !== false) {
              const ddl = await this.tableDDL(connId, db, table);
              await write(sqlHeader(db, table) + (ddl ? ddl.replace(/\n$/, '') + ';\n\n' : ''));
            } else {
              await write(sqlHeader(db, table));
            }
          }
          // batched inserts
          if ((count - 1) % batchSize === 0) {
            if (count > 1) await write(';\n');
            await write('INSERT INTO ' + DBManager.qRef(db, table) + ' (' + fields.map(DBManager.escId).join(', ') + ') VALUES\n');
          } else {
            await write(',\n');
          }
          await write('  (' + fields.map(f => DBManager.escValue(row[f])).join(', ') + ')');
        }
      }
      if (format === 'json') await write(count ? '\n]\n' : '[\n]\n');
      if (format === 'sql' && count) await write(';\n');
      if (format === 'sql' && !count && includeDdl !== false && db && table) {
        const ddl = await this.tableDDL(connId, db, table);
        await write(sqlHeader(db, table) + (ddl ? ddl + ';\n' : ''));
      }
      out.end();
      await new Promise((res) => out.on('close', res));
    } finally {
      conn.release();
    }
    this._log('io', connId, `-- EXPORT ${format}${db && table ? ' ' + db + '.' + table : ''} (${count} rows) -> ${filePath}`, null, count, true, null, db);
    return { count, format, filePath };
  }

  // ================= import =================

  /** Guess a column type from sample values (for auto table creation). */
  _inferType(values) {
    let allInt = true, allNum = true, allDate = true, allDateTime = true, maxLen = 0;
    for (const v of values) {
      if (v === null || v === undefined || v === '') continue;
      const s = v instanceof Date ? v.toISOString().slice(0, 19).replace('T', ' ') : String(v);
      maxLen = Math.max(maxLen, s.length);
      if (!/^-?\d+$/.test(s)) allInt = false;
      if (!/^-?\d+(\.\d+)?$/.test(s)) allNum = false;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(s) && !(v instanceof Date)) allDate = false;
      if (!/^\d{4}-\d{2}-\d{2}([ T]\d{2}:\d{2}(:\d{2})?)?$/.test(s) && !(v instanceof Date)) allDateTime = false;
    }
    if (maxLen === 0) return 'VARCHAR(50)';
    if (allInt && maxLen <= 9) return 'INT';
    if (allInt) return 'BIGINT';
    if (allNum) return 'DECIMAL(18,4)';
    if (allDateTime) return 'DATETIME';
    if (allDate) return 'DATE';
    if (maxLen <= 255) return `VARCHAR(${Math.max(20, Math.min(255, Math.ceil(maxLen * 1.5)))})`;
    return 'TEXT';
  }

  static safeIdent(name, used) {
    let n = String(name || '').replace(/[^\wก-๙]+/g, '_').replace(/^_+|_+$/g, '');
    if (!n || /^\d/.test(n)) n = 'col_' + n;
    while (used.has(n.toLowerCase())) n = n + '_2';
    used.add(n.toLowerCase());
    return n;
  }

  /** Create table from header+sample rows (auto id PK + inferred types). */
  async _autoCreateTable(connId, db, table, header, sampleRows) {
    const chk = await this.query(connId,
      "SELECT COUNT(*) n FROM information_schema.TABLES WHERE TABLE_SCHEMA=? AND TABLE_NAME=?",
      [db, table], { db });
    if (Number(chk.results[0].rows[0]?.n || 0) > 0) return false; // exists -> plain insert
    const used = new Set(['id']);
    const colDefs = header.map((h, j) =>
      DBManager.escId(DBManager.safeIdent(h, used)) + ' ' + this._inferType(sampleRows.map(r => r[j])));
    const sql = 'CREATE TABLE ' + DBManager.qRef(db, table) + ' (\n  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,\n  '
      + colDefs.join(',\n  ') + '\n) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4';
    await this.exec(connId, sql, { db });
    return true;
  }

  /** Map original header names to the sanitized ones (same algorithm as _autoCreateTable). */
  _mappedHeader(header) {
    const used = new Set(['id']);
    return header.map(h => DBManager.safeIdent(h, used));
  }

  async importCsv(connId, { filePath, db, table, delimiter = ',', firstRowHeaders = true, encoding = 'utf8', truncateFirst = false, batchSize = 300, createTable = false, onProgress }) {
    const text = fs.readFileSync(filePath, encoding);
    const rows = parseCsv(text, delimiter);
    if (!rows.length) return { count: 0 };
    let header = rows[0].map((h, i) => (h && h.trim()) ? h.trim() : 'col' + (i + 1));
    let dataRows = rows.slice(1);
    if (!firstRowHeaders) {
      header = rows[0].map((_, i) => 'col' + (i + 1));
      dataRows = rows;
    }
    if (createTable) {
      await this._autoCreateTable(connId, db, table, header, dataRows.slice(0, 200));
      header = this._mappedHeader(header);
    }
    if (truncateFirst) await this.exec(connId, 'TRUNCATE TABLE ' + DBManager.qRef(db, table), { db });
    const cols = header.map(DBManager.escId).join(', ');
    const base = 'INSERT INTO ' + DBManager.qRef(db, table) + ' (' + cols + ') VALUES ';
    let count = 0;
    for (let i = 0; i < dataRows.length; i += batchSize) {
      const chunk = dataRows.slice(i, i + batchSize).filter(r => r.length > 1 || (r[0] !== undefined && r[0] !== ''));
      if (!chunk.length) continue;
      const values = chunk.map(r => '(' + header.map((_, j) => DBManager.escValue(r[j] === undefined ? null : r[j])).join(', ') + ')').join(',\n');
      await this.exec(connId, base + '\n' + values);
      count += chunk.length;
      if (onProgress) onProgress({ done: count, total: dataRows.length });
    }
    this._log('io', connId, `-- IMPORT CSV ${filePath} -> ${db}.${table} (${count} rows${createTable ? ', table auto-created' : ''})`, null, count, true, null, db);
    return { count, columns: header, created: !!createTable };
  }

  async importJson(connId, { filePath, db, table, truncateFirst = false, batchSize = 300 }) {    const arr = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const rows = Array.isArray(arr) ? arr : [arr];
    if (!rows.length) return { count: 0 };
    const header = [...new Set(rows.flatMap(r => Object.keys(r)))];
    if (truncateFirst) await this.exec(connId, 'TRUNCATE TABLE ' + DBManager.qRef(db, table));
    const base = 'INSERT INTO ' + DBManager.qRef(db, table) + ' (' + header.map(DBManager.escId).join(', ') + ') VALUES ';
    let count = 0;
    for (let i = 0; i < rows.length; i += batchSize) {
      const chunk = rows.slice(i, i + batchSize);
      const values = chunk.map(r => '(' + header.map(h => DBManager.escValue(r[h] === undefined ? null : r[h])).join(', ') + ')').join(',\n');
      await this.exec(connId, base + '\n' + values);
      count += chunk.length;
    }
    this._log('io', connId, `-- IMPORT JSON ${filePath} -> ${db}.${table} (${count} rows)`, null, count, true, null, db);
    return { count, columns: header };
  }

  /** Import an Excel workbook sheet (.xlsx/.xls) into a table. */
  async importXlsx(connId, { filePath, db, table, sheetIndex = 0, truncateFirst = false, batchSize = 300, createTable = false }) {
    const { readXlsx } = require('./xlsxio');
    const parsed = readXlsx(filePath, sheetIndex);
    const sheet = parsed.sheet;
    const rows = parsed.rows;
    let header = parsed.header;
    if (!rows.length) return { count: 0, sheet };
    if (createTable) {
      await this._autoCreateTable(connId, db, table, header, rows.slice(0, 200));
      header = this._mappedHeader(header);
    }
    if (truncateFirst) await this.exec(connId, 'TRUNCATE TABLE ' + DBManager.qRef(db, table), { db });
    const cols = header.map(DBManager.escId).join(', ');
    const base = 'INSERT INTO ' + DBManager.qRef(db, table) + ' (' + cols + ') VALUES ';
    let count = 0;
    for (let i = 0; i < rows.length; i += batchSize) {
      const chunk = rows.slice(i, i + batchSize);
      const values = chunk.map(r => '(' + header.map((_, j) => {
        const v = r[j];
        return v instanceof Date ? DBManager.escValue(v) : DBManager.escValue(v === undefined ? null : v);
      }).join(', ') + ')').join(',\n');
      await this.exec(connId, base + '\n' + values, { db });
      count += chunk.length;
    }
    this._log('io', connId, `-- IMPORT XLSX ${filePath} [${sheet}] -> ${db}.${table} (${count} rows${createTable ? ', table auto-created' : ''})`, null, count, true, null, db);
    return { count, sheet, columns: header, created: !!createTable };
  }

  /** Execute a .sql script file (split on ; at line ends, respecting strings). */
  async runSqlFile(connId, { filePath, onProgress }) {    const raw = fs.readFileSync(filePath, 'utf8');
    const statements = splitSqlStatements(raw);
    let done = 0, errors = 0;
    for (const stmt of statements) {
      if (!stmt.trim()) continue;
      try { await this.exec(connId, stmt); }
      catch (err) { errors++; if (onProgress) onProgress({ done, total: statements.length, error: err.message }); }
      done++;
      if (onProgress) onProgress({ done, total: statements.length });
    }
    this._log('io', connId, `-- RUN SQL FILE ${filePath} (${done}/${statements.length} statements, ${errors} errors)`, null, done, errors === 0, errors ? errors + ' errors' : null, null);
    return { statements: statements.length, done, errors };
  }

  /** Full backup: schema + data for a database (or selected tables). Streamed to file. */
  async backup(connId, { db, tables = null, includeData = true, includeSchema = true, includeViews = true, includeRoutines = false, filePath, onProgress }) {
    const out = fs.createWriteStream(filePath, { encoding: 'utf8' });
    const write = (s) => new Promise((res) => { if (!out.write(s)) out.once('drain', res); else res(); });
    await write('-- WJ DB Studio backup\n-- Host database: ' + db + '\n-- Generated: ' + new Date().toISOString() + '\n\n' +
      'SET NAMES utf8mb4;\nSET FOREIGN_KEY_CHECKS=0;\nSET SQL_MODE=\'NO_AUTO_VALUE_ON_ZERO\';\n\n');
    const objs = await this.listObjects(connId, db);
    const targetTables = tables && tables.length ? tables : objs.tables.map(t => t.name);
    let i = 0;
    for (const t of targetTables) {
      i++;
      if (onProgress) onProgress({ done: i, total: targetTables.length, table: t });
      if (includeSchema) {
        const ddl = await this.tableDDL(connId, db, t);
        await write('DROP TABLE IF EXISTS ' + DBManager.qRef(db, t) + ';\n' + ddl + ';\n\n');
      }
      if (includeData) {
        const pool = this.pool(connId);
        const conn = await pool.getConnection();
        try {
          const query = conn.connection.query('SELECT * FROM ' + DBManager.qRef(db, t));
          const stream = query.stream();
          let n = 0, fields = null;
          for await (const row of stream) {
            n++;
            if (!fields) {
              fields = Object.keys(row);
              await write('INSERT INTO ' + DBManager.qRef(db, t) + ' (' + fields.map(DBManager.escId).join(', ') + ') VALUES\n');
            } else {
              await write(',\n');
            }
            await write('  (' + fields.map(f => DBManager.escValue(row[f])).join(', ') + ')');
            if (n % 500 === 0) { await write(';\n'); fields = null; }
          }
          if (fields) await write(';\n');
          if (n) await write('\n');
        } finally { conn.release(); }
      }
    }
    if (includeViews) {
      for (const v of objs.views) {
        const ddl = await this.tableDDL(connId, db, v.name);
        await write('DROP VIEW IF EXISTS ' + DBManager.qRef(db, v.name) + ';\n' + ddl + ';\n\n');
      }
    }
    await write('SET FOREIGN_KEY_CHECKS=1;\n-- End of backup\n');
    out.end();
    await new Promise((res) => out.on('close', res));
    this._log('io', connId, `-- BACKUP ${db} (${targetTables.length} tables) -> ${filePath}`, null, targetTables.length, true, null, db);
    return { filePath, tables: targetTables.length };
  }
}

// ================= pure helpers (also used for CSV) =================

function csvLine(values) {
  return values.map(v => {
    if (v === null || v === undefined) return '\\N';
    let s;
    if (Buffer.isBuffer(v)) s = '<binary ' + v.length + ' bytes>';
    else if (typeof v === 'object' && v.toISOString) s = v.toISOString();
    else s = String(v);
    if (/[",\n\r]/.test(s)) s = '"' + s.replace(/"/g, '""') + '"';
    return s;
  }).join(',');
}

/** RFC4180-ish CSV parser with configurable delimiter. */
function parseCsv(text, delim = ',') {
  const rows = [];
  let row = [], field = '', inQ = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQ) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQ = false;
      } else field += ch;
    } else if (ch === '"') {
      inQ = true;
    } else if (ch === delim) {
      row.push(field); field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(field); field = '';
      rows.push(row); row = [];
    } else field += ch;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows.filter(r => !(r.length === 1 && r[0] === ''));
}

/** Split SQL text into statements honoring strings, backticks and comments. */
function splitSqlStatements(sql) {
  const out = [];
  let cur = '', i = 0;
  const n = sql.length;
  while (i < n) {
    const ch = sql[i];
    // comments
    if (ch === '-' && sql[i + 1] === '-') {
      while (i < n && sql[i] !== '\n') { cur += sql[i]; i++; }
      continue;
    }
    if (ch === '#') {
      while (i < n && sql[i] !== '\n') { cur += sql[i]; i++; }
      continue;
    }
    if (ch === '/' && sql[i + 1] === '*') {
      const end = sql.indexOf('*/', i + 2);
      const seg = end === -1 ? sql.slice(i) : sql.slice(i, end + 2);
      cur += seg; i += seg.length; continue;
    }
    // strings & identifiers
    if (ch === "'" || ch === '"' || ch === '`') {
      const q = ch;
      cur += ch; i++;
      while (i < n) {
        if (sql[i] === '\\') { cur += sql[i] + (sql[i + 1] || ''); i += 2; continue; }
        cur += sql[i];
        if (sql[i] === q) {
          if (sql[i + 1] === q) { cur += sql[i + 1]; i += 2; continue; }
          i++; break;
        }
        i++;
      }
      continue;
    }
    if (ch === ';') {
      if (cur.trim()) out.push(cur.trim());
      cur = ''; i++; continue;
    }
    // DELIMITER directive (mysqldump routines)
    if (/^DELIMITER\s/i.test(sql.slice(i, i + 12))) {
      const nl = sql.indexOf('\n', i);
      const line = sql.slice(i, nl === -1 ? n : nl);
      i += line.length;
      continue;
    }
    cur += ch; i++;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

function sqlHeader(db, table) {
  return '-- Data for table ' + db + '.' + table + '\n';
}

module.exports = { DBManager, parseCsv, splitSqlStatements };
