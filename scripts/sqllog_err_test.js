/** Verify error entries land in the SQL Log (dev tool). */
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
async function ev(x) { const r = await send('Runtime.evaluate', { expression: x, returnByValue: true, awaitPromise: true }); return r.result?.value; }

ws.addEventListener('open', async () => {
  // guard: bail out if the open handler throws
  try {
    await run();
  } catch (e) {
    console.log('FAIL: ' + (e && e.message || e));
    process.exit(1);
  }
});

async function run() {
  console.log('step: enable');
  await send('Runtime.enable');
  // connect first (fresh app instance)
  console.log('step: connect dispatch');
  await ev(`(() => {
    const row = [...document.querySelectorAll('#tree .trow')].find(r => r.textContent.includes('Local MariaDB'));
    if (row) row.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 2 }));
    return 'ok';
  })()`);
  await sleep(3000);
  console.log('step: open editor');
  await ev(`document.getElementById('tb-newquery').click()`);
  await sleep(700);
  await ev(`(() => {
    const ta = document.querySelector('.view.active textarea.ed-text');
    ta.value = 'SELECT * FROM wjds_demo.table_that_does_not_exist';
    ta.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', ctrlKey: true, bubbles: true }));
    return 'ok';
  })()`);
  await sleep(1800);
  console.log('step: run failing query done, open sqllog tab');
  await ev(`document.querySelector('[data-bp="sqllog"]').click()`);
  await sleep(800);
  console.log('step: read err rows');
  const errRows = await ev(`[...document.querySelectorAll('#sqllog-list .bp-item')].filter(x => x.querySelector('.err')).map(x => x.textContent.slice(0, 160))`);
  console.log(JSON.stringify({ errRows }, null, 1));
  process.exit(0);
}

ws.addEventListener('error', () => { console.log('WS ERROR'); process.exit(1); });
setTimeout(() => { console.log('TIMEOUT'); process.exit(1); }, 45000);
