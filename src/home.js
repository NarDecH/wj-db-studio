/**
 * WJ DB Studio — home dashboard (welcome view).
 * (c) 2026 Weeradech Jessadarom — MIT
 */
import { el, ic, fmtBytes, fmtNum } from './utils.js';
import { t } from './i18n.js';
import { state } from './state.js';
import { openConnectionDialog, manageConnections } from './connections.js';

export function renderHome(view) {
  view.innerHTML = '';
  const root = el('div', { class: 'home' });

  root.append(
    el('h1', {}, 'WJ DB Studio'),
    el('div', { class: 'sub', text: t('about.desc') }),
  );

  const cards = el('div', { class: 'cards' });
  const actions = [
    ['plug', t('tb.newconn'), t('conn.new') + ' — MySQL / MariaDB', () => openConnectionDialog({ onSaved: () => import('./app.js').then(m => m.openTab && null) })],
    ['code', t('tb.newquery'), t('ed.empty'), () => import('./editor.js').then(m => m.openEditor())],
    ['import', t('tb.import'), 'CSV / JSON / SQL', () => import('./importer.js').then(m => m.importDialog())],
    ['backup', t('tb.backup'), t('bk.title'), () => import('./importer.js').then(m => m.backupDialog())],
    ['server', t('tb.server'), t('srv.title'), () => import('./servertools.js').then(m => m.openServerDashboard())],
    ['users', t('tb.users'), t('usr.title'), () => import('./servertools.js').then(m => m.openUsers())],
    ['gear', t('set.title'), t('set.security'), () => import('./settings.js').then(m => m.showSettings())],
    ['help', t('help.title'), 'F1', () => import('./help.js').then(m => m.showHelp())],
  ];
  for (const [icon, title, desc, action] of actions) {
    cards.append(el('div', { class: 'card', onclick: action },
      el('div', { class: 'cicon', html: ic(icon).innerHTML }),
      el('div', {}, el('b', { text: title }), el('span', { text: desc }))));
  }
  root.append(cards);

  // recent connections
  const recents = [...state.connections].sort((a, b) => String(b.lastUsed).localeCompare(String(a.lastUsed))).slice(0, 5);
  if (recents.length) {
    const sec = el('div', { class: 'recent-conns' }, el('h3', { text: t('conn.title') }));
    for (const c of recents) {
      sec.append(el('div', {
        class: 'recent-row',
        onclick: async () => {
          const res = await window.wjds.dbConnect(c.id);
          if (res.ok) {
            import('./app.js').then(async m => {
              m.setStatusConn(t('st.ready') + ' · ' + c.name, 'on');
              m.setStatusServer(res.info);
              m.logResult('✓ ' + t('msg.connected', { name: c.name }));
            });
            import('./tree.js').then(m => m.refreshTree());
          } else {
            import('./utils.js').then(u => u.toast(t('conn.testfail'), 'err', res.error));
          }
        },
      },
        ic('server', 'ticon ic-ok'),
        el('span', { class: 'rname', text: c.name }),
        el('span', { class: 'rmeta', text: `${c.user}@${c.host}:${c.port}` })));
    }
    root.append(sec);
  }

  view.append(root);
}
