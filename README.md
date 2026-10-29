# WJ DB Studio

<p align="center">
  <img src="build/icon.png" width="96" alt="WJ DB Studio logo">
</p>

**A fast, modern, zero-setup database manager for MySQL and MariaDB.**

Developed by **Weeradech Jessadarom**

[![Release](https://img.shields.io/badge/release-v1.0.0-blue)](../../releases)
[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey)](../../releases)

---

## ✨ Highlights

| | |
|---|---|
| 🚀 **Zero setup** | Portable `.exe` — download, run, done. No installer required. |
| 🎨 **Modern UI** | Clean dark/light theme, clear icons for every section, Thai 🇹🇭 / English 🇬🇧 |
| ⚡ **Fast** | Streamed exports, batched imports, paginated grids, connection pooling |
| 🔐 **Safe** | Passwords encrypted with the OS keychain (DPAPI/Keychain). **No telemetry. No cloud.** |
| 🧭 **Helpful** | Context-sensitive help (F1), first-run tour, error doctor that explains MySQL errors in plain language |
| 🔄 **Auto update** | Checks GitHub Releases and installs updates in-app (optional) |

## 📦 Features

- **Connection manager** — unlimited saved connections with groups, SSL/TLS (custom CA), SSH tunnels, one-click test
- **Object explorer** — databases, tables, views, stored procedures, functions, triggers, events with row counts & sizes
- **SQL editor** — syntax highlighting, schema-aware autocomplete (Ctrl+Space), multi-statement execution, result tabs, query history, snippets, SQL formatter
- **Data grid** — browse with WHERE filter, sort, paginate; inline edit (INSERT/UPDATE/DELETE with PK safety), NULL handling, copy as JSON/INSERT
- **Table designer** — create/alter columns, primary keys, indexes, foreign keys with generated-SQL preview
- **Import** — CSV/TSV (delimiter & header options), JSON arrays, raw `.sql` scripts
- **Export** — CSV, JSON, SQL INSERTs; streamed to disk for large tables
- **Backup** — mysqldump-style `.sql` backup (schema + data + views) for a table or a whole database; restore via import
- **Server tools** — dashboard (version/uptime/connections/sizes), process list with KILL, server variables & status search
- **Users & privileges** — create/drop users, set passwords, global GRANT editor
- **Full config system** — theme, language, fonts, page size, timeouts, confirmation policy; stored locally
- **Bilingual UI** — Thai and English, switchable instantly

## 🚀 Quick start

1. Download the latest **`WJ-DB-Studio-x.y.z-Portable.exe`** (or the installer) from [**Releases**](../../releases).
2. Run it. Click **Connect** → enter your MySQL/MariaDB details → **Test** → **Save**.
3. Double-click the connection in the sidebar, expand a database, double-click a table. That's it.

> Requirements: none on the client machine — you only need network access to your database server.

## ⌨️ Essential shortcuts

| Keys | Action |
|---|---|
| `Ctrl+T` | New query tab |
| `Ctrl+Enter` | Execute SQL |
| `Ctrl+Shift+Enter` | Execute selection only |
| `Ctrl+Space` | Autocomplete |
| `Ctrl+/` | Comment lines |
| `F1` | Help panel |
| `F5` | Refresh |
| `Ctrl+,` | Settings |

Full list in-app: **Help → Keyboard Shortcuts**.

## 📖 Documentation

- [คู่มือผู้ใช้ (ภาษาไทย)](docs/USER_GUIDE.th.md)
- [User Guide (English)](docs/USER_GUIDE.en.md)
- [Feature list](docs/FEATURES.md)
- [Roadmap](docs/ROADMAP.md)
- [Building from source](docs/BUILD.md)
- [Security notes](docs/SECURITY.md)
- [Changelog](CHANGELOG.md)

## 🛠 Development

```bash
npm install     # install dependencies
npm start       # run the app in dev mode
npm run selftest
npm run dist    # build Windows installer + portable exe
```

See [docs/BUILD.md](docs/BUILD.md) for release automation via GitHub Actions.

## 🤝 Contributing

Issues and pull requests are welcome. Keep PRs small and focused.

## 📄 License

[MIT](LICENSE) © 2026 **Weeradech Jessadarom**
