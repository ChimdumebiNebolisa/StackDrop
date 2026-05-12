import { readFile } from "@tauri-apps/plugin-fs";

export async function readSourceFileBytes(filePath: string): Promise<Uint8Array> {
  if (import.meta.env.VITE_E2E_SQLITE === "1" && typeof window !== "undefined") {
    const bytes = window.__STACKDROP_E2E__?.readFile?.(filePath);
    if (bytes) {
      return bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
    }
  }

  return readFile(filePath);
}
