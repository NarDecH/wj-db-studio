/**
 * WJ DB Studio — CDP E2E test driver (development tool).
 * Drives the running renderer (start app with --remote-debugging-port=9222).
 * Usage: node scripts/cdp_test.js <webSocketDebuggerUrl>
 * (c) 2026 Weeradech Jessadarom — MIT
 */
'use strict';
const fs = require('fs');
const url = process.argv[2];
if (!url) { console.log('usage: node scripts/cdp_test.js <ws-url>'); process.exit(1); }

const ws = new WebSocket(url);
let seq = 0;
const pend = new Map();
const errors = [];

function send(method, params = {}) {
  return new Promise((res, rej) => {
    const id = ++seq;
    pend.set(id, { res, rej });
    ws.send(JSON.stringify({ id, method, params }));
  });
}

ws.addEventListener('message', (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pend.has(m.id)) {
    const p = pend.get(m.id); pend.delete(m.id);
    m.error ? p.rej(new Error(m.error.message)) : p.res(m.result);
    return;
  }
  if (m.method === 'Runtime.exceptionThrown') {
    const d = m.params.exceptionDetails;
    errors.push('EXC: ' + (d.exception?.description || d.text).slice(0, 300));
  }
  if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') {
    errors.push('CON: ' + m.params.args.map(a => a.value || a.description || '').join(' ').slice(0, 300));
  }
});

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function ev(expr) {
  const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true, userGesture: true });
  if (r.exceptionDetails) throw new Error('eval: ' + (r.exceptionDetails.exception?.description || r.exceptionDetails.text).slice(0, 400));
  return r.result?.value;
}

ws.addEventListener('open', async () => {
  const out = {};
  try {
    await send('Runtime.enable');
    await send('Page.enable');

    out.bootTreeRows = await ev(`document.querySelectorAll('#tree .trow').length`);

    // 1) connect (connection row: click with detail=2)
    out.connect = await ev(`(() => {
      const row = [...document.querySelectorAll('#tree .trow')].find(r => r.textContent.includes('Local MariaDB'));
      if (!row) return 'row-not-found';
      row.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 2 }));
      return 'dispatched';
    })()`);
    await sleep(3500);
    out.rowsAfterConnect = await ev(`document.querySelectorAll('#tree .trow').length`);
    out.dbListShown = await ev(`[...document.querySelectorAll('#tree .tlabel')].some(x => x.textContent === 'wjds_demo')`);

    // 2) expand wjds_demo (single click toggles)
    out.expandDb = await ev(`(() => {
      const row = [...document.querySelectorAll('#tree .trow')].find(r => r.querySelector('.tlabel')?.textContent === 'wjds_demo');
      if (!row) return 'not-found';
      row.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 }));
      return 'ok';
    })()`);
    await sleep(1800);
    out.groups = await ev(`[...document.querySelectorAll('#tree .trow .tlabel')].map(x => x.textContent).slice(0, 30)`);

    // 3) expand the Tables group under wjds_demo
    out.openTablesGroup = await ev(`(() => {
      const grp = [...document.querySelectorAll('#tree .trow')].find(r => (r.querySelector('.tlabel')?.textContent || '') === 'ตาราง');
      if (!grp) return 'no-group';
      grp.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 }));
      return 'ok';
    })()`);
    await sleep(1800);
    out.customersVisible = await ev(`[...document.querySelectorAll('#tree .trow')].some(r => r.querySelector('.tlabel')?.textContent === 'customers')`);

    // 4) open customers (dblclick)
    out.openCustomers = await ev(`(() => {
      const row = [...document.querySelectorAll('#tree .trow')].find(r => r.querySelector('.tlabel')?.textContent === 'customers');
      if (!row) return 'not-found';
      row.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
      return 'ok';
    })()`);
    await sleep(3500);
    out.tabs = await ev(`[...document.querySelectorAll('#tabbar .tab .tlabel')].map(x => x.textContent)`);
    out.gridHeaders = await ev(`[...document.querySelectorAll('.view.active .dgrid thead th')].map(x => x.textContent.trim())`);
    out.gridRows = await ev(`document.querySelectorAll('.view.active .dgrid tbody tr').length`);
    out.firstRowText = await ev(`(document.querySelector('.view.active .dgrid tbody tr')?.textContent || '').slice(0, 120)`);
    out.pagerInfo = await ev(`document.querySelector('.view.active .pginfo')?.textContent || ''`);

    // 5) SQL editor: open new query tab and run a JOIN
    out.openEditor = await ev(`document.getElementById('tb-newquery').click() || 'ok'`);
    await sleep(1200);
    out.editorReady = await ev(`!!document.querySelector('.view.active textarea.ed-text')`);
    out.runQuery = await ev(`(() => {
      const ta = document.querySelector('.view.active textarea.ed-text');
      if (!ta) return 'no-editor';
      ta.value = "SELECT c.name AS customer, o.product AS product, o.qty, o.total FROM wjds_demo.orders o JOIN wjds_demo.customers c ON c.id = o.customer_id ORDER BY o.total DESC";
      ta.dispatchEvent(new Event('input', { bubbles: true }));
      ta.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', ctrlKey: true, bubbles: true }));
      return 'executed';
    })()`);
    await sleep(2500);
    out.resultRows = await ev(`document.querySelectorAll('.view.active .res-grid-wrap .dgrid tbody tr').length`);
    out.resultFirstRow = await ev(`(document.querySelector('.view.active .res-grid-wrap .dgrid tbody tr')?.textContent || '').slice(0, 120)`);
    out.hlColored = await ev(`document.querySelectorAll('.view.active .ed-hl .tk-kw').length`);

    // 6) SQL Log: open the bottom-panel tab and read entries
    out.sqllogTabClick = await ev(`(() => {
      const btn = document.querySelector('[data-bp="sqllog"]');
      if (!btn) return 'no-tab';
      btn.click();
      return 'ok';
    })()`);
    await sleep(1200);
    out.sqllogEntries = await ev(`[...document.querySelectorAll('#sqllog-list .bp-item')].map(x => x.textContent.slice(0, 100)).slice(0, 10)`);
    out.sqllogErrorRows = await ev(`[...document.querySelectorAll('#sqllog-list .bp-item .err')].length`);

    out.errors = errors;
    console.log(JSON.stringify(out, null, 1));

    const shot = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(process.env.TEMP + '\\wjds-e2e.png', Buffer.from(shot.data, 'base64'));
    console.log('SCREENSHOT: ' + process.env.TEMP + '\\wjds-e2e.png');
    process.exit(0);
  } catch (err) {
    console.log('FAIL: ' + err.message);
    console.log('ERRORS: ' + (errors.join('\n') || '(none captured)'));
    process.exit(1);
  }
});

ws.addEventListener('error', (e) => { console.log('WS ERROR'); process.exit(1); });
