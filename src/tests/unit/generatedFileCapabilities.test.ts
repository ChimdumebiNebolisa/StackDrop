import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import {
  FILE_EXTENSION_FILTER_OPTIONS,
  SUPPORTED_FILE_CAPABILITIES,
  SUPPORTED_FILE_EXTENSIONS,
  getFileCapability,
  isSupportedFileExtension,
} from "../../domain/documents/generatedFileCapabilities";
import {
  FILE_EXTENSION_CHECK_SQL,
  FILE_EXTENSION_DELETE_UNSUPPORTED_SQL,
  FILE_EXTENSION_SQL_LIST,
  GENERATED_FILE_EXTENSIONS,
} from "../../data/db/generatedFileCapabilities";

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

  it("looks up capability metadata with dotted and uppercase extensions", () => {
    expect(getFileCapability(".PDF")).toMatchObject({
      extension: "pdf",
      parserId: "pdf-text",
      parseRuntime: "hybrid",
      ocr: { supported: true, parserId: "pdf-ocr" },
    });
    expect(getFileCapability("doc")).toMatchObject({
      extension: "doc",
      parserId: "doc-antiword",
      parseRuntime: "native",
    });
    expect(getFileCapability("md")).toBeNull();
  });

  it("keeps the README supported-file section aligned with generated capabilities", () => {
    const readme = readFileSync(path.join(process.cwd(), "README.md"), "utf8");
    const section = readme.match(
      /<!-- BEGIN GENERATED SUPPORTED FILES -->[\s\S]*<!-- END GENERATED SUPPORTED FILES -->/,
    )?.[0];

    expect(section).toBeTruthy();
    for (const capability of SUPPORTED_FILE_CAPABILITIES) {
      expect(section).toContain(`| \`.${capability.extension}\` | ${capability.displayLabel} |`);
    }
    expect(section).not.toContain("`.md`");
    expect(section).not.toContain("`.markdown`");
  });

  it("derives database extension SQL helpers from generated capabilities", () => {
    expect(GENERATED_FILE_EXTENSIONS).toEqual(SUPPORTED_FILE_EXTENSIONS);
    expect(FILE_EXTENSION_SQL_LIST).toBe(SUPPORTED_FILE_EXTENSIONS.map((extension) => `'${extension}'`).join(", "));
    expect(FILE_EXTENSION_CHECK_SQL).toBe(`file_extension IN (${FILE_EXTENSION_SQL_LIST})`);
    expect(FILE_EXTENSION_DELETE_UNSUPPORTED_SQL).toBe(`file_extension NOT IN (${FILE_EXTENSION_SQL_LIST})`);
  });

  it("keeps schema.sql file-extension checks aligned with generated database capabilities", () => {
    const schema = readFileSync(path.join(process.cwd(), "src/data/db/schema.sql"), "utf8");
    const checkSql = schema.match(
      /\/\* BEGIN GENERATED FILE_EXTENSION_CHECK_SQL \*\/([\s\S]*?)\/\* END GENERATED FILE_EXTENSION_CHECK_SQL \*\//,
    )?.[1].trim();

    expect(checkSql).toBe(FILE_EXTENSION_CHECK_SQL);
  });
});
