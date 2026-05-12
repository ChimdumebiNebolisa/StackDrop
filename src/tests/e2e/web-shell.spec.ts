import { expect, test, type Page } from "@playwright/test";

declare global {
  interface Window {
    __STACKDROP_E2E__?: {
      pickFile?: () => string | null;
      readFile?: (filePath: string) => number[] | Uint8Array | null;
    };
    __STACKDROP_E2E_QUEUE_FILE__?: (filePath: string) => void;
  }
}

const minimalPdf = `%PDF-1.1
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 144] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>
endobj
4 0 obj
<< /Length 44 >>
stream
BT
/F1 18 Tf
72 72 Td
(StackDrop PDF Search Text) Tj
ET
endstream
endobj
5 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
xref
0 6
0000000000 65535 f
0000000010 00000 n
0000000065 00000 n
0000000122 00000 n
0000000248 00000 n
0000000340 00000 n
trailer
<< /Root 1 0 R /Size 6 >>
startxref
410
%%EOF`;

async function installFilePickerShim(page: Page, files: Record<string, string>) {
  await page.addInitScript((seedFiles: Record<string, string>) => {
    const encoder = new TextEncoder();
    const queue: string[] = [];
    window.__STACKDROP_E2E__ = {
      pickFile: () => queue.shift() ?? null,
      readFile: (filePath: string) => {
        const text = seedFiles[filePath];
        return text === undefined ? null : Array.from(encoder.encode(text));
      },
    };
    window.__STACKDROP_E2E_QUEUE_FILE__ = (filePath: string) => {
      queue.push(filePath);
    };
  }, files);
}

async function createNote(page: Page, title: string, body: string) {
  const noteForm = page.getByRole("form", { name: "New note" });
  await noteForm.getByLabel("Title").fill(title);
  await noteForm.getByLabel("Body").fill(body);
  await page.getByTestId("create-note-submit").click();
  await expect(page.getByTestId("item-list").getByText(title)).toBeVisible({ timeout: 15_000 });
}

async function saveLink(page: Page, title: string, url: string) {
  const linkForm = page.getByRole("form", { name: "New link" });
  await linkForm.getByLabel("Title").fill(title);
  await linkForm.getByLabel("URL").fill(url);
  await page.getByTestId("save-link-submit").click();
  await expect(page.getByTestId("item-list").getByText(title)).toBeVisible({ timeout: 15_000 });
}

async function importQueuedFile(page: Page, filePath: string, title: string) {
  await page.evaluate((path: string) => window.__STACKDROP_E2E_QUEUE_FILE__?.(path), filePath);
  await page.getByTestId("import-file-button").click();
  await expect(page.getByTestId("item-list").getByText(title)).toBeVisible({ timeout: 15_000 });
}

