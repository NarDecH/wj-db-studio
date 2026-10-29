/** Final comprehensive E2E — fixed version. */
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
    // connect (renderer flow)
    await ev(`[...document.querySelectorAll('#tree .trow')].find(r => r.textContent.includes('Local MariaDB'))?.dispatchEvent(new MouseEvent('click', {bubbles:true, detail:2}))`);
    await sleep(3000);
    out.connected = await ev(`(async () => { const m = await import('./state.js'); return !!m.state.currentConnId; })()`);
    const connId = 'c_local';

    // 1) ER diagram
    out.er = await ev(`(async () => {
      const m = await import('./erdiagram.js');
      m.openERDiagram({ connId: '${connId}', db: 'wjds_demo' });
      await new Promise(r => setTimeout(r, 3000));
      return { rects: document.querySelectorAll('.view.active svg rect').length, paths: document.querySelectorAll('.view.active svg path').length };
    })()`);

    // 2) find in database — with debug
    out.find = await ev(`(async () => {
      const direct = await window.wjds.dbQuery('${connId}', "SELECT COUNT(*) n FROM wjds_demo.customers WHERE name LIKE ?", ['%สมชาย%']);
      const found = await window.wjds.findInDatabase({ connId: '${connId}', db: 'wjds_demo', term: 'สมชาย' });
      return { directLike: direct.results[0].rows[0].n, foundTables: found.map(f => f.table) };
    })()`);

    // 3) auto-create table round trip
    out.autocreate = await ev(`(async () => {
      await window.wjds.dbExec('${connId}', 'DROP TABLE IF EXISTS wjds_demo.auto_imp', {});
      await window.wjds.exportToFile({ connId: '${connId}', sql: 'SELECT id, name, city, credit FROM wjds_demo.customers', format: 'xlsx', filePath: 'C:/_Project/_downloads/auto-src.xlsx', db: 'wjds_demo', table: 'customers', includeDdl: false });
      const imp = await window.wjds.importXlsx({ connId: '${connId}', filePath: 'C:/_Project/_downloads/auto-src.xlsx', db: 'wjds_demo', table: 'auto_imp', createTable: true });
      const q = await window.wjds.dbQuery('${connId}', 'SELECT COUNT(*) n FROM wjds_demo.auto_imp');
      const ddl = await window.wjds.tableDDL('${connId}', 'wjds_demo', 'auto_imp');
      await window.wjds.dbExec('${connId}', 'DROP TABLE wjds_demo.auto_imp', {});
      return { imported: imp.count, back: q.results[0].rows[0].n, inferred: /INT|VARCHAR|DECIMAL/.test(ddl), idPk: /AUTO_INCREMENT/i.test(ddl) };
    })()`);

    // 4) multi-row select
    out.multiselect = await ev(`(async () => {
      const g = await import('./grid.js');
      g.openTableData({ connId: '${connId}', db: 'wjds_demo', table: 'customers' });
      await new Promise(r => setTimeout(r, 2200));
      const tabs = [...document.querySelectorAll('#tabbar .tab')];
      tabs.find(t => t.textContent.includes('customers')).dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
      await new Promise(r => setTimeout(r, 600));
      const trs = [...document.querySelectorAll('.view.active .dgrid tbody tr')];
      trs[0].dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
      trs[1].dispatchEvent(new MouseEvent('mousedown', { bubbles: true, ctrlKey: true }));
      trs[2].dispatchEvent(new MouseEvent('mousedown', { bubbles: true, ctrlKey: true }));
      return { selected: document.querySelectorAll('.view.active .dgrid tbody tr.selected').length };
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
