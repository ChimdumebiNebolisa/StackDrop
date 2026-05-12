import { vi } from "vitest";

vi.mock("@tauri-apps/plugin-fs", async () => {
  const { readFile: readFileNode } = await import("node:fs/promises");
  return {
    readFile: async (path: string | URL) => {
      const target = typeof path === "string" ? path : path.toString();
      return new Uint8Array(await readFileNode(target));
    },
  };
});
