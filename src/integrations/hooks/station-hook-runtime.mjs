/**
 * ESM face for station-hook-runtime.cjs — Grok hooks import this.
 */
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const require = createRequire(import.meta.url);
const impl = require(join(dirname(fileURLToPath(import.meta.url)), 'station-hook-runtime.cjs'));

export const stationMarkdownPath = impl.stationMarkdownPath;
export const sessionBootPath = impl.sessionBootPath;
export const clipIntent = impl.clipIntent;
export const readExistingBoot = impl.readExistingBoot;
export const readGitBrief = impl.readGitBrief;
export const readPlanLine = impl.readPlanLine;
export const buildRepertoireResume = impl.buildRepertoireResume;
export const applyStationHeat = impl.applyStationHeat;
export const formatStationMarkdown = impl.formatStationMarkdown;
export const writeStationMarkdown = impl.writeStationMarkdown;
