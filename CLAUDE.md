# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

"Gior" — a personal productivity Electron desktop app (tasks/pomodoro, accounting/ledger, recipes, notes, reminders). Stack: `electron-vite`, React 18 + TypeScript renderer, `sql.js` (SQLite compiled to WASM) for persistence, `i18next` for translations. Windows desktop target (NSIS installer via `electron-builder`, config in `electron-builder.yml`).

## Commands

- `npm run dev` — start in dev mode
- `npm run build` — build all three targets (main/preload/renderer)
- `npm run dist` — build + package with electron-builder
- `npm run release` — build + package + publish to GitHub Releases
- `npm run lint` — ESLint (flat config in `eslint.config.js`, TypeScript + React rules)

There is no `typecheck` or `test` script. **To verify TypeScript correctness after changes, run `npx electron-vite build`** — it compiles main, preload, and renderer through esbuild/vite and surfaces type errors across all three. A bare `tsc` will not work since the root `tsconfig.json` is a references-only shell (`tsconfig.node.json` covers main/preload/shared, `tsconfig.web.json` covers the renderer). No formatter is configured.

## Architecture

- `src/main/` — Electron main process, one file per domain (`ledger.ts`, `tasks.ts`, `pomodoro.ts`, `db.ts`, etc.), all IPC handlers registered in `src/main/index.ts`.
- `src/preload/index.ts` — single file exposing `window.api.<domain>.<method>()` via `contextBridge`; every method is `ipcRenderer.invoke('domain:method', ...)`.
- `src/renderer/src/` — React UI (`components/`, `lib/`, `locales/`, `styles/`).
- `src/shared/` — types/constants imported by both main and renderer.

**IPC convention**: channel strings are `'domain:method'`, matching `window.api.domain.method()` 1:1 (e.g. `'tasks:toggle'` ↔ `window.api.tasks.toggle()`). Adding a new IPC call means adding it in all three places: `main/index.ts` (`ipcMain.handle`), `preload/index.ts` (bridge method), and the shared type if new input/output shapes are involved. Handlers generally return `{ ok: boolean; error?: string }`, sometimes with extra fields.

**Database (`src/main/db.ts`)**: `sql.js` keeps the entire DB in memory; there is no incremental/transactional disk write. `persistDb()` serializes the whole in-memory DB to disk and **must be called explicitly after every mutation** (`db.run(...)`) or the change is lost on next load/crash. There is no formal migration/versioning system — schema changes require two things: (1) add the column/table to the relevant `CREATE TABLE IF NOT EXISTS` block for fresh installs, AND (2) add a corresponding `ensureColumn(db, table, column, definition)` call (or, for more invasive changes, the rename-old-table → create-new → copy-data → drop-old pattern used in e.g. `migrateRecurringTasksFrequencyCheck`) so existing users' on-disk DBs get upgraded on next launch.

**i18n**: locale files are `src/renderer/src/locales/{es,en,fr,pt}.json`. Any user-facing string change must be applied to all four files to stay in sync.

## Conventions

- No emojis anywhere in code or UI text.
- Windows path handling: always use `join()` from `'path'`; no manual backslash concatenation anywhere in the codebase.
