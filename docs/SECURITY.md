# Security Notes — WJ DB Studio

Developed by **Weeradech Jessadarom**.

## Data the app stores (all local)

| Data | Where | Protection |
|---|---|---|
| Settings, snippets, query history | `%APPDATA%\WJ DB Studio\config.json` | plain JSON (no secrets inside) |
| Database passwords | same file, `passwordEnc` field | **OS-encrypted** via Electron `safeStorage` (Windows: DPAPI tied to the user account; macOS: Keychain; Linux: libsecret) |
| SSH passwords | same file, `ssh.passwordEnc` | same encryption |

- Nothing is ever sent to any third-party service. No telemetry, no crash reporting, no analytics.
- The only outbound traffic: your configured database/SSH servers, and HTTPS calls to **GitHub Releases** when you use update checks (can be disabled in Settings).

## Renderer hardening

- `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`
- Strict Content-Security-Policy: no remote scripts, no remote fonts/images, no `connect-src`
- Renderer talks to the backend only through a whitelisted `contextBridge` API
- All navigation to external links goes through `shell.openExternal` with an `https?` scheme check

## SQL safety model

- Grid edits (UPDATE/INSERT/DELETE) use **parameterized statements** (`?` placeholders).
- Identifiers (table/column names) are escaped with backtick-quoting.
- The SQL editor deliberately sends user-written SQL verbatim — it is a database *admin* tool; anyone using it already has the credentials' full power.
- Destructive actions (DROP / TRUNCATE / KILL) require explicit confirmation dialogs (configurable).

## Reporting a vulnerability

Please open a private security advisory on GitHub or contact the maintainer. Do not open public issues for security problems.
