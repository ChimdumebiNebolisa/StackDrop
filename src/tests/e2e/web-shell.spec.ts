import { mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";

import { expect, test, type Page } from "@playwright/test";

const ROOT_PATH = "C:\\stackdrop-e2e-root";
const TXT_TOKEN = "STACKDROP_TXT_TOKEN_20260514";
const DOCX_TOKEN = "stackdrop-docx-fixture-token";
const PDF_TEXT_TOKEN = "STACKDROP_PDF_TEXT_TOKEN_20260514";
const OCR_TOKEN = "STACKDROP OCR TOKEN 52614";
const DOC_TOKEN = "VESTIBULUM DOC TOKEN 20260514";

interface ShimFile {
  absolutePath: string;
  relativePath: string;
  fileName: string;
  extension: string;
  sizeBytes: number;
  modifiedAtMs: number;
  bytes: number[];
  ocrText?: string;
  docText?: string;
}

function fixtureBytes(name: string): number[] {
  return Array.from(readFileSync(join(process.cwd(), "src/tests/fixtures", name)));
}

function buildShimFiles(root: string): ShimFile[] {
  const now = Date.now();
  const mk = (name: string, extension: string, bytes: number[], extra: Partial<ShimFile> = {}): ShimFile => ({
    absolutePath: `${root}\\${name}`,
    relativePath: name,
    fileName: name,
    extension,
    sizeBytes: bytes.length,
    modifiedAtMs: now,
    bytes,
    ...extra,
  });

  return [
    mk("sample.txt", "txt", Array.from(new TextEncoder().encode(`${TXT_TOKEN}\n`))),
    mk("minimal.docx", "docx", fixtureBytes("minimal.docx")),
    mk("text-layer.pdf", "pdf", fixtureBytes("text-layer.pdf")),
    mk("scanned-image-only.pdf", "pdf", fixtureBytes("scanned-image-only.pdf"), { ocrText: OCR_TOKEN }),
    mk("legacy-sample.doc", "doc", fixtureBytes("legacy-sample.doc"), { docText: DOC_TOKEN }),
    mk("broken.doc", "doc", fixtureBytes("broken.doc")),
  ];
}

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
      watchFolders?: (paths: string[], onDirtyRoot: (rootPath: string) => void) => (() => void) | void;
    };
    __STACKDROP_E2E_TEST__?: {
      emitWatch: (rootPath?: string) => void;
      createTxt: (name: string, text: string) => void;
      modifyTxt: (name: string, text: string) => void;
      deleteFile: (name: string) => void;
      renameFile: (oldName: string, newName: string) => void;
      listFileNames: () => string[];
    };
  }
}

async function installFeatureShim(
  page: Page,
  options: { defaultRoots?: string[]; pickFolder?: string | null; files?: ShimFile[] } = {},
) {
  const payload = {
    rootPath: ROOT_PATH,
    defaultRoots: options.defaultRoots ?? [ROOT_PATH],
    pickFolder: options.pickFolder ?? ROOT_PATH,
    files: options.files ?? buildShimFiles(ROOT_PATH),
  };

  await page.addInitScript((init) => {
    const encoder = new TextEncoder();
    const normalize = (path: string) => path.replaceAll("/", "\\");
    const files = [...init.files];
    const watchers: Array<(rootPath: string) => void> = [];

    const fireDirty = (rootPath: string) => {
      for (const cb of watchers) cb(rootPath);
    };

    const byAbsolutePath = (absolutePath: string) => files.find((f) => normalize(f.absolutePath) === normalize(absolutePath));
    const byName = (name: string) => files.find((f) => f.fileName === name);

    window.__STACKDROP_E2E__ = {
      defaultDocumentRoots: () => [...init.defaultRoots],
      pickFolder: () => init.pickFolder,
      discoverSupportedFiles: (rootPath: string) => [
        ...files
          .filter((f) => normalize(f.absolutePath).startsWith(normalize(rootPath)))
          .map(({ absolutePath, relativePath, fileName, extension, sizeBytes, modifiedAtMs }) => ({
            absolutePath,
            relativePath,
            fileName,
            extension,
            sizeBytes,
            modifiedAtMs,
          })),
      ],
      readFileUnderRoot: (_root: string, absolutePath: string) => {
        const hit = byAbsolutePath(absolutePath);
        return hit ? hit.bytes : null;
      },
      ocrPdfTextUnderRoot: (_root: string, absolutePath: string) => {
        const hit = byAbsolutePath(absolutePath);
        return hit?.ocrText ?? "";
      },
      extractDocTextUnderRoot: (_root: string, absolutePath: string) => {
        const hit = byAbsolutePath(absolutePath);
        if (!hit?.docText) {
          throw new Error("Legacy .doc extraction failed");
        }
        return hit.docText;
      },
      watchFolders: (_paths, onDirtyRoot) => {
        watchers.push(onDirtyRoot);
        return () => {
          const index = watchers.indexOf(onDirtyRoot);
          if (index >= 0) watchers.splice(index, 1);
        };
      },
    };

    window.__STACKDROP_E2E_TEST__ = {
      emitWatch: (rootPath = init.rootPath) => fireDirty(rootPath),
      createTxt: (name: string, text: string) => {
        const bytes = Array.from(encoder.encode(text));
        const file: ShimFile = {
          absolutePath: `${init.rootPath}\\${name}`,
          relativePath: name,
          fileName: name,
          extension: "txt",
          sizeBytes: bytes.length,
          modifiedAtMs: Date.now(),
          bytes,
        };
        files.push(file);
      },
      modifyTxt: (name: string, text: string) => {
        const file = byName(name);
        if (!file) return;
        const bytes = Array.from(encoder.encode(text));
        file.bytes = bytes;
        file.sizeBytes = bytes.length;
        file.modifiedAtMs = Date.now();
      },
      deleteFile: (name: string) => {
        const index = files.findIndex((f) => f.fileName === name);
        if (index >= 0) files.splice(index, 1);
      },
      renameFile: (oldName: string, newName: string) => {
        const file = byName(oldName);
        if (!file) return;
        file.fileName = newName;
        file.relativePath = newName;
        file.absolutePath = `${init.rootPath}\\${newName}`;
        file.modifiedAtMs = Date.now();
      },
      listFileNames: () => files.map((f) => f.fileName),
    };
  }, payload);
}

