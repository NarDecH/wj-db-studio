'use strict';
/**
 * WJ DB Studio — Excel (xlsx) helpers via SheetJS.
 * (c) 2026 Weeradech Jessadarom — MIT
 */
const XLSX = require('xlsx');

const MAX_CELLS = 4_000_000; // ~ guard for in-memory builds

function cellValue(v) {
  if (v === null || v === undefined) return null;
  if (v instanceof Uint8Array || (v && v.type === 'Buffer')) return '<binary ' + (v.length || (v.data && v.data.length) || 0) + ' B>';
  return v; // numbers, strings, Dates pass through
}

/** Build an xlsx file from an array of row objects. Returns row count. */
function writeRowsXlsx(fields, rows, filePath, sheetName = 'Data') {
  const cells = (rows.length + 1) * fields.length;
  if (cells > MAX_CELLS) throw new Error(`Result too large for in-memory xlsx (${cells.toLocaleString()} cells). Use CSV/SQL export instead.`);
  const aoa = [fields.map(f => f.name)];
  for (const r of rows) aoa.push(fields.map(f => cellValue(r[f.name])));
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  // rough column widths from a sample
  ws['!cols'] = fields.map((f, i) => {
    let w = Math.max(10, f.name.length + 2);
    for (let j = 0; j < Math.min(rows.length, 200); j++) {
      const v = rows[j][f.name];
      const s = v === null || v === undefined ? '' : String(cellValue(v));
      if (s.length > w) w = Math.min(45, s.length + 2);
    }
    return { wch: w };
  });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, String(sheetName || 'Data').slice(0, 31) || 'Data');
  XLSX.writeFile(wb, filePath);
  return rows.length;
}

/** Write CSV/JSON (plain) for row arrays. Returns row count. */
function writeRowsPlain(fields, rows, format, filePath) {
  if (format === 'csv') {
    const esc = (s) => (/[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s);
    const lines = [fields.map(f => esc(f.name)).join(',')];
    for (const r of rows) {
      lines.push(fields.map(f => {
        const v = r[f.name];
        const s = v === null || v === undefined ? '' : (v instanceof Date ? v.toISOString() : String(v));
        return esc(s);
      }).join(','));
    }
    require('fs').writeFileSync(filePath, lines.join('\r\n') + '\r\n', 'utf8');
    return rows.length;
  }
  // json
  const data = rows.map(r => {
    const o = {};
    for (const f of fields) {
      const v = r[f.name];
      o[f.name] = v instanceof Uint8Array || (v && v.type === 'Buffer') ? null : (v instanceof Date ? v.toISOString() : v);
    }
    return o;
  });
  require('fs').writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  return data.length;
}

/** Read the first (or given) sheet of an xlsx file into {header, rows}. */
function readXlsx(filePath, sheetIndex = 0) {
  const wb = XLSX.readFile(filePath, { cellDates: true });
  const name = wb.SheetNames[sheetIndex] || wb.SheetNames[0];
  const aoa = XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, raw: true, defval: null });
  if (!aoa.length) return { sheet: name, header: [], rows: [] };
  const header = aoa[0].map((h, i) => (h === null || String(h).trim() === '' ? 'col' + (i + 1) : String(h).trim()));
  const rows = aoa.slice(1).filter(r => r.some(c => c !== null && c !== ''));
  return { sheet: name, header, rows };
}

module.exports = { writeRowsXlsx, writeRowsPlain, readXlsx, MAX_CELLS };
