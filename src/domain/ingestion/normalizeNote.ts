export interface NormalizeNoteInput {
  title: string;
  body: string;
}

export function normalizeNote(input: NormalizeNoteInput): NormalizeNoteInput {
  const title = input.title.trim();
  const body = input.body.trim();
  if (!title) {
    throw new Error("Note title is required.");
  }
  if (!body) {
    throw new Error("Note body is required.");
  }
  return { title, body };
}
