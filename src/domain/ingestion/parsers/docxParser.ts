import mammoth from "mammoth";

/**
 * Extract plain text from a .docx (OOXML) file.
 * Mammoth accepts a byte buffer at runtime; official typings are Node-centric (`Buffer`).
 */
export async function parseDocxFromBytes(bytes: Uint8Array): Promise<string> {
  const source =
    typeof window === "undefined"
      ? ({ buffer: bytes } as Parameters<typeof mammoth.extractRawText>[0])
      : ({
          arrayBuffer: bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
        } as Parameters<typeof mammoth.extractRawText>[0]);
  const { value } = await mammoth.extractRawText(source);
  return value.trim();
}
