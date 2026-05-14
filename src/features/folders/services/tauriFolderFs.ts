import { invoke } from "@tauri-apps/api/core";

/**
 * Thin typed adapters for Tauri `invoke` calls (the app’s public “API” surface).
 *
 * | Rust command | TS wrapper |
 * |--------------|------------|
 * | `open_folder_dialog` | `invokeOpenFolderDialog` |
 * | `get_default_document_roots` | `invokeDefaultDocumentRoots` |
 * | `discover_supported_files` | `invokeDiscoverSupportedFiles` |
 * | `read_file_bytes_under_root` | `invokeReadFileBytesUnderRoot` |
 * | `app_health` | `invokeAppHealth` |
 *
 * When `VITE_E2E_SQLITE=1`, reads route through `window.__STACKDROP_E2E__` so Playwright can run without a native shell.
 *
 * Full contract tables: `docs/API.md` (repo root).
 */
export interface DiscoveredFileDto {
  absolutePath: string;
  relativePath: string;
  fileName: string;
  extension: string;
  sizeBytes: number;
  modifiedAtMs: number;
}

type E2EWatchFoldersHook = (paths: string[], onDirtyRoot: (rootPath: string) => void) => void | (() => void);

declare global {
  interface Window {
    __STACKDROP_E2E__?: {
      pickFolder?: () => string | null;
      defaultDocumentRoots?: () => string[];
      discoverSupportedFiles?: (rootPath: string) => DiscoveredFileDto[];
      readFileUnderRoot?: (rootPath: string, absolutePath: string) => Uint8Array | number[] | null;
      ocrPdfTextUnderRoot?: (rootPath: string, absolutePath: string) => string;
      extractDocTextUnderRoot?: (rootPath: string, absolutePath: string) => string;
      watchFolders?: E2EWatchFoldersHook;
    };
  }
}

export async function invokeOpenFolderDialog(): Promise<string | null> {
  if (import.meta.env.VITE_E2E_SQLITE === "1" && typeof window !== "undefined") {
    return window.__STACKDROP_E2E__?.pickFolder?.() ?? null;
  }
  return invoke<string | null>("open_folder_dialog");
}

export interface DefaultDocumentRootDto {
  label: string;
  path: string;
}

export interface AppHealthDto {
  ok: boolean;
  packageVersion: string;
}

export async function invokeDefaultDocumentRoots(): Promise<DefaultDocumentRootDto[]> {
  if (import.meta.env.VITE_E2E_SQLITE === "1" && typeof window !== "undefined") {
    const paths = window.__STACKDROP_E2E__?.defaultDocumentRoots?.() ?? ["C:\\stackdrop-e2e-root"];
    return paths.map((path) => ({ path, label: "E2E" }));
  }
  return invoke<DefaultDocumentRootDto[]>("get_default_document_roots");
}

export async function invokeAppHealth(): Promise<AppHealthDto> {
  if (import.meta.env.VITE_E2E_SQLITE === "1" && typeof window !== "undefined") {
    return { ok: true, packageVersion: "e2e" };
  }
  return invoke<AppHealthDto>("app_health");
}

export async function invokeDiscoverSupportedFiles(rootPath: string): Promise<DiscoveredFileDto[]> {
  if (import.meta.env.VITE_E2E_SQLITE === "1" && typeof window !== "undefined") {
    const fn = window.__STACKDROP_E2E__?.discoverSupportedFiles;
    if (fn) return fn(rootPath);
  }
  return invoke<DiscoveredFileDto[]>("discover_supported_files", { rootPath });
}

export async function invokeReadFileBytesUnderRoot(rootPath: string, absolutePath: string): Promise<Uint8Array> {
  if (import.meta.env.VITE_E2E_SQLITE === "1" && typeof window !== "undefined") {
    const raw = window.__STACKDROP_E2E__?.readFileUnderRoot?.(rootPath, absolutePath);
    if (!raw) {
      throw new Error("E2E readFileUnderRoot returned no data.");
    }
    return raw instanceof Uint8Array ? raw : new Uint8Array(raw);
  }
  const bytes = await invoke<number[]>("read_file_bytes_under_root", { rootPath, absolutePath });
  return new Uint8Array(bytes);
}

export async function invokeOcrPdfTextUnderRoot(rootPath: string, absolutePath: string): Promise<string> {
  if (import.meta.env.VITE_E2E_SQLITE === "1" && typeof window !== "undefined") {
    return window.__STACKDROP_E2E__?.ocrPdfTextUnderRoot?.(rootPath, absolutePath) ?? "";
  }
  return invoke<string>("ocr_pdf_under_root", { rootPath, absolutePath });
}

export async function invokeExtractDocTextUnderRoot(rootPath: string, absolutePath: string): Promise<string> {
  if (import.meta.env.VITE_E2E_SQLITE === "1" && typeof window !== "undefined") {
    return window.__STACKDROP_E2E__?.extractDocTextUnderRoot?.(rootPath, absolutePath) ?? "";
  }
  return invoke<string>("extract_doc_text_under_root", { rootPath, absolutePath });
}
