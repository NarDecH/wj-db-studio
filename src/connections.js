/**
 * WJ DB Studio — connection manager UI.
 * (c) 2026 Weeradech Jessadarom — MIT
 */
import { $, el, ic, toast, showModal, confirmBox } from './utils.js';
import { t } from './i18n.js';
import { state, loadConnections } from './state.js';

/**
 * Connection editor dialog.
 * opts: { conn?: existing meta, onSaved?: fn, connectAfter?: bool }
 */
export function openConnectionDialog(opts = {}) {
  const conn = opts.conn || null;
  const isEdit = !!conn;
  const s = state.settings || {};

  const name = el('input', { type: 'text', value: conn ? conn.name : '', placeholder: 'Local development' });
  const group = el('input', { type: 'text', value: conn ? (conn.group || '') : '', placeholder: 'e.g. Production' });
  const host = el('input', { type: 'text', value: conn ? conn.host : '127.0.0.1', placeholder: '127.0.0.1' });
  const port = el('input', { type: 'number', value: conn ? conn.port : 3306, min: '1', max: '65535' });
  const user = el('input', { type: 'text', value: conn ? conn.user : 'root', autocomplete: 'off' });
  const pass = el('input', { type: 'password', value: '', placeholder: conn && conn.passwordStored ? '•••••••• (saved)' : '' });
  const ssl = el('input', { type: 'checkbox' });
  ssl.checked = !!(conn && conn.ssl);
  const sslCa = el('input', { type: 'text', value: conn ? (conn.sslCa || '') : '', placeholder: 'C:\\path\\ca.pem' });
  const caBrowse = el('button', { class: 'mini-btn', text: '…', onclick: async () => {
    const f = await window.wjds.pickFile({ title: 'CA certificate', filters: [{ name: 'PEM', extensions: ['pem', 'crt', 'cer'] }] });
    if (f) sslCa.value = f;
  }});

  // SSH section
  const sshEnabled = el('input', { type: 'checkbox' });
  sshEnabled.checked = !!(conn && conn.ssh && conn.ssh.enabled);
  const sshHost = el('input', { type: 'text', value: conn && conn.ssh ? conn.ssh.host : '' });
  const sshPort = el('input', { type: 'number', value: conn && conn.ssh ? conn.ssh.port : 22 });
  const sshUser = el('input', { type: 'text', value: conn && conn.ssh ? conn.ssh.user : 'root' });
  const sshPass = el('input', { type: 'password', value: '', placeholder: conn && conn.ssh && conn.ssh.passwordStored ? '•••••••• (saved)' : '' });
  const sshKey = el('input', { type: 'text', value: conn && conn.ssh ? conn.ssh.privateKeyPath : '' });
  const sshKeyBrowse = el('button', { class: 'mini-btn', text: '…', onclick: async () => {
    const f = await window.wjds.pickFile({ title: 'Private key' });
    if (f) sshKey.value = f;
  }});
  const sshFields = el('div', { class: 'form', style: { display: sshEnabled.checked ? 'grid' : 'none', padding: '10px 12px', background: 'var(--bg2)', borderRadius: '10px', border: '1px solid var(--border)' } },
    row(t('conn.sshhost'), sshHost), row2(t('conn.sshport'), sshPort, t('conn.sshuser'), sshUser),
    row(t('conn.sshpass'), sshPass), row(t('conn.sshkey'), el('div', { style: { display: 'flex', gap: '6px' } }, sshKey, sshKeyBrowse)));
  sshEnabled.addEventListener('change', () => { sshFields.style.display = sshEnabled.checked ? 'grid' : 'none'; });

  const testBtn = el('button', { class: 'btn', onclick: doTest }, ic('bolt'), t('conn.test'));
  const delBtn = isEdit ? el('button', { class: 'btn danger', onclick: doDelete }, ic('trash'), t('conn.delete')) : null;
  const saveBtn = el('button', { class: 'btn primary', onclick: doSave }, ic('save'), t('conn.save'));

  const body = el('div', { class: 'form' },
    row(t('conn.name'), name),
    row(t('conn.group'), group),
    el('fieldset', {},
      el('legend', { text: 'MySQL / MariaDB' }),
      el('div', { class: 'form' },
        el('div', { class: 'form-grid3' },
          el('div', {}, fieldLabel(t('conn.host')), host),
          el('div', {}, fieldLabel(t('conn.port')), port),
          el('div', {}, fieldLabel(t('conn.user')), user)),
        row(t('conn.pass'), pass),
        el('label', { class: 'check' }, ssl, el('span', { text: t('conn.ssl') })),
        row(t('conn.sslca'), el('div', { style: { display: 'flex', gap: '6px' } }, sslCa, caBrowse)))),
    el('fieldset', {},
      el('label', { class: 'check', style: { marginBottom: '8px' } }, sshEnabled, el('span', { text: t('conn.ssh') })),
      sshFields)));

  const foot = [delBtn, el('span', { class: 'spacer' }), testBtn, el('button', { class: 'btn', onclick: () => r.close(), text: t('conn.cancel') }), saveBtn].filter(Boolean);
  const r = showModal({ title: isEdit ? t('conn.edit') : t('conn.new'), icon: 'plug', body, footer: foot, width: '560px' });
  setTimeout(() => name.focus(), 60);

  function collect() {
    return {
      id: conn ? conn.id : undefined,
      name: name.value.trim() || `${host.value}:${port.value}`,
      group: group.value.trim(),
      host: host.value.trim() || '127.0.0.1',
      port: port.value || 3306,
      user: user.value.trim() || 'root',
      password: pass.value || undefined,
      clearPassword: !pass.value && !ssl.checked ? undefined : undefined,
      ssl: ssl.checked,
      sslCa: sslCa.value.trim(),
      ssh: {
        enabled: sshEnabled.checked,
        host: sshHost.value.trim(),
        port: sshPort.value || 22,
        user: sshUser.value.trim(),
        password: sshPass.value || undefined,
        privateKeyPath: sshKey.value.trim(),
      },
    };
  }

  async function doTest() {
    const c = collect();
    testBtn.disabled = true;
    testBtn.innerHTML = ic('clock').outerHTML + '…';
    try {
      // save first (passwords must be stored to connect), then connect
      const saved = await window.wjds.saveConnection(c);
      const res = await window.wjds.dbConnect(saved.id);
      if (res.ok) {
        await window.wjds.dbDisconnect(saved.id);
        toast(t('conn.testok'), 'ok', `${c.user}@${c.host}:${c.port}`);
      } else {
        toast(t('conn.testfail'), 'err', res.error);
      }
    } catch (err) {
      toast(t('conn.testfail'), 'err', err.message);
    }
    testBtn.disabled = false;
    testBtn.innerHTML = ic('bolt').outerHTML + t('conn.test');
  }

  async function doSave() {
    try {
      const saved = await window.wjds.saveConnection(collect());
      await loadConnections();
      toast(t('conn.saved'), 'ok');
      r.close();
      opts.onSaved && opts.onSaved(saved);
      if (!isEdit || opts.connectAfter) {
        // auto-connect the (new) connection
        import('./tree.js').then(() => {}); // tree re-renders via onSaved
      }
    } catch (err) {
      toast(t('msg.error'), 'err', err.message);
    }
  }

  async function doDelete() {
    if (!(await confirmBox(t('conn.delete'), t('conn.confirmDelete'), true))) return;
    await window.wjds.deleteConnection(conn.id);
    await loadConnections();
    toast(t('conn.deleted'), 'ok');
    r.close();
    opts.onSaved && opts.onSaved(null);
  }
}

