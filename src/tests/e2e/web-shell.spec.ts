import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

import { expect, test, type Page } from "@playwright/test";

declare global {
  interface Window {
    __STACKDROP_E2E__?: {
      pickFolder?: () => string | null;
      defaultDocumentRoots?: () => string[];
      discoverSupportedFiles?: (rootPath: string) => Array<{
        absolutePath: string;
        relativePath: string;
        fileName: string;
        extension: string;
        sizeBytes: number;
        modifiedAtMs: number;
      }>;
      readFileUnderRoot?: (rootPath: string, absolutePath: string) => Uint8Array | number[] | null;
      ocrPdfTextUnderRoot?: (rootPath: string, absolutePath: string) => string;
      extractDocTextUnderRoot?: (rootPath: string, absolutePath: string) => string;
    };
  }
}

async function installFolderScanShim(page: Page) {
  await page.addInitScript(() => {
    const encoder = new TextEncoder();
    window.__STACKDROP_E2E__ = {
      defaultDocumentRoots: () => ["C:\\stackdrop-e2e-root"],
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

test("loads StackDrop branding and library shell", async ({ page }) => {
  test.setTimeout(300_000);
  await page.goto("/", { waitUntil: "load", timeout: 180_000 });
  await expect(page.getByRole("heading", { name: "Documents" })).toBeVisible({ timeout: 180_000 });
  await expect(page).toHaveTitle(/StackDrop/i, { timeout: 30_000 });
});

test("indexes library via e2e shim and finds document by search", async ({ page }) => {
  await installFolderScanShim(page);
  await page.goto("/");
  await page.getByRole("button", { name: "Index library" }).click();
  await expect(page.getByTestId("document-list").getByText("doc.txt")).toBeVisible({ timeout: 15_000 });
  await page.getByLabel("Search documents").fill("e2e-folder-index-token");
  await expect(page.getByTestId("document-list").getByText("doc.txt")).toBeVisible();
});

test("opens document detail from list", async ({ page }) => {
  await installFolderScanShim(page);
  await page.goto("/");
  await page.getByRole("button", { name: "Index library" }).click();
  await expect(page.getByTestId("document-list").getByText("doc.txt")).toBeVisible({ timeout: 15_000 });
  await page.getByRole("link", { name: /doc\.txt/ }).click();
  await expect(page.getByRole("heading", { name: "doc.txt" })).toBeVisible();
  await expect(page.getByText("e2e-folder-index-token")).toBeVisible();
});

test("proof screenshot — library after index", async ({ page }) => {
  await installFolderScanShim(page);
  await page.goto("/");
  await page.getByRole("button", { name: "Index library" }).click();
  await expect(page.getByTestId("document-list").getByText("doc.txt")).toBeVisible({ timeout: 15_000 });
  const outPath = "docs/proof-screenshots/01-library-after-index.png";
  mkdirSync(dirname(outPath), { recursive: true });
  await page.screenshot({ path: outPath, fullPage: true });
});

test("proof screenshots — search and detail", async ({ page }) => {
  await installFolderScanShim(page);
  await page.goto("/");
  await page.getByRole("button", { name: "Index library" }).click();
  await expect(page.getByTestId("document-list").getByText("doc.txt")).toBeVisible({ timeout: 15_000 });
  mkdirSync("docs/proof-screenshots", { recursive: true });
  await page.getByLabel("Search documents").fill("doc");
  await page.screenshot({ path: "docs/proof-screenshots/02-search-by-title.png", fullPage: true });
  await page.getByLabel("Search documents").fill("e2e-folder-index-token");
  await page.screenshot({ path: "docs/proof-screenshots/03-search-by-content.png", fullPage: true });
  await page.getByRole("link", { name: /doc\.txt/ }).click();
  await expect(page.getByRole("heading", { name: "doc.txt" })).toBeVisible();
  await page.screenshot({ path: "docs/proof-screenshots/04-document-detail.png", fullPage: true });
});
