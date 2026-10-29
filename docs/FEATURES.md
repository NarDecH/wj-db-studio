# WJ DB Studio — Feature List

Complete capability map. Developed by **Weeradech Jessadarom**.

## Connections
- [x] Unlimited saved profiles with groups and colors of usage (last-used sorting)
- [x] MySQL **and** MariaDB (auto flavor detection), Percona/Aurora labeling
- [x] SSL/TLS with optional CA certificate file
- [x] SSH tunnel (password or private-key auth) via local port forwarding
- [x] Test-before-save, OS-encrypted passwords (safeStorage/DPAPI)
- [x] Single-instance app, reconnect handling

## Object explorer
- [x] Databases with size & table counts
- [x] Tables, views (rows estimate, engine, size), procedures, functions, triggers, events
- [x] Object filter search
- [x] Context menus: DDL view, designer, import/export/backup, truncate, drop, rename
- [x] Create database dialog with charset/collation (incl. `tis620`, `utf8mb4_thai_520_ci`)

## SQL editor
- [x] Syntax highlighting (keywords, functions, types, strings, comments, numbers, identifiers)
- [x] Schema-aware autocomplete (Ctrl+Space + auto popup): keywords, functions, types, tables, columns
- [x] Multi-statement execution with per-result tabs
- [x] Execute selection only (Ctrl+Shift+Enter)
- [x] Line commenting (Ctrl+/), Tab indent
- [x] Basic SQL formatter
- [x] Result grids with sorting, export, row counts and timings
- [x] Query history (300 entries, click-to-reuse)
- [x] Saved snippets (create/reuse/delete)
- [x] Position indicator (Ln/Col) in tab title

## Data grid
- [x] Paginated browsing (configurable page size), WHERE filter, ORDER BY
- [x] Inline cell editing with type coercion, NULL via empty value
- [x] Add / delete rows, dirty-change badge, batch apply with confirmation
- [x] Primary-key-aware UPDATE/DELETE (all-columns fallback for PK-less tables)
- [x] Copy cell / row JSON / generated INSERT
- [x] Row count, page navigation, timings

## Table designer
- [x] Create & alter tables
- [x] Columns: name/type/NULL/default/auto-increment/comment, drop
- [x] Primary key editor, indexes (UNIQUE), foreign keys (ON DELETE/ON UPDATE)
- [x] Engine & charset, table comment, rename
- [x] Generated SQL preview before apply

## Import / Export / Backup
- [x] Import CSV/TSV (delimiters `,` `;` TAB `|`, headers toggle, truncate-first)
- [x] Import JSON arrays
- [x] Run `.sql` script files (statement splitter honoring strings/comments/DELIMITER)
- [x] Export CSV / JSON / SQL INSERTs, **streamed** to disk (handles very large tables)
- [x] Batched INSERTs on import (300/batch) for speed
- [x] mysqldump-style backup: schema + data + views, per-table or full database

## Server administration
- [x] Dashboard: version, flavor, uptime, connections, queries served, DB sizes
- [x] Process list with KILL / KILL QUERY (context menu, confirmation)
- [x] Global variables & status counters with search
- [x] Users: create/drop, set password, view grants, grant global privileges

## Help & assistance (automatic)
- [x] F1 help panel with searchable bilingual topics
- [x] First-run welcome tour
- [x] Tooltips on every control
- [x] **Error doctor** — maps ~12 common MySQL error classes to friendly bilingual advice
- [x] Empty-state guidance (e.g., no connections yet)

## Config & updates
- [x] Settings: language, theme, font sizes, page size, timeout, auto-update, confirmations, autocomplete
- [x] Atomic config writes, forward-compatible schema (defaults merge)
- [x] Auto-update via GitHub Releases (electron-updater): check → download → install & restart
- [x] Bilingual native menus

## Platform & packaging
- [x] Windows (NSIS installer + portable exe), Linux AppImage, macOS dmg (x64/arm64) via CI
- [x] No external runtime required by users
- [x] CSP-hardened renderer (no remote content, context-isolated, sandboxed)

## Roadmap (post-1.0 ideas)
- [ ] ER diagram viewer
- [ ] Query profiler / visual EXPLAIN
- [ ] Multi-database data transfer (cross-server copy)
- [ ] Scheduled backups
- [ ] Dark/light auto (system) scheduling
- [ ] Plugin/extension hooks
