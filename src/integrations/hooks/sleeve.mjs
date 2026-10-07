/**
 * ESM face for sleeve.cjs.
 */
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const require = createRequire(import.meta.url);
const impl = require(join(dirname(fileURLToPath(import.meta.url)), "sleeve.cjs"));

export const STITCHES = impl.STITCHES;
export const SLEEVE_PLANES = impl.SLEEVE_PLANES;
export const isSleevePlane = impl.isSleevePlane;
export const readSleeve = impl.readSleeve;
export const runFoundryMill = impl.runFoundryMill;
export const formatSleevePointer = impl.formatSleevePointer;
export const formatSleeveReading = impl.formatSleeveReading;
