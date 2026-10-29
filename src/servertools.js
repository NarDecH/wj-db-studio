/**
 * WJ DB Studio — server dashboard, process list, variables, users & privileges.
 * (c) 2026 Weeradech Jessadarom — MIT
 */
import { el, ic, toast, showModal, confirmBox, fmtBytes, fmtNum, fmtUptime, copyText } from './utils.js';
import { t } from './i18n.js';
import { requireConn, currentDb } from './state.js';
import { openTab, logResult } from './app.js';

/* ================= Server Dashboard ================= */
export function openServerDashboard() {
  let conn;
  try { conn = requireConn(); } catch { return; }
  openTab({
    type: 'server', key: `server:${conn.id}`,
    title: t('srv.title'), icon: 'server',
    render: (tab, view) => buildServerView(tab, view, conn.id),
  });
}

async function buildServerView(tab, view, connId) {
  const root = el('div', { class: 'srv' });
  view.append(root);
  tab.onRefresh = () => buildServerView(tab, view, connId);

  try {
    const info = state0().info;
    const info2 = await window.wjds.dbConnect(connId);
    const inf = (info2 && info2.ok) ? info2.info : info;

    root.append(el('h2', {}, ic('server'), el('span', { text: t('srv.title') })));

    const cards = el('div', { class: 'stat-cards' });
    const stat = (icon, k, v) => el('div', { class: 'stat' }, el('div', { class: 'k' }, ic(icon), el('span', { text: k })), el('div', { class: 'v', text: v }));
    cards.append(
      stat('globe', t('srv.flavor'), inf.flavor || ''),
      stat('doc', t('srv.version'), inf.version || ''),
      stat('clock', t('srv.uptime'), fmtUptime(inf.uptimeSec)),
      stat('users', t('srv.threads'), fmtNum(inf.threads)),
      stat('bolt', t('srv.questions'), fmtNum(inf.questions)),
    );
    root.append(cards);

    // buttons to other tools
    root.append(el('div', { style: { display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' } },
      el('button', { class: 'btn', onclick: () => openProcessList() }, ic('monitor'), el('span', { text: t('srv.processlist') })),
      el('button', { class: 'btn', onclick: () => openVariables('variables') }, ic('gear'), el('span', { text: t('srv.vars') })),
      el('button', { class: 'btn', onclick: () => openVariables('status') }, ic('chart'), el('span', { text: t('srv.status') })),
      el('button', { class: 'btn', onclick: () => openUsers() }, ic('users'), el('span', { text: t('usr.title') }))));

    // databases with sizes
    root.append(el('h2', {}, ic('database'), el('span', { text: t('tree.databases') })));
    const dbs = await window.wjds.listDatabases(connId);
    const tbl = el('table', { class: 'var-table' });
    let totalSize = 0;
    for (const d of dbs) {
      totalSize += d.size;
      tbl.append(el('tr', { style: { cursor: 'pointer' }, onclick: () => {
        import('./grid.js');
        import('./editor.js').then(m => m.openEditor({ connId, db: d.name }));
      } },
        el('td', {}, ic('database', 'ticon ic-db'), ' ', el('span', { text: d.name })),
        el('td', { text: fmtNum(d.tables) + ' ' + t('tree.tables').toLowerCase() }),
        el('td', { text: fmtBytes(d.size) })));
    }
    root.append(tbl, el('div', { class: 'muted', style: { marginTop: '8px' }, text: t('srv.dbsize') + ': ' + fmtBytes(totalSize) }));
  } catch (err) {
    root.append(el('div', { class: 'res-msg', style: { color: 'var(--danger)' }, text: err.message }));
  }

  function state0() { return { info: null }; }
}

/* ================= Process List ================= */
export function openProcessList() {
  let conn;
  try { conn = requireConn(); } catch { return; }
  openTab({
    type: 'procs', key: `procs:${conn.id}`,
    title: t('srv.processlist'), icon: 'monitor',
    render: (tab, view) => buildProcView(tab, view, conn.id),
  });
}

async function buildProcView(tab, view, connId) {
  const root = el('div', { class: 'srv' });
  const refreshBtn = el('button', { class: 'btn', onclick: load }, ic('refresh'), el('span', { text: t('grid.refresh') }));
  root.append(el('h2', {}, ic('monitor'), el('span', { text: t('srv.processlist') })), el('div', { class: 'tbl-toolbar' }, refreshBtn));
  const wrap = el('div', {});
  root.append(wrap);
  view.append(root);
  tab.onRefresh = load;

  async function load() {
    wrap.innerHTML = '';
    try {
      const procs = await window.wjds.processList(connId);
      const tbl = el('table', { class: 'var-table' });
      tbl.append(el('tr', {}, ...['Id', 'User', 'Host', 'db', 'Command', 'Time', 'State', 'Info'].map(h => el('td', { style: { fontWeight: '700' }, text: h }))));
      for (const p of procs) {
        const info = String(p.Info || '');
        const tr = el('tr', {},
          el('td', { text: String(p.Id) }),
          el('td', { text: p.User || '' }),
          el('td', { text: p.Host || '' }),
          el('td', { text: p.db || '' }),
          el('td', { text: p.Command || '' }),
          el('td', { text: String(p.Time ?? '') }),
          el('td', { text: p.State || '' }),
          el('td', { text: info.slice(0, 120), title: info, style: { maxWidth: '420px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }));
        tr.addEventListener('contextmenu', async (e) => {
          e.preventDefault();
          const { showContextMenu } = await import('./utils.js');
          showContextMenu(e.clientX, e.clientY, [
            { label: 'Copy', icon: 'copy', action: () => copyText(JSON.stringify(p, null, 2)) },
            {
              label: t('srv.kill') + ' ' + p.Id, icon: 'stop', danger: true,
              action: async () => {
                if (!(await confirmBox(t('srv.kill'), t('srv.confirmKill', { id: p.Id }), true))) return;
                try { await window.wjds.killProcess(connId, p.Id); toast('✓ KILL ' + p.Id, 'ok'); load(); }
                catch (err) { toast(t('msg.error'), 'err', err.message); }
              },
            },
            {
              label: t('srv.killquery') + ' ' + p.Id, icon: 'stop', danger: true,
              action: async () => {
                try { await window.wjds.killProcess(connId, p.Id, true); toast('✓ KILL QUERY ' + p.Id, 'ok'); load(); }
                catch (err) { toast(t('msg.error'), 'err', err.message); }
              },
            },
          ]);
        });
        tbl.append(tr);
      }
      wrap.append(tbl);
    } catch (err) {
      wrap.append(el('div', { class: 'res-msg', style: { color: 'var(--danger)' }, text: err.message }));
    }
  }
  await load();
}

/* ================= Variables / Status ================= */
export function openVariables(kind = 'variables') {
  let conn;
  try { conn = requireConn(); } catch { return; }
  openTab({
    type: 'vars', key: `vars:${conn.id}:${kind}`,
    title: kind === 'status' ? t('srv.status') : t('srv.vars'), icon: kind === 'status' ? 'chart' : 'gear',
    render: (tab, view) => buildVarsView(tab, view, conn.id, kind),
  });
}

async function buildVarsView(tab, view, connId, kind) {
  const root = el('div', { class: 'srv' });
  const search = el('input', { type: 'text', placeholder: t('srv.search'), style: { flex: '1' } });
  const refreshBtn = el('button', { class: 'btn', onclick: load }, ic('refresh'), el('span', { text: t('grid.refresh') }));
  const wrap = el('div', {});
  root.append(
    el('h2', {}, ic(kind === 'status' ? 'chart' : 'gear'), el('span', { text: kind === 'status' ? t('srv.status') : t('srv.vars') })),
    el('div', { class: 'tbl-toolbar' }, search, refreshBtn),
    wrap);
  view.append(root);
  tab.onRefresh = load;
  let all = [];
  search.addEventListener('input', () => paint());

  async function load() {
    try {
      all = await window.wjds.variables(connId, kind, '');
      paint();
    } catch (err) {
      wrap.append(el('div', { class: 'res-msg', style: { color: 'var(--danger)' }, text: err.message }));
    }
  }
  function paint() {
    wrap.innerHTML = '';
    const s = search.value.toLowerCase();
    const rows = s ? all.filter(x => x.name.toLowerCase().includes(s) || String(x.value).toLowerCase().includes(s)) : all;
    const tbl = el('table', { class: 'var-table' });
    for (const v of rows.slice(0, 2000)) {
      tbl.append(el('tr', {}, el('td', { text: v.name }), el('td', { text: String(v.value) })));
    }
    wrap.append(tbl);
    if (rows.length > 2000) wrap.append(el('div', { class: 'muted', text: `+${rows.length - 2000} more…` }));
  }
  await load();
}

/* ================= Users & Privileges ================= */
const GLOBAL_PRIVS = ['ALL PRIVILEGES', 'SELECT', 'INSERT', 'UPDATE', 'DELETE', 'CREATE', 'DROP', 'RELOAD', 'PROCESS', 'FILE',
  'REFERENCES', 'INDEX', 'ALTER', 'SHOW DATABASES', 'SUPER', 'CREATE TEMPORARY TABLES', 'LOCK TABLES', 'REPLICATION CLIENT',
  'REPLICATION SLAVE', 'CREATE VIEW', 'SHOW VIEW', 'CREATE ROUTINE', 'ALTER ROUTINE', 'CREATE USER', 'EVENT', 'TRIGGER'];

export function openUsers() {
  let conn;
  try { conn = requireConn(); } catch { return; }
  openTab({
    type: 'users', key: `users:${conn.id}`,
    title: t('usr.title'), icon: 'users',
    render: (tab, view) => buildUsersView(tab, view, conn.id),
  });
}

async function buildUsersView(tab, view, connId) {
  const root = el('div', { class: 'srv' });
  root.append(el('h2', {}, ic('users'), el('span', { text: t('usr.title') })),
    el('div', { class: 'tbl-toolbar' },
      el('button', { class: 'btn primary', onclick: showCreate }, ic('plus'), el('span', { text: t('usr.new') }))),
    el('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '16px', alignItems: 'start' } },
      el('div', {}, el('h3', { style: { color: 'var(--text-dim)', fontSize: '12px' }, text: t('usr.name') }), userListEl),
      el('div', {}, el('h3', { style: { color: 'var(--text-dim)', fontSize: '12px' }, text: t('usr.grants') }), grantsEl)));
  view.append(root);

  const userListEl = el('div', {});
  const grantsEl = el('div', {});

  async function load() {
    userListEl.innerHTML = '';
    try {
      const users = await window.wjds.users(connId);
      for (const u of users) {
        const row = el('div', {
          class: 'recent-row',
          onclick: () => showGrants(u.User, u.Host),
          oncontextmenu: (e) => {
            e.preventDefault();
            import('./utils.js').then(({ showContextMenu }) => showContextMenu(e.clientX, e.clientY, [
              { label: t('usr.setpass'), icon: 'key', action: () => showSetPassword(u) },
              {
                label: t('usr.drop'), icon: 'trash', danger: true, action: async () => {
                  if (!(await confirmBox(t('usr.drop'), t('usr.confirmDrop', { u: u.User, h: u.Host }), true))) return;
                  try { await window.wjds.dropUser({ connId, user: u.User, host: u.Host }); toast('✓', 'ok'); load(); }
                  catch (err) { toast(t('msg.error'), 'err', err.message); }
                },
              },
            ]));
          },
        },
          ic('user', 'ticon ic-acc'),
          el('span', { class: 'rname', text: u.User }),
          el('span', { class: 'rmeta', text: '@' + u.Host }));
        userListEl.append(row);
      }
    } catch (err) {
      userListEl.append(el('div', { class: 'res-msg', style: { color: 'var(--danger)' }, text: err.message }));
    }
  }

  async function showGrants(user, host) {
    grantsEl.innerHTML = '';
    try {
      const grants = await window.wjds.userGrants(connId, user, host);
      const pre = el('div', { class: 'ds-code', style: { maxHeight: '400px' }, text: grants.join('\n\n') });
      grantsEl.append(pre);
      // quick grant editor
      const privChecks = GLOBAL_PRIVS.map(p => ({ p, chk: el('input', { type: 'checkbox' }) }));
      const applyBtn = el('button', { class: 'btn primary', onclick: doGrant }, ic('ok'), el('span', { text: 'GRANT' }));
      grantsEl.append(el('h3', { style: { color: 'var(--text-dim)', fontSize: '12px', marginTop: '14px' }, text: t('usr.global') }),
        el('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '4px' } },
          privChecks.map(x => el('label', { class: 'check' }, x.chk, el('span', { text: x.p, style: { fontSize: '11.5px' } })))),
        el('div', { class: 'tbl-toolbar' }, applyBtn));
      async function doGrant() {
        const privs = privChecks.filter(x => x.chk.checked).map(x => x.p);
        if (!privs.length) return;
        try {
          await window.wjds.grant({ connId, user, host, privs, database: '*', withGrant: false });
          toast('✓ GRANT ' + privs.join(', '), 'ok');
          showGrants(user, host);
        } catch (err) { toast(t('msg.error'), 'err', err.message); }
      }
    } catch (err) {
      grantsEl.append(el('div', { class: 'res-msg', style: { color: 'var(--danger)' }, text: err.message }));
    }
  }

  function showCreate() {
    const user = el('input', { type: 'text', placeholder: 'newuser' });
    const host = el('input', { type: 'text', value: '%', placeholder: '%' });
    const pass = el('input', { type: 'password', placeholder: 'password' });
    const r = showModal({
      title: t('usr.new'), icon: 'user',
      body: el('div', { class: 'form' },
        el('div', { class: 'form-grid2' },
          el('div', {}, fieldLabel(t('usr.name')), user),
          el('div', {}, fieldLabel(t('usr.host')), host)),
        el('div', { class: 'form-row' }, el('label', { text: t('usr.password') }), pass)),
      footer: [
        el('button', { class: 'btn', onclick: () => r.close(), text: t('conn.cancel') }),
        el('button', { class: 'btn primary', onclick: async () => {
          try {
            await window.wjds.createUser({ connId, user: user.value.trim(), host: host.value.trim() || '%', password: pass.value });
            toast(t('usr.created'), 'ok');
            r.close(); load();
          } catch (err) { toast(t('msg.error'), 'err', err.message); }
        } }, ic('ok'), el('span', { text: t('conn.save') })),
      ],
    });
  }

  function showSetPassword(u) {
    const pass = el('input', { type: 'password' });
    const r = showModal({
      title: `${t('usr.setpass')} — ${u.User}@${u.Host}`, icon: 'key',
      body: el('div', { class: 'form' }, el('div', { class: 'form-row' }, el('label', { text: t('usr.password') }), pass)),
      footer: [
        el('button', { class: 'btn', onclick: () => r.close(), text: t('conn.cancel') }),
        el('button', { class: 'btn primary', onclick: async () => {
          try {
            await window.wjds.alterUserPassword({ connId, user: u.User, host: u.Host, password: pass.value });
            toast('✓', 'ok'); r.close();
          } catch (err) { toast(t('msg.error'), 'err', err.message); }
        } }, ic('ok'), el('span', { text: t('conn.save') })),
      ],
    });
  }

  await load();
}

function fieldLabel(text) {
  return el('label', { style: { display: 'block', color: 'var(--text-dim)', fontSize: '11.5px', margin: '0 0 3px 2px' }, text });
}