/** Connections management modal (list + add/edit/delete/connect). */
export function manageConnections() {
  const listEl = el('div', {});
  const r = showModal({
    title: t('conn.title'), icon: 'server', width: '640px',
    body: listEl,
    footer: [el('span', { class: 'spacer' }), el('button', { class: 'btn primary', onclick: () => { r.close(); openConnectionDialog({ onSaved: refresh }); } }, ic('plus'), t('conn.new'))],
  });

  async function refresh() {
    await loadConnections();
    listEl.innerHTML = '';
    if (!state.connections.length) {
      listEl.append(el('div', { class: 'tree-empty', text: t('conn.empty') }));
      return;
    }
    for (const c of state.connections) {
      const editBtn = el('button', { class: 'mini-btn', html: ic('edit').innerHTML });
      editBtn.addEventListener('click', () => { r.close(); openConnectionDialog({ conn: c, onSaved: () => manageConnections() }); });
      listEl.append(el('div', { style: { display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 12px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '10px', marginBottom: '7px' } },
        ic('server', 'ticon ic-dim'),
        el('div', {},
          el('div', { style: { fontWeight: '600' }, text: c.name + (c.group ? `  ·  ${c.group}` : '') }),
          el('div', { style: { color: 'var(--text-faint)', fontSize: '11.5px' }, text: `${c.user}@${c.host}:${c.port}` })),
        el('span', { style: { marginLeft: 'auto' } }),
        editBtn,
        el('button', { class: 'mini-btn', html: ic('trash').innerHTML, onclick: async () => {
          if (!(await confirmBox(t('conn.delete'), t('conn.confirmDelete'), true))) return;
          await window.wjds.deleteConnection(c.id);
          await loadConnections();
          refresh();
        }})));
    }
  }
  refresh();
}

