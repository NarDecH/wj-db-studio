/**
 * WJ DB Studio — bilingual UI strings (Thai / English).
 * (c) 2026 Weeradech Jessadarom — MIT
 */
export const I18N = {
  en: {
    'tb.home': 'Home', 'tb.newconn': 'Connect', 'tb.newquery': 'New Query', 'tb.import': 'Import',
    'tb.export': 'Export', 'tb.backup': 'Backup', 'tb.server': 'Server', 'tb.users': 'Users', 'tb.find': 'Find',
    'find.title': 'Find in database — search a value across all tables',
    'find.term': 'Value to search', 'find.run': 'Search', 'find.none': 'No matches found in any table.',
    'side.explorer': 'Object Explorer', 'side.filter': 'Filter objects…',
    'bp.messages': 'Messages', 'bp.history': 'History', 'bp.snippets': 'Snippets', 'bp.clear': 'Clear',
    'bp.newsnippet': 'New snippet', 'bp.sqllog': 'SQL Log',
    'sqllog.filter': 'Filter SQL…', 'sqllog.onlyerr': 'Errors only', 'sqllog.empty': 'No SQL logged yet — run a query and it will appear here.',
    'st.notconnected': 'Not connected', 'st.ready': 'Ready',

    'conn.title': 'Connections', 'conn.new': 'New Connection', 'conn.edit': 'Edit Connection',
    'conn.name': 'Name', 'conn.group': 'Group', 'conn.host': 'Host', 'conn.port': 'Port',
    'conn.user': 'Username', 'conn.pass': 'Password', 'conn.ssl': 'Use SSL/TLS',
    'conn.sslverify': 'Verify server certificate (secure)',
    'conn.sslca': 'CA certificate (optional)', 'conn.ssh': 'SSH Tunnel',
    'conn.sshhost': 'SSH host', 'conn.sshport': 'SSH port', 'conn.sshuser': 'SSH user',
    'conn.sshpass': 'SSH password', 'conn.sshkey': 'Private key file', 'conn.test': 'Test',
    'conn.save': 'Save', 'conn.cancel': 'Cancel', 'conn.delete': 'Delete',
    'conn.testok': 'Connection successful', 'conn.testfail': 'Connection failed',
    'conn.readonly': 'Read-only connection (SELECT/SHOW/EXPLAIN only)',
    'msg.connlost': 'Connection lost: {name}',
    'conn.saved': 'Connection saved', 'conn.deleted': 'Connection deleted',
    'conn.confirmDelete': 'Delete this connection?', 'conn.empty': 'No connections yet.\nClick + to add your first database connection.',

    'tree.databases': 'Databases', 'tree.tables': 'Tables', 'tree.views': 'Views',
    'tree.procs': 'Stored Procedures', 'tree.funcs': 'Functions', 'tree.triggers': 'Triggers', 'tree.events': 'Events',
    'tree.columns': 'Columns', 'tree.indexes': 'Indexes', 'tree.ddl': 'DDL',
    'tree.connecting': 'Connecting…', 'tree.connected': 'Connected',
    'tree.newdb': 'New database', 'tree.createdb': 'Create database', 'tree.dbname': 'Database name',
    'tree.charset': 'Charset', 'tree.collation': 'Collation',

    'ctx.selectdata': 'Select Data (limit 1000)', 'ctx.altertable': 'Table Designer', 'ctx.ddlview': 'View DDL',
    'ctx.truncate': 'Truncate Table…', 'ctx.drop': 'Drop…', 'ctx.rename': 'Rename…',
    'ctx.refresh': 'Refresh', 'ctx.dumpdata': 'Backup Table…', 'ctx.query': 'New Query',
    'ctx.disconnect': 'Disconnect',
    'ctx.import': 'Import Data…', 'ctx.export': 'Export…',
    'ctx.confirmDrop': 'DROP {type} {name}?\nThis cannot be undone!', 'ctx.confirmTrunc': 'TRUNCATE {name}?\nAll rows will be deleted!',
    'ctx.dropped': 'Dropped', 'ctx.newtable': 'New Table…',

    'grid.filter': 'WHERE filter, e.g.  price > 100 AND name LIKE "a%"',
    'grid.rows': 'rows', 'grid.total': 'of {n}', 'grid.editing': 'Editing', 'grid.nopk':
      'Table has no primary key — editing falls back to matching all columns.',
    'grid.save': 'Apply Changes', 'grid.revert': 'Revert', 'grid.addrow': 'Add Row', 'grid.delrow': 'Delete Row',
    'grid.refresh': 'Refresh', 'grid.null': 'NULL', 'grid.confirmsave': 'Apply {n} change(s)?',
    'grid.applied': 'Applied changes: +{i} ~{u} -{d}', 'grid.page': 'Page', 'grid.loading': 'Loading…',
    'grid.export': 'Export', 'grid.blob': '<binary {n} B>', 'grid.viewblob': 'View value',
    'grid.preview': 'View value…', 'grid.text': 'Text (UTF-8)',
    'grid.colwidth': 'Column: ', 'grid.noresults': 'No rows', 'grid.error': 'Query error',

    'ed.execute': 'Execute (Ctrl+Enter)', 'ed.execSel': 'Execute Selection', 'ed.format': 'Format SQL',
    'ed.open': 'Open SQL file (Ctrl+O)', 'ed.savefile': 'Save SQL file (Ctrl+S)',
    'ed.opened': 'Opened {f}', 'ed.explain': 'Show execution plan', 'ed.analyze': 'EXPLAIN ANALYZE — actually runs the statement',
    'ed.nowhere.title': 'UPDATE/DELETE without WHERE', 'ed.nowhere.body': 'This statement has no WHERE clause — it will affect EVERY row.\nRun it anyway?',
    'ed.saveSnippet': 'Save as Snippet', 'ed.newtab': 'New Tab', 'ed.tab': 'Query',
    'ed.running': 'Running…', 'ed.rowsaffected': '{r} row(s) affected', 'ed.empty': 'Type SQL here, press Ctrl+Enter to run.',
    'ed.autocommit': 'autocommit',

    'hist.empty': 'Executed queries appear here.', 'hist.copy': 'Click to copy into current editor.',

    'imp.title': 'Import Data', 'imp.file': 'File', 'imp.browse': 'Browse…', 'imp.target': 'Target table',
    'imp.delim': 'Delimiter', 'imp.headers': 'First row contains headers', 'imp.truncate': 'Truncate table before import',
    'imp.createtable': 'Create table automatically from this file (auto column types)',
    'imp.run': 'Import', 'imp.done': 'Imported {n} row(s)', 'imp.json': 'JSON array file',

    'exp.title': 'Export', 'exp.format': 'Format', 'exp.run': 'Export', 'exp.done': 'Exported {n} row(s) to {f}',
    'exp.noactive': 'Run a query or open a table first.',

    'bk.title': 'Backup Database', 'bk.db': 'Database', 'bk.tables': 'Tables (empty = all)',
    'bk.schema': 'Include schema (CREATE TABLE)', 'bk.data': 'Include data (INSERTs)',
    'bk.views': 'Include views', 'bk.run': 'Backup', 'bk.done': 'Backup written to {f}',

    'srv.title': 'Server Dashboard', 'srv.version': 'Server version', 'srv.flavor': 'Flavor',
    'srv.uptime': 'Uptime', 'srv.threads': 'Connections', 'srv.questions': 'Queries served',
    'srv.dbsize': 'Total size of databases', 'srv.processlist': 'Process List', 'srv.kill': 'Kill',
    'srv.killquery': 'Kill Query', 'srv.vars': 'Variables', 'srv.status': 'Status',
    'srv.search': 'Search…', 'srv.confirmKill': 'Kill process {id}?',
    'srv.autorefresh': 'Auto refresh (5s)', 'srv.dbprivs': 'Database privileges', 'srv.qps': 'Queries/sec (blue) · Connections (green)',

    'usr.title': 'Users & Privileges', 'usr.new': 'Create User', 'usr.name': 'User', 'usr.host': 'Host',
    'usr.password': 'Password', 'usr.grants': 'Grants', 'usr.drop': 'Drop User', 'usr.setpass': 'Set Password',
    'usr.confirmDrop': 'Drop user {u}@{h}?', 'usr.created': 'User created', 'usr.global': 'Global privileges',

    'ds.title': 'Table Designer', 'ds.columns': 'Columns', 'ds.indexes': 'Indexes', 'ds.fks': 'Foreign Keys',
    'ds.colname': 'Name', 'ds.coltype': 'Type', 'ds.nullable': 'NULL', 'ds.default': 'Default',
    'ds.ai': 'Auto Inc', 'ds.comment': 'Comment', 'ds.engine': 'Engine', 'ds.charset': 'Charset',
    'ds.tablename': 'Table name', 'ds.preview': 'Preview SQL', 'ds.apply': 'Apply',
    'ds.applied': 'Table saved', 'ds.uniq': 'UNIQUE', 'ds.indexname': 'Index name', 'ds.ref': 'Reference (table) columns',
    'ds.ondelete': 'ON DELETE', 'ds.onupdate': 'ON UPDATE', 'ds.pk': 'Primary Key',

    'set.title': 'Settings', 'set.language': 'Language', 'set.theme': 'Theme', 'set.dark': 'Dark', 'set.light': 'Light',
    'set.fontsize': 'UI font size', 'set.editorfontsize': 'Editor font size', 'set.maxrows': 'Rows per page',
    'set.timeout': 'Query timeout (seconds)', 'set.autoupdate': 'Check for updates automatically',
    'set.confirm': 'Confirm destructive operations (DROP/TRUNCATE/DELETE)',
    'set.autocomplete': 'SQL autocomplete', 'set.saved': 'Settings saved',
    'set.sqllog': 'Record SQL log (every executed statement, local file only)',
    'set.sqllogdays': 'Keep SQL log (days)',
    'set.security': 'Passwords are encrypted with your OS keychain and never leave this computer. No telemetry is collected.',

    'help.title': 'Help', 'help.search': 'Search help…',
    'help.welcome.title': 'Welcome to WJ DB Studio',
    'help.welcome.body': 'A fast, modern manager for MySQL & MariaDB.\n\n1. Click "Connect" to add a database connection.\n2. Expand the tree to browse databases and tables.\n3. Press "New Query" to write SQL with autocomplete.\n\nPress F1 anytime for help.',
    'help.tourSkip': 'Skip', 'help.tourStart': 'Start',

    'about.title': 'About WJ DB Studio',
    'about.developed': 'Developed by',
    'about.desc': 'A fast, modern, zero-setup database manager for MySQL and MariaDB.',
    'about.license': 'Released under the MIT License.',
    'about.privacy': 'No telemetry. No cloud. Your passwords stay on your machine (OS-encrypted).',
    'about.check': 'Check for Updates', 'about.upToDate': 'You are up to date',
    'about.newVersion': 'New version {v} available', 'about.download': 'Download', 'about.install': 'Install & Restart',

    'msg.copied': 'Copied', 'msg.connected': 'Connected to {name}', 'msg.disconnected': 'Disconnected',
    'msg.needconn': 'Connect to a server first', 'msg.savedfile': 'Saved: {f}',
    'msg.error': 'Error', 'msg.running': 'Working…',
    'menu.closeTab': 'Close tab', 'menu.sessionrestored': 'Previous session restored',
    'er.title': 'ER Diagram',
    'tr.title': 'Transfer a table between connections', 'tr.source': 'Source', 'tr.target': 'Target',
    'tr.drop': 'Drop target table first', 'tr.run': 'Transfer', 'tr.done': 'Transferred {n} row(s) to {t}',
    'cmp.title': 'Schema Compare', 'cmp.source': 'Source (desired)', 'cmp.target': 'Target (to change)',
    'cmp.drops': 'Include DROPs for tables/columns missing in source', 'cmp.run': 'Compare',
    'cmp.onlyA': 'only in source', 'cmp.onlyB': 'only in target', 'cmp.changed': 'changed tables',
    'cmp.sql': 'Migration SQL (target ← source)', 'cmp.save': 'Save migration SQL',
    'connx.export': 'Export Connections (no passwords)…', 'connx.import': 'Import Connections…',
    'connx.exported': 'Exported {n} connection(s) to {f} — passwords are not included', 'connx.imported': 'Imported {n} connection(s) — re-enter passwords when connecting',
    'chart.title': 'Result chart', 'chart.btn': 'Chart', 'chart.bar': 'Bar', 'chart.line': 'Line', 'chart.nonum': 'No numeric column to chart',
    'mock.title': 'Generate mock data', 'mock.rows': 'Rows to generate', 'mock.hint': 'Values are generated per column type and name (names, emails, cities, dates, numbers…).',
    'mock.run': 'Generate', 'mock.done': 'Generated {n} row(s)',
  },

  th: {
    'tb.home': 'หน้าแรก', 'tb.newconn': 'เชื่อมต่อ', 'tb.newquery': 'SQL ใหม่', 'tb.import': 'นำเข้า',
    'tb.export': 'ส่งออก', 'tb.backup': 'สำรอง', 'tb.server': 'เซิร์ฟเวอร์', 'tb.users': 'ผู้ใช้', 'tb.find': 'ค้นหา',
    'find.title': 'ค้นหาค่าในฐานข้อมูล — ค้นทุกตารางพร้อมกัน',
    'find.term': 'ค่าที่ต้องการค้นหา', 'find.run': 'ค้นหา', 'find.none': 'ไม่พบข้อมูลในตารางใดเลย',
    'side.explorer': 'สำรวจออบเจกต์', 'side.filter': 'ค้นหาออบเจกต์…',
    'bp.messages': 'ข้อความ', 'bp.history': 'ประวัติ', 'bp.snippets': 'ตัวอย่าง SQL', 'bp.clear': 'ล้าง',
    'bp.newsnippet': 'สร้างตัวอย่าง', 'bp.sqllog': 'SQL Log',
    'sqllog.filter': 'กรอง SQL…', 'sqllog.onlyerr': 'เฉพาะที่ผิดพลาด', 'sqllog.empty': 'ยังไม่มี SQL ที่ถูกบันทึก — รันคำสั่งแล้วจะปรากฏที่นี่',
    'st.notconnected': 'ยังไม่ได้เชื่อมต่อ', 'st.ready': 'พร้อมใช้งาน',

    'conn.title': 'การเชื่อมต่อ', 'conn.new': 'เชื่อมต่อใหม่', 'conn.edit': 'แก้ไขการเชื่อมต่อ',
    'conn.name': 'ชื่อ', 'conn.group': 'กลุ่ม', 'conn.host': 'โฮสต์', 'conn.port': 'พอร์ต',
    'conn.user': 'ชื่อผู้ใช้', 'conn.pass': 'รหัสผ่าน', 'conn.ssl': 'ใช้ SSL/TLS',
    'conn.sslverify': 'ตรวจสอบใบรับรองเซิร์ฟเวอร์ (ปลอดภัย)',
    'conn.sslca': 'ไฟล์ CA certificate (ไม่บังคับ)', 'conn.ssh': 'อุโมงค์ SSH',
    'conn.sshhost': 'โฮสต์ SSH', 'conn.sshport': 'พอร์ต SSH', 'conn.sshuser': 'ผู้ใช้ SSH',
    'conn.sshpass': 'รหัสผ่าน SSH', 'conn.sshkey': 'ไฟล์ Private key', 'conn.test': 'ทดสอบ',
    'conn.save': 'บันทึก', 'conn.cancel': 'ยกเลิก', 'conn.delete': 'ลบ',
    'conn.testok': 'เชื่อมต่อสำเร็จ', 'conn.testfail': 'เชื่อมต่อไม่สำเร็จ',
    'conn.readonly': 'อ่านอย่างเดียว (SELECT/SHOW/EXPLAIN เท่านั้น)',
    'msg.connlost': 'การเชื่อมต่อหลุด: {name}',
    'conn.saved': 'บันทึกการเชื่อมต่อแล้ว', 'conn.deleted': 'ลบการเชื่อมต่อแล้ว',
    'conn.confirmDelete': 'ลบการเชื่อมต่อนี้?', 'conn.empty': 'ยังไม่มีการเชื่อมต่อ\nกด + เพื่อเพิ่มการเชื่อมต่อฐานข้อมูลแรกของคุณ',

    'tree.databases': 'ฐานข้อมูล', 'tree.tables': 'ตาราง', 'tree.views': 'วิว',
    'tree.procs': 'Stored Procedure', 'tree.funcs': 'ฟังก์ชัน', 'tree.triggers': 'ทริกเกอร์', 'tree.events': 'อีเวนต์',
    'tree.columns': 'คอลัมน์', 'tree.indexes': 'ดัชนี', 'tree.ddl': 'โครงสร้าง (DDL)',
    'tree.connecting': 'กำลังเชื่อมต่อ…', 'tree.connected': 'เชื่อมต่อแล้ว',
    'tree.newdb': 'ฐานข้อมูลใหม่', 'tree.createdb': 'สร้างฐานข้อมูล', 'tree.dbname': 'ชื่อฐานข้อมูล',
    'tree.charset': 'ชุดอักขระ', 'tree.collation': 'การเรียงลำดับ',

    'ctx.selectdata': 'ดูข้อมูล (1000 แถว)', 'ctx.altertable': 'ออกแบบตาราง', 'ctx.ddlview': 'ดู DDL',
    'ctx.truncate': 'ล้างตาราง (Truncate)…', 'ctx.drop': 'ลบ (Drop)…', 'ctx.rename': 'เปลี่ยนชื่อ…',
    'ctx.refresh': 'รีเฟรช', 'ctx.dumpdata': 'สำรองตาราง…', 'ctx.query': 'คำสั่ง SQL ใหม่',
    'ctx.disconnect': 'ตัดการเชื่อมต่อ',
    'ctx.import': 'นำเข้าข้อมูล…', 'ctx.export': 'ส่งออก…',
    'ctx.confirmDrop': 'ลบ {type} {name}?\nไม่สามารถย้อนกลับได้!', 'ctx.confirmTrunc': 'ล้างข้อมูลตาราง {name}?\nข้อมูลทั้งหมดจะถูกลบ!',
    'ctx.dropped': 'ลบแล้ว', 'ctx.newtable': 'สร้างตาราง…',

    'grid.filter': 'เงื่อนไข WHERE เช่น  price > 100 AND name LIKE "a%"',
    'grid.rows': 'แถว', 'grid.total': 'จาก {n}', 'grid.editing': 'กำลังแก้ไข', 'grid.nopk':
      'ตารางนี้ไม่มี Primary Key — การแก้ไขจะจับคู่ทุกคอลัมน์แทน',
    'grid.save': 'บันทึกการแก้ไข', 'grid.revert': 'ยกเลิก', 'grid.addrow': 'เพิ่มแถว', 'grid.delrow': 'ลบแถว',
    'grid.refresh': 'รีเฟรช', 'grid.null': 'NULL', 'grid.confirmsave': 'บันทึกการแก้ไข {n} รายการ?',
    'grid.applied': 'บันทึกแล้ว: เพิ่ม {i} แก้ {u} ลบ {d}', 'grid.page': 'หน้า', 'grid.loading': 'กำลังโหลด…',
    'grid.export': 'ส่งออก', 'grid.blob': '<ไบนารี {n} B>', 'grid.viewblob': 'ดูค่า',
    'grid.preview': 'ดูค่า…', 'grid.text': 'ข้อความ (UTF-8)',
    'grid.noresults': 'ไม่มีข้อมูล', 'grid.error': 'ข้อผิดพลาดของคำสั่ง',

    'ed.execute': 'รันคำสั่ง (Ctrl+Enter)', 'ed.execSel': 'รันเฉพาะที่เลือก', 'ed.format': 'จัดรูปแบบ SQL',
    'ed.open': 'เปิดไฟล์ SQL (Ctrl+O)', 'ed.savefile': 'บันทึกไฟล์ SQL (Ctrl+S)',
    'ed.opened': 'เปิด {f} แล้ว', 'ed.explain': 'ดูแผนการประมวลผล', 'ed.analyze': 'EXPLAIN ANALYZE — รันคำสั่งจริง',
    'ed.nowhere.title': 'UPDATE/DELETE ไม่มี WHERE', 'ed.nowhere.body': 'คำสั่งนี้ไม่มีเงื่อนไข WHERE — จะกระทบทุกแถวในตาราง!\nรันต่อหรือไม่?',
    'ed.saveSnippet': 'บันทึกเป็นตัวอย่าง SQL', 'ed.newtab': 'แท็บใหม่', 'ed.tab': 'คำสั่ง',
    'ed.running': 'กำลังรัน…', 'ed.rowsaffected': 'มีผล {r} แถว', 'ed.empty': 'พิมพ์ SQL แล้วกด Ctrl+Enter เพื่อรัน',
    'ed.autocommit': 'autocommit',

    'hist.empty': 'คำสั่งที่รันจะแสดงที่นี่', 'hist.copy': 'คลิกเพื่อคัดลอกไปยังตัวแก้ไขปัจจุบัน',

    'imp.title': 'นำเข้าข้อมูล', 'imp.file': 'ไฟล์', 'imp.browse': 'เลือกไฟล์…', 'imp.target': 'ตารางปลายทาง',
    'imp.delim': 'ตัวคั่น', 'imp.headers': 'แถวแรกเป็นชื่อคอลัมน์', 'imp.truncate': 'ล้างตารางก่อนนำเข้า',
    'imp.createtable': 'สร้างตารางใหม่จากไฟล์นี้อัตโนมัติ (เดาชนิดคอลัมน์ให้)',
    'imp.run': 'นำเข้า', 'imp.done': 'นำเข้าแล้ว {n} แถว', 'imp.json': 'ไฟล์ JSON แบบ array',

    'exp.title': 'ส่งออก', 'exp.format': 'รูปแบบ', 'exp.run': 'ส่งออก', 'exp.done': 'ส่งออก {n} แถว ไปที่ {f}',
    'exp.noactive': 'กรุณารันคำสั่งหรือเปิดตารางก่อน',

    'bk.title': 'สำรองฐานข้อมูล', 'bk.db': 'ฐานข้อมูล', 'bk.tables': 'ตาราง (เว้นว่าง = ทุกตาราง)',
    'bk.schema': 'รวมโครงสร้าง (CREATE TABLE)', 'bk.data': 'รวมข้อมูล (INSERT)',
    'bk.views': 'รวมวิว', 'bk.run': 'สำรองข้อมูล', 'bk.done': 'บันทึกไฟล์สำรองไปที่ {f}',

    'srv.title': 'แดชบอร์ดเซิร์ฟเวอร์', 'srv.version': 'เวอร์ชันเซิร์ฟเวอร์', 'srv.flavor': 'ชนิด',
    'srv.uptime': 'เวลาทำงาน', 'srv.threads': 'การเชื่อมต่อ', 'srv.questions': 'คำสั่งที่ประมวลผล',
    'srv.dbsize': 'ขนาดฐานข้อมูลรวม', 'srv.processlist': 'Process List', 'srv.kill': 'Kill',
    'srv.killquery': 'Kill Query', 'srv.vars': 'ตัวแปรระบบ', 'srv.status': 'สถานะ',
    'srv.search': 'ค้นหา…', 'srv.confirmKill': 'Kill process {id}?',
    'srv.autorefresh': 'รีเฟรชอัตโนมัติ (5 วิ)', 'srv.dbprivs': 'สิทธิ์ระดับฐานข้อมูล', 'srv.qps': 'คิวรี/วินาที (ฟ้า) · การเชื่อมต่อ (เขียว)',

    'usr.title': 'ผู้ใช้และสิทธิ์', 'usr.new': 'สร้างผู้ใช้', 'usr.name': 'ผู้ใช้', 'usr.host': 'โฮสต์',
    'usr.password': 'รหัสผ่าน', 'usr.grants': 'สิทธิ์', 'usr.drop': 'ลบผู้ใช้', 'usr.setpass': 'ตั้งรหัสผ่าน',
    'usr.confirmDrop': 'ลบผู้ใช้ {u}@{h}?', 'usr.created': 'สร้างผู้ใช้แล้ว', 'usr.global': 'สิทธิ์ระดับสูงสุด',

    'ds.title': 'ออกแบบตาราง', 'ds.columns': 'คอลัมน์', 'ds.indexes': 'ดัชนี', 'ds.fks': 'Foreign Keys',
    'ds.colname': 'ชื่อ', 'ds.coltype': 'ชนิดข้อมูล', 'ds.nullable': 'NULL', 'ds.default': 'ค่าเริ่มต้น',
    'ds.ai': 'Auto Increment', 'ds.comment': 'คำอธิบาย', 'ds.engine': 'Engine', 'ds.charset': 'ชุดอักขระ',
    'ds.tablename': 'ชื่อตาราง', 'ds.preview': 'ดู SQL', 'ds.apply': 'บันทึก',
    'ds.applied': 'บันทึกตารางแล้ว', 'ds.uniq': 'UNIQUE', 'ds.indexname': 'ชื่อดัชนี', 'ds.ref': 'ตาราง/คอลัมน์อ้างอิง',
    'ds.ondelete': 'ON DELETE', 'ds.onupdate': 'ON UPDATE', 'ds.pk': 'Primary Key',

    'set.title': 'ตั้งค่า', 'set.language': 'ภาษา', 'set.theme': 'ธีม', 'set.dark': 'มืด', 'set.light': 'สว่าง',
    'set.fontsize': 'ขนาดฟอนต์หน้าจอ', 'set.editorfontsize': 'ขนาดฟอนต์ตัวแก้ไข SQL', 'set.maxrows': 'แถวต่อหน้า',
    'set.timeout': 'หมดเวลาคำสั่ง (วินาที)', 'set.autoupdate': 'ตรวจสอบการอัปเดตอัตโนมัติ',
    'set.confirm': 'ยืนยันก่อนคำสั่งที่ลบข้อมูล (DROP/TRUNCATE/DELETE)',
    'set.autocomplete': 'ช่วยเติม SQL อัตโนมัติ', 'set.saved': 'บันทึกการตั้งค่าแล้ว',
    'set.sqllog': 'บันทึก SQL Log (ทุกคำสั่งที่รัน เก็บเป็นไฟล์ในเครื่องนี้เท่านั้น)',
    'set.sqllogdays': 'เก็บ SQL Log ไว้ (วัน)',
    'set.security': 'รหัสผ่านถูกเข้ารหัสด้วย keychain ของระบบปฏิบัติการ และไม่ออกจากเครื่องนี้ ไม่มีการส่งข้อมูล (telemetry) ใดๆ',

    'help.title': 'ช่วยเหลือ', 'help.search': 'ค้นหาวิธีใช้…',
    'help.welcome.title': 'ยินดีต้อนรับสู่ WJ DB Studio',
    'help.welcome.body': 'โปรแกรมจัดการ MySQL และ MariaDB ที่เร็ว ทันสมัย ไม่ต้องติดตั้ง\n\n1. กด "เชื่อมต่อ" เพื่อเพิ่มการเชื่อมต่อฐานข้อมูล\n2. กดลูกศรในแผนก้านเพื่อสำรวจฐานข้อมูลและตาราง\n3. กด "SQL ใหม่" เพื่อเขียน SQL พร้อมระบบช่วยเติมอัตโนมัติ\n\nกด F1 ได้ตลอดเวลาหากต้องการความช่วยเหลือ',
    'help.tourSkip': 'ข้าม', 'help.tourStart': 'เริ่มใช้งาน',

    'about.title': 'เกี่ยวกับ WJ DB Studio',
    'about.developed': 'พัฒนาโดย',
    'about.desc': 'โปรแกรมจัดการฐานข้อมูล MySQL และ MariaDB ที่เร็ว ทันสมัย และไม่ต้องติดตั้ง',
    'about.license': 'เผยแพร่ภายใต้สัญญาอนุญาต MIT License',
    'about.privacy': 'ไม่มีการส่งข้อมูล (telemetry) ไม่มีคลาวด์ รหัสผ่านอยู่บนเครื่องของคุณเท่านั้น (เข้ารหัสระดับระบบปฏิบัติการ)',
    'about.check': 'ตรวจสอบการอัปเดต', 'about.upToDate': 'โปรแกรมเป็นเวอร์ชันล่าสุดแล้ว',
    'about.newVersion': 'มีเวอร์ชันใหม่ {v}', 'about.download': 'ดาวน์โหลด', 'about.install': 'ติดตั้งและรีสตาร์ท',

    'msg.copied': 'คัดลอกแล้ว', 'msg.connected': 'เชื่อมต่อ {name} แล้ว', 'msg.disconnected': 'ตัดการเชื่อมต่อแล้ว',
    'msg.needconn': 'กรุณาเชื่อมต่อเซิร์ฟเวอร์ก่อน', 'msg.savedfile': 'บันทึกที่: {f}',
    'msg.error': 'ข้อผิดพลาด', 'msg.running': 'กำลังทำงาน…',
    'menu.closeTab': 'ปิดแท็บ', 'menu.sessionrestored': 'กู้คืนหน้าจอครั้งก่อนแล้ว',
    'er.title': 'แผนผังความสัมพันธ์ (ER)',
    'tr.title': 'ย้าย/คัดลอกตารางข้ามการเชื่อมต่อ', 'tr.source': 'ต้นทาง', 'tr.target': 'ปลายทาง',
    'tr.drop': 'ลบตารางปลายทางก่อน (Drop)', 'tr.run': 'ย้ายข้อมูล', 'tr.done': 'ย้าย {n} แถว ไป {t} แล้ว',
    'cmp.title': 'เทียบโครงสร้างฐานข้อมูล', 'cmp.source': 'ต้นแบบ (ที่ต้องการ)', 'cmp.target': 'ปลายทาง (ที่จะแก้)',
    'cmp.drops': 'รวม DROP ของตาราง/คอลัมน์ที่หายในต้นแบบ', 'cmp.run': 'เทียบ',
    'cmp.onlyA': 'มีเฉพาะต้นแบบ', 'cmp.onlyB': 'มีเฉพาะปลายทาง', 'cmp.changed': 'ตารางที่ต่างกัน',
    'cmp.sql': 'SQL สำหรับแก้ปลายทางให้เหมือนต้นแบบ', 'cmp.save': 'บันทึก SQL migration',
    'connx.export': 'ส่งออกรายการเชื่อมต่อ (ไม่รวมรหัสผ่าน)…', 'connx.import': 'นำเข้ารายการเชื่อมต่อ…',
    'connx.exported': 'ส่งออก {n} การเชื่อมต่อ ไปที่ {f} — ไม่รวมรหัสผ่าน', 'connx.imported': 'นำเข้า {n} การเชื่อมต่อ — กรุณากรอกรหัสผ่านใหม่ตอนเชื่อมต่อ',
    'chart.title': 'กราฟจากผลลัพธ์', 'chart.btn': 'กราฟ', 'chart.bar': 'แท่ง', 'chart.line': 'เส้น', 'chart.nonum': 'ไม่มีคอลัมน์ตัวเลขให้วาดกราฟ',
    'mock.title': 'สร้างข้อมูลทดสอบ (Mock data)', 'mock.rows': 'จำนวนแถว', 'mock.hint': 'สร้างค่าอัตโนมัติตามชนิดและชื่อคอลัมน์ (ชื่อ อีเมล เมือง วันที่ ตัวเลข…)',
    'mock.run': 'สร้าง', 'mock.done': 'สร้างแล้ว {n} แถว',
  },
};

