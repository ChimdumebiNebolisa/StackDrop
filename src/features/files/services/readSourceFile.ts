import { readFile } from "@tauri-apps/plugin-fs";

export async function readSourceFileBytes(filePath: string): Promise<Uint8Array> {
  return readFile(filePath);
}
