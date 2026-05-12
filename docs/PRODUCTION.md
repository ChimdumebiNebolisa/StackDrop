# Production readiness (desktop)

## Build / package

```bash
npm install
npm run build        # web assets → dist/
cd src-tauri && cargo build --release   # native binary
```

For a full installer, use the Tauri bundler (configured in `src-tauri/tauri.conf.json`): `npm run tauri build`.

## Runtime logging

- `console.info("[StackDrop]", …)` is emitted after each folder scan and full-library scan with **counts only** (no paths or file contents). See [`src/lib/log.ts`](../src/lib/log.ts).
- Verbose debug logs are **dev-only** (`import.meta.env.DEV`).

## Health

- Tauri command `app_health` returns `{ ok, packageVersion }`.
- The Documents screen calls this once on load to show shell readiness next to the title when available.

## Docker

Not used. Reproducibility is covered by pinned `package.json` / `Cargo.toml` and documented commands in [`README.md`](../README.md).

## Monitoring

No HTTP health endpoint. For support, collect `app_health` output + the latest scan summary from logs.
