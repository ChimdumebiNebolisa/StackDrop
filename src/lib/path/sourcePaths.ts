/** Last path segment (includes extension), normalized for Windows paths. */
export function fileBasename(filePath: string): string {
  const normalized = filePath.replace(/\\/g, "/");
  const seg = normalized.split("/").pop();
  return seg && seg.length > 0 ? seg : filePath;
}

/** Lowercase extension including leading dot, or "" if none. */
export function fileExtension(filePath: string): string {
  const base = fileBasename(filePath);
  const dot = base.lastIndexOf(".");
  return dot <= 0 ? "" : base.slice(dot).toLowerCase();
}
