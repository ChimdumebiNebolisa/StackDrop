import mammoth from "mammoth";

/**
 * Extract plain text from a .docx (OOXML) file.
 * Mammoth accepts a byte buffer at runtime; official typings are Node-centric (`Buffer`).
 */
export async function parseDocxFromBytes(bytes: Uint8Array): Promise<string> {
  const { value } = await mammoth.extractRawText({ buffer: bytes } as Parameters<typeof mammoth.extractRawText>[0]);
  return value.trim();
}
