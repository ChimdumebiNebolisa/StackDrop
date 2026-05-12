import { getDocument, GlobalWorkerOptions } from "pdfjs-dist/legacy/build/pdf.mjs";
import pdfWorkerUrl from "pdfjs-dist/legacy/build/pdf.worker.mjs?url";

if (typeof window !== "undefined") {
  GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
}

export async function parsePdfFromBytes(bytes: Uint8Array): Promise<string> {
  const loadingTask = getDocument({ data: bytes });
  const pdf = await loadingTask.promise;
  const pageTexts: string[] = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const textContent = await page.getTextContent();
    const text = textContent.items
      .map((item) => ("str" in item ? item.str : ""))
      .filter(Boolean)
      .join(" ");
    pageTexts.push(text);
  }

  return pageTexts.join("\n").trim();
}
