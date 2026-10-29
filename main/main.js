'use strict';
/**
 * WJ DB Studio — Electron main process.
 * (c) 2026 Weeradech Jessadarom — MIT
 */
const { app, BrowserWindow, ipcMain, dialog, shell, nativeTheme, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const pkg = require('../package.json');
const { Store } = require('./store');
const { DBManager } = require('./db');
const { SQLLog } = require('./sqllog');
const { writeRowsXlsx, writeRowsPlain } = require('./xlsxio');
const { setupUpdater } = require('./updater');
const { buildMenu } = require('./appmenu');

const SELFTEST = process.argv.includes('--selftest');

// ---- single instance ----
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
}

app.setAppUserModelId('com.weeradech.wjdbstudio');
app.setName('WJ DB Studio');

let store = null;
let dbm = null;
let sqllog = null;
let mainWindow = null;

function getMainWindow() { return mainWindow && !mainWindow.isDestroyed() ? mainWindow : null; }

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1480,
    height: 920,
    minWidth: 1040,
    minHeight: 640,
    show: false,
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#11151c' : '#f5f6f8',
    title: 'WJ DB Studio',
    icon: path.join(__dirname, '..', 'build', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, '..', 'src', 'index.html'));
  mainWindow.once('ready-to-show', () => {
    if (!SELFTEST) mainWindow.show();
  });
  mainWindow.on('closed', () => { mainWindow = null; });
}

