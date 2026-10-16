import { log } from "../lib/logger.js";

const FORBIDDEN_SNIPPETS = ["ts-ignore", "ts-expect-error"];

/**
 * Pre-intake gate (inspired by preValidate + console-log guard patterns).
 * @param {string} summary
 */
export function assertIntakeAllowed(summary) {
  if (!summary || typeof summary !== "string") {
    throw new Error("Lesson summary must be a non-empty string");
  }
  if (summary.length > 16_384) {
    throw new Error("Lesson summary exceeds maximum length");
  }
  for (const snippet of FORBIDDEN_SNIPPETS) {
    if (summary.includes(snippet)) {
      throw new Error(`Forbidden pattern in lesson summary: ${snippet}`);
    }
  }
  if (/\bbench-[0-9a-f]{8,}\b/i.test(summary)) {
    throw new Error("Lesson summary must not embed runtime bench tokens");
  }
  log("gates", "intake-allowed", "debug", { summaryLength: summary.length });
  return true;
}
