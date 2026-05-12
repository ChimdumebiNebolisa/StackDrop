export interface NormalizeLinkInput {
  title: string;
  url: string;
}

export function normalizeLink(input: NormalizeLinkInput): NormalizeLinkInput {
  const title = input.title.trim();
  const url = input.url.trim();

  if (!title) {
    throw new Error("Link title is required.");
  }
  if (!url) {
    throw new Error("Link URL is required.");
  }

  try {
    // Validates structure without introducing network behavior.
    new URL(url);
  } catch {
    throw new Error("Link URL is invalid.");
  }

  return { title, url };
}
