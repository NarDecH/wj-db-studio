# WJ DB Studio — User Guide (English)

> A fast, modern, zero-setup manager for MySQL and MariaDB.
> Developed by **Weeradech Jessadarom** · License: MIT
> คู่มือภาษาไทย: [USER_GUIDE.th.md](USER_GUIDE.th.md)

## 1. Installation

No setup required. Grab a file from [Releases](https://github.com/weeradech/wj-db-studio/releases):

| File | Best for |
|---|---|
| `WJ-DB-Studio-x.y.z-Portable.exe` | Run immediately, no install (works from a USB stick) |
| `WJ DB Studio Setup x.y.z.exe` | Permanent install with desktop shortcut |

Settings and connections are stored in `%APPDATA%\WJ DB Studio\config.json`.

## 2. Connecting

1. Click **Connect** on the toolbar or **+** in the sidebar.
2. Fill in **Name, Host, Port, Username, Password**.
   - **SSL/TLS** — encrypt the connection (optional CA file).
   - **SSH Tunnel** — reach databases behind an SSH bastion (password or private key).
3. Click **Test**, then **Save**.
4. **Double-click** the connection in the sidebar to open it (green dot = connected).

> 💡 When something fails, the built-in *error doctor* shows a plain-language hint under the error.

## 3. Browsing objects

Sidebar tree: connection → databases → (tables / views / procedures / functions / triggers / events).

- Click **arrows** to expand, **double-click a table** to open its data.
- **Right-click** anything for: DDL, table designer, import, backup, truncate, drop, rename.
- The search box filters objects across the tree.
- Create a database with the **New database** row under the database list.

## 4. Writing SQL

- **Ctrl+T** opens a query tab.
- **Ctrl+Enter** executes; **Ctrl+Shift+Enter** executes only the selection.
- Multiple statements separated by `;` run together — each result gets its own tab.
- **Ctrl+Space** autocompletes keywords, table names and columns (from live schema).
- **Ctrl+/** comments the selected lines.
- The **Format SQL** button pretty-prints the statement.
- Bottom panel: **Messages** (log), **History** (click to reuse), **Snippets** (saved queries), **SQL Log** (full audit — see §10).

## 5. Editing data

In a table view:

- Type a raw **WHERE** into the filter box: `price > 100 AND status = 1`.
- Click column headers to sort.
- **Double-click a cell** to edit, Enter to commit.
- **Add Row / Delete Row** buttons; a yellow badge counts pending changes.
- Press **Apply Changes** to write everything (UPDATE/INSERT/DELETE keyed by Primary Key; PK-less tables match all columns).
- Empty cell = NULL. Right-click a cell to copy value / row JSON / INSERT statement.

## 6. Table designer

Right-click a table → **Table Designer** (or create a new one from the database):

- Columns: name, type, NULL, default, auto-increment, comment.
- Tick the first box to include a column in the **Primary Key**.
- Indexes (optionally UNIQUE) and Foreign Keys with ON DELETE / ON UPDATE actions.
- **Preview SQL** before **Apply**.

## 7. Import / Export / Backup

### Import
- **CSV/TSV**: delimiter (`,` `;` TAB `|`), first-row headers, optional truncate-first.
- **JSON**: an array of objects.
- **SQL**: run a whole `.sql` file (also how you restore a backup).

### Export
- From query results or an open table → CSV / JSON / SQL INSERTs.
- Server-side export **streams to disk**, so multi-million-row tables are fine.

### Backup
- Pick a database (leave tables empty for all), choose schema/data/views → a mysqldump-style `.sql` file.

## 8. Server tools

- **Server** dashboard: version, flavor, uptime, connections, per-database sizes.
- **Process List**: right-click to **Kill** a connection or **Kill Query**.
- **Variables / Status**: searchable list of all server variables.
- **Users**: create/drop users, set passwords, inspect and grant global privileges.

## 9. Settings (Ctrl+,)

Language (TH/EN) · theme · UI & editor font sizes · rows per page · query timeout · auto-update · destructive-action confirmation · autocomplete · SQL Log on/off + retention.

## 10. SQL Log — full statement audit

Every SQL statement the app executes (editor queries, grid edits, tree DDL operations,
import/export/backup summaries, connect/disconnect) is recorded automatically:

- Files: `%APPDATA%\WJ DB Studio\logs\sql-YYYY-MM-DD.log` (one JSONL file per day)
- In-app: bottom panel → **SQL Log** tab (text filter, "errors only" toggle, click to copy SQL)
- Open folder: **Tools → SQL Log** menu
- Privacy: parameterized statement **values are never written** — only the statement with `?` and a value count
- Settings: on/off + retention days (default 30, pruned at startup)

## 11. Extra features (v1.1)

- **Find in database** (toolbar "Find"): search one value across every table, click a match to copy as JSON.
- **Transfer table between connections** (Tools menu): any source → any target server, schema auto-created, rows streamed in batches.
- **Auto-create table on import**: tick it when importing CSV/Excel — column types are inferred and an `id` PK is added.
- **Read-only connection**: rejects every write (grid + SQL editor) — enforced in the main process.
- **ER Diagram**: right-click a database → tables, columns and FK lines, zoomable.
- **Session restore**: SQL tabs, open tables and the last connection come back on relaunch.
- Rename table (right-click), duplicate connection, dark/light toolbar toggle, keep-alive with auto-reconnect.

## 12. Security notes

- Passwords are encrypted with the OS keychain (Electron safeStorage → DPAPI on Windows) and never leave the machine.
- No telemetry, no analytics, no network calls except to your database servers and GitHub update checks.
- Grid edits use parameterized statements.

## 13. Troubleshooting

| Symptom | Fix |
|---|---|
| `Access denied` | Check user/password and the user's `Host` column (`%` vs specific IP). |
| `ECONNREFUSED` | Server not running or wrong port; check `bind-address`. |
| Timeout | Firewall/network, or raise the timeout in Settings. |
| `Unknown database` | Create it first (New database). |
| Frequent disconnects | Server `wait_timeout` — just reconnect from the sidebar. |
| Thai text shows `???` | Use `utf8mb4` charset when creating tables/databases. |
