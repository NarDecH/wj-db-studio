'use strict';
/**
 * WJ DB Studio — native application menu & global shortcuts.
 * Menu labels are bilingual; actions are forwarded to the renderer.
 * (c) 2026 Weeradech Jessadarom — MIT
 */
const { Menu, app, shell } = require('electron');

const L = {
  en: {
    file: 'File', edit: 'Edit', view: 'View', tools: 'Tools', help: 'Help',
    newConn: 'New Connection…', manageConn: 'Manage Connections…', newQuery: 'New Query Tab', closeTab: 'Close Tab',
    quit: 'Quit', undo: 'Undo', redo: 'Redo', cut: 'Cut', copy: 'Copy', paste: 'Paste', selectAll: 'Select All',
    exec: 'Execute Query', execSel: 'Execute Selection', refresh: 'Refresh',
    importData: 'Import Data…', exportData: 'Export Results…', backup: 'Backup Database…',
    settings: 'Settings…', serverDashboard: 'Server Dashboard', userManager: 'Users & Privileges',
    procList: 'Process List', about: 'About WJ DB Studio', checkUpdates: 'Check for Updates…',
    sqllog: 'SQL Log', transfer: 'Transfer Table Between Connections…', compare: 'Schema Compare…',
    mock: 'Generate Mock Data…',
    connx: { export: 'Export Connections (no passwords)…', import: 'Import Connections…' },
    helpTopics: 'Help Topics', shortcuts: 'Keyboard Shortcuts', reloadUI: 'Reload UI', devtools: 'Toggle Developer Tools',
    zoom: 'Zoom', fullscreen: 'Toggle Full Screen', home: 'Home Dashboard', resetZoom: 'Reset Zoom',
  },
  th: {
    file: 'ไฟล์', edit: 'แก้ไข', view: 'มุมมอง', tools: 'เครื่องมือ', help: 'ช่วยเหลือ',
    newConn: 'เชื่อมต่อใหม่…', manageConn: 'จัดการการเชื่อมต่อ…', newQuery: 'แท็บคำสั่ง SQL ใหม่', closeTab: 'ปิดแท็บ',
    quit: 'ออกจากโปรแกรม', undo: 'เลิกทำ', redo: 'ทำซ้ำ', cut: 'ตัด', copy: 'คัดลอก', paste: 'วาง', selectAll: 'เลือกทั้งหมด',
    exec: 'รันคำสั่ง', execSel: 'รันเฉพาะที่เลือก', refresh: 'รีเฟรช',
    importData: 'นำเข้าข้อมูล…', exportData: 'ส่งออกผลลัพธ์…', backup: 'สำรองฐานข้อมูล…',
    settings: 'ตั้งค่า…', serverDashboard: 'แดชบอร์ดเซิร์ฟเวอร์', userManager: 'ผู้ใช้และสิทธิ์',
    procList: 'Process List', about: 'เกี่ยวกับ WJ DB Studio', checkUpdates: 'ตรวจสอบการอัปเดต…',
    sqllog: 'SQL Log', transfer: 'ย้าย/คัดลอกตารางข้ามการเชื่อมต่อ…', compare: 'เทียบโครงสร้างฐานข้อมูล…',
    mock: 'สร้างข้อมูลทดสอบ…',
    connx: { export: 'ส่งออกรายการเชื่อมต่อ (ไม่รวมรหัสผ่าน)…', import: 'นำเข้ารายการเชื่อมต่อ…' },
    helpTopics: 'หัวข้อช่วยเหลือ', shortcuts: 'ปุ่มลัดคีย์บอร์ด', reloadUI: 'โหลดหน้าจอใหม่', devtools: 'เปิด/ปิด Developer Tools',
    zoom: 'ซูม', fullscreen: 'เต็มหน้าจอ', home: 'แดชบอร์ดหลัก', resetZoom: 'รีเซ็ตซูม',
  },
};

function sendTo(win, action) {
  if (win && !win.isDestroyed()) win.webContents.send('menu:action', action);
}

