/**
 * ESM face for session-note-index.cjs.
 */
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const require = createRequire(import.meta.url);
const impl = require(join(dirname(fileURLToPath(import.meta.url)), "session-note-index.cjs"));

export const DAY_MS = impl.DAY_MS;
export const STALE_AFTER_MS = impl.STALE_AFTER_MS;
export const SHORT_INDEX_LIMIT = impl.SHORT_INDEX_LIMIT;
export const LINE_MAX = impl.LINE_MAX;
export const sessionNotesPath = impl.sessionNotesPath;
export const lawsPath = impl.lawsPath;
export const rememberSessionNote = impl.rememberSessionNote;
export const shortSessionIndex = impl.shortSessionIndex;
export const dropStaleSessionNotes = impl.dropStaleSessionNotes;
export const retainProjectNotes = impl.retainProjectNotes;
