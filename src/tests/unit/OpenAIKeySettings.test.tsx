// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { OpenAIKeySettings } from "../../features/settings/components/OpenAIKeySettings";

const credentialMocks = vi.hoisted(() => ({
  has: vi.fn(),
  save: vi.fn(),
  remove: vi.fn(),
}));

vi.mock("../../features/settings/services/openAICredentialService", () => ({
  hasOpenAIApiKey: credentialMocks.has,
  saveOpenAIApiKey: credentialMocks.save,
  removeOpenAIApiKey: credentialMocks.remove,
  getOpenAICredentialErrorCode: (error: unknown) =>
    typeof error === "object" && error !== null && "code" in error ? (error as { code: string }).code : "unknown",
}));

describe("OpenAIKeySettings", () => {
  beforeEach(() => {
    credentialMocks.has.mockReset();
    credentialMocks.save.mockReset();
    credentialMocks.remove.mockReset();
  });

  afterEach(cleanup);

  it("saves a new key without displaying it after storage", async () => {
    credentialMocks.has.mockResolvedValue({ configured: false, persistence: "os_credential" });
    credentialMocks.save.mockResolvedValue({ configured: true, persistence: "os_credential" });
    render(<OpenAIKeySettings />);

    const input = await screen.findByLabelText("OpenAI API key");
    fireEvent.change(input, { target: { value: "fake-test-key" } });
    fireEvent.click(screen.getByRole("button", { name: "Save key" }));

    await screen.findByText("API key configured");
    expect(credentialMocks.save).toHaveBeenCalledWith("fake-test-key");
    expect(screen.queryByDisplayValue("fake-test-key")).not.toBeInTheDocument();
  });

  it("supports replacing and removing a configured key", async () => {
    credentialMocks.has.mockResolvedValue({ configured: true, persistence: "os_credential" });
    credentialMocks.save.mockResolvedValue({ configured: true, persistence: "os_credential" });
    credentialMocks.remove.mockResolvedValue({ configured: false, persistence: "os_credential" });
    render(<OpenAIKeySettings />);

    await screen.findByText("API key configured");
    fireEvent.click(screen.getByRole("button", { name: "Replace key" }));
    fireEvent.change(screen.getByLabelText("OpenAI API key"), { target: { value: "replacement-test-key" } });
    fireEvent.click(screen.getByRole("button", { name: "Save key" }));
    await waitFor(() => expect(credentialMocks.save).toHaveBeenCalledWith("replacement-test-key"));

    fireEvent.click(await screen.findByRole("button", { name: "Remove key" }));
    await waitFor(() => expect(credentialMocks.remove).toHaveBeenCalledOnce());
    expect(await screen.findByLabelText("OpenAI API key")).toHaveValue("");
  });

  it("reports secure credential-store failures without exposing values", async () => {
    credentialMocks.has.mockRejectedValue({ code: "credential_store_error", internal: "do not show" });
    render(<OpenAIKeySettings />);
    expect(await screen.findByText(/could not access secure credential storage/i)).toBeInTheDocument();
    expect(screen.queryByText(/do not show/i)).not.toBeInTheDocument();
  });
});
