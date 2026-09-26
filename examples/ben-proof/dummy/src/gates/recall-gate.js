/**
 * Validates recalled lesson shape before smoke comparison.
 * @param {unknown} record
 */
export function validateLessonRecord(record) {
  if (!record || typeof record !== "object") {
    return { ok: false, reason: "not an object" };
  }
  const r = record;
  const required = ["lessonId", "benchToken", "summary", "governance", "createdAt"];
  for (const key of required) {
    if (!(key in r)) {
      return { ok: false, reason: `missing ${key}` };
    }
  }
  if (typeof r.benchToken !== "string" || !/^bench-[0-9a-f]+$/i.test(r.benchToken)) {
    return { ok: false, reason: "invalid benchToken format" };
  }
  if (typeof r.summary !== "string" || !r.summary.length) {
    return { ok: false, reason: "empty summary" };
  }
  return { ok: true };
}
