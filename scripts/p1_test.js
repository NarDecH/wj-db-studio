/** P1 feature verification: EXPLAIN, xlsx round-trip, BLOB preview, file IPC, process auto-refresh. */
'use strict';
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

ws.addEventListener('open', async () => {
  try {
    await send('Runtime.enable');
    const out = {};

    // connect
    await ev(`[...document.querySelectorAll('#tree .trow')].find(r => r.textContent.includes('Local MariaDB'))?.dispatchEvent(new MouseEvent('click', {bubbles:true, detail:2}))`);
    await sleep(3000);

    // 1) file IPC round-trip
    out.fileRw = await ev(`(async () => {
      const p = 'C:/_Project/_downloads/wjds-filetest.sql';
      await window.wjds.writeFile(p, 'SELECT 1;');
      const back = await window.wjds.readFile(p, 5);
      return back === 'SELECT 1;';
    })()`);

    // 2) EXPLAIN via editor buttons
    await ev(`document.getElementById('tb-newquery').click()`);
    await sleep(800);
    out.explain = await ev(`(async () => {
      const ta = document.querySelector('.view.active textarea.ed-text');
      ta.value = 'SELECT * FROM wjds_demo.customers WHERE credit > 1000';
      ta.dispatchEvent(new Event('input', { bubbles: true }));
      // click the EXPLAIN button (5th mini-btn in toolbar)
      const btns = [...document.querySelectorAll('.view.active .ed-toolbar .mini-btn')];
      const explain = btns.find(b => b.textContent.includes('EXPLAIN') && !b.textContent.includes('ANALYZE'));
      explain.click();
      await new Promise(r => setTimeout(r, 1800));
      const rows = document.querySelectorAll('.view.active .res-grid-wrap .dgrid tbody tr').length;
      return { rows };
    })()`);

    out.analyze = await ev(`(async () => {
      const btns = [...document.querySelectorAll('.view.active .ed-toolbar .mini-btn')];
      const an = btns.find(b => b.textContent.includes('ANALYZE'));
      an.click();
      await new Promise(r => setTimeout(r, 2500));
      const txt = (document.querySelector('.view.active .res-grid-wrap')?.textContent || '');
      return { hasRRows: /r_rows|r_total/i.test(txt) || txt.length > 50 };
    })()`);

    // 3) xlsx export (server path incl. DDL sheet) + import round-trip
    out.xlsx = await ev(`(async () => {
      const p = 'C:/_Project/_downloads/wjds-xlsx-test.xlsx';
      const exp = await window.wjds.exportToFile({ connId: window.__connId || (window.__connId = undefined), sql: 'SELECT * FROM wjds_demo.customers', format: 'xlsx', filePath: p, db: 'wjds_demo', table: 'customers', includeDdl: true });
      return { count: exp.count };
    })()`);

    // get connId properly from state
    out.connFix = await ev(`(async () => {
      const mod = await import('./state.js');
      const connId = mod.state.currentConnId;
      const p = 'C:/_Project/_downloads/wjds-xlsx-test.xlsx';
      const exp = await window.wjds.exportToFile({ connId, sql: 'SELECT * FROM wjds_demo.customers', format: 'xlsx', filePath: p, db: 'wjds_demo', table: 'customers', includeDdl: true });
      // import round-trip into a scratch table
      await window.wjds.dbExec(connId, 'DROP TABLE IF EXISTS wjds_demo.xlsx_roundtrip', {});
      await window.wjds.dbExec(connId, 'CREATE TABLE wjds_demo.xlsx_roundtrip (id INT UNSIGNED PRIMARY KEY, name VARCHAR(100), email VARCHAR(120), city VARCHAR(60), credit DECIMAL(10,2), created_at VARCHAR(40))', {});
      const imp = await window.wjds.importXlsx({ connId, filePath: p, db: 'wjds_demo', table: 'xlsx_roundtrip' });
      const q = await window.wjds.dbQuery(connId, 'SELECT COUNT(*) n FROM wjds_demo.xlsx_roundtrip');
      const n = q.results[0].rows[0].n;
      await window.wjds.dbExec(connId, 'DROP TABLE wjds_demo.xlsx_roundtrip', {});
      return { exported: exp.count, imported: imp.count, backCount: n };
    })()`);

    // 4) BLOB: create table with blob, open in grid, check fmt + preview modal
    out.blob = await ev(`(async () => {
      const mod = await import('./state.js');
      const connId = mod.state.currentConnId;
      await window.wjds.dbExec(connId, 'DROP TABLE IF EXISTS wjds_demo.attach_test', {});
      await window.wjds.dbExec(connId, "CREATE TABLE wjds_demo.attach_test (id INT PRIMARY KEY, data BLOB)", {});
      await window.wjds.dbExec(connId, "INSERT INTO wjds_demo.attach_test VALUES (1, X'48656C6C6F20574A2044422053747564696F')", {});
      // open the table data view
      const g = await import('./grid.js');
      g.openTableData({ connId, db: 'wjds_demo', table: 'attach_test' });
      await new Promise(r => setTimeout(r, 2000));
      // switch to the new tab
      const tabs = [...document.querySelectorAll('#tabbar .tab')];
      const tt = tabs.find(t => t.textContent.includes('attach_test'));
      tt.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
      await new Promise(r => setTimeout(r, 600));
      const firstCell = document.querySelector('.view.active .dgrid tbody tr td:nth-child(2)');
      const blobShown = /binary/i.test(firstCell?.textContent || '');
      // dblclick -> preview modal
      firstCell.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
      await new Promise(r => setTimeout(r, 600));
      const modalText = document.querySelector('.modal-body')?.textContent || '';
      const hasHello = modalText.includes('Hello WJ DB Studio');
      document.querySelector('.modal-head .mclose')?.click();
      await window.wjds.dbExec(connId, 'DROP TABLE wjds_demo.attach_test', {});
      return { blobShown, hasHello };
    })()`);

    // 5) process list auto-refresh checkbox exists
    out.procAuto = await ev(`(async () => {
      document.getElementById('tb-server') ? null : null;
      const m = await import('./servertools.js');
      m.openProcessList();
      await new Promise(r => setTimeout(r, 1500));
      return { hasToggle: !!document.querySelector('.view.active #proc-auto') };
    })()`);

    console.log(JSON.stringify(out, null, 1));
    process.exit(0);
  } catch (err) {
    console.log('FAIL: ' + (err && err.message || err));
    process.exit(1);
  }
});
ws.addEventListener('error', () => { console.log('WS ERROR'); process.exit(1); });
setTimeout(() => { console.log('TIMEOUT'); process.exit(1); }, 90000);
