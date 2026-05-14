import { watch, type UnwatchFn } from "@tauri-apps/plugin-fs";

import type { IndexedFolderRecord } from "../../../domain/documents/types";

interface WatchOptions {
  onFolderDirty: (folder: IndexedFolderRecord) => void;
}

const SUPPORTED_EXTENSIONS = new Set(["txt", "pdf", "docx", "doc"]);
const FOLDER_RESCAN_DEBOUNCE_MS = 1200;
const FS_EVENT_DEBOUNCE_MS = 450;

function extensionOf(path: string): string | null {
  const dot = path.lastIndexOf(".");
  if (dot < 0 || dot === path.length - 1) return null;
  return path.slice(dot + 1).toLowerCase();
}

function eventTouchesSupportedFile(paths: string[]): boolean {
  if (paths.length === 0) return true;
  return paths.some((path) => {
    const ext = extensionOf(path);
    if (!ext) return false;
    return SUPPORTED_EXTENSIONS.has(ext);
  });
}

export async function watchIndexedFolders(
  folders: IndexedFolderRecord[],
  options: WatchOptions,
): Promise<() => Promise<void>> {
  if (folders.length === 0) {
    return async () => {};
  }

  if (import.meta.env.VITE_E2E_SQLITE === "1" && typeof window !== "undefined") {
    const roots = folders.map((f) => f.rootPath);
    const byRoot = new Map(folders.map((f) => [f.rootPath, f]));
    const unwatch = window.__STACKDROP_E2E__?.watchFolders?.(roots, (rootPath) => {
      const folder = byRoot.get(rootPath);
      if (folder) options.onFolderDirty(folder);
    });
    return async () => {
      if (typeof unwatch === "function") unwatch();
    };
  }

  const unwatchers: UnwatchFn[] = [];
  const rescanTimers = new Map<string, ReturnType<typeof setTimeout>>();

  for (const folder of folders) {
    const unwatch = await watch(
      folder.rootPath,
      (event) => {
        if (!eventTouchesSupportedFile(event.paths)) return;
        const existing = rescanTimers.get(folder.id);
        if (existing) clearTimeout(existing);
        const timer = setTimeout(() => {
          rescanTimers.delete(folder.id);
          options.onFolderDirty(folder);
        }, FOLDER_RESCAN_DEBOUNCE_MS);
        rescanTimers.set(folder.id, timer);
      },
      { recursive: true, delayMs: FS_EVENT_DEBOUNCE_MS },
    );
    unwatchers.push(unwatch);
  }

  return async () => {
    for (const timer of rescanTimers.values()) {
      clearTimeout(timer);
    }
    rescanTimers.clear();
    for (const unwatch of unwatchers) {
      unwatch();
    }
  };
}
