/**
 * WJ DB Studio — help panel (F1), contextual topics, first-run tour.
 * The automatic help system: searchable topics + inline hints.
 * (c) 2026 Weeradech Jessadarom — MIT
 */
import { $, el, ic } from './utils.js';
import { t, setLanguage } from './i18n.js';
import { state } from './state.js';

/* ================= topics ================= */
function topics() {
  const lang = (state.settings && state.settings.language) || 'th';
  const TH = lang === 'th';
  return [
    {
      id: 'connect',
      title: TH ? 'การเชื่อมต่อฐานข้อมูล' : 'Connecting to a database',
      body: TH
        ? '1. กดปุ่ม "เชื่อมต่อ" บนแถบเครื่องมือ หรือกด + ในแผนก้านด้านซ้าย\n2. กรอก Host, Port, Username, Password\n3. กด "ทดสอบ" เพื่อตรวจสอบ แล้วกด "บันทึก"\n4. ดับเบิลคลิกที่ชื่อการเชื่อมต่อในแผนก้านเพื่อเชื่อมต่อ\n\n• รองรับ SSL/TLS (ติ๊กเลือกและระบุไฟล์ CA ได้)\n• รองรับ SSH Tunnel สำหรับเซิร์ฟเวอร์ที่อยู่หลังไฟร์วอลล์\n• รหัสผ่านถูกเข้ารหัสด้วยระบบของ OS (DPAPI / Keychain)'
        : '1. Click "Connect" on the toolbar or + in the sidebar.\n2. Fill Host, Port, Username, Password.\n3. Press "Test" then "Save".\n4. Double-click the connection in the tree to connect.\n\n• SSL/TLS supported (with optional CA file)\n• SSH Tunnel supported for firewalled servers\n• Passwords are OS-encrypted (DPAPI / Keychain)',
    },
    {
      id: 'browse',
      title: TH ? 'สำรวจตารางและข้อมูล' : 'Browsing tables & data',
      body: TH
        ? '• กดลูกศรข้างชื่อการเชื่อมต่อเพื่อขยายรายการฐานข้อมูล\n• กดลูกศรข้างชื่อฐานข้อมูลเพื่อดู Tables, Views, Procedures ฯลฯ\n• ดับเบิลคลิกที่ตาราง = เปิดข้อมูลแบบตาราง (แก้ไขได้เลย: ดับเบิลคลิกที่เซลล์)\n• คลิกขวาที่ตาราง = ดู DDL, ออกแบบตาราง, นำเข้า/ส่งออก, Truncate, Drop\n• ช่อง "Filter" รับเงื่อนไข WHERE โดยตรง เช่น price > 100 AND status = 1'
        : '• Click the arrow next to a connection to expand databases.\n• Expand a database to see Tables, Views, Procedures, etc.\n• Double-click a table = open data grid (double-click a cell to edit inline).\n• Right-click a table = DDL, designer, import/export, truncate, drop.\n• The "Filter" box accepts raw WHERE, e.g. price > 100 AND status = 1',
    },
    {
      id: 'sql',
      title: TH ? 'การเขียน SQL' : 'Writing SQL',
      body: TH
        ? '• กดปุ่ม "SQL ใหม่" (Ctrl+T) เพื่อเปิดแท็บตัวแก้ไข\n• Ctrl+Enter = รัน, Ctrl+Shift+Enter = รันเฉพาะข้อความที่เลือก\n• Ctrl+Space = ช่วยเติมคำ (คีย์เวิร์ด ชื่อตาราง คอลัมน์)\n• Ctrl+/ = คอมเมนต์บรรทัดที่เลือก\n• รันได้หลายคำสั่งพร้อมกันโดยคั่นด้วย ;  (ผลลัพธ์แยกเป็นแท็บ)\n• ประวัติคำสั่งอยู่แผงล่าง คลิกเพื่อคัดลอกกลับ\n• บันทึก SQL ที่ใช้บ่อยไว้ในแท็บ "ตัวอย่าง SQL"'
        : '• Press "New Query" (Ctrl+T) to open an editor tab.\n• Ctrl+Enter = run, Ctrl+Shift+Enter = run selection only.\n• Ctrl+Space = autocomplete (keywords, tables, columns).\n• Ctrl+/ = comment selected lines.\n• Multiple statements separated by ; run together (results in tabs).\n• Query history is in the bottom panel; click to reuse.\n• Save frequently used SQL under the "Snippets" tab.',
    },
    {
      id: 'editdata',
      title: TH ? 'แก้ไขข้อมูลในตาราง' : 'Editing table data',
      body: TH
        ? '• ดับเบิลคลิกเซลล์เพื่อแก้ไข, Enter เพื่อยืนยัน\n• ปุ่ม "เพิ่มแถว" = เพิ่มแถวใหม่, ปุ่ม "ลบแถว" = ลบแถวที่เลือก\n• กด "บันทึกการแก้ไข" เพื่อ APPLY ทั้งหมดพร้อมกัน (แสดงจำนวนที่รอบันทึก)\n• การแก้ไขใช้ Primary Key ในการอ้างอิงแถว — ตารางที่ไม่มี PK จะใช้ทุกคอลัมน์แทน\n• NULL แสดงเป็นตัวเอียงสีเทา แก้ไขโดยเว้นช่องว่าง'
        : '• Double-click a cell to edit, Enter to commit.\n• "Add Row" inserts, "Delete Row" removes the selected row.\n• Press "Apply Changes" to save everything at once (a badge shows pending count).\n• Row identity uses the Primary Key — tables without a PK match on all columns.\n• NULL renders as grey italics; leave the cell empty to set NULL.',
    },
    {
      id: 'io',
      title: TH ? 'นำเข้า / ส่งออก / สำรองข้อมูล' : 'Import / Export / Backup',
      body: TH
        ? '• นำเข้า: รองรับ CSV/TSV, JSON array และไฟล์ .sql โดยตรง\n• ส่งออกผลลัพธ์: CSV, JSON, SQL INSERT — ไฟล์ใหญ่จะถูกสตรีมลงดิสก์\n• สำรอง: สร้างไฟล์ .sql (CREATE TABLE + INSERT ทุกตาราง) เหมือน mysqldump\n• กู้คืน: นำเข้าไฟล์ .sql ที่สำรองไว้ผ่านเมนูนำเข้า'
        : '• Import: CSV/TSV, JSON arrays and raw .sql scripts.\n• Export results: CSV, JSON, SQL INSERTs — large results stream to disk.\n• Backup: generates a .sql file (CREATE TABLE + INSERTs) like mysqldump.\n• Restore: import the backed-up .sql file via the Import dialog.',
    },
    {
      id: 'server',
      title: TH ? 'เครื่องมือผู้ดูแลเซิร์ฟเวอร์' : 'Server administration',
      body: TH
        ? '• แดชบอร์ด: เวอร์ชัน, uptime, จำนวนการเชื่อมต่อ, ขนาดฐานข้อมูล\n• Process List: ดูและ Kill query/process ที่ค้าง (คลิกขวา)\n• Variables/Status: ค้นหาตัวแปรระบบทั้งหมด\n• Users: สร้าง/ลบผู้ใช้, ตั้งรหัสผ่าน, GRANT สิทธิ์ระดับ global'
        : '• Dashboard: version, uptime, connection count, database sizes.\n• Process List: view and kill stuck queries/processes (right-click).\n• Variables/Status: search all server variables.\n• Users: create/drop users, set passwords, GRANT global privileges.',
    },
    {
      id: 'shortcuts',
      title: TH ? 'ปุ่มลัดที่ใช้บ่อย' : 'Common shortcuts',
      body: TH
        ? 'Ctrl+N เชื่อมต่อใหม่ · Ctrl+T SQL ใหม่ · Ctrl+Enter รัน\nCtrl+Space ช่วยเติม · F1 ช่วยเหลือ · F5 รีเฟรช · Ctrl+, ตั้งค่า'
        : 'Ctrl+N connect · Ctrl+T new query · Ctrl+Enter execute\nCtrl+Space autocomplete · F1 help · F5 refresh · Ctrl+, settings',
    },
    {
      id: 'update',
      title: TH ? 'การอัปเดตอัตโนมัติ' : 'Automatic updates',
      body: TH
        ? 'โปรแกรมตรวจสอบเวอร์ชันใหม่จาก GitHub Releases อัตโนมัติ (ปิดได้ในตั้งค่า)\nเมื่อมีเวอร์ชันใหม่จะแจ้งที่มุมขวาบน และดาวน์โหลด-ติดตั้งได้ในโปรแกรม'
        : 'The app checks GitHub Releases for new versions automatically (can be disabled in Settings). When a new version is found you get a notification and can download & install in-app.',
    },
  ];
}

