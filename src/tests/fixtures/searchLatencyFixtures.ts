import type { DocumentUpsertInput } from "../../data/repositories/documentRepository";

export interface SearchLatencyFixtureDocument {
  id: string;
  absolutePath: string;
  relativePath: string;
  fileName: string;
  body: string;
  updatedAt: string;
}

export interface SearchLatencyFixtureCorpus {
  rootPath: string;
  documents: SearchLatencyFixtureDocument[];
  queries: {
    exactFilename: string;
    filenamePrefix: string;
    relativePath: string;
    bodyOnly: string;
    fallbackSubstring: string;
  };
}

function padded(index: number): string {
  return index.toString().padStart(4, "0");
}

function stableTimestamp(index: number): string {
  return `2025-01-${((index % 28) + 1).toString().padStart(2, "0")}T00:00:00.000Z`;
}

export function createSearchLatencyFixtureCorpus(size = 240): SearchLatencyFixtureCorpus {
  const rootPath = "/tmp/stackdrop-latency-fixture";
  const documents: SearchLatencyFixtureDocument[] = [];

  for (let index = 0; index < size; index += 1) {
    const label = padded(index);
    const bucket = index % 6;
    const directory = ["finance", "engineering", "legal", "sales", "support", "archive"][bucket];
    const fileName = `fixture-${label}-${directory}.txt`;
    const relativePath = `${directory}/2025/week-${padded(index % 52)}/${fileName}`;
    const body = [
      `StackDrop deterministic latency fixture ${label}.`,
      `Bucket ${directory} contains ordinary body text for lexical search.`,
      index % 11 === 0 ? "shared-body-latency-token appears here." : "non-target filler body text appears here.",
      index % 17 === 0 ? "secondary repeated term for ranking shape." : "stable filler paragraph.",
    ].join(" ");

    documents.push({
      id: `latency-doc-${label}`,
      absolutePath: `${rootPath}/${relativePath}`,
      relativePath,
      fileName,
      body,
      updatedAt: stableTimestamp(index),
    });
  }

  documents.push(
    {
      id: "latency-doc-exact-filename",
      absolutePath: `${rootPath}/reports/latency-target-report.txt`,
      relativePath: "reports/latency-target-report.txt",
      fileName: "latency-target-report.txt",
      body: "ordinary report body without the exact filename terms repeated",
      updatedAt: "2025-02-01T00:00:00.000Z",
    },
    {
      id: "latency-doc-prefix",
      absolutePath: `${rootPath}/reports/latency-prefix-candidate.txt`,
      relativePath: "reports/latency-prefix-candidate.txt",
      fileName: "latency-prefix-candidate.txt",
      body: "prefix candidate body text",
      updatedAt: "2025-02-02T00:00:00.000Z",
    },
    {
      id: "latency-doc-path",
      absolutePath: `${rootPath}/clients/acme/quarterly/readme.txt`,
      relativePath: "clients/acme/quarterly/readme.txt",
      fileName: "readme.txt",
      body: "path-sensitive document body",
      updatedAt: "2025-02-03T00:00:00.000Z",
    },
    {
      id: "latency-doc-body",
      absolutePath: `${rootPath}/body/body-token.txt`,
      relativePath: "body/body-token.txt",
      fileName: "body-token.txt",
      body: "rare-body-latency-token is present only in document contents",
      updatedAt: "2025-02-04T00:00:00.000Z",
    },
    {
      id: "latency-doc-fallback",
      absolutePath: `${rootPath}/finance/invoice2026.txt`,
      relativePath: "finance/invoice2026.txt",
      fileName: "invoice2026.txt",
      body: "fallback substring fixture body",
      updatedAt: "2025-02-05T00:00:00.000Z",
    },
  );

  return {
    rootPath,
    documents,
    queries: {
      exactFilename: "latency-target-report.txt",
      filenamePrefix: "latency-pref",
      relativePath: "acme quarterly",
      bodyOnly: "rare-body-latency-token",
      fallbackSubstring: "voice2026",
    },
  };
}

export function toDocumentUpsertInput(
  folderId: string,
  document: SearchLatencyFixtureDocument,
): DocumentUpsertInput {
  return {
    id: document.id,
    folderId,
    absolutePath: document.absolutePath,
    relativePath: document.relativePath,
    fileName: document.fileName,
    fileExtension: "txt",
    sizeBytes: document.body.length,
    modifiedAt: document.updatedAt,
    parseStatus: "parsed_text",
    parseError: null,
    extractedText: document.body,
    updatedAt: document.updatedAt,
  };
}
