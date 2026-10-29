/**
 * WJ DB Studio — settings dialog, about dialog, shortcuts reference.
 * (c) 2026 Weeradech Jessadarom — MIT
 */
import { el, ic, toast, showModal } from './utils.js';
import { t } from './i18n.js';
import { state, saveSettings } from './state.js';

export function showSettings(onApply) {
  const s = state.settings;

  const langSel = el('select', {},
    el('option', { value: 'th', text: 'ไทย (Thai)', selected: s.language === 'th' }),
    el('option', { value: 'en', text: 'English', selected: s.language === 'en' }));
  const themeSel = el('select', {},
    el('option', { value: 'dark', text: t('set.dark'), selected: s.theme === 'dark' }),
    el('option', { value: 'light', text: t('set.light'), selected: s.theme === 'light' }));
  const fontI = el('input', { type: 'number', min: '11', max: '20', value: s.fontSize });
  const edFontI = el('input', { type: 'number', min: '11', max: '28', value: s.editorFontSize });
  const maxRowsI = el('input', { type: 'number', min: '50', max: '10000', step: '50', value: s.maxRows });
  const timeoutI = el('input', { type: 'number', min: '5', max: '600', value: s.queryTimeout });
  const autoUpd = el('input', { type: 'checkbox' }); autoUpd.checked = !!s.autoUpdate;
  const confirmChk = el('input', { type: 'checkbox' }); confirmChk.checked = !!s.confirmDestructive;
  const acChk = el('input', { type: 'checkbox' }); acChk.checked = !!s.autoComplete;
  const logChk = el('input', { type: 'checkbox' }); logChk.checked = s.sqlLog !== false;
  const logDaysI = el('input', { type: 'number', min: '1', max: '365', value: s.sqlLogDays || 30 });

  const r = showModal({
    title: t('set.title'), icon: 'gear', width: '540px',
    body: el('div', { class: 'form' },
      el('div', { class: 'form-grid2' },
        el('div', {}, fieldLabel(t('set.language')), langSel),
        el('div', {}, fieldLabel(t('set.theme')), themeSel)),
      el('div', { class: 'form-grid3' },
        el('div', {}, fieldLabel(t('set.fontsize')), fontI),
        el('div', {}, fieldLabel(t('set.editorfontsize')), edFontI),
        el('div', {}, fieldLabel(t('set.maxrows')), maxRowsI)),
      el('div', { class: 'form-row' }, el('label', { text: t('set.timeout') }), timeoutI),
      el('label', { class: 'check' }, autoUpd, el('span', { text: t('set.autoupdate') })),
      el('label', { class: 'check' }, confirmChk, el('span', { text: t('set.confirm') })),
      el('label', { class: 'check' }, acChk, el('span', { text: t('set.autocomplete') })),
      el('label', { class: 'check' }, logChk, el('span', { text: t('set.sqllog') })),
      el('div', { class: 'form-row' }, el('label', { text: t('set.sqllogdays') }), logDaysI),
      el('div', { class: 'res-msg', text: '🔒 ' + t('set.security') })),
    footer: [
      el('button', { class: 'btn', onclick: () => r.close(), text: t('conn.cancel') }),
      el('button', { class: 'btn primary', onclick: doSave }, ic('save'), el('span', { text: t('conn.save') })),
    ],
  });

  async function doSave() {
    await saveSettings({
      language: langSel.value,
      theme: themeSel.value,
      fontSize: parseInt(fontI.value, 10) || 13,
      editorFontSize: parseInt(edFontI.value, 10) || 14,
      maxRows: parseInt(maxRowsI.value, 10) || 500,
      queryTimeout: parseInt(timeoutI.value, 10) || 30,
      autoUpdate: autoUpd.checked,
      confirmDestructive: confirmChk.checked,
      autoComplete: acChk.checked,
      sqlLog: logChk.checked,
      sqlLogDays: parseInt(logDaysI.value, 10) || 30,
    });
    toast(t('set.saved'), 'ok');
    r.close();
    onApply && onApply();
  }
}

