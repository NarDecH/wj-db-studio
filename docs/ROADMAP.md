# WJ DB Studio — Roadmap การพัฒนาต่อ

> วิเคราะห์เมื่อ 2026-10-30 เทียบกับ HeidiSQL, DBeaver, TablePlus, Beekeeper Studio
> + ตรวจโค้ดจริงหาฟีเจอร์ที่ทำค้างไว้ โดย Weeradech Jessadarom

> ✅ **อัปเดต: ชุด A + B + C1 + C3 + C4 ทำเสร็จแล้วทั้งหมด** (ER diagram, find in
> database, auto-create table, multi-row, value editors, read-only, keep-alive,
> QPS chart, session restore, resizable columns, rename, theme toggle, db-grants)
> — งานที่เหลือคือชุด C ตัวใหญ่ตัวที่เหลือด้านล่าง

## สถานะปัจจุบัน (ที่มีแล้ว)

เชื่อมต่อ (SSL/SSH tunnel/กลุ่ม), สำรวจออบเจกต์ครบ 6 ชนิด, SQL editor
(highlight/autocomplete/ประวัติ/snippets/เปิด-บันทึกไฟล์/EXPLAIN+ANALYZE),
แก้ข้อมูลใน grid, ออกแบบตาราง, Import CSV/XLSX/JSON/SQL, Export
CSV/JSON/SQL/XLSX, Backup, แดชบอร์ด+Process list+Variables, Users & global
grants, SQL Log audit, Help สองภาษา+Error doctor, Auto-update, ธีมมืด/สว่าง

## A. Quick wins — backend พร้อมอยู่แล้ว เพียงเชื่อม UI (แนะนำทำก่อน ⭐)

| # | ฟีเจอร์ | สถานะโค้ด | เหตุผล |
|---|---|---|---|
| A1 | **Rename table/view ในเมนูคลิกขวา** | `db.renameObject` + preload พร้อม 100% แต่ไม่มีปุ่ม | ที่ตารางคลิกขวาต้องใช้ designer แทน — ไม่สะดวก |
| A2 | **ปุ่มสลับธีมมืด/สว่างบน toolbar** | ไอคอน `moon`/`sun` วาดไว้แล้ว ยังไม่มีปุ่ม | ทุกเจ้ามี toggle ด่วน ไม่ต้องเข้า Settings |
| A3 | **Read-only mode ต่อ connection** | ต้องเพิ่ม: checkbox ใน connection dialog + guard ฝั่ง main | ต่อ production แล้วไม่ต้องกลัวพลาด (จุดขายด้าน safety ของ TablePlus) |
| A4 | **จำความกว้างคอลัมน์ grid** | เก็บต่อ `db.table` ใน config | ไม่ต้องค่อยลากใหม่ทุกครั้ง |

## B. ฟีเจอร์ที่ผู้ใช้จริงถามหาบ่อย (P1 รอบถัดไป)

| # | ฟีเจอร์ | รายละเอียด | ความยาก |
|---|---|---|---|
| B1 | **Multi-row select + bulk actions** | Ctrl/Shift คลิกหลายแถว, copy เป็น JSON/CSV/INSERT, ลบหลายแถวพร้อมกัน | ⭐⭐ |
| B2 | **ตัวช่วยแก้ค่าตามชนิดคอลัมน์** | ENUM/SET → dropdown, DATE/DATETIME → picker, JSON → editor popup | ⭐⭐ |
| B3 | **GRANT ระดับ database** | หน้าผู้ใช้ตอนนี้ให้ได้แต่สิทธิ์ global — เพิ่มเลือก db + สิทธิ์ระดับ db | ⭐⭐ |
| B4 | **Find in database** | ค้นค่าในทุกตารางของ db (เลือกคอลัมน์ text/number) แบบ HeidiSQL | ⭐⭐⭐ |
| B5 | **Session restore** | จำแท็บ SQL ที่เปิดค้าง + connection ล่าสุด ตอนเปิดโปรแกรมใหม่ (จุดเด่น Beekeeper) | ⭐⭐ |
| B6 | **Connection keep-alive + auto-reconnect** | ping ทุก 30 วิ, ต่อใหม่เองเมื่อ pool หลุด (เน็ตหลุด/wifi สลับ) | ⭐ |
| B7 | **ค้นหาใน grid (Ctrl+F)** | ไฮไลต์เซลล์ที่ตรงเงื่อนไข | ⭐ |

## C. ฟีเจอร์ใหญ่ (P2 — ทำเป็นเวอร์ชัน 1.1–1.2)

| # | ฟีเจอร์ | อ้างอิงคู่แข่ง | ความยาก |
|---|---|---|---|
| C1 | **ER Diagram** (อ่านอย่างเดียว, วาดจาก FK) | DBeaver | ⭐⭐⭐⭐ |
| C2 | **Data transfer ข้าม connection** | DBeaver (core) | ⭐⭐⭐ |
| C3 | **สร้างตารางจาก CSV/Excel อัตโนมัติ** + จับคู่คอลัมน์ตอน import | phpMyAdmin/HeidiSQL | ⭐⭐⭐ |
| C4 | **กราฟเซิร์ฟเวอร์เรียลไทม์** (QPS, connections, slow queries) | MySQL Workbench | ⭐⭐⭐ |
| C5 | **Schema compare/diff** สองฐานข้อมูล → SQL แก้ไข | DBeaver/MySQL Workbench | ⭐⭐⭐⭐ |
| C6 | **ตั้งเวลา backup อัตโนมัติ** + zip + retention | HeidiSQL (process scheduler) | ⭐⭐⭐ |
| C7 | **Visual Query Builder** แบบง่าย (ลากตาราง+JOIN) | DBeaver (Enterprise) | ⭐⭐⭐⭐ |
| C8 | **Table partitions** ใน designer | HeidiSQL | ⭐⭐⭐ |
| C9 | **Mock data generator** สำหรับ dev/test | DBeaver Enterprise | ⭐⭐⭐ |
| C10 | **ปรับคีย์ลัดเองได้** | TablePlus | ⭐⭐⭐ |

## D. ข้อสังเกตเชิงคุณภาพ (ทำควบคู่ได้)

- ลบ i18n key/icon ที่ไม่ใช้แล้ว (`ed.autocommit`, `grid.colwidth`, `grid.viewblob`, `star`, `flag`, `menu`, `panel`, `wand`)
- เพิ่มปุ่ม duplicate connection (สำเนา config แล้วแก้ชื่อ)
- แสดง warning เมื่อคิวรีจะอัปเดต/ลบโดยไม่มี WHERE (`UPDATE ... SET ...` เฉย ๆ)
- เมนูคลิกขวาหัวคอลัมน์: เรียง, ซ่อนคอลัมน์, คัดลอกชื่อ, filter by value ที่เลือก

## ลำดับที่แนะนำ

1. **ชุด A ทั้งหมด** (A1–A4) — คืนทุนสูงสุด ใช้เวลาสั้นสุด
2. **B6 (keep-alive) + B1 (multi-row) + B2 (ตัวช่วยแก้ค่า)** — จุดที่ผู้ใช้จริงเจอบ่อยสุด
3. **C3 (สร้างตารางจาก Excel) + C1 (ER diagram)** — ของใหม่ที่ตลาดไทยใช้เยอะ
