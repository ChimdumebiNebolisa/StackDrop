import { expect, test } from "@playwright/test";

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
});
