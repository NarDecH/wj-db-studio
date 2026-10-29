'use strict';
/**
 * WJ DB Studio — preload bridge.
 * Exposes a typed, allow-listed API to the renderer (no node access).
 * (c) 2026 Weeradech Jessadarom — MIT
 */
const { contextBridge, ipcRenderer } = require('electron');

const invoke = (ch) => (...args) => ipcRenderer.invoke(ch, ...args);

const api = {
  // app
  appVersion: invoke('app:version'),
  platform: invoke('app:platform'),
  openExternal: (url) => invoke('app:openExternal')(url),
  setThemeSource: (t) => invoke('app:themeSource')(t),

  // dialogs & files
  pickFile: (opts) => invoke('dialog:pickFile')(opts),
  pickFolder: (opts) => invoke('dialog:pickFolder')(opts),
  pickSaveFile: (opts) => invoke('dialog:pickSaveFile')(opts),
  showMessageBox: (opts) => invoke('dialog:messageBox')(opts),
  readFile: (filePath, maxMB) => invoke('file:readText')(filePath, maxMB),
  writeFile: (filePath, content) => invoke('file:writeText')(filePath, content),
  exportRows: (args) => invoke('io:exportRows')(args),

  // store / settings
  getSettings: invoke('store:settings:get'),
  setSettings: (patch) => invoke('store:settings:set')(patch),
  listConnections: invoke('store:connections:list'),
  saveConnection: (conn) => invoke('store:connections:save')(conn),
  deleteConnection: (id) => invoke('store:connections:delete')(id),
  getHistory: invoke('store:history:list'),
  addHistory: (entry) => invoke('store:history:add')(entry),
  clearHistory: invoke('store:history:clear'),
  listSnippets: invoke('store:snippets:list'),
  saveSnippet: (s) => invoke('store:snippets:save')(s),
  deleteSnippet: (id) => invoke('store:snippets:delete')(id),
   setTourDone: invoke('store:tourDone'),
  getSession: invoke('store:session:get'),
  saveSession: (s) => invoke('store:session:save')(s),

  // sql log
  sqllogRead: (limit) => invoke('sqllog:read')(limit),
  sqllogOpenFolder: invoke('sqllog:openFolder'),

  // database
  dbConnect: (connId) => invoke('db:connect')(connId),
  dbDisconnect: (connId) => invoke('db:disconnect')(connId),
  dbQuery: (connId, sql, params, opts) => invoke('db:query')(connId, sql, params, opts),
  dbExec: (connId, sql, opts) => invoke('db:exec')(connId, sql, opts),
  listDatabases: (connId) => invoke('db:listDatabases')(connId),
  listObjects: (connId, db) => invoke('db:listObjects')(connId, db),
  listRoutines: (connId, db) => invoke('db:listRoutines')(connId, db),
  listTriggers: (connId, db) => invoke('db:listTriggers')(connId, db),
  listEvents: (connId, db) => invoke('db:listEvents')(connId, db),
  tableColumns: (connId, db, table) => invoke('db:tableColumns')(connId, db, table),
  tableIndexes: (connId, db, table) => invoke('db:tableIndexes')(connId, db, table),
  tableDDL: (connId, db, table) => invoke('db:tableDDL')(connId, db, table),
  tableStats: (connId, db, table) => invoke('db:tableStats')(connId, db, table),
  listForeignKeys: (connId, db) => invoke('db:listForeignKeys')(connId, db),
  primaryKeys: (connId, db, table) => invoke('db:primaryKeys')(connId, db, table),
  selectPage: (args) => invoke('db:selectPage')(args),
  applyChanges: (args) => invoke('db:applyChanges')(args),
  dropObject: (args) => invoke('db:dropObject')(args),
  truncateTable: (args) => invoke('db:truncateTable')(args),
  renameObject: (args) => invoke('db:renameObject')(args),
  createDatabase: (args) => invoke('db:createDatabase')(args),
  listCharsets: (connId) => invoke('db:listCharsets')(connId),
  buildTableDDL: (payload) => invoke('db:buildTableDDL')(payload),
  processList: (connId) => invoke('db:processList')(connId),
  killProcess: (connId, id, queryOnly) => invoke('db:killProcess')(connId, id, queryOnly),
  variables: (connId, kind, search) => invoke('db:variables')(connId, kind, search),
  users: (connId) => invoke('db:users')(connId),
  userGrants: (connId, user, host) => invoke('db:userGrants')(connId, user, host),
  createUser: (args) => invoke('db:createUser')(args),
  alterUserPassword: (args) => invoke('db:alterUserPassword')(args),
  dropUser: (args) => invoke('db:dropUser')(args),
  grant: (args) => invoke('db:grant')(args),

  // import / export / backup
  exportToFile: (args) => invoke('io:exportToFile')(args),
  importCsv: (args) => invoke('io:importCsv')(args),
  importJson: (args) => invoke('io:importJson')(args),
  importXlsx: (args) => invoke('io:importXlsx')(args),
  findInDatabase: (args) => invoke('db:findInDatabase')(args),
  transferTable: (args) => invoke('db:transferTable')(args),
  schemaSnapshot: (connId, db) => invoke('db:schemaSnapshot')(connId, db),
  buildMigrationSql: (args) => invoke('db:buildMigrationSql')(args),
  mockFillTable: (args) => invoke('db:mockFillTable')(args),
  runSqlFile: (args) => invoke('io:runSqlFile')(args),
  backup: (args) => invoke('io:backup')(args),

  // updates
  updateInfo: invoke('update:info'),
  updateCheck: invoke('update:check'),
  updateDownload: invoke('update:download'),
  updateInstall: invoke('update:install'),

  // events from main
  onMenuAction: (cb) => { ipcRenderer.on('menu:action', (_e, action) => cb(action)); },
  onUpdateEvent: (cb) => { ipcRenderer.on('update:event', (_e, payload) => cb(payload)); },
  onDbEvent: (cb) => { ipcRenderer.on('db:event', (_e, payload) => cb(payload)); },
};

contextBridge.exposeInMainWorld('wjds', api);
