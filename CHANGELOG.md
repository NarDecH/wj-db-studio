# Changelog

All notable changes to WJ DB Studio are documented here.
Developed by **Weeradech Jessadarom**.

## [1.0.0] — 2026-10-29

First public release 🎉

### Verified with live end-to-end testing
Tested against a real **MariaDB 10.11** server (localhost): connection dialog with test-save,
object explorer (7 databases), table data grid with Thai `utf8mb4` content, JOIN query with
syntax highlighting and autocomplete — all passing (8/8 automated checks).

### Added during 1.0 hardening
- **SQL Log**: full statement audit (daily JSONL files + in-app viewer with filters)
- **Open/save .sql files** in the SQL editor (Ctrl+O / Ctrl+S)
- **EXPLAIN / EXPLAIN ANALYZE** buttons (flavor-aware: MariaDB `ANALYZE`, MySQL `EXPLAIN ANALYZE`)
- **Excel export (.xlsx)** with auto column widths + DDL sheet, and **Excel import (.xlsx/.xls)**
- **BLOB preview**: text / hex dump / automatic image rendering (PNG/JPEG/GIF/WEBP)
- **Process list auto-refresh** (5s toggle)
- **ER Diagram** (read-only SVG: tables with columns + FK relationship lines, zoomable)
- **Find in database**: search a value across all tables at once
- **Auto-create table on import** with column-type inference (INT/DECIMAL/DATE/DATETIME/VARCHAR/TEXT)
- **Multi-row grid selection** (Ctrl/Shift) with bulk delete + copy as JSON/CSV/INSERT
- **Value editors by column type**: ENUM dropdown, DATE / DATETIME pickers
- **Read-only connection mode** (main-process enforced; DML/DDL rejected)
- **Keep-alive + auto-reconnect** with disconnect notification
- **Live server chart** (queries/sec + connections, 2s sampling)
- **Resizable columns with persisted widths**, **Ctrl+F** filter focus
- **Session restore**: last tabs + connection reopen on launch
- Rename table via right-click, duplicate connection, database-level GRANT editor

### Added
- Connection manager: MySQL & MariaDB, SSL/TLS (+CA), SSH tunnels, test-before-save, groups
- Object explorer: databases, tables, views, procedures, functions, triggers, events
- SQL editor: highlighting, schema-aware autocomplete, multi-statement runs, result tabs,
  history (300), snippets, formatter, line comments
- Data grid: filter (WHERE), sort, pagination, inline editing with PK safety,
  add/delete rows, NULL handling, batch apply
- Table designer: columns, PK, indexes, foreign keys, SQL preview, create & alter
- Import: CSV/TSV, JSON, .sql scripts (batched inserts)
- Export: CSV / JSON / SQL INSERTs with disk streaming for huge tables
- Backup: mysqldump-style .sql (schema + data + views), per-table or whole database
- Server tools: dashboard, process list (Kill/Kill Query), variables & status search
- Users & privileges: create/drop users, passwords, global GRANT editor
- Help system: F1 searchable bilingual topics, first-run tour, tooltips, error doctor
- Auto-update via GitHub Releases (electron-updater), disableable
- Thai 🇹🇭 / English 🇬🇧 UI, dark & light themes
- Packaging: Windows NSIS + portable exe, Linux AppImage, macOS dmg via GitHub Actions