function buildMenu({ getMainWindow, store, openAbout, checkUpdates }) {
  const lang = (store.getSettings().language === 'th') ? 'th' : 'en';
  const t = L[lang];
  const win = () => getMainWindow();

  const template = [
    {
      label: t.file,
      submenu: [
        { label: t.newConn, accelerator: 'CmdOrCtrl+N', click: () => sendTo(win(), 'new-connection') },
        { label: t.manageConn, click: () => sendTo(win(), 'manage-connections') },
        { type: 'separator' },
        { label: t.newQuery, accelerator: 'CmdOrCtrl+T', click: () => sendTo(win(), 'new-query') },
        { label: t.closeTab, accelerator: 'CmdOrCtrl+W', click: () => sendTo(win(), 'close-tab') },
        { type: 'separator' },
        { label: t.importData, click: () => sendTo(win(), 'import') },
        { label: t.exportData, click: () => sendTo(win(), 'export') },
        { label: t.backup, click: () => sendTo(win(), 'backup') },
        { type: 'separator' },
        { label: t.quit, role: 'quit' },
      ],
    },
    {
      label: t.edit,
      submenu: [
        { label: t.undo, role: 'undo' }, { label: t.redo, role: 'redo' },
        { type: 'separator' },
        { label: t.cut, role: 'cut' }, { label: t.copy, role: 'copy' }, { label: t.paste, role: 'paste' },
        { label: t.selectAll, role: 'selectAll' },
      ],
    },
    {
      label: t.view,
      submenu: [
        { label: t.home, accelerator: 'CmdOrCtrl+1', click: () => sendTo(win(), 'home') },
        { label: t.refresh, accelerator: 'F5', click: () => sendTo(win(), 'refresh') },
        { type: 'separator' },
        { label: t.reloadUI, role: 'reload' }, { label: t.devtools, role: 'toggleDevTools' },
        { type: 'separator' },
        { label: t.zoom, submenu: [
          { role: 'zoomIn' }, { role: 'zoomOut' }, { label: t.resetZoom, role: 'resetZoom' },
        ]},
        { label: t.fullscreen, role: 'togglefullscreen' },
      ],
    },
    {
      label: t.tools,
      submenu: [
        { label: t.exec, accelerator: 'CmdOrCtrl+Return', click: () => sendTo(win(), 'execute') },
        { label: t.execSel, accelerator: 'CmdOrCtrl+Shift+Return', click: () => sendTo(win(), 'execute-selection') },
        { type: 'separator' },
        { label: t.serverDashboard, click: () => sendTo(win(), 'server-dashboard') },
        { label: t.procList, click: () => sendTo(win(), 'process-list') },
        { label: t.userManager, click: () => sendTo(win(), 'user-manager') },
        { label: t.sqllog, click: () => sendTo(win(), 'open-sqllog') },
        { label: t.transfer, click: () => sendTo(win(), 'transfer') },
        { label: t.compare, click: () => sendTo(win(), 'schema-compare') },
        { label: t.mock, click: () => sendTo(win(), 'mock-data') },
        { label: t.connx.export, click: () => sendTo(win(), 'export-connections') },
        { label: t.connx.import, click: () => sendTo(win(), 'import-connections') },
        { type: 'separator' },
        { label: t.settings, accelerator: 'CmdOrCtrl+,', click: () => sendTo(win(), 'settings') },
      ],
    },
    {
      label: t.help,
      submenu: [
        { label: t.helpTopics, accelerator: 'F1', click: () => sendTo(win(), 'help') },
        { label: t.shortcuts, accelerator: 'CmdOrCtrl+/', click: () => sendTo(win(), 'shortcuts') },
        { type: 'separator' },
        { label: t.checkUpdates, click: () => { if (checkUpdates) checkUpdates(); else sendTo(win(), 'check-updates'); } },
        { type: 'separator' },
        { label: t.about, click: () => openAbout && openAbout() },
      ],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

module.exports = { buildMenu };