/* ================= About ================= */
export function showAbout(version) {
  const checkBtn = el('button', { class: 'btn', onclick: checkNow }, ic('refresh'), el('span', { text: t('about.check') }));
  const statusLine = el('div', { class: 'res-msg', style: { textAlign: 'center' } });

  const r = showModal({
    title: t('about.title'), icon: 'help', width: '480px',
    body: el('div', { class: 'about' },
      el('div', { class: 'logo', html: ic('database').innerHTML }),
      el('h2', { text: 'WJ DB Studio' }),
      el('div', { class: 'ver', text: 'Version ' + version + ' · MySQL & MariaDB Manager' }),
      el('div', { class: 'author' }, t('about.developed'), el('br'), el('b', { style: { fontSize: '16px' }, text: 'Weeradech Jessadarom' })),
      el('p', { text: t('about.desc') }),
      el('p', {}, t('about.license'), el('br'),
        el('a', { text: 'GitHub Releases', onclick: () => window.wjds.openExternal('https://github.com/weeradech/wj-db-studio/releases') })),
      el('p', { text: '🛡 ' + t('about.privacy') }),
      el('div', { style: { display: 'flex', gap: '8px', justifyContent: 'center' } }, checkBtn),
      statusLine),
  });

  async function checkNow() {
    statusLine.textContent = '⏳ …';
    const res = await window.wjds.updateCheck();
    if (res.status === 'available') {
      statusLine.textContent = '✨ ' + t('about.newVersion', { v: res.version });
      checkBtn.innerHTML = ic('download').outerHTML + el('span', { text: t('about.download') }).outerHTML;
      checkBtn.onclick = async () => {
        await window.wjds.updateDownload();
        checkBtn.innerHTML = ic('ok').outerHTML + el('span', { text: t('about.install') }).outerHTML;
        checkBtn.onclick = () => window.wjds.updateInstall();
      };
    } else if (res.status === 'none') {
      statusLine.textContent = '✓ ' + t('about.upToDate');
    } else {
      statusLine.textContent = '✗ ' + (res.message || 'update check failed');
    }
  }
}

/* ================= Shortcuts reference ================= */
export function showShortcuts() {
  const rows = [
    ['Ctrl+N', 'New connection / เชื่อมต่อใหม่'],
    ['Ctrl+T', 'New query tab / แท็บ SQL ใหม่'],
    ['Ctrl+W', 'Close tab / ปิดแท็บ'],
    ['Ctrl+Enter', 'Execute SQL / รันคำสั่ง SQL'],
    ['Ctrl+Shift+Enter', 'Execute selection / รันเฉพาะที่เลือก'],
    ['Ctrl+Space', 'Autocomplete / ช่วยเติมคำ'],
    ['Ctrl+/', 'Toggle comment / คอมเมนต์'],
    ['Ctrl+,', 'Settings / ตั้งค่า'],
    ['F1', 'Help / ช่วยเหลือ'],
    ['F5', 'Refresh / รีเฟรช'],
    ['Ctrl+/', 'Shortcuts / ปุ่มลัด'],
  ];
  const r = showModal({
    title: t('help.shortcuts') || 'Keyboard Shortcuts', icon: 'info', width: '480px',
    body: el('div', { class: 'var-table' },
      el('table', { class: 'var-table' },
        rows.map(([k, d]) => el('tr', {},
          el('td', {}, el('kbd', { style: { background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '5px', padding: '1px 7px', fontFamily: 'var(--font-mono)' }, text: k })),
          el('td', { text: d }))))),
  });
}

function fieldLabel(text) {
  return el('label', { style: { display: 'block', color: 'var(--text-dim)', fontSize: '11.5px', margin: '0 0 3px 2px' }, text });
}
