# AGENTS.md

## Cursor Cloud specific instructions

### Overview

StackDrop is a local-first Tauri v2 + React desktop document indexer. SQLite + FTS5 powers search and document metadata. Indexing and search remain local, and there is no account or auth system. The only remote product boundary is an optional, explicit selected-document summary request using the user's own OpenAI API key.

### Development modes

| Mode | Command | Notes |
|------|---------|-------|
| Web UI only | `npm run dev:web` | Vite on `127.0.0.1:1420`. Requires `VITE_E2E_SQLITE=1` env to use sql.js-fts5 fallback for DB (otherwise shows "Loading database..." since Tauri native plugins aren't available). |
| Full desktop | `npm run dev` | Tauri + Vite. Requires Linux GTK/WebKit system libs. |

### Running tests

- `npm run typecheck` — TypeScript type check
- `npm run test` — Vitest unit + integration tests (uses `better-sqlite3` for test harness)
- `npm run test:e2e` — Playwright e2e (auto-starts Vite with `VITE_E2E_SQLITE=1`)
- `cd src-tauri && cargo test` — Rust unit tests

### Important caveats

- The Rust toolchain must be **stable 1.95+** (the Cargo.lock pins crates requiring edition 2024). If `cargo test` fails with "feature `edition2024` is required", run `rustup default stable` to pick up the latest installed stable.
- `npm run dev:web` without `VITE_E2E_SQLITE=1` will stall at "Loading database..." because the web fallback path only activates with that env var. The e2e Playwright config sets this automatically.
- System packages required for Tauri Linux builds/tests: `libgtk-3-dev`, `libwebkit2gtk-4.1-dev`, `libsoup-3.0-dev`, `libjavascriptcoregtk-4.1-dev`.
- Optional system packages for full doc parsing: `antiword`, `tesseract-ocr`, `poppler-utils`.
- Playwright needs Chromium installed: `npx playwright install chromium`.
- Document summaries must remain opt-in: only prepared extracted text from the selected document plus filename, relative path, and extension may be transmitted after **Generate summary** is chosen.
- OpenAI credentials must be stored and retrieved through native OS credential storage. Never return a saved key to JavaScript or persist it in SQLite, browser storage, configuration, or environment files.
- Automated tests must mock credential access and OpenAI requests through `window.__STACKDROP_E2E__`; tests must never call the real API.

### Standard commands reference

See `README.md` for build/run/test commands and `scripts/setup-cloud-agent-env.sh` for the full cloud/CI bootstrap script.
