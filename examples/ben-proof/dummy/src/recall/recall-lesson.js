import { open } from "node:fs/promises";
import { lessonsPath } from "../lib/paths.js";
import { validateLessonRecord } from "../gates/recall-gate.js";
import { log } from "../lib/logger.js";

/**
 * Read the last existing lesson line. Opens the file read-only and never mints or appends.
 * @returns {Promise<import("../governance/types.js").LessonRecord>}
 */
export async function recallLatestLesson() {
  let raw;
  const handle = await open(lessonsPath, "r");
  try {
    raw = await handle.readFile({ encoding: "utf8" });
  } finally {
    await handle.close();
  }

  const lines = raw.split("\n").filter((line) => line.trim().length > 0);
  if (!lines.length) {
    throw new Error("No lessons found in data/lessons.jsonl");
  }

  const lesson = JSON.parse(lines[lines.length - 1]);
  const gate = validateLessonRecord(lesson);
  if (!gate.ok) {
    throw new Error(`Recall gate failed: ${gate.reason}`);
  }
  log("recall", "lesson-loaded", "info", {
    lessonId: lesson.lessonId,
    benchToken: lesson.benchToken,
  });
  return lesson;
}
