/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** When `"1"`, use in-memory SQLite (Playwright / browser without Tauri). */
  readonly VITE_E2E_SQLITE?: string;
}
