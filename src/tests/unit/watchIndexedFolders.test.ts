import { watch, type WatchEvent } from "@tauri-apps/plugin-fs";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { IndexedFolderRecord } from "../../domain/documents/types";
import { watchIndexedFolders } from "../../features/folders/services/watchIndexedFolders";
import { invokeDiscoverSupportedFiles } from "../../features/folders/services/tauriFolderFs";

vi.mock("@tauri-apps/plugin-fs", () => ({
  watch: vi.fn(),
}));

vi.mock("../../features/folders/services/tauriFolderFs", () => ({
  invokeDiscoverSupportedFiles: vi.fn(),
}));

const folder: IndexedFolderRecord = {
  id: "folder-1",
  rootPath: "C:\\fixture-root",
  createdAt: "2026-06-28T00:00:00.000Z",
  lastScanAt: "2026-06-28T00:01:00.000Z",
  lastError: null,
  lastErrorAt: null,
};

describe("watchIndexedFolders", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("registers the native watcher before initial poll signature discovery resolves", async () => {
    vi.useFakeTimers();
    let nativeCallback: ((event: WatchEvent) => void) | undefined;
    const unwatch = vi.fn();
    vi.mocked(watch).mockImplementation(async (_rootPath, callback) => {
      nativeCallback = callback;
      return unwatch;
    });
    vi.mocked(invokeDiscoverSupportedFiles).mockImplementation(() => new Promise(() => undefined));
    const onFolderDirty = vi.fn();

    const stop = await watchIndexedFolders([folder], { onFolderDirty });

    expect(watch).toHaveBeenCalledWith(folder.rootPath, expect.any(Function), { recursive: true, delayMs: 450 });
    expect(nativeCallback).toBeDefined();

    nativeCallback?.({
      paths: ["C:\\fixture-root\\created.txt"],
      type: "create",
      attrs: {},
    } as unknown as WatchEvent);
    await vi.advanceTimersByTimeAsync(1200);

    expect(onFolderDirty).toHaveBeenCalledWith(folder);

    await stop();
    expect(unwatch).toHaveBeenCalled();
  });
});
