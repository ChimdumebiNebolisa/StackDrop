const PREFIX = "[StackDrop]";

/** Dev-only verbose logging. */
export function logDebug(message: string, data?: Record<string, unknown>): void {
  if (import.meta.env.DEV) {
    if (data && Object.keys(data).length > 0) {
      console.debug(PREFIX, message, data);
    } else {
      console.debug(PREFIX, message);
    }
  }
}

/** Lightweight operational log (safe for production: no paths, no body text). */
export function logScanSummary(context: string, summary: Record<string, unknown>): void {
  console.info(PREFIX, context, summary);
}
