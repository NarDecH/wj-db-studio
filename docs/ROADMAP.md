# WJ DB Studio — Roadmap การพัฒนา

> อัปเดตล่าสุด: 2026-10-30 · โดย Weeradech Jessadarom
> จัดทำจาก gap analysis เทียบ HeidiSQL / DBeaver / TablePlus / Beekeeper Studio + ผลทดสอบจริง

## สิ่งที่เสร็จแล้ว

### v1.0 (2026-10-29) — ฐานที่แข็งแรง
เชื่อมต่อ (SSL/SSH/กลุ่ม), Explorer 6 ชนิดออบเจกต์, SQL editor ครบ
(highlight/autocomplete/ประวัติ/snippets), แก้ข้อมูลใน grid, Table designer,
Import CSV/JSON/SQL, Export CSV/JSON/SQL, Backup, แดชบอร์ด+Process list,
Users (global grants), Help สองภาษา + Error doctor, Auto-update, SQL Log

### v1.1 (2026-10-30) — ฟีเจอร์เสริมเต็มรูปแบบ
SQL Log audit, เปิด/บันทึกไฟล์ .sql, EXPLAIN/ANALYZE (แยก MariaDB/MySQL),
Excel import/export, BLOB preview (text/hex/รูปภาพ), Process auto-refresh,
**ER Diagram**, **Find in database**, **สร้างตารางจากไฟล์ (type inference)**,
**เลือกหลายแถว + bulk ops**, ตัวช่วยแก้ค่าตามชนิดคอลัมน์, **Read-only
connection**, **keep-alive + auto-reconnect**, **QPS chart**, **session
restore**, resizable columns (จำความกว้าง), Rename/Duplicate connection,
GRANT ระดับ database, แก้บั๊ก backup prefix ร้ายแรง (จับได้จากการทดสอบจริง)

---

## v1.2 — "ความปลอดภัย & ความทนทาน" (เป้าหมาย: ~3 สัปดาห์)

| ฟีเจอร์ | รายละเอียด | ความยาก |
|---|---|---|
| **Schema compare** | เทียบ 2 ฐานข้อมูล (ตาราง/คอลัมน์/ดัชนี) → สร้าง SQL migration script | ⭐⭐⭐ |
| **ตั้งเวลา backup** | แอปเปิดอยู่ → backup อัตโนมัติตามรอบ + zip + เก็บกี่ไฟล์ | ⭐⭐⭐ |
| **SSL verify-full** | ปัจจุบัน rejectUnauthorized:false — เพิ่มโหมดตรวจใบรับรองจริง | ⭐ |
| **SSH host key check** | บันทึก fingerprint ครั้งแรก, เตือนเมื่อเปลี่ยน | ⭐⭐ |
| **Export/Import connections** | แชร์รายการ connection ระหว่างเครื่อง (ไม่รวมรหัสผ่าน) | ⭐ |
| **เตือน UPDATE/DELETE ไม่มี WHERE** | ตรวจก่อนรันใน editor | ⭐ |
| **เมนูหัวคอลัมน์ grid** | เรียง/ซ่อนคอลัมน์/filter by value ที่เลือก | ⭐⭐ |

## v1.3 — "ผู้ใช้ระดับสูง" (เป้าหมาย: ~1 เดือน)

| ฟีเจอร์ | รายละเอียด | ความยาก |
|---|---|---|
| **Query profiler** | รวม EXPLAIN + timing + SHOW STATUS ต่อคิวรี เป็นรายงานเดียว | ⭐⭐⭐ |
| **Mock data generator** | สร้างข้อมูลปลอมตามชนิดคอลัมน์ (ชื่อ/อีเมล/วันที่/เลข) N แถว | ⭐⭐ |
| **Table partitions** | ออกแบบ/ดู partition ใน designer (RANGE/LIST/HASH) | ⭐⭐⭐ |
| **ปรับคีย์ลัดเองได้** | แก้ mapping เก็บใน config | ⭐⭐ |
| **กราฟจากผลคิวรี** | เลือก 2-3 คอลัมน์ใน grid → bar/line chart ทันที | ⭐⭐ |
| **Virtualized grid** | รองรับ 10k+ แถวต่อหน้าแบบลื่น | ⭐⭐⭐ |

## v2.0 — "ขยายขอบเขต" (ระยะยาว)

| ฟีเจอร์ | รายละเอียด | สถานะ |
|---|---|---|
| **CLI mode** | `WJ DB Studio.exe --exec "SQL" --conn "name"` — พิมพ์ผลเป็น TSV ไม่เปิดหน้าต่าง (ใช้ในสคริปต์/cron ได้) | ✅ เสร็จแล้ว |
| **PostgreSQL / SQLite** | แยก driver layer ออกจาก db.js เป็นสถาปัตยกรรม adapter | ⏳ แผนถัดไป |
| **Visual Query Builder** | ลากตาราง + JOIN + เงื่อนไขแบบกราฟิก | ⏳ |
| **Plugin system** | โหลดส่วนเสริมจากโฟลเดอร์ (เช่น รูปแบบ export ใหม่) | ⏳ |
| **เว็บไซต์ + docs** | GitHub Pages จากเอกสารที่มี | ⏳ |

## งานต่อเนื่อง (ทำควบคู่ทุกเวอร์ชัน)

- **CI เต็มรูปแบบ**: เพิ่ม unit tests ของ pure functions (CSV parser, SQL splitter,
  type inference, highlighter) — ปัจจุบันมีแต่ selftest + CDP E2E
- **Accessibility**: นำทางคีย์บอร์ดครบทุกหน้าจอ, contrast ตามมาตรฐาน
- **i18n**: โครงรองรับภาษาใหม่แล้ว — เพิ่มได้เมื่อมีผู้ช่วยแปล
- **ทดสอบบนขอบ**: SSH จริง, SSL จริง, ฐานข้อมูลหลายล้านแถว, เครือข่ายช้า/หลุดบ่อย

## หลักการตัดสินใจ

1. **ความปลอดภัยมาก่อนฟีเจอร์** — อะไรที่กันข้อมูล user เสีย ทำก่อนเสมอ
2. **ไม่มี telemetry ไม่มีคลาวด์บังคับ** — ทุกอย่าง opt-in เสมอ
3. **ไม่ต้อง setup** — ทุกฟีเจอร์ใหม่ต้องยังแจกเป็น portable ได้
4. เวอร์ชัน: patch = แก้บั๊ก, minor = ฟีเจอร์ใหม่, major = เปลี่ยนสถาปัตยกรรม
