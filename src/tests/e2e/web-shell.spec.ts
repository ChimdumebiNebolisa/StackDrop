import { expect, test, type Page } from "@playwright/test";

declare global {
  interface Window {
    __STACKDROP_E2E__?: {
      pickFolder?: () => string | null;
      discoverSupportedFiles?: (rootPath: string) => Array<{
        absolutePath: string;
        relativePath: string;
        fileName: string;
        extension: string;
        sizeBytes: number;
        modifiedAtMs: number;
      }>;
      readFileUnderRoot?: (rootPath: string, absolutePath: string) => Uint8Array | number[] | null;
    };
  }
}

async function installFolderScanShim(page: Page) {
  await page.addInitScript(() => {
    const encoder = new TextEncoder();
    window.__STACKDROP_E2E__ = {
      pickFolder: () => "C:\\stackdrop-e2e-root",
      discoverSupportedFiles: (rootPath: string) => [
        {
          absolutePath: `${rootPath}\\doc.txt`,
          relativePath: "doc.txt",
          fileName: "doc.txt",
          extension: "txt",
          sizeBytes: 24,
          modifiedAtMs: Date.now(),
        },
      ],
      readFileUnderRoot: (_root: string, absolutePath: string) => {
        if (absolutePath.endsWith("doc.txt")) {
          return Array.from(encoder.encode("e2e-folder-index-token"));
        }
        return null;
      },
    };
  });
}

test("loads root and StackDrop branding", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/StackDrop/i);
});

test("shows library UI with in-memory database", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Documents" })).toBeVisible();
});

test("indexes folder via e2e shim and finds document by search", async ({ page }) => {
  await installFolderScanShim(page);
  await page.goto("/");
  await page.getByRole("button", { name: "Add folder…" }).click();
  await expect(page.getByTestId("document-list").getByText("doc.txt")).toBeVisible({ timeout: 15_000 });
  await page.getByLabel("Search documents").fill("e2e-folder-index-token");
  await expect(page.getByTestId("document-list").getByText("doc.txt")).toBeVisible();
});

test("opens document detail from list", async ({ page }) => {
  await installFolderScanShim(page);
  await page.goto("/");
  await page.getByRole("button", { name: "Add folder…" }).click();
  await expect(page.getByTestId("document-list").getByText("doc.txt")).toBeVisible({ timeout: 15_000 });
  await page.getByRole("link", { name: /doc\.txt/ }).click();
  await expect(page.getByRole("heading", { name: "doc.txt" })).toBeVisible();
  await expect(page.getByText("e2e-folder-index-token")).toBeVisible();
});
