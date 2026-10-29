# Building WJ DB Studio from source

Developed by **Weeradech Jessadarom**. MIT licensed.

## Prerequisites

- **Node.js 20+** (LTS recommended) — https://nodejs.org
- npm (bundled with Node)
- No compilers needed: `mysql2` and `ssh2` ship prebuilt/pure-JS code.

## One-time setup

```bash
git clone https://github.com/NarDecH/wj-db-studio.git
cd wj-db-studio
npm install
```

## Run in development

```bash
npm start
```

The app opens with the dev flag; auto-update is disabled in dev builds.

Sanity check without opening a visible window:

```bash
npm run selftest
```

## Build installers

```bash
npm run dist            # Windows: NSIS installer + portable exe
npm run dist:portable   # Windows portable only
npm run dist:linux      # AppImage
npm run dist:mac        # dmg (x64 + arm64)  [needs macOS]
npm run dist:all        # all platforms (mac target needs macOS)
```

Output lands in `dist/`:

- `WJ DB Studio Setup <ver>.exe` — NSIS installer
- `WJ-DB-Studio-<ver>-Portable.exe` — portable, zero-setup
- `WJ DB Studio-<ver>.AppImage` / `.dmg`

> **Note:** the first build downloads the Electron binary (~110 MB) once; it is cached.

## Publishing a release (GitHub Actions)

1. Edit the `publish` block in `package.json` → set `owner`/`repo` to **your** GitHub repository.
2. Commit and push.
3. Create a version tag and push it:

```bash
git tag v1.0.1
git push origin v1.0.1
```

4. GitHub Actions (`.github/workflows/release.yml`) builds all platforms and publishes the release with assets attached automatically. electron-updater then finds new versions by repository metadata.

The workflow needs no extra secrets — `GITHUB_TOKEN` is provided by Actions.

## Project layout

```
main/          Electron main process (Node.js)
  main.js      app lifecycle, window, IPC routing
  db.js        MySQL/MariaDB engine (mysql2 pools, SSH tunnel, import/export/backup)
  store.js     config + connections + encrypted passwords
  preload.js   contextBridge API (renderer has no Node access)
  appmenu.js   native menus & accelerators
  updater.js   electron-updater integration
src/           Renderer (plain ES modules, no build step)
  app.js       shell: toolbar, tabs, panels
  tree.js      object explorer
  editor.js    SQL editor (highlight/autocomplete/execution)
  grid.js      data grid + table data view
  designer.js  table designer
  importer.js  import/export/backup dialogs
  servertools.js dashboard/processlist/variables/users
  i18n.js      Thai/English strings + error doctor
  help.js      help panel + tour
scripts/       icon generator (pure stdlib Python)
build/         packaging resources (icon)
docs/          guides
```

## Releasing checklist

1. Bump `version` in `package.json`.
2. Update `CHANGELOG.md`.
3. `npm run selftest` passes.
4. Commit, tag `vX.Y.Z`, push — CI does the rest.
