import { invoke } from "@tauri-apps/api/core";

export interface DiscoveredFileDto {
  absolutePath: string;
  relativePath: string;
  fileName: string;
  extension: string;
  sizeBytes: number;
  modifiedAtMs: number;
}

declare global {
  interface Window {
    __STACKDROP_E2E__?: {
      pickFolder?: () => string | null;
      discoverSupportedFiles?: (rootPath: string) => DiscoveredFileDto[];
      readFileUnderRoot?: (rootPath: string, absolutePath: string) => Uint8Array | number[] | null;
    };
  }
}

export async function invokeOpenFolderDialog(): Promise<string | null> {
  if (import.meta.env.VITE_E2E_SQLITE === "1" && typeof window !== "undefined") {
    return window.__STACKDROP_E2E__?.pickFolder?.() ?? null;
  }
  return invoke<string | null>("open_folder_dialog");
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
