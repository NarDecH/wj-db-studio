# Changelog

All notable changes to WJ DB Studio are documented here.
Developed by **Weeradech Jessadarom**.

## [1.0.0] — 2026-10-29

First public release 🎉

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
