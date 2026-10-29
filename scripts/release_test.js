/** v1.1.0 packaged-build test: E2E regression + backup round-trip + transfer + big import + screenshots. */
'use strict';
const fs = require('fs');
const ws = new WebSocket(process.argv[2]);
let seq = 0;
const pend = new Map();
function send(m, p = {}) {
  return new Promise((res) => { const i = ++seq; pend.set(i, res); ws.send(JSON.stringify({ id: i, method: m, params: p })); });
}
ws.addEventListener('message', (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pend.has(m.id)) { pend.get(m.id)(m.result); pend.delete(m.id); }
});
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
async function ev(x) {
  const r = await send('Runtime.evaluate', { expression: x, returnByValue: true, awaitPromise: true, userGesture: true });
  if (r.exceptionDetails) return { __err: (r.exceptionDetails.exception?.description || r.exceptionDetails.text).slice(0, 300) };
  return r.result?.value;
}
async function shot(name) {
  const s = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('C:/_Project/MySQLAndMariaDB_DBMS/docs/screenshots/' + name, Buffer.from(s.data, 'base64'));
}

ws.addEventListener('open', async () => {
  try {
    await send('Runtime.enable');
    const out = {};
    out.version = await ev(`window.wjds.appVersion()`);
    await ev(`[...document.querySelectorAll('#tree .trow')].find(r => r.textContent.includes('Local MariaDB'))?.dispatchEvent(new MouseEvent('click', {bubbles:true, detail:2}))`);
    await sleep(3000);
    out.connected = await ev(`(async () => { const m = await import('./state.js'); return !!m.state.currentConnId; })()`);
    const C = 'c_local';

    // regression: grid + editor
    await ev(`(async () => { const m = await import('./grid.js'); m.openTableData({ connId: '${C}', db: 'wjds_demo', table: 'customers' }); })()`);
    await sleep(2000);
    out.gridRows = await ev(`document.querySelectorAll('.view.active .dgrid tbody tr').length`);
    await shot('02-table-data.png');

    await ev(`document.getElementById('tb-newquery').click()`);
    await sleep(800);
    out.query = await ev(`(async () => {
      const ta = document.querySelector('.view.active textarea.ed-text');
      ta.value = 'SELECT c.name, o.product, o.total FROM wjds_demo.orders o JOIN wjds_demo.customers c ON c.id=o.customer_id ORDER BY o.total DESC';
      ta.dispatchEvent(new Event('input', {bubbles:true}));
      ta.dispatchEvent(new KeyboardEvent('keydown', {key:'Enter', ctrlKey:true, bubbles:true}));
      await new Promise(r => setTimeout(r, 1800));
      return document.querySelectorAll('.view.active .res-grid-wrap .dgrid tbody tr').length;
    })()`);
    await shot('03-sql-editor.png');

    // ER screenshot
    await ev(`(async () => { const m = await import('./erdiagram.js'); m.openERDiagram({ connId: '${C}', db: 'wjds_demo' }); })()`);
    await sleep(3000);
    out.erRects = await ev(`document.querySelectorAll('.view.active svg rect').length`);
    await shot('04-er-diagram.png');

    // backup -> restore round trip into a scratch database
    out.backup = await ev(`(async () => {
      await window.wjds.dbExec('${C}', 'DROP DATABASE IF EXISTS wjds_restore_check', {});
      await window.wjds.createDatabase({ connId: '${C}', name: 'wjds_restore_check', charset: 'utf8mb4' });
      const bk = await window.wjds.backup({ connId: '${C}', db: 'wjds_demo', filePath: 'C:/_Project/_downloads/demo-backup.sql' });
      const rs = await window.wjds.runSqlFile({ connId: '${C}', filePath: 'C:/_Project/_downloads/demo-backup.sql', db: 'wjds_restore_check' });
      const a = await window.wjds.dbQuery('${C}', 'SELECT COUNT(*) n FROM wjds_demo.customers');
      const b = await window.wjds.dbQuery('${C}', 'SELECT COUNT(*) n FROM wjds_restore_check.customers');
      const ok = a.results[0].rows[0].n === b.results[0].rows[0].n;
      await window.wjds.dbExec('${C}', 'DROP DATABASE wjds_restore_check', {});
      return { tables: bk.tables, statements: rs.done, errors: rs.errors, countMatch: ok };
    })()`);

    // transfer: same server, demo -> backup db
    out.transfer = await ev(`(async () => {
      await window.wjds.dbExec('${C}', 'DROP DATABASE IF EXISTS wjds_transfer_check', {});
      await window.wjds.createDatabase({ connId: '${C}', name: 'wjds_transfer_check', charset: 'utf8mb4' });
      const tr = await window.wjds.transferTable({ fromConnId: '${C}', toConnId: '${C}', fromDb: 'wjds_demo', table: 'customers', toDb: 'wjds_transfer_check' });
      const q = await window.wjds.dbQuery('${C}', 'SELECT COUNT(*) n FROM wjds_transfer_check.customers');
      const n = q.results[0].rows[0].n;
      await window.wjds.dbExec('${C}', 'DROP DATABASE wjds_transfer_check', {});
      return { copied: tr.count, created: tr.created, back: n };
    })()`);

    // big import: 100k rows CSV, auto-create
    out.bigImport = await ev(`(async () => {
      const lines = ['id,name,amount,created_at'];
      for (let i = 1; i <= 100000; i++) lines.push(i + ',user' + i + ',' + (i % 997) + '.50,2026-01-15 10:30:00');
      await window.wjds.writeFile('C:/_Project/_downloads/big100k.csv', lines.join('\\n'));
      const t0 = Date.now();
      const imp = await window.wjds.importCsv({ connId: '${C}', filePath: 'C:/_Project/_downloads/big100k.csv', db: 'wjds_demo', table: 'big_import_test', createTable: true });
      const ms = Date.now() - t0;
      const q = await window.wjds.dbQuery('${C}', 'SELECT COUNT(*) n FROM wjds_demo.big_import_test');
      await window.wjds.dbExec('${C}', 'DROP TABLE wjds_demo.big_import_test', {});
      return { imported: imp.count, back: q.results[0].rows[0].n, seconds: Math.round(ms / 100) / 10 };
    })()`);

    // home screenshot for README
    await ev(`(async () => { const m = await import('./app.js'); m.openHome(); })()`);
    await sleep(800);
    await shot('01-home.png');

    console.log(JSON.stringify(out, null, 1));
    process.exit(0);
  } catch (err) {
    console.log('FAIL: ' + (err && err.message || err));
    process.exit(1);
  }
});
ws.addEventListener('error', () => { console.log('WS ERROR'); process.exit(1); });
setTimeout(() => { console.log('TIMEOUT'); process.exit(1); }, 240000);
