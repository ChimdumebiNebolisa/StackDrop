// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DocumentSummaryLauncher } from "../../features/document-summary/components/DocumentSummaryLauncher";
import type { SummarySourceDocument } from "../../features/document-summary/types/documentSummaryTypes";

const mocks = vi.hoisted(() => ({
  hasKey: vi.fn(),
  summarize: vi.fn(),
}));

vi.mock("../../features/settings/services/openAICredentialService", () => ({
  hasOpenAIApiKey: mocks.hasKey,
  getOpenAICredentialErrorCode: (error: unknown) =>
    typeof error === "object" && error !== null && "code" in error ? (error as { code: string }).code : "unknown",
}));

vi.mock("../../features/document-summary/services/documentSummaryService", () => ({
  summarizeDocument: mocks.summarize,
  getSummaryErrorCode: (error: unknown) =>
    typeof error === "object" && error !== null && "code" in error ? (error as { code: string }).code : "unknown",
}));

const sourceDocument: SummarySourceDocument = {
  id: "doc-1",
  fileName: "notes.txt",
  relativePath: "notes.txt",
  fileExtension: "txt",
  parseStatus: "parsed_text",
  extractedText: "A short document with useful content.",
};

const summary = {
  overview: "A short overview.",
  keyPoints: ["One key point"],
  importantDetails: ["One important detail"],
  importantDates: [],
  actionItems: ["Review it"],
  uncertainties: [],
};

function renderLauncher(source = sourceDocument) {
  return render(
    <MemoryRouter>
      <DocumentSummaryLauncher document={source} />
    </MemoryRouter>,
  );
}

describe("DocumentSummaryLauncher", () => {
  beforeEach(() => {
    mocks.hasKey.mockReset();
    mocks.summarize.mockReset();
  });

  afterEach(cleanup);

  it("disables Summarize for parse failures and blank text", () => {
    const { rerender } = renderLauncher({ ...sourceDocument, parseStatus: "parse_failed" });
    expect(screen.getByRole("button", { name: "Summarize" })).toBeDisabled();
    rerender(
      <MemoryRouter>
        <DocumentSummaryLauncher document={{ ...sourceDocument, extractedText: "  " }} />
      </MemoryRouter>,
    );
    expect(screen.getByRole("button", { name: "Summarize" })).toBeDisabled();
  });

  it("shows the missing-key state without generating", async () => {
    mocks.hasKey.mockResolvedValue({ configured: false, persistence: "os_credential" });
    renderLauncher();
    fireEvent.click(screen.getByRole("button", { name: "Summarize" }));
    expect(await screen.findByText("Add an API key in Settings to generate summaries.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open Settings" })).toHaveAttribute("href", "/#settings");
    expect(mocks.summarize).not.toHaveBeenCalled();
  });

  it("requires Generate summary, shows loading, and renders validated sections", async () => {
    let resolveSummary: (value: typeof summary) => void = () => undefined;
    mocks.hasKey.mockResolvedValue({ configured: true, persistence: "os_credential" });
    mocks.summarize.mockImplementation(() => new Promise((resolve) => (resolveSummary = resolve)));
    renderLauncher();

    const trigger = screen.getByRole("button", { name: "Summarize" });
    fireEvent.click(trigger);
    const generate = await screen.findByRole("button", { name: "Generate summary" });
    expect(mocks.summarize).not.toHaveBeenCalled();
    fireEvent.click(generate);
    expect(await screen.findByText("Generating summary...")).toBeInTheDocument();
    expect(trigger).toBeDisabled();
    expect(screen.getByRole("button", { name: "Close document summary" })).toHaveAttribute("aria-disabled", "true");

    resolveSummary(summary);
    expect(await screen.findByText("A short overview.")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Key points" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Action items" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Important dates" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Uncertainties" })).not.toBeInTheDocument();
  });

  it("shows an invalid-key action and a retry for transient errors", async () => {
    mocks.hasKey.mockResolvedValue({ configured: true, persistence: "os_credential" });
    mocks.summarize.mockRejectedValueOnce({ code: "invalid_api_key" });
    const { unmount } = renderLauncher();
    fireEvent.click(screen.getByRole("button", { name: "Summarize" }));
    fireEvent.click(await screen.findByRole("button", { name: "Generate summary" }));
    expect(await screen.findByText(/OpenAI rejected this API key/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open Settings" })).toBeInTheDocument();
    unmount();

    mocks.summarize.mockRejectedValueOnce({ code: "network_error" }).mockResolvedValueOnce(summary);
    renderLauncher();
    fireEvent.click(screen.getByRole("button", { name: "Summarize" }));
    fireEvent.click(await screen.findByRole("button", { name: "Generate summary" }));
    expect(await screen.findByText(/could not reach OpenAI/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByText("A short overview.")).toBeInTheDocument();
  });

  it("closes with Escape, restores focus, and discloses truncation", async () => {
    mocks.hasKey.mockResolvedValue({ configured: true, persistence: "os_credential" });
    mocks.summarize.mockResolvedValue(summary);
    renderLauncher({ ...sourceDocument, extractedText: "x".repeat(48_100) });
    const trigger = screen.getByRole("button", { name: "Summarize" });
    fireEvent.click(trigger);
    expect(await screen.findByRole("button", { name: "Generate summary" })).toBeInTheDocument();
    fireEvent.keyDown(window.document.body, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await waitFor(() => expect(trigger).toHaveFocus());

    fireEvent.click(trigger);
    fireEvent.click(await screen.findByRole("button", { name: "Generate summary" }));
    expect(await screen.findByText(/bounded sample from the beginning, middle, and end/i)).toBeInTheDocument();
  });
});