/** Create database dialog (used from tree). */
export function createDatabaseDialog(meta, onDone) {
  const name = el('input', { type: 'text', placeholder: 'my_database' });
  const charset = el('select', {}, el('option', { value: 'utf8mb4', text: 'utf8mb4 (Unicode)' }), el('option', { value: 'utf8', text: 'utf8' }), el('option', { value: 'latin1', text: 'latin1' }), el('option', { value: 'tis620', text: 'tis620 (Thai)' }));
  const collation = el('select', {}, el('option', { value: 'utf8mb4_general_ci', text: 'utf8mb4_general_ci' }), el('option', { value: 'utf8mb4_unicode_ci', text: 'utf8mb4_unicode_ci' }), el('option', { value: 'utf8mb4_thai_520_ci', text: 'utf8mb4_thai_520_ci (Thai)' }));
  const r = showModal({
    title: t('tree.createdb'), icon: 'dbplus',
    body: el('div', { class: 'form' },
      row(t('tree.dbname'), name),
      row(t('tree.charset'), charset),
      row(t('tree.collation'), collation)),
    footer: [
      el('button', { class: 'btn', onclick: () => r.close(), text: t('conn.cancel') }),
      el('button', { class: 'btn primary', onclick: doCreate }, ic('ok'), t('conn.save')),
    ],
  });
  setTimeout(() => name.focus(), 60);

  async function doCreate() {
    const dbname = name.value.trim();
    if (!dbname) return;
    try {
      await window.wjds.createDatabase({ connId: meta.id, name: dbname, charset: charset.value, collation: collation.value });
      toast(t('tree.createdb') + ': ' + dbname, 'ok');
      r.close();
      onDone && onDone();
    } catch (err) {
      toast(t('msg.error'), 'err', err.message);
    }
  }
}

export async function disconnectAll() {
  for (const id of [...state.active.keys()]) {
    await window.wjds.dbDisconnect(id);
  }
}

/* ---------- small form helpers ---------- */
function row(label, control) {
  return el('div', { class: 'form-row' }, el('label', { text: label }), control);
}
function row2(l1, c1, l2, c2) {
  return el('div', { class: 'form-grid2' }, el('div', {}, fieldLabel(l1), c1), el('div', {}, fieldLabel(l2), c2));
}
function fieldLabel(text) {
  return el('label', { style: { display: 'block', color: 'var(--text-dim)', fontSize: '11.5px', margin: '0 0 3px 2px' }, text });
}
