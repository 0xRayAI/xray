import { appendFile, mkdir, readFile } from "node:fs/promises";
import { dataDir, lessonsPath } from "../lib/paths.js";

/**
 * @param {import("../governance/types.js").LessonRecord} record
 */
export async function appendLesson(record) {
  await mkdir(dataDir, { recursive: true });
  const line = `${JSON.stringify(record)}\n`;
  await appendFile(lessonsPath, line, "utf8");
}

/**
 * @returns {Promise<import("../governance/types.js").LessonRecord|null>}
 */
export async function readLastLesson() {
  try {
    const raw = await readFile(lessonsPath, "utf8");
    const lines = raw.trim().split("\n").filter(Boolean);
    if (!lines.length) return null;
    return JSON.parse(lines[lines.length - 1]);
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      return null;
    }
    throw error;
  }
}
