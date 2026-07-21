import { describe, expect, it } from "vitest";

import { MAX_DOCUMENT_CHARACTERS, OMISSION_MARKER, prepareDocumentText } from "../../features/document-summary/services/prepareDocumentText";

describe("prepareDocumentText", () => {
  it("rejects blank input", () => {
    expect(() => prepareDocumentText(" \r\n\t ")).toThrow(/empty/i);
  });

  it("normalizes inline whitespace and preserves paragraph boundaries", () => {
    const result = prepareDocumentText("  First\t line\ncontinues.\r\n\r\n  Second   paragraph.  ");
    expect(result.text).toBe("First line continues.\n\nSecond paragraph.");
    expect(result.truncated).toBe(false);
  });

  it("counts and preserves Unicode code points", () => {
    const result = prepareDocumentText("Résumé 😀 東京");
    expect(result.text).toBe("Résumé 😀 東京");
    expect(result.originalCharacterCount).toBe(Array.from("Résumé 😀 東京").length);
  });

  it("leaves input below the limit unchanged after normalization", () => {
    const result = prepareDocumentText("short text", 20);
    expect(result).toEqual({
      text: "short text",
      truncated: false,
      originalCharacterCount: 10,
      transmittedCharacterCount: 10,
    });
  });

  it("does not truncate input exactly at the limit", () => {
    const text = "x".repeat(MAX_DOCUMENT_CHARACTERS);
    const result = prepareDocumentText(text);
    expect(result.truncated).toBe(false);
    expect(result.transmittedCharacterCount).toBe(MAX_DOCUMENT_CHARACTERS);
  });

  it("samples the beginning, middle, and end above the limit", () => {
    const text = `${"A".repeat(100)}${"B".repeat(100)}${"C".repeat(100)}`;
    const result = prepareDocumentText(text, 120);
    expect(result.truncated).toBe(true);
    expect(result.text).toMatch(/^A+/);
    expect(result.text).toContain("B");
    expect(result.text).toMatch(/C+$/);
    expect(result.transmittedCharacterCount).toBeLessThanOrEqual(120);
  });

  it("inserts two explicit omission markers", () => {
    const result = prepareDocumentText("x".repeat(300), 120);
    expect(result.text.split(OMISSION_MARKER)).toHaveLength(3);
  });

  it("is deterministic and reports truncation metadata", () => {
    const input = `${"start ".repeat(80)}${"middle ".repeat(80)}${"end ".repeat(80)}`;
    const first = prepareDocumentText(input, 160);
    const second = prepareDocumentText(input, 160);
    expect(first).toEqual(second);
    expect(first.truncated).toBe(true);
    expect(first.originalCharacterCount).toBeGreaterThan(first.transmittedCharacterCount);
  });
});
