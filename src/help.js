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
        ? '• กดปุ่ม "SQL ใหม่" (Ctrl+T) เพื่อเปิดแท็บตัวแก้ไข\n• Ctrl+Enter = รัน, Ctrl+Shift+Enter = รันเฉพาะข้อความที่เลือก\n• Ctrl+Space = ช่วยเติมคำ (คีย์เวิร์ด ชื่อตาราง คอลัมน์)\n• Ctrl+O = เปิดไฟล์ .sql, Ctrl+S = บันทึกไฟล์ .sql\n• ปุ่ม EXPLAIN = ดูแผนประมวลผล, ANALYZE = รันจริงพร้อมสถิติ\n• Ctrl+/ = คอมเมนต์บรรทัดที่เลือก\n• รันได้หลายคำสั่งพร้อมกันโดยคั่นด้วย ;  (ผลลัพธ์แยกเป็นแท็บ)\n• ประวัติคำสั่งอยู่แผงล่าง คลิกเพื่อคัดลอกกลับ\n• บันทึก SQL ที่ใช้บ่อยไว้ในแท็บ "ตัวอย่าง SQL"'
        : '• Press "New Query" (Ctrl+T) to open an editor tab.\n• Ctrl+Enter = run, Ctrl+Shift+Enter = run selection only.\n• Ctrl+Space = autocomplete (keywords, tables, columns).\n• Ctrl+O = open a .sql file, Ctrl+S = save to .sql file.\n• EXPLAIN button shows the plan; ANALYZE runs it with live statistics.\n• Ctrl+/ = comment selected lines.\n• Multiple statements separated by ; run together (results in tabs).\n• Query history is in the bottom panel; click to reuse.\n• Save frequently used SQL under the "Snippets" tab.',
    },
    {
      id: 'sqllog',
      title: TH ? 'SQL Log — บันทึกทุกคำสั่งที่รัน' : 'SQL Log — statement audit',
      body: TH
        ? 'ทุกคำสั่งที่โปรแกรมรัน (คิวรี, แก้ข้อมูล, DDL, นำเข้า/ส่งออก, เชื่อมต่อ) ถูกบันทึกอัตโนมัติ\n\n• ดูในแอป: แผงล่าง → แท็บ "SQL Log" (กรองข้อความ, เฉพาะที่ผิดพลาด, คลิกเพื่อคัดลอก)\n• ไฟล์: %APPDATA%\\WJ DB Studio\\logs\\sql-YYYY-MM-DD.log (1 ไฟล์/วัน)\n• เมนู เครื่องมือ → SQL Log = เปิดโฟลเดอร์ log\n• ค่าพารามิเตอร์ของ prepared statement ไม่ถูกเขียนลง log (เป็น ? + จำนวนค่า)\n• เปิด/ปิด + เก็บกี่วัน: อยู่ในตั้งค่า (default เก็บ 30 วัน)'
        : 'Every executed statement (queries, grid edits, DDL, import/export, connect) is logged automatically.\n\n• In-app: bottom panel → "SQL Log" tab (text filter, errors-only, click to copy)\n• Files: %APPDATA%\\WJ DB Studio\\logs\\sql-YYYY-MM-DD.log (daily)\n• Menu Tools → SQL Log opens the folder\n• Parameterized values are never written — only ? placeholders + a count\n• On/off + retention in Settings (default 30 days)',
    },
    {
      id: 'find',
      title: TH ? 'ค้นหาค่าข้ามตาราง (Find in database)' : 'Find in database',
      body: TH
        ? 'ปุ่ม "ค้นหา" บนแถบเครื่องมือ: กรอกค่าที่ต้องการ → โปรแกรมไล่ค้นทุกตารางของฐานข้อมูล (LIKE บนคอลัมน์ข้อความ, ตรงกันบนคอลัมน์ตัวเลข) แล้วแสดงผลจับคู่พร้อมตารางที่พบ — คลิกผลลัพธ์เพื่อคัดลอกเป็น JSON'
        : 'The "Find" toolbar button searches one value across every table of a database (LIKE on text columns, equality on numerics) and lists all matches per table — click a result to copy it as JSON.',
    },
    {
      id: 'transfer',
      title: TH ? 'ย้าย/คัดลอกตารางข้ามการเชื่อมต่อ' : 'Transfer a table between connections',
      body: TH
        ? 'เมนู เครื่องมือ → "ย้าย/คัดลอกตารางข้ามการเชื่อมต่อ": เลือกต้นทาง (connection + db + ตาราง) และปลายทาง (อีก connection ไหนก็ได้) → โปรแกรมสร้างตารางให้อัตโนมัติถ้ายังไม่มี แล้วสตรีมข้อมูลเป็นชุด — ใช้ย้ายข้อมูลข้าม server ได้โดยไม่ต้อง dump/import\n\n• ติ๊ก "ลบตารางปลายทางก่อน" เพื่อแทนที่ของเดิม\n• การเชื่อมต่อปลายทางต้องไม่เป็นโหมดอ่านอย่างเดียว'
        : 'Menu Tools → "Transfer Table Between Connections": pick source (connection + db + table) and any target connection — the table is created automatically if missing and rows are streamed in batches. Use it to move data between servers without dump/import.\n\n• Tick "Drop target table first" to replace existing data\n• The target connection must not be read-only',
    },
    {
      id: 'readonly',
      title: TH ? 'โหมดอ่านอย่างเดียว (Read-only)' : 'Read-only connections',
      body: TH
        ? 'ตอนสร้าง connection ติ๊ก "🔒 อ่านอย่างเดียว" สำหรับฐานข้อมูล production — โปรแกรมจะปฏิเสธคำสั่ง INSERT/UPDATE/DELETE/DDL ทุกทาง (ทั้ง grid และ SQL editor) เหลือแต่ SELECT/SHOW/EXPLAIN — บังคับที่ระดับ main process จึงเปลี่ยนไม่ได้จากหน้าจอ'
        : 'Tick "🔒 Read-only" when creating a connection for production databases — INSERT/UPDATE/DELETE/DDL are rejected everywhere (grid and SQL editor), leaving SELECT/SHOW/EXPLAIN. Enforced in the main process, not just the UI.',
    },
    {
      id: 'er',
      title: TH ? 'แผนผังความสัมพันธ์ (ER Diagram)' : 'ER Diagram',
      body: TH
        ? 'คลิกขวาที่ฐานข้อมูล → "แผนผังความสัมพันธ์ (ER)" — เห็นกล่องตาราง (คอลัมน์ + PK) และเส้นเชื่อม foreign key อัตโนมัติ ซูมด้วยปุ่ม + / − — ใช้ดูโครงสร้างรวมได้เร็ว'
        : 'Right-click a database → "ER Diagram" — tables with columns (PK highlighted) and automatic foreign-key lines. Zoom with + / − for a quick structural overview.',
    },
    {
      id: 'restore',
      title: TH ? 'กู้คืนหน้าจอครั้งก่อน (Session restore)' : 'Session restore',
      body: TH
        ? 'โปรแกรมจำแท็บ SQL (พร้อมข้อความ), ตารางที่เปิดค้าง และ connection ล่าสุด — เปิดใหม่ครั้งถัดไปทุกอย่างกลับมาเอง'
        : 'The app remembers open SQL tabs (with their text), data tables and the last connection — everything comes back on the next launch.',
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
