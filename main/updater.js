'use strict';
/**
 * WJ DB Studio — auto-update via GitHub Releases (electron-updater).
 * (c) 2026 Weeradech Jessadarom — MIT
 */
const { ipcMain } = require('electron');
const pkg = require('../package.json');

function setupUpdater({ app, BrowserWindow, getMainWindow, store }) {
  // Only meaningful in packaged builds; dev builds check GitHub API instead.
  if (!app.isPackaged) {
    ipcMain.handle('update:info', () => ({
      enabled: false,
      version: pkg.version,
      reason: 'dev',
    }));
    ipcMain.handle('update:check', async () => ({ status: 'disabled', version: pkg.version }));
    ipcMain.handle('update:download', async () => ({ ok: false }));
    ipcMain.handle('update:install', async () => ({ ok: false }));
    return null;
  }

  let autoUpdater;
  try {
    autoUpdater = require('electron-updater').autoUpdater;
  } catch {
    return null;
  }

  autoUpdater.autoDownload = false;          // user decides (setting controls the prompt)
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.logger = console;

  const send = (channel, payload) => {
    const win = getMainWindow();
    if (win && !win.isDestroyed()) win.webContents.send(channel, payload);
  };

  autoUpdater.on('checking-for-update', () => send('update:event', { type: 'checking' }));
  autoUpdater.on('update-available', (info) => send('update:event', { type: 'available', version: info.version, notes: info.releaseNotes || '' }));
  autoUpdater.on('update-not-available', (info) => send('update:event', { type: 'none', version: info.version }));
  autoUpdater.on('download-progress', (p) => send('update:event', { type: 'progress', percent: Math.round(p.percent) }));
  autoUpdater.on('update-downloaded', (info) => send('update:event', { type: 'downloaded', version: info.version }));

  ipcMain.handle('update:info', () => ({
    enabled: true,
    version: pkg.version,
    allowPrerelease: autoUpdater.allowPrerelease,
  }));

  ipcMain.handle('update:check', async () => {
    try {
      const result = await autoUpdater.checkForUpdates();
      const version = result && result.updateInfo ? result.updateInfo.version : null;
      return { status: version && version !== pkg.version ? 'available' : 'none', version };
    } catch (err) {
      return { status: 'error', message: String(err && err.message || err) };
    }
  });

  ipcMain.handle('update:download', async () => {
    try {
      const files = await autoUpdater.downloadUpdate();
      return { ok: true, files };
    } catch (err) {
      return { ok: false, message: String(err && err.message || err) };
    }
  });

  ipcMain.handle('update:install', () => {
    autoUpdater.quitAndInstall(false, true);
    return { ok: true };
  });

  // Automatic check on startup (respecting the setting)
  const settings = store.getSettings();
  if (settings.autoUpdate) {
    setTimeout(() => {
      autoUpdater.checkForUpdates().catch(() => { /* offline: silent */ });
    }, 15000);
  }

  return autoUpdater;
}

module.exports = { setupUpdater };
