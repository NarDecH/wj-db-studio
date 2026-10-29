/** v1.2 schema compare verification. */
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
    await ev(`[...document.querySelectorAll('#tree .trow')].find(r => r.textContent.includes('Local MariaDB'))?.dispatchEvent(new MouseEvent('click', {bubbles:true, detail:2}))`);
    await sleep(3000);
    const out = await ev(`(async () => {
      const C = 'c_local';
      await window.wjds.dbExec(C, 'DROP DATABASE IF EXISTS wjds_schema_b', {});
      await window.wjds.createDatabase({ connId: C, name: 'wjds_schema_b', charset: 'utf8mb4' });
      await window.wjds.dbExec(C, 'CREATE TABLE wjds_schema_b.customers AS SELECT * FROM wjds_demo.customers', {});
      await window.wjds.dbExec(C, "ALTER TABLE wjds_schema_b.customers ADD COLUMN phone VARCHAR(30)", {});
      await window.wjds.dbExec(C, 'CREATE TABLE wjds_schema_b.extra (id INT PRIMARY KEY)', {});
      const mig = await window.wjds.buildMigrationSql({ connIdA: C, dbA: 'wjds_demo', connIdB: C, dbB: 'wjds_schema_b', includeDrops: true });
      await window.wjds.dbExec(C, 'DROP DATABASE wjds_schema_b', {});
      return {
        onlyA: mig.onlyA, onlyB: mig.onlyB,
        changedTables: mig.changed.map(c => c.table),
        hasPhoneAdd: mig.sql.includes('ADD COLUMN') && mig.sql.includes('phone'),
        hasColDrop: mig.sql.includes('DROP COLUMN'),
        hasTableDrop: mig.sql.includes('DROP TABLE'),
      };
    })()`);
    console.log(JSON.stringify(out, null, 1));
    process.exit(0);
  } catch (err) { console.log('FAIL: ' + (err && err.message || err)); process.exit(1); }
});
ws.addEventListener('error', () => { console.log('WS ERROR'); process.exit(1); });
setTimeout(() => { console.log('TIMEOUT'); process.exit(1); }, 60000);
