/**
 * WJ DB Studio — quick chart from query/table results (bar or line).
 * (c) 2026 Weeradech Jessadarom — MIT
 */
import { el, ic, toast, showModal } from './utils.js';
import { t } from './i18n.js';

export function chartDialog(fields, rows) {
  const numeric = fields.filter(f => rows.some(r => { const n = Number(r[f.name]); return r[f.name] !== null && r[f.name] !== '' && isFinite(n); }));
  if (!numeric.length) { toast(t('chart.nonum'), 'err'); return; }
  const xSel = el('select', {}, fields.map(f => el('option', { value: f.name, text: f.name })));
  const ySel = el('select', {}, numeric.map(f => el('option', { value: f.name, text: f.name })));
  const kindSel = el('select', {},
    el('option', { value: 'bar', text: t('chart.bar') }),
    el('option', { value: 'line', text: t('chart.line') }));
  const cv = el('canvas', { width: 860, height: 420, style: { width: '100%', background: 'var(--bg0)', borderRadius: '10px', border: '1px solid var(--border)' } });

  const draw = () => {
    const xName = xSel.value, yName = ySel.value;
    const data = rows.slice(0, 60).map(r => ({ x: String(r[xName] ?? 'NULL'), y: Number(r[yName]) })).filter(p => isFinite(p.y));
    if (!data.length) return;
    const ctx = cv.getContext('2d');
    const W = cv.width, H = cv.height, padL = 70, padB = 70, padT = 20, padR = 20;
    ctx.clearRect(0, 0, W, H);
    const max = Math.max(1, ...data.map(p => p.y));
    // gridlines
    ctx.strokeStyle = 'rgba(128,140,160,.25)'; ctx.fillStyle = '#8b94a7'; ctx.font = '11px monospace'; ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
      const y = padT + (H - padT - padB) * (1 - i / 5);
      ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(W - padR, y); ctx.stroke();
      ctx.fillText(String(+(max * i / 5).toFixed(2)), 8, y + 4);
    }
    const slot = (W - padL - padR) / data.length;
    const bw = Math.min(slot * 0.7, 40);
    data.forEach((p, i) => {
      const x = padL + slot * i + (slot - bw) / 2;
      const y = H - padB - (p.y / max) * (H - padT - padB);
      if (kindSel.value === 'bar') {
        ctx.fillStyle = '#4f8cff';
        ctx.fillRect(x, y, bw, H - padB - y);
        ctx.fillStyle = '#dde4f0';
      } else {
        ctx.strokeStyle = '#4f8cff'; ctx.fillStyle = '#4f8cff'; ctx.lineWidth = 2;
        const cx = padL + slot * i + slot / 2;
        if (i === 0) ctx.beginPath(), ctx.moveTo(cx, y);
        else ctx.lineTo(cx, y);
        if (i === data.length - 1) ctx.stroke();
        ctx.beginPath(); ctx.arc(cx, y, 3, 0, 7); ctx.fill();
        ctx.fillStyle = '#dde4f0';
      }
      // x label (thinned)
      if (data.length <= 20 || i % Math.ceil(data.length / 20) === 0) {
        ctx.save(); ctx.translate(x + bw / 2, H - padB + 12); ctx.rotate(-Math.PI / 4);
        ctx.textAlign = 'right'; ctx.fillStyle = '#8b94a7'; ctx.fillText(p.x.slice(0, 14), 0, 0); ctx.restore();
      }
    });
  };
  xSel.addEventListener('change', draw);
  ySel.addEventListener('change', draw);
  kindSel.addEventListener('change', draw);

  showModal({
    title: t('chart.title'), icon: 'chart', width: '920px',
    body: el('div', {},
      el('div', { style: { display: 'flex', gap: '10px', marginBottom: '10px', alignItems: 'center', flexWrap: 'wrap' } },
        el('span', { class: 'muted', text: 'X:' }), xSel,
        el('span', { class: 'muted', text: 'Y:' }), ySel, kindSel,
        el('span', { class: 'muted', text: `(${Math.min(rows.length, 60)} ${t('grid.rows')})` })),
      cv),
  });
  setTimeout(draw, 50);
}