test("loads StackDrop branding and library shell", async ({ page }) => {
  test.setTimeout(300_000);
  await page.goto("/", { waitUntil: "load", timeout: 180_000 });
  await expect(page.getByRole("heading", { name: "Documents" })).toBeVisible({ timeout: 180_000 });
  await expect(page).toHaveTitle(/StackDrop/i, { timeout: 30_000 });
  await expect(page.getByRole("heading", { name: /Known limitations/i })).toHaveCount(0);
});

test("indexes all supported file fixtures and validates parse statuses", async ({ page }) => {
  await installFeatureShim(page);
  await page.goto("/");
  await page.getByRole("button", { name: "Index library" }).click();
  await expect(page.getByTestId("document-list").getByText("sample.txt")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByTestId("document-list").getByText("minimal.docx")).toBeVisible();
  await expect(page.getByTestId("document-list").getByText("text-layer.pdf")).toBeVisible();
  await expect(page.getByTestId("document-list").getByText("scanned-image-only.pdf")).toBeVisible();
  await expect(page.getByTestId("document-list").getByText("legacy-sample.doc")).toBeVisible();
  await expect(page.getByTestId("document-list").getByText("broken.doc")).toBeVisible();

  await expect(page.getByLabel("Filter by file type")).toContainText(".txt");
  await expect(page.getByLabel("Filter by file type")).toContainText(".pdf");
  await expect(page.getByLabel("Filter by file type")).toContainText(".docx");
  await expect(page.getByLabel("Filter by file type")).toContainText(".doc");
  await expect(page.getByLabel("Filter by parse status")).toContainText("Parsed (text)");
  await expect(page.getByLabel("Filter by parse status")).toContainText("Parsed (OCR)");
  await expect(page.getByLabel("Filter by parse status")).toContainText("Parse failed");

  await page.getByLabel("Search documents").fill(TXT_TOKEN);
  await expect(page.getByTestId("document-list").getByText("sample.txt")).toBeVisible();
  await page.getByLabel("Search documents").fill(DOCX_TOKEN);
  await expect(page.getByTestId("document-list").getByText("minimal.docx")).toBeVisible();
  await page.getByLabel("Search documents").fill(PDF_TEXT_TOKEN);
  await expect(page.getByTestId("document-list").getByText("text-layer.pdf")).toBeVisible();
  await page.getByLabel("Search documents").fill(OCR_TOKEN);
  await expect(page.getByTestId("document-list").getByText("scanned-image-only.pdf")).toBeVisible();
  await page.getByLabel("Search documents").fill(DOC_TOKEN);
  await expect(page.getByTestId("document-list").getByText("legacy-sample.doc")).toBeVisible();

  await page.getByLabel("Search documents").fill("");
  await page.getByRole("link", { name: /text-layer\.pdf/ }).click();
  await expect(page.locator("dl.meta-grid")).toContainText("parsed text");
  await page.getByRole("link", { name: "← Back" }).click();

  await page.getByRole("link", { name: /scanned-image-only\.pdf/ }).click();
  await expect(page.locator("dl.meta-grid")).toContainText("parsed OCR");
  await page.getByRole("link", { name: "← Back" }).click();

  await page.getByRole("link", { name: /broken\.doc/ }).click();
  await expect(page.locator("dl.meta-grid")).toContainText("parse failed");
  await expect(page.getByText("Parse error")).toBeVisible();
});