/* ================= panel ================= */
export function initHelp() {
  $('#hp-close').addEventListener('click', () => toggleHelp(false));
  $('#hp-search').addEventListener('input', () => paint($('#hp-search').value));
}

export function toggleHelp(force) {
  const p = $('#help-panel');
  const show = force !== undefined ? force : p.hidden;
  p.hidden = !show;
  if (show) paint('');
}

export function showHelp(topicId) {
  toggleHelp(true);
  if (topicId) {
    const elx = $('#hp-content').querySelector(`[data-topic="${topicId}"]`);
    if (elx) elx.scrollIntoView();
  }
}

function paint(filter) {
  const box = $('#hp-content');
  box.innerHTML = '';
  const f = (filter || '').toLowerCase();
  for (const topic of topics()) {
    if (f && !(topic.title + ' ' + topic.body).toLowerCase().includes(f)) continue;
    box.append(el('div', { class: 'hp-topic', 'data-topic': topic.id },
      el('h4', { text: topic.title }),
      el('p', { text: topic.body })));
  }
  if (!box.children.length) {
    box.append(el('div', { class: 'hp-topic' }, el('p', { text: '— / no matches' })));
  }
}

/* ================= first-run tour ================= */
export function showTour() {
  import('./utils.js').then(async ({ showModal }) => {
    const lang = (state.settings && state.settings.language) || 'th';
    const TH = lang === 'th';
    const r = showModal({
      title: t('help.welcome.title'), icon: 'help', width: '520px',
      body: el('div', { style: { textAlign: 'center', padding: '6px 10px' } },
        el('div', { class: 'about' },
          el('div', { class: 'logo', html: ic('database').innerHTML }),
          el('p', { style: { whiteSpace: 'pre-line', textAlign: 'left', lineHeight: '1.9', color: 'var(--text-dim)' }, text: t('help.welcome.body') }))),
      footer: [
        el('button', { class: 'btn', onclick: () => { window.wjds.setTourDone(); r.close(); }, text: t('help.tourSkip') }),
        el('button', { class: 'btn primary', onclick: () => { window.wjds.setTourDone(); r.close(); showHelp('connect'); } }, ic('ok'), el('span', { text: t('help.tourStart') })),
      ],
    });
  });
}