test.describe("web shell", () => {
  test("loads root and StackDrop branding", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/StackDrop/i);
  });

  test("shows main UI with in-memory database (Playwright webServer)", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Items" })).toBeVisible({ timeout: 60_000 });
    await expect(page.getByTestId("create-note-submit")).toBeVisible();
  });

  test("creates a note and finds it via search", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Items" })).toBeVisible({ timeout: 60_000 });

    const marker = `e2e-marker-${Date.now()}`;
    const noteForm = page.getByRole("form", { name: "New note" });
    await noteForm.getByLabel("Title").fill("Playwright smoke note");
    await noteForm.getByLabel("Body").fill(`Hello world ${marker}`);
    await page.getByTestId("create-note-submit").click();

    await expect(page.getByTestId("item-list").getByText("Playwright smoke note")).toBeVisible({
      timeout: 15_000,
    });

    await page.getByTestId("search-input").fill(marker);
    await expect(page.getByTestId("item-list").getByText("Playwright smoke note")).toBeVisible({
      timeout: 15_000,
    });
  });

  test("covers v1 capture, browse, search, organization, and removal flows", async ({ page }) => {
    const files = {
      "C:/stackdrop-e2e/alpha.txt": "txt imported body alpha-file-token",
      "C:/stackdrop-e2e/brief.md": "# Brief\nmarkdown imported body markdown-token",
      "C:/stackdrop-e2e/manual.pdf": minimalPdf,
      "C:/stackdrop-e2e/broken.pdf": "not-a-real-pdf corrupt-body-token",
    };
    await installFilePickerShim(page, files);
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Items" })).toBeVisible({ timeout: 60_000 });

    await createNote(page, "Alpha note", "full note body alpha-note-token sorttoken sorttoken sorttoken");
    await createNote(page, "Recent note", "body with sorttoken");
    await saveLink(page, "Docs link", "https://example.com/metadata-only");

    await importQueuedFile(page, "C:/stackdrop-e2e/alpha.txt", "alpha.txt");
    await importQueuedFile(page, "C:/stackdrop-e2e/brief.md", "brief.md");
    await importQueuedFile(page, "C:/stackdrop-e2e/manual.pdf", "manual.pdf");
    await importQueuedFile(page, "C:/stackdrop-e2e/broken.pdf", "broken.pdf");

    await page.getByRole("link", { name: /note Alpha note/i }).click();
    await expect(page.getByTestId("note-body")).toContainText("alpha-note-token");
    await page.getByLabel("Title").fill("Alpha note renamed");
    await page.getByTestId("save-title").click();
    await expect(page.getByRole("heading", { name: "Alpha note renamed" })).toBeVisible();

    await page.getByLabel("Tags (comma-separated)").fill("research, keep");
    await page.getByTestId("save-tags").click();
    await page.getByTestId("back-to-list").click();
    await expect(page.getByTestId("item-list")).toContainText("research");

    await page.getByLabel("New collection name").fill("Reading");
    await page.getByRole("button", { name: "Add" }).click();
    await expect(page.getByRole("link", { name: "Reading" })).toBeVisible();

    await page.getByRole("link", { name: /note Alpha note renamed/i }).click();
    await page.getByRole("combobox", { name: /Collection/ }).selectOption({ label: "Reading" });
    await page.getByTestId("save-collection").click();
    await page.getByTestId("back-to-list").click();
    await page.getByRole("link", { name: "Reading" }).click();
    await expect(page.getByText("Alpha note renamed")).toBeVisible();
    await expect(page.getByText("Recent note")).not.toBeVisible();

    await page.getByRole("link", { name: "All items", exact: true }).click();
    await page.getByRole("link", { name: "research" }).click();
    await expect(page.getByText("Alpha note renamed")).toBeVisible();
    await expect(page.getByText("Docs link")).not.toBeVisible();

    await page.getByRole("link", { name: "All items", exact: true }).click();
    await page.getByTestId("search-input").fill("alpha-note-token");
    await expect(page.getByTestId("item-list")).toContainText("Alpha note renamed");

    await page.getByTestId("search-input").fill("metadata-only");
    await expect(page.getByTestId("item-list")).toContainText("Docs link");
    await page.getByTestId("search-input").fill("remote-webpage-body-token");
    await expect(page.getByTestId("item-list")).not.toContainText("Docs link");

    await page.getByTestId("search-input").fill("alpha-file-token");
    await expect(page.getByTestId("item-list")).toContainText("alpha.txt");
    await page.getByTestId("search-input").fill("markdown-token");
    await expect(page.getByTestId("item-list")).toContainText("brief.md");
    await page.getByTestId("search-input").fill("StackDrop");
    await expect(page.getByTestId("item-list")).toContainText("manual.pdf");
    await page.getByTestId("search-input").fill("corrupt-body-token");
    await expect(page.getByTestId("item-list")).not.toContainText("broken.pdf");

    await page.getByTestId("search-input").fill("");
    await page.getByLabel("Type").selectOption("note");
    await expect(page.getByTestId("item-list")).toContainText("Alpha note renamed");
    await expect(page.getByTestId("item-list")).not.toContainText("Docs link");
    await page.getByLabel("Type").selectOption("");
    await page.getByLabel("Tag").selectOption("research");
    await expect(page.getByTestId("item-list")).toContainText("Alpha note renamed");
    await expect(page.getByTestId("item-list")).not.toContainText("Recent note");

    await page.getByLabel("Tag").selectOption("");
    await createNote(page, "Newest sort note", "sorttoken");
    await page.getByTestId("search-input").fill("sorttoken");
    await page.getByRole("radio", { name: "Relevance" }).check();
    const relevanceFirst = await page.locator("[data-testid='item-list'] .item-title").first().innerText();
    await page.getByRole("radio", { name: "Recent" }).check();
    const recentFirst = await page.locator("[data-testid='item-list'] .item-title").first().innerText();
    expect(relevanceFirst).not.toEqual(recentFirst);

    await page.getByTestId("search-input").fill("");
    await page.getByRole("radio", { name: "Recent" }).check();
    await page.getByRole("link", { name: /link Docs link/i }).click();
    await expect(page.getByTestId("link-url")).toHaveText("https://example.com/metadata-only");
    await page.getByTestId("back-to-list").click();

    await page.getByRole("link", { name: /file alpha.txt/i }).click();
    await expect(page.getByTestId("file-preview")).toContainText("alpha-file-token");
    await page.getByTestId("back-to-list").click();

    await page.getByRole("link", { name: /file broken.pdf/i }).click();
    await expect(page.getByText(/Indexed:\s*no/i)).toBeVisible();
    await expect(page.getByTestId("file-preview")).toContainText("No extracted text");
    await page.getByTestId("back-to-list").click();

    await page.getByRole("link", { name: /note Alpha note renamed/i }).click();
    await page.getByLabel("Tags (comma-separated)").fill("keep");
    await page.getByTestId("save-tags").click();
    await page.getByRole("combobox", { name: /Collection/ }).selectOption("");
    await page.getByTestId("save-collection").click();
    await page.getByTestId("back-to-list").click();
    await expect(page.getByTestId("item-list")).not.toContainText("research");
    await page.getByRole("link", { name: "Reading" }).click();
    await expect(page.getByText("No items in this collection.")).toBeVisible();

    await page.getByRole("link", { name: "All items", exact: true }).click();
    await page.getByRole("link", { name: /file alpha.txt/i }).click();
    page.on("dialog", (dialog) => dialog.accept());
    await page.getByTestId("remove-item").click();
    await expect(page.getByTestId("item-list")).not.toContainText("alpha.txt");
  });
});
