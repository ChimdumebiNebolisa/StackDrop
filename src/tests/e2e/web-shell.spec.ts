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
  readError?: string;
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

async function installFeatureShim(
  page: Page,
  options: {
    defaultRoots?: string[];
    pickFolder?: string | null;
    files?: ShimFile[];
    readDelayMs?: number;
    summaryFailure?: "invalid_api_key" | "network_error" | null;
  } = {},
) {
  const payload = {
    rootPath: ROOT_PATH,
    defaultRoots: options.defaultRoots ?? [ROOT_PATH],
    pickFolder: options.pickFolder ?? ROOT_PATH,
    files: options.files ?? buildShimFiles(ROOT_PATH),
    readDelayMs: options.readDelayMs ?? 0,
    summaryFailure: options.summaryFailure ?? null,
  };

  await page.addInitScript((init) => {
    const encoder = new TextEncoder();
    const normalize = (path: string) => path.replaceAll("/", "\\");
    const files = [...init.files];
    const watchers: Array<(rootPath: string) => void> = [];
    let discoverError: string | null = null;
    let apiKeyConfigured = false;
    let summaryFailure: "invalid_api_key" | "network_error" | null = init.summaryFailure;

    const fireDirty = (rootPath: string) => {
      for (const cb of watchers) cb(rootPath);
    };

    const byAbsolutePath = (absolutePath: string) => files.find((f) => normalize(f.absolutePath) === normalize(absolutePath));
    const byName = (name: string) => files.find((f) => f.fileName === name);

    window.__STACKDROP_E2E__ = {
      defaultDocumentRoots: () => [...init.defaultRoots],
      pickFolder: () => init.pickFolder,
      discoverSupportedFiles: (rootPath: string) => {
        if (discoverError) throw new Error(discoverError);
        return [
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
        ];
      },
      readFileUnderRoot: async (_root: string, absolutePath: string) => {
        if (init.readDelayMs > 0) {
          await new Promise((resolve) => setTimeout(resolve, init.readDelayMs));
        }
        const hit = byAbsolutePath(absolutePath);
        if (hit?.readError) {
          throw new Error(hit.readError);
        }
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
      hasOpenAIApiKey: () => ({ configured: apiKeyConfigured, persistence: "os_credential" }),
      saveOpenAIApiKey: (apiKey: string) => {
        if (!apiKey.trim()) throw { code: "invalid_input" };
        apiKeyConfigured = true;
        return { configured: true, persistence: "os_credential" };
      },
      removeOpenAIApiKey: () => {
        apiKeyConfigured = false;
        return { configured: false, persistence: "os_credential" };
      },
      summarizeDocument: () => {
        if (!apiKeyConfigured) throw { code: "api_key_missing" };
        if (summaryFailure) throw { code: summaryFailure };
        return {
          overview: "This fixture document contains a concise local test note.",
          keyPoints: ["The selected document is summarized only after an explicit request."],
          importantDetails: ["The automated test uses an in-memory mock and never calls OpenAI."],
          importantDates: [],
          actionItems: ["Review the generated summary."],
          uncertainties: [],
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
      setDiscoverError: (message: string | null) => {
        discoverError = message;
      },
      listFileNames: () => files.map((f) => f.fileName),
      setSummaryFailure: (code) => {
        summaryFailure = code;
      },
    };
  }, payload);
}

function documentLink(page: Page, fileName: string) {
  const escaped = fileName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return page.getByTestId("document-list").getByRole("link", { name: new RegExp(escaped) });
}

test("loads StackDrop branding and library shell", async ({ page }) => {
  test.setTimeout(300_000);
  await page.goto("/", { waitUntil: "load", timeout: 180_000 });
  await expect(page.getByRole("heading", { name: "Documents", exact: true })).toBeVisible({ timeout: 180_000 });
  await expect(page.getByRole("link", { name: "Locations" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Failed parses" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Settings" })).toBeVisible();
  await expect(page.getByRole("link", { name: "About" })).toBeVisible();
  await expect(page.getByLabel("Sort documents")).toBeVisible();
  await expect(page.getByLabel("Group documents")).toBeVisible();
  await expect(page.getByLabel("Set view density")).toBeVisible();
  await expect(page).toHaveTitle(/StackDrop/i, { timeout: 30_000 });
  await expect(page.getByRole("heading", { name: /Known limitations/i })).toHaveCount(0);

  const sidebarTop = (await page.locator(".layout-sidebar").boundingBox())?.y;
  await page.locator(".layout-main").evaluate((main) => {
    main.scrollTop = main.scrollHeight;
  });
  await expect.poll(async () => (await page.locator(".layout-sidebar").boundingBox())?.y).toBe(sidebarTop);
  await expect.poll(async () => page.locator(".layout-main").evaluate((main) => getComputedStyle(main).scrollBehavior)).toBe("smooth");
});

test("indexes all supported file fixtures and validates parse statuses", async ({ page }) => {
  await installFeatureShim(page);
  await page.goto("/");
  await page.getByLabel("Index controls").getByRole("button", { name: "Index library" }).click();
  await expect(documentLink(page, "sample.txt")).toBeVisible({ timeout: 15_000 });
  await expect(documentLink(page, "minimal.docx")).toBeVisible();
  await expect(documentLink(page, "text-layer.pdf")).toBeVisible();
  await expect(documentLink(page, "scanned-image-only.pdf")).toBeVisible();
  await expect(documentLink(page, "legacy-sample.doc")).toBeVisible();
  await expect(documentLink(page, "broken.doc")).toBeVisible();

  await expect(page.getByLabel("Filter by file type")).toContainText(".txt");
  await expect(page.getByLabel("Filter by file type")).toContainText(".pdf");
  await expect(page.getByLabel("Filter by file type")).toContainText(".docx");
  await expect(page.getByLabel("Filter by file type")).toContainText(".doc");
  await expect(page.getByLabel("Filter by parse status")).toContainText("Parsed (text)");
  await expect(page.getByLabel("Filter by parse status")).toContainText("Parsed (OCR)");
  await expect(page.getByLabel("Filter by parse status")).toContainText("Parse failed");
  await expect(page.getByLabel("Sort documents")).toContainText("Recently indexed");
  await expect(page.getByLabel("Group documents")).toContainText("Parse status");
  await expect(page.getByLabel("Set view density")).toContainText("Compact");

  await page.getByLabel("Search documents").fill(TXT_TOKEN);
  await expect(documentLink(page, "sample.txt")).toBeVisible();
  await page.getByLabel("Search documents").fill(DOCX_TOKEN);
  await expect(documentLink(page, "minimal.docx")).toBeVisible();
  await page.getByLabel("Search documents").fill(PDF_TEXT_TOKEN);
  await expect(documentLink(page, "text-layer.pdf")).toBeVisible();
  await page.getByLabel("Search documents").fill(OCR_TOKEN);
  await expect(documentLink(page, "scanned-image-only.pdf")).toBeVisible();
  await page.getByLabel("Search documents").fill(DOC_TOKEN);
  await expect(documentLink(page, "legacy-sample.doc")).toBeVisible();

  await page.getByLabel("Search documents").fill("");
  await page.getByLabel("Group documents").selectOption("parse_status");
  await expect(page.getByRole("heading", { name: /Parse failed/i })).toBeVisible();
  await page.getByRole("link", { name: "Failed parses" }).click();
  await expect(page.getByLabel("Filter by parse status")).toHaveValue("parse_failed");
  await page.getByLabel("Filter by parse status").selectOption("");
  await page.getByLabel("Group documents").selectOption("none");

  await documentLink(page, "text-layer.pdf").click();
  await expect(page.locator("dl.meta-grid")).toContainText("parsed text");
  await page.getByRole("link", { name: "← Back" }).click();

  await documentLink(page, "scanned-image-only.pdf").click();
  await expect(page.locator("dl.meta-grid")).toContainText("parsed OCR");
  await page.getByRole("link", { name: "← Back" }).click();

  await documentLink(page, "broken.doc").click();
  await expect(page.locator("dl.meta-grid")).toContainText("parse failed");
  await expect(page.getByText("Parse error")).toBeVisible();
});

test("active indexing shows live file progress", async ({ page }) => {
  await installFeatureShim(page, {
    readDelayMs: 1500,
    files: [
      {
        absolutePath: `${ROOT_PATH}\\slow-progress.txt`,
        relativePath: "slow-progress.txt",
        fileName: "slow-progress.txt",
        extension: "txt",
        sizeBytes: 20,
        modifiedAtMs: Date.now(),
        bytes: Array.from(new TextEncoder().encode("SLOW_PROGRESS_TOKEN_20260628")),
      },
    ],
  });
  await page.goto("/");
  await page.getByLabel("Index controls").getByRole("button", { name: "Index library" }).click();

  await expect(page.getByRole("status")).toContainText(/Reading slow-progress\.txt|Parsing slow-progress\.txt/, { timeout: 5_000 });
  await expect(page.getByRole("status")).toContainText("0 indexed / 1 discovered");
  await expect(documentLink(page, "slow-progress.txt")).toBeVisible({ timeout: 15_000 });
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
  await page.getByLabel("Index controls").getByRole("button", { name: "Index library" }).click();
  await expect(documentLink(page, "sample.txt")).toBeVisible({ timeout: 15_000 });

  const backgroundCheckbox = page.getByLabel("Index controls").getByLabel("Auto-index while open");
  await expect(backgroundCheckbox).toBeChecked();
  await backgroundCheckbox.uncheck();
  await expect(backgroundCheckbox).not.toBeChecked();

  await page.evaluate(() => {
    window.__STACKDROP_E2E_TEST__?.createTxt("watch-new.txt", "WATCH_CREATE_TOKEN_20260514");
    window.__STACKDROP_E2E_TEST__?.emitWatch();
    window.__STACKDROP_E2E_TEST__?.emitWatch();
    window.__STACKDROP_E2E_TEST__?.emitWatch();
  });
  await expect(documentLink(page, "watch-new.txt")).toHaveCount(0);

  await backgroundCheckbox.check();
  await expect(backgroundCheckbox).toBeChecked();
  await page.evaluate(() => {
    window.__STACKDROP_E2E_TEST__?.emitWatch();
  });

  await expect(documentLink(page, "watch-new.txt")).toBeVisible({ timeout: 15_000 });
  await expect(documentLink(page, "watch-new.txt")).toHaveCount(1);

  await page.evaluate(() => {
    window.__STACKDROP_E2E_TEST__?.modifyTxt("sample.txt", "WATCH_MODIFIED_TOKEN_20260514");
    window.__STACKDROP_E2E_TEST__?.emitWatch();
  });
  await page.getByLabel("Search documents").fill("WATCH_MODIFIED_TOKEN_20260514");
  await expect(documentLink(page, "sample.txt")).toBeVisible({ timeout: 15_000 });
  await page.getByLabel("Search documents").fill(TXT_TOKEN);
  await expect(page.getByText("No documents matched this search.")).toBeVisible();

  await page.evaluate(() => {
    window.__STACKDROP_E2E_TEST__?.renameFile("watch-new.txt", "watch-renamed.txt");
    window.__STACKDROP_E2E_TEST__?.emitWatch();
  });
  await page.getByLabel("Search documents").fill("WATCH_CREATE_TOKEN_20260514");
  await expect(documentLink(page, "watch-renamed.txt")).toBeVisible({ timeout: 15_000 });
  await expect(documentLink(page, "watch-new.txt")).toHaveCount(0);

  await page.evaluate(() => {
    window.__STACKDROP_E2E_TEST__?.deleteFile("watch-renamed.txt");
    window.__STACKDROP_E2E_TEST__?.emitWatch();
  });
  await expect(page.getByText("No documents matched this search.")).toBeVisible({ timeout: 15_000 });
});

test("default roots fallback and manual Add folder flow still works", async ({ page }) => {
  await installFeatureShim(page, { defaultRoots: [] });
  await page.goto("/");
  await expect(page.getByText("0 indexed locations")).toBeVisible();
  await page.getByLabel("Index controls").getByRole("button", { name: "Add folder" }).click();
  await expect(page.getByRole("region", { name: "Locations" }).locator(".folder-path", { hasText: ROOT_PATH })).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.getByRole("heading", { name: /Known limitations/i })).toHaveCount(0);
});

test("search snippet visible for content match", async ({ page }) => {
  await installFeatureShim(page);
  await page.goto("/");
  await page.getByLabel("Index controls").getByRole("button", { name: "Index library" }).click();
  await expect(documentLink(page, "sample.txt")).toBeVisible({ timeout: 15_000 });
  await page.getByLabel("Search documents").fill(TXT_TOKEN);
  await expect(documentLink(page, "sample.txt")).toBeVisible({ timeout: 15_000 });
  await expect(page.locator(".doc-snippet")).toBeVisible({ timeout: 5_000 });
  const snippetHtml = await page.locator(".doc-snippet").innerHTML();
  expect(snippetHtml).toContain("<mark>");
});

test("read failures are labeled and failed rescans refresh diagnostics", async ({ page }) => {
  const files: ShimFile[] = [
    {
      absolutePath: `${ROOT_PATH}\\normal.txt`,
      relativePath: "normal.txt",
      fileName: "normal.txt",
      extension: "txt",
      sizeBytes: 20,
      modifiedAtMs: Date.now(),
      bytes: Array.from(new TextEncoder().encode("NORMAL_TOKEN_20260627")),
    },
    {
      absolutePath: `${ROOT_PATH}\\large-over-50mb.txt`,
      relativePath: "large-over-50mb.txt",
      fileName: "large-over-50mb.txt",
      extension: "txt",
      sizeBytes: 52_428_801,
      modifiedAtMs: Date.now(),
      bytes: [],
      readError: "File exceeds maximum read size of 52428800 bytes.",
    },
  ];
  await installFeatureShim(page, { files });
  await page.goto("/");
  await page.getByLabel("Index controls").getByRole("button", { name: "Index library" }).click();
  await expect(documentLink(page, "normal.txt")).toBeVisible({ timeout: 15_000 });

  await page.getByLabel("Search documents").fill("large-over-50mb");
  const largeResultRow = page.locator(".doc-row", { hasText: "large-over-50mb.txt" });
  await expect(largeResultRow).toBeVisible();
  await expect(largeResultRow).toContainText("Read failure");
  await expect(page.getByText("Failed parses do not break filename or path search.")).toBeVisible();
  await expect(page.getByText(/read failures mean the file could not be read/i)).toBeVisible();

  await page.evaluate(() => window.__STACKDROP_E2E_TEST__?.setDiscoverError("root unavailable"));
  await page.getByRole("button", { name: "Re-scan" }).click();
  await expect(page.getByText("Root issues").locator("..")).toContainText("1", { timeout: 15_000 });
  await expect(page.getByText("Root error: root unavailable")).toBeVisible();
});

test("relevance sort: filename match ranks above body match", async ({ page }) => {
  const tokenFiles: ShimFile[] = [
    {
      absolutePath: `${ROOT_PATH}\\TARGETWORD.txt`,
      relativePath: "TARGETWORD.txt",
      fileName: "TARGETWORD.txt",
      extension: "txt",
      sizeBytes: 20,
      modifiedAtMs: Date.now(),
      bytes: Array.from(new TextEncoder().encode("unrelated content here")),
    },
    {
      absolutePath: `${ROOT_PATH}\\other.txt`,
      relativePath: "other.txt",
      fileName: "other.txt",
      extension: "txt",
      sizeBytes: 50,
      modifiedAtMs: Date.now(),
      bytes: Array.from(new TextEncoder().encode("this document mentions TARGETWORD in the body")),
    },
  ];
  await installFeatureShim(page, { files: tokenFiles });
  await page.goto("/");
  await page.getByLabel("Index controls").getByRole("button", { name: "Index library" }).click();
  await expect(documentLink(page, "TARGETWORD.txt")).toBeVisible({ timeout: 15_000 });
  await page.getByLabel("Search documents").fill("TARGETWORD");
  await expect(documentLink(page, "TARGETWORD.txt")).toBeVisible({ timeout: 15_000 });
  const links = page.locator(".doc-row .doc-name");
  const firstResult = await links.first().textContent();
  expect(firstResult).toBe("TARGETWORD.txt");
});

test("saves a mocked API key and generates a structured document summary", async ({ page }) => {
  await installFeatureShim(page);
  await page.goto("/");

  await page.getByRole("link", { name: "Settings" }).click();
  await expect(page.getByRole("heading", { name: "Document summaries" })).toBeVisible();
  await page.getByLabel("OpenAI API key").fill("test-only-placeholder");
  await page.getByRole("button", { name: "Save key" }).click();
  await expect(page.getByText("API key configured", { exact: true })).toBeVisible();

  await page.getByRole("link", { name: "Library" }).click();
  await page.getByLabel("Index controls").getByRole("button", { name: "Index library" }).click();
  await expect(documentLink(page, "sample.txt")).toBeVisible({ timeout: 15_000 });
  await documentLink(page, "sample.txt").click();

  await page.getByRole("button", { name: "Summarize" }).click();
  const panel = page.getByRole("dialog", { name: "Document summary" });
  await expect(panel).toBeVisible();
  await panel.getByRole("button", { name: "Generate summary" }).click();
  await expect(panel.getByText("This fixture document contains a concise local test note.")).toBeVisible();
  await expect(panel.getByRole("heading", { name: "Key points" })).toBeVisible();
  await expect(panel.getByRole("heading", { name: "Important details" })).toBeVisible();
  await expect(panel.getByRole("heading", { name: "Action items" })).toBeVisible();
  await panel.getByRole("button", { name: "Close document summary" }).click();
  await expect(panel).not.toBeVisible();
});

test("shows an actionable invalid-key summary error", async ({ page }) => {
  await installFeatureShim(page, { summaryFailure: "invalid_api_key" });
  await page.goto("/");
  await page.getByRole("link", { name: "Settings" }).click();
  await page.getByLabel("OpenAI API key").fill("invalid-test-placeholder");
  await page.getByRole("button", { name: "Save key" }).click();
  await expect(page.getByText("API key configured", { exact: true })).toBeVisible();

  await page.getByRole("link", { name: "Library" }).click();
  await page.getByLabel("Index controls").getByRole("button", { name: "Index library" }).click();
  await expect(documentLink(page, "sample.txt")).toBeVisible({ timeout: 15_000 });
  await documentLink(page, "sample.txt").click();
  await page.getByRole("button", { name: "Summarize" }).click();
  const panel = page.getByRole("dialog", { name: "Document summary" });
  await panel.getByRole("button", { name: "Generate summary" }).click();
  await expect(panel.getByText(/OpenAI rejected this API key/i)).toBeVisible();
  await panel.getByRole("link", { name: "Open Settings" }).click();
  await expect(page.getByRole("heading", { name: "Document summaries" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Replace key" })).toBeVisible();
});

test("proof screenshots — library, search, and detail", async ({ page }) => {
  await installFeatureShim(page);
  await page.goto("/");
  await page.getByLabel("Index controls").getByRole("button", { name: "Index library" }).click();
  await expect(documentLink(page, "sample.txt")).toBeVisible({ timeout: 15_000 });
  mkdirSync("docs/proof-screenshots", { recursive: true });
  await page.screenshot({ path: "docs/proof-screenshots/01-library-after-index.png", fullPage: true });
  await page.getByLabel("Search documents").fill(PDF_TEXT_TOKEN);
  await page.screenshot({ path: "docs/proof-screenshots/02-search-by-title.png", fullPage: true });
  await page.getByLabel("Search documents").fill(OCR_TOKEN);
  await page.screenshot({ path: "docs/proof-screenshots/03-search-by-content.png", fullPage: true });
  await documentLink(page, "scanned-image-only.pdf").click();
  await expect(page.getByRole("heading", { name: "scanned-image-only.pdf" })).toBeVisible();
  await page.screenshot({ path: "docs/proof-screenshots/04-document-detail.png", fullPage: true });
});
