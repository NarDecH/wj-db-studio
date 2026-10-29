/**
 * WJ DB Studio — auto-update UI: passive badge + download/install flow.
 * (c) 2026 Weeradech Jessadarom — MIT
 */
import { el, ic, toast } from './utils.js';
import { t } from './i18n.js';
import { state } from './state.js';

let downloadedVersion = null;

export function initUpdateBadge() {
  window.wjds.onUpdateEvent((payload) => {
    switch (payload.type) {
      case 'available':
        toast(t('about.newVersion', { v: payload.version }), 'info', t('about.check'), 8000);
        break;
      case 'progress':
        break;
      case 'downloaded':
        downloadedVersion = payload.version;
        toast('✓ ' + t('about.install'), 'ok', payload.version, 10000);
        installPrompt();
        break;
    }
  });
}

function installPrompt() {
  const { showModal } = window.__zutil || {};
  import('./utils.js').then(({ showModal }) => {
    const r = showModal({
      title: t('about.install'), icon: 'ok', width: '420px',
      body: el('div', { class: 'about' },
        el('h2', { text: 'v' + downloadedVersion }),
        el('p', { text: t('about.newVersion', { v: downloadedVersion }) })),
      footer: [
        el('button', { class: 'btn', onclick: () => r.close(), text: t('help.tourSkip') }),
        el('button', { class: 'btn primary', onclick: () => window.wjds.updateInstall() }, ic('ok'), el('span', { text: t('about.install') })),
      ],
    });
  });
}

/** Manual check flow (menu / about). */
export async function checkUpdatesFlow() {
  const info = await window.wjds.updateInfo();
  if (!info.enabled) {
    toast('v' + info.version + ' — dev build (updates disabled)', 'info');
    return;
  }
  toast('⏳ …', 'info', t('about.check'));
  const res = await window.wjds.updateCheck();
  if (res.status === 'available') {
    const dl = await window.wjds.updateDownload();
    if (dl.ok) toast('✓ ' + t('about.install'), 'ok');
    else toast(t('msg.error'), 'err', dl.message);
  } else if (res.status === 'none') {
    toast('✓ ' + t('about.upToDate'), 'ok');
  } else {
    toast(t('msg.error'), 'err', res.message);
  }
}
