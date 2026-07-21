import { describe, expect, it } from "vitest";

import { validateDocumentSummary } from "../../features/document-summary/validation/validateDocumentSummary";

const valid = {
  overview: "A concise overview.",
  keyPoints: ["One key point"],
  importantDetails: ["One important detail"],
  importantDates: ["January 1"],
  actionItems: ["Review the document"],
  uncertainties: ["The owner is not specified"],
};

describe("validateDocumentSummary", () => {
  it("accepts a fully valid response", () => {
    expect(validateDocumentSummary(valid)).toEqual(valid);
  });

  it("accepts empty optional arrays", () => {
    const source = { ...valid, importantDates: [], actionItems: [], uncertainties: [] };
    expect(validateDocumentSummary(source)).toEqual(source);
  });

  it("rejects a missing or blank overview", () => {
    const { overview: _overview, ...missing } = valid;
    expect(() => validateDocumentSummary(missing)).toThrow(/expected structure/i);
    expect(() => validateDocumentSummary({ ...valid, overview: " " })).toThrow(/expected structure/i);
  });

  it("rejects incorrect field types", () => {
    expect(() => validateDocumentSummary({ ...valid, keyPoints: "not an array" })).toThrow(/expected structure/i);
  });

  it("rejects excessive array lengths", () => {
    expect(() => validateDocumentSummary({ ...valid, keyPoints: Array.from({ length: 9 }, () => "point") })).toThrow(/expected structure/i);
  });

  it("rejects excessive string lengths", () => {
    expect(() => validateDocumentSummary({ ...valid, overview: "x".repeat(2_001) })).toThrow(/expected structure/i);
    expect(() => validateDocumentSummary({ ...valid, keyPoints: ["x".repeat(501)] })).toThrow(/expected structure/i);
  });

  it("rejects malformed JSON", () => {
    expect(() => validateDocumentSummary("{not json}")).toThrow(/expected structure/i);
  });

  it("rejects unexpected source shapes and fields", () => {
    expect(() => validateDocumentSummary([])).toThrow(/expected structure/i);
    expect(() => validateDocumentSummary({ ...valid, rawResponse: "not allowed" })).toThrow(/expected structure/i);
  });
});