function registerIpc() {
  // ---- app ----
  ipcMain.handle('app:version', () => pkg.version);
  ipcMain.handle('app:platform', () => process.platform);
  ipcMain.handle('app:openExternal', (_e, url) => {
    if (/^https?:\/\//i.test(url)) shell.openExternal(url);
  });
  ipcMain.handle('app:themeSource', (_e, t) => {
    nativeTheme.themeSource = t === 'light' ? 'light' : t === 'dark' ? 'dark' : 'system';
  });

  // ---- dialogs ----
  ipcMain.handle('dialog:pickFile', async (_e, opts) => {
    const win = getMainWindow();
    const r = await dialog.showOpenDialog(win, {
      title: opts && opts.title,
      defaultPath: opts && opts.defaultPath,
      filters: (opts && opts.filters) || [],
      properties: opts && opts.directory ? ['openDirectory'] : ['openFile'],
    });
    return r.canceled ? null : r.filePaths[0];
  });
  ipcMain.handle('dialog:pickFolder', async (_e, opts) => {
    const win = getMainWindow();
    const r = await dialog.showOpenDialog(win, { properties: ['openDirectory'], title: opts && opts.title });
    return r.canceled ? null : r.filePaths[0];
  });
  ipcMain.handle('dialog:messageBox', async (_e, opts) => {
    const win = getMainWindow();
    const r = await dialog.showMessageBox(win, {
      type: opts.type || 'question',
      title: opts.title || 'WJ DB Studio',
      message: opts.message || '',
      detail: opts.detail || '',
      buttons: opts.buttons || ['OK'],
      defaultId: 0,
      cancelId: opts.buttons ? opts.buttons.length - 1 : 0,
    });
    return r.response;
  });
  ipcMain.handle('dialog:pickSaveFile', async (_e, opts) => {
    const win = getMainWindow();
    const r = await dialog.showSaveDialog(win, {
      title: opts && opts.title,
      defaultPath: opts && opts.defaultPath,
      filters: (opts && opts.filters) || [],
    });
    return r.canceled ? null : r.filePath;
  });

  // ---- files (editor open/save, row exports) ----
  ipcMain.handle('file:readText', (_e, filePath, maxMB = 50) => {
    if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) throw new Error('File not found: ' + filePath);
    if (fs.statSync(filePath).size > maxMB * 1024 * 1024) throw new Error(`File is larger than ${maxMB} MB`);
    return fs.readFileSync(filePath, 'utf8');
  });
  ipcMain.handle('file:writeText', (_e, filePath, content) => {
    fs.writeFileSync(filePath, content, 'utf8');
    return true;
  });
  ipcMain.handle('io:exportRows', (_e, { fields, rows, format, filePath, sheetName }) => {
    if (!Array.isArray(fields) || !Array.isArray(rows)) throw new Error('Invalid export payload');
    if (format === 'xlsx') return { count: writeRowsXlsx(fields, rows, filePath, sheetName) };
    return { count: writeRowsPlain(fields, rows, format, filePath) };
  });

  // ---- store ----
  ipcMain.handle('store:settings:get', () => store.getSettings());
  ipcMain.handle('store:settings:set', (_e, patch) => store.setSettings(patch));
  ipcMain.handle('store:connections:list', () => store.listConnections());
  ipcMain.handle('store:connections:save', (_e, conn) => store.saveConnection(conn));
  ipcMain.handle('store:connections:delete', (_e, id) => store.deleteConnection(id));
  ipcMain.handle('store:history:list', () => store.listHistory());
  ipcMain.handle('store:history:add', (_e, entry) => store.addHistory(entry || {}));
  ipcMain.handle('store:history:clear', () => store.clearHistory());
  ipcMain.handle('store:snippets:list', () => store.listSnippets());
  ipcMain.handle('store:snippets:save', (_e, s) => store.saveSnippet(s));
  ipcMain.handle('store:snippets:delete', (_e, id) => store.deleteSnippet(id));
  ipcMain.handle('store:tourDone', () => store.setTourDone());
  ipcMain.handle('store:session:get', () => store.getSession());
  ipcMain.handle('store:session:save', (_e, s) => store.saveSession(s || {}));

  // ---- sql log ----
  ipcMain.handle('sqllog:read', (_e, limit) => sqllog.read(limit || 400));
  ipcMain.handle('sqllog:openFolder', () => { shell.openPath(sqllog.openFolder()); return true; });

  // ---- database ----
  ipcMain.handle('db:connect', async (_e, id) => {
    try { return { ok: true, info: await dbm.connect(id) }; }
    catch (err) { return { ok: false, error: err.message }; }
  });
  ipcMain.handle('db:disconnect', async (_e, id) => { await dbm.close(id); return true; });
  ipcMain.handle('db:query', async (_e, id, sql, params, opts) => dbm.query(id, sql, params, opts || {}));
  ipcMain.handle('db:exec', async (_e, id, sql, opts) => dbm.exec(id, sql, opts || {}));
  ipcMain.handle('db:listDatabases', (_e, id) => dbm.listDatabases(id));
  ipcMain.handle('db:listObjects', (_e, id, db) => dbm.listObjects(id, db));
  ipcMain.handle('db:listRoutines', (_e, id, db) => dbm.listRoutines(id, db));
  ipcMain.handle('db:listTriggers', (_e, id, db) => dbm.listTriggers(id, db));
  ipcMain.handle('db:listEvents', (_e, id, db) => dbm.listEvents(id, db));
  ipcMain.handle('db:tableColumns', (_e, id, db, t) => dbm.tableColumns(id, db, t));
  ipcMain.handle('db:tableIndexes', (_e, id, db, t) => dbm.tableIndexes(id, db, t));
  ipcMain.handle('db:tableDDL', (_e, id, db, t) => dbm.tableDDL(id, db, t));
  ipcMain.handle('db:tableStats', (_e, id, db, t) => dbm.tableStats(id, db, t));
  ipcMain.handle('db:primaryKeys', (_e, id, db, t) => dbm.primaryKeys(id, db, t));
  ipcMain.handle('db:selectPage', (_e, args) => dbm.selectPage(args.connId, args));
  ipcMain.handle('db:applyChanges', (_e, args) => dbm.applyChanges(args.connId, args));
  ipcMain.handle('db:dropObject', (_e, args) => dbm.dropObject(args.connId, args));
  ipcMain.handle('db:truncateTable', (_e, args) => dbm.truncateTable(args.connId, args));
  ipcMain.handle('db:renameObject', (_e, args) => dbm.renameObject(args.connId, args));
  ipcMain.handle('db:createDatabase', (_e, args) => dbm.createDatabase(args.connId, args));
  ipcMain.handle('db:listCharsets', (_e, id) => dbm.listCharsets(id));
  ipcMain.handle('db:buildTableDDL', (_e, payload) => dbm.buildTableDDL(payload));
  ipcMain.handle('db:processList', (_e, id) => dbm.processList(id));
  ipcMain.handle('db:killProcess', (_e, id, pid, q) => dbm.killProcess(id, pid, q));
  ipcMain.handle('db:variables', (_e, id, kind, search) => dbm.variables(id, kind, search));
  ipcMain.handle('db:users', (_e, id) => dbm.users(id));
  ipcMain.handle('db:userGrants', (_e, id, u, h) => dbm.userGrants(id, u, h));
  ipcMain.handle('db:createUser', (_e, args) => dbm.createUser(args.connId, args));
  ipcMain.handle('db:alterUserPassword', (_e, args) => dbm.alterUserPassword(args.connId, args));
  ipcMain.handle('db:dropUser', (_e, args) => dbm.dropUser(args.connId, args));
  ipcMain.handle('db:grant', (_e, args) => dbm.grant(args.connId, args));

  // ---- import / export / backup ----
  ipcMain.handle('io:exportToFile', (_e, args) => dbm.exportToFile(args.connId, args));
  ipcMain.handle('io:importCsv', (_e, args) => dbm.importCsv(args.connId, args));
  ipcMain.handle('io:importJson', (_e, args) => dbm.importJson(args.connId, args));
  ipcMain.handle('io:importXlsx', (_e, args) => dbm.importXlsx(args.connId, args));
  ipcMain.handle('db:findInDatabase', (_e, args) => dbm.findInDatabase(args.connId, args));
  ipcMain.handle('io:runSqlFile', (_e, args) => dbm.runSqlFile(args.connId, args));
  ipcMain.handle('io:backup', (_e, args) => dbm.backup(args.connId, args));

  // ---- updates ----
  setupUpdater({ app, BrowserWindow, getMainWindow, store });
}

