# Environment variables

StackDrop uses **Vite** env flags only where needed for automation.

| Variable | Where | Purpose |
|----------|--------|---------|
| `VITE_E2E_SQLITE` | Playwright / CI | When set to `1`, the app uses an in-memory **sql.js** database and `window.__STACKDROP_E2E__` shims instead of real Tauri invokes for filesystem, credential, and summary operations. See [`playwright.config.ts`](../playwright.config.ts). |
| *(built-in)* `import.meta.env.DEV` | Dev server | Enables verbose `logDebug` output in [`src/lib/log.ts`](../src/lib/log.ts). |

**Secrets:** no development environment secret is required. Do not put OpenAI keys in `VITE_*`, `.env`, or `.env.local`; Vite values ship in the client bundle and StackDrop intentionally does not read environment keys. Users enter their key in Settings, and native Rust stores it in Windows Credential Manager. Automated web tests use fake in-memory hooks and never call OpenAI.

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
