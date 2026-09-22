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
export const readGitSubject = impl.readGitSubject;
export const readPlanLine = impl.readPlanLine;
export const buildRepertoireResume = impl.buildRepertoireResume;
export const persistRepertoireWorking = impl.persistRepertoireWorking;
export const readRepertoireWorking = impl.readRepertoireWorking;
export const readOpProcNames = impl.readOpProcNames;
export const hydrateDestOnWake = impl.hydrateDestOnWake;
export const growDestOnWake = impl.growDestOnWake;
export const heatLiveMemory = impl.heatLiveMemory;
export const withDestLock = impl.withDestLock;
export const slugPrimitiveName = impl.slugPrimitiveName;
export const patternsFromGit = impl.patternsFromGit;
export const readNotesPickup = impl.readNotesPickup;
export const maybeCaptureSessionOnHeadMove = impl.maybeCaptureSessionOnHeadMove;
export const formatWorkingLine = impl.formatWorkingLine;
export const applyStationHeat = impl.applyStationHeat;
export const isStockTicket = impl.isStockTicket;
export const readStationTicketField = impl.readStationTicketField;
export const resolveHeatIntent = impl.resolveHeatIntent;
export const resolveHeatPlan = impl.resolveHeatPlan;
export const extractPreservedStationLines = impl.extractPreservedStationLines;
export const mergeStationMarkdown = impl.mergeStationMarkdown;
export const formatStationMarkdown = impl.formatStationMarkdown;
export const writeStationMarkdown = impl.writeStationMarkdown;
export const isHoldNpmLine = impl.isHoldNpmLine;
export const stationDurableHoldsNpm = impl.stationDurableHoldsNpm;
export const stationBootNeedsRefresh = impl.stationBootNeedsRefresh;