let current = 'th';

export function setLanguage(lang) {
  current = I18N[lang] ? lang : 'en';
  document.documentElement.lang = current;
}

export function t(key, vars) {
  let s = (I18N[current] && I18N[current][key]) ?? I18N.en[key] ?? key;
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll('{' + k + '}', String(v));
  return s;
}

/** Apply translations to all [data-i18n] / [data-i18n-ph] elements. */
export function applyI18n(root = document) {
  root.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.getAttribute('data-i18n')); });
  root.querySelectorAll('[data-i18n-ph]').forEach(el => { el.placeholder = t(el.getAttribute('data-i18n-ph')); });
}

/**
 * Error doctor — maps common MySQL errors to friendly bilingual advice.
 * (automatic help system)
 */
const ERROR_HELP = [
  [/ER_ACCESS_DENIED|Access denied for user/i, {
    en: 'Username or password is wrong, or the user is not allowed to connect from this host. Check the credentials and the user\'s Host in "Users".',
    th: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง หรือผู้ใช้นี้ไม่ได้รับอนุญาตให้เชื่อมต่อจากโฮสต์นี้ ตรวจสอบข้อมูลล็อกอินและคอลัมน์ Host ในหน้า "ผู้ใช้"',
  }],
  [/ECONNREFUSED/i, {
    en: 'Nothing is listening on that host/port. Is the MySQL server running? Is the host/port correct?',
    th: 'ไม่มีโปรแกรมรอการเชื่อมต่อที่โฮสต์/พอร์ตนี้ เซิร์ฟเวอร์ MySQL เปิดอยู่หรือไม่ โฮสต์/พอร์ตถูกต้องหรือไม่',
  }],
  [/ETIMEDOUT|connectTimeout|handshake.*timeout/i, {
    en: 'The server did not answer in time. Check network/firewall, or increase "Query timeout" in Settings. If connecting through SSH, verify the SSH details.',
    th: 'เซิร์ฟเวอร์ไม่ตอบกลับในเวลาที่กำหนด ตรวจสอบเครือข่าย/ไฟร์วอลล์ หรือเพิ่มค่าหมดเวลาในการตั้งค่า ถ้าใช้ SSH ให้ตรวจสอบข้อมูล SSH ด้วย',
  }],
  [/ER_NO_SUCH_TABLE/i, {
    en: 'That table does not exist in the selected database. Check spelling or select the right database in the tree.',
    th: 'ไม่พบตารางนี้ในฐานข้อมูลที่เลือก ตรวจสอบชื่อหรือเลือกฐานข้อมูลที่ถูกต้องในแผนก้าน',
  }],
  [/ER_BAD_DB_ERROR|Unknown database/i, {
    en: 'The database does not exist. Right-click "Databases" to create it.',
    th: 'ไม่มีฐานข้อมูลนี้ คลิกขวาที่ "ฐานข้อมูล" เพื่อสร้างใหม่ได้',
  }],
  [/ER_TABLE_EXISTS_ERROR/i, {
    en: 'A table with this name already exists. Use the Table Designer on the existing table instead.',
    th: 'มีตารางชื่อนี้อยู่แล้ว ใช้ตัวออกแบบตารางกับตารางเดิมแทน',
  }],
  [/ER_DUP_ENTRY|Duplicate entry/i, {
    en: 'This value violates a UNIQUE constraint — the value already exists.',
    th: 'ค่านี้ขัดกับข้อจำกัด UNIQUE — มีค่านี้อยู่ในตารางแล้ว',
  }],
  [/ER_DATA_TOO_LONG/i, {
    en: 'The value is longer than the column allows. Increase the column length in the Table Designer.',
    th: 'ค่ายาวเกินขนาดคอลัมน์ เพิ่มความยาวคอลัมน์ในตัวออกแบบตาราง',
  }],
  [/ER_NO_REFERENCED_ROW|foreign key constraint fails/i, {
    en: 'A foreign key check failed — the referenced record does not exist (or the parent row is still referenced).',
    th: 'การตรวจสอบ foreign key ไม่ผ่าน — ข้อมูลที่อ้างอิงไม่มีอยู่ (หรือแถวลูกยังอ้างอิงอยู่)',
  }],
  [/ER_PARSE_ERROR|syntax to use near/i, {
    en: 'SQL syntax error. Check keywords, commas and quotes near the reported position.',
    th: 'ไวยากรณ์ SQL ไม่ถูกต้อง ตรวจสอบคำสั่ง จุลภาค และเครื่องหมายคำพูดบริเวณตำแหน่งที่ระบุ',
  }],
  [/PROTOCOL_CONNECTION_LOST|connection lost/i, {
    en: 'The connection dropped (server restart / network issue / wait_timeout). Reconnect from the tree.',
    th: 'การเชื่อมต่อหลุด (เซิร์ฟเวอร์รีสตาร์ท / ปัญหาเครือข่าย / wait_timeout) เชื่อมต่อใหม่จากแผนก้าน',
  }],
  [/secure file priv|LOAD DATA LOCAL/i, {
    en: 'The server restricts local file operations (secure_file_priv). Use Import with INSERT batches instead.',
    th: 'เซิร์ฟเวอร์จำกัดการอ่านไฟล์ฝั่ง client (secure_file_priv) ใช้การนำเข้าแบบ INSERT เป็นชุดแทน',
  }],
];

export function explainError(err) {
  const msg = (err && (err.message || String(err))) || 'Unknown error';
  for (const [re, help] of ERROR_HELP) {
    if (re.test(msg)) return { msg, hint: help[current] || help.en };
  }
  return { msg, hint: null };
}
