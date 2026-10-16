/**
 * ESM face for wake-cascade.cjs.
 */
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const require = createRequire(import.meta.url);
const impl = require(join(dirname(fileURLToPath(import.meta.url)), "wake-cascade.cjs"));

export const CASCADE_PLANE = impl.CASCADE_PLANE;
export const MEMORY_PLANES = impl.MEMORY_PLANES;
export const isCascadePlane = impl.isCascadePlane;
export const readWakeCascade = impl.readWakeCascade;
export const formatCascadePointer = impl.formatCascadePointer;
export const formatCascadeReading = impl.formatCascadeReading;
