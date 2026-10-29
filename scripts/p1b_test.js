/** Focused re-test: ANALYZE result content + BLOB cell display/preview. */
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
  if (r.exceptionDetails) return { __err: (r.exceptionDetails.exception?.description || r.exceptionDetails.text).slice(0, 400) };
  return r.result?.value;
}

ws.addEventListener('open', async () => {
  try {
    await send('Runtime.enable');
    const out = {};

    // ANALYZE: run in a fresh editor tab, read result headers + any res-msg
    await ev(`document.getElementById('tb-newquery').click()`);
    await sleep(800);
    out.analyze = await ev(`(async () => {
      const ta = document.querySelector('.view.active textarea.ed-text');
      ta.value = 'SELECT * FROM wjds_demo.customers WHERE credit > 1000';
      ta.dispatchEvent(new Event('input', { bubbles: true }));
      const btns = [...document.querySelectorAll('.view.active .ed-toolbar .mini-btn')];
      btns.find(b => b.textContent.includes('ANALYZE')).click();
      await new Promise(r => setTimeout(r, 2500));
      const headers = [...document.querySelectorAll('.view.active .res-grid-wrap .dgrid thead th')].map(x => x.textContent.trim());
      const firstRow = (document.querySelector('.view.active .res-grid-wrap .dgrid tbody tr')?.textContent || '').slice(0, 150);
      const msgs = [...document.querySelectorAll('#bp-messages .msg-line')].slice(-2).map(x => x.textContent);
      return { headers, firstRow, msgs };
    })()`);

    // BLOB with correct cell (rownum=1st, id=2nd, data=3rd)
    out.blob = await ev(`(async () => {
      const mod = await import('./state.js');
      const connId = mod.state.currentConnId;
      await window.wjds.dbExec(connId, 'DROP TABLE IF EXISTS wjds_demo.attach_test', {});
      await window.wjds.dbExec(connId, "CREATE TABLE wjds_demo.attach_test (id INT PRIMARY KEY, data BLOB)", {});
      await window.wjds.dbExec(connId, "INSERT INTO wjds_demo.attach_test VALUES (1, X'48656C6C6F20574A2044422053747564696F')", {});
      const g = await import('./grid.js');
      g.openTableData({ connId, db: 'wjds_demo', table: 'attach_test' });
      await new Promise(r => setTimeout(r, 2200));
      const tabs = [...document.querySelectorAll('#tabbar .tab')];
      tabs.find(t => t.textContent.includes('attach_test')).dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
      await new Promise(r => setTimeout(r, 700));
      const tds = [...document.querySelectorAll('.view.active .dgrid tbody tr:first-child td')];
      const cellTexts = tds.map(x => x.textContent.trim());
      const blobCell = tds[2];
      const blobShown = /binary/i.test(blobCell?.textContent || '');
      blobCell.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
      await new Promise(r => setTimeout(r, 700));
      const modalText = document.querySelector('.modal-body')?.textContent || '';
      const hasHello = modalText.includes('Hello WJ DB Studio');
      document.querySelector('.modal-head .mclose')?.click();
      await window.wjds.dbExec(connId, 'DROP TABLE wjds_demo.attach_test', {});
      return { cellTexts, blobShown, hasHello };
    })()`);

    console.log(JSON.stringify(out, null, 1));
    process.exit(0);
  } catch (err) {
    console.log('FAIL: ' + (err && err.message || err));
    process.exit(1);
  }
});
ws.addEventListener('error', () => { console.log('WS ERROR'); process.exit(1); });
setTimeout(() => { console.log('TIMEOUT'); process.exit(1); }, 60000);
