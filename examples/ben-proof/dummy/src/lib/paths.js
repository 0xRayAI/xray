import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const moduleDir = dirname(fileURLToPath(import.meta.url));
export const appRoot = join(moduleDir, "..", "..");
export const dataDir = join(appRoot, "data");
export const lessonsPath = join(dataDir, "lessons.jsonl");