function openAbout() {
  const win = getMainWindow();
  if (win) win.webContents.send('menu:action', 'about');
}

function checkUpdates() {
  const win = getMainWindow();
  if (win) win.webContents.send('menu:action', 'check-updates');
}

app.whenReady().then(() => {
  store = new Store();
  sqllog = new SQLLog({ userDataDir: app.getPath('userData'), store });
  sqllog.prune(store.getSettings().sqlLogDays || 30);
  dbm = new DBManager(store, sqllog, (channel, payload) => {
    const w = getMainWindow();
    if (w && !w.isDestroyed()) w.webContents.send(channel, payload);
  });
  registerIpc();
  buildMenu({ getMainWindow, store, openAbout, checkUpdates });
  createWindow();

  app.on('second-instance', () => {
    const w = getMainWindow();
    if (w) { if (w.isMinimized()) w.restore(); w.focus(); }
  });
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });

  if (SELFTEST) {
    // capture renderer diagnostics
    const diag = [];
    mainWindow.webContents.on('console-message', (_e, level, message, line, sourceId) => {
      diag.push({ level, message: String(message).slice(0, 300), source: String(sourceId).split(/[\\/]/).pop() + ':' + line });
    });
    mainWindow.webContents.on('preload-error', (_e, p, err) => diag.push({ preloadError: String(err) }));
    mainWindow.webContents.on('render-process-gone', (_e, d) => diag.push({ renderGone: d.reason }));

    setTimeout(async () => {
      const fs = require('fs');
      const checks = {
        electron: process.versions.electron,
        store: !!store.data.settings.language,
        dbModule: typeof dbm.query === 'function',
        escId: DBManager.escId('a`b') === '`a``b`',
        csvParse: (() => { const { parseCsv } = require('./db'); return JSON.stringify(parseCsv('a,b\n"x,y",2')) === JSON.stringify([['a','b'],['x,y','2']]); })(),
        sqlSplit: (() => { const { splitSqlStatements } = require('./db'); return splitSqlStatements("SELECT 1; INSERT INTO t VALUES ('a;b');").length === 2; })(),
        xlsx: (() => {
          try {
            const { writeRowsXlsx } = require('./xlsxio');
            const p = path.join(app.getPath('temp'), 'wjds-selftest.xlsx');
            const n = writeRowsXlsx([{ name: 'a' }, { name: 'b' }], [{ a: 1, b: 'x' }, { a: 2, b: 'y' }], p, 'T');
            return n === 2 && fs.existsSync(p);
          } catch { return false; }
        })(),
        window: !!mainWindow,
      };
      const ok = checks.store && checks.dbModule && checks.escId && checks.csvParse && checks.sqlSplit && checks.window && checks.xlsx;
      checks.ok = ok;
      // Verify the renderer booted (home view rendered) when possible
      try {
        const dom = await mainWindow.webContents.executeJavaScript(
          'JSON.stringify({tree: !!document.querySelector("#tree"), home: !!document.querySelector("#views .view"), tabs: document.querySelectorAll("#tabbar .tab").length, toastApi: typeof window.wjds.dbQuery})', true);
        checks.renderer = JSON.parse(dom);
        if (!checks.renderer.tree || !checks.renderer.home) checks.ok = false;
      } catch (e) {
        checks.renderer = { error: String(e && e.message || e) };
        checks.ok = false;
      }
      try { console.log('SELFTEST ' + JSON.stringify(checks)); } catch {}
      checks.diagnostics = diag;
      try { fs.writeFileSync(path.join(app.getPath('temp'), 'wjds-selftest.json'), JSON.stringify(checks, null, 2)); } catch {}
      await dbm.closeAll();
      app.exit(ok ? 0 : 1);
    }, 2500);
  }
});

app.on('window-all-closed', async () => {
  if (SELFTEST) return; // selftest exits explicitly
  if (dbm) await dbm.closeAll();
  if (process.platform !== 'darwin') app.quit();
});
