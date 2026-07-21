import { describe, expect, it } from "vitest";

import {
  FILE_EXTENSION_FILTER_OPTIONS,
  SUPPORTED_FILE_CAPABILITIES,
  SUPPORTED_FILE_EXTENSIONS,
  isSupportedFileExtension,
} from "../../domain/documents/generatedFileCapabilities";

describe("generated file capabilities", () => {
  it("derives TypeScript extension consumers from the capability entries", () => {
    expect(SUPPORTED_FILE_EXTENSIONS).toEqual(SUPPORTED_FILE_CAPABILITIES.map((capability) => capability.extension));
    expect(FILE_EXTENSION_FILTER_OPTIONS).toEqual(
      SUPPORTED_FILE_CAPABILITIES.map((capability) => ({
        value: capability.extension,
        label: capability.displayLabel,
      })),
    );
  });

  it("validates supported extensions case-insensitively without accepting unknown formats", () => {
    expect(isSupportedFileExtension("TXT")).toBe(true);
    expect(isSupportedFileExtension("pdf")).toBe(true);
    expect(isSupportedFileExtension("md")).toBe(false);
  });
});
