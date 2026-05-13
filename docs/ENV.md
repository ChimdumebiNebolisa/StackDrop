# Environment variables

StackDrop uses **Vite** env flags only where needed for automation.

| Variable | Where | Purpose |
|----------|--------|---------|
| `VITE_E2E_SQLITE` | Playwright / CI | When set to `1`, the app uses an in-memory **sql.js** database and `window.__STACKDROP_E2E__` shims instead of real Tauri invokes for filesystem operations. See [`playwright.config.ts`](../playwright.config.ts). |
| *(built-in)* `import.meta.env.DEV` | Dev server | Enables verbose `logDebug` output in [`src/lib/log.ts`](../src/lib/log.ts). |

**Secrets:** none required. Do not put API keys in `VITE_*` variables (they would ship to the client bundle). This app does not call remote backends.

## Cloud agent bootstrap

For a fresh cloud machine, run:

```bash
./scripts/setup-cloud-agent-env.sh
```

This installs the local/offline tooling required by this repo:

- Playwright Chromium
- Rust stable + `x86_64-pc-windows-msvc` target
- `cargo-xwin`
- LLVM tools (`llvm-lib`, `llvm-rc`, `clang-cl`)
- GTK/WebKit Linux dependencies for Tauri
- NSIS
- OCR + legacy `.doc` parsers (`tesseract-ocr`, `poppler-utils`, `antiword`)