test("auto re-index watcher handles create/modify/delete/rename with debounce", async ({ page }) => {
  await installFeatureShim(page, {
    files: [
      {
        absolutePath: `${ROOT_PATH}\\sample.txt`,
        relativePath: "sample.txt",
        fileName: "sample.txt",
        extension: "txt",
        sizeBytes: TXT_TOKEN.length,
        modifiedAtMs: Date.now(),
        bytes: Array.from(new TextEncoder().encode(TXT_TOKEN)),
      },
    ],
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Index library" }).click();
  await expect(page.getByTestId("document-list").getByText("sample.txt")).toBeVisible({ timeout: 15_000 });

  const backgroundCheckbox = page.getByLabel("Background indexing");
  await expect(backgroundCheckbox).toBeChecked();
  await backgroundCheckbox.uncheck();
  await expect(backgroundCheckbox).not.toBeChecked();

  await page.evaluate(() => {
    window.__STACKDROP_E2E_TEST__?.createTxt("watch-new.txt", "WATCH_CREATE_TOKEN_20260514");
    window.__STACKDROP_E2E_TEST__?.emitWatch();
    window.__STACKDROP_E2E_TEST__?.emitWatch();
    window.__STACKDROP_E2E_TEST__?.emitWatch();
  });
  await expect(page.getByTestId("document-list").getByText("watch-new.txt")).toHaveCount(0);

  await backgroundCheckbox.check();
  await expect(backgroundCheckbox).toBeChecked();
  await page.evaluate(() => {
    window.__STACKDROP_E2E_TEST__?.emitWatch();
  });

  await expect(page.getByTestId("document-list").getByText("watch-new.txt")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByTestId("document-list").getByText("watch-new.txt")).toHaveCount(1);

  await page.evaluate(() => {
    window.__STACKDROP_E2E_TEST__?.modifyTxt("sample.txt", "WATCH_MODIFIED_TOKEN_20260514");
    window.__STACKDROP_E2E_TEST__?.emitWatch();
  });
  await page.getByLabel("Search documents").fill("WATCH_MODIFIED_TOKEN_20260514");
  await expect(page.getByTestId("document-list").getByText("sample.txt")).toBeVisible({ timeout: 15_000 });
  await page.getByLabel("Search documents").fill(TXT_TOKEN);
  await expect(page.getByText("No documents match the current filters.")).toBeVisible();

  await page.evaluate(() => {
    window.__STACKDROP_E2E_TEST__?.renameFile("watch-new.txt", "watch-renamed.txt");
    window.__STACKDROP_E2E_TEST__?.emitWatch();
  });
  await page.getByLabel("Search documents").fill("WATCH_CREATE_TOKEN_20260514");
  await expect(page.getByTestId("document-list").getByText("watch-renamed.txt")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByTestId("document-list").getByText("watch-new.txt")).toHaveCount(0);

  await page.evaluate(() => {
    window.__STACKDROP_E2E_TEST__?.deleteFile("watch-renamed.txt");
    window.__STACKDROP_E2E_TEST__?.emitWatch();
  });
  await expect(page.getByText("No documents match the current filters.")).toBeVisible({ timeout: 15_000 });
});

test("default roots fallback and manual Add folder flow still works", async ({ page }) => {
  await installFeatureShim(page, { defaultRoots: [] });
  await page.goto("/");
  await expect(page.getByText("Indexed locations: 0")).toBeVisible();
  await page.getByRole("button", { name: "Add folder…" }).click();
  await expect(page.getByTitle(ROOT_PATH)).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole("heading", { name: /Known limitations/i })).toHaveCount(0);
});

test("proof screenshots — library, search, and detail", async ({ page }) => {
  await installFeatureShim(page);
  await page.goto("/");
  await page.getByRole("button", { name: "Index library" }).click();
  await expect(page.getByTestId("document-list").getByText("sample.txt")).toBeVisible({ timeout: 15_000 });
  mkdirSync("docs/proof-screenshots", { recursive: true });
  await page.screenshot({ path: "docs/proof-screenshots/01-library-after-index.png", fullPage: true });
  await page.getByLabel("Search documents").fill(PDF_TEXT_TOKEN);
  await page.screenshot({ path: "docs/proof-screenshots/02-search-by-title.png", fullPage: true });
  await page.getByLabel("Search documents").fill(OCR_TOKEN);
  await page.screenshot({ path: "docs/proof-screenshots/03-search-by-content.png", fullPage: true });
  await page.getByRole("link", { name: /scanned-image-only\.pdf/ }).click();
  await expect(page.getByRole("heading", { name: "scanned-image-only.pdf" })).toBeVisible();
  await page.screenshot({ path: "docs/proof-screenshots/04-document-detail.png", fullPage: true });
});
