/**
 * Current picture of the worn suit.
 *
 * Inventory, already on disk, not a second store:
 * - logs/framework/activity.log — activity-logger.ts and grok-hook-activity appendHookActivity
 * - inference state — InferenceStateManager.load() from vendored @0xray/repertoire
 *   (.xray/state/repertoire/inference-state.json)
 * - repertoire version — that organ's package.json
 * - worn 0xray version — package.json beside this CLI
 * - 0xray report stays the health report; scripts/mjs/goggles-observer.mjs stays the lens check
 */

import { existsSync, readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { dirname, join, resolve } from "node:path";

const REPERTOIRE_PACKAGE_CANDIDATES = [
  "node_modules/@0xray/repertoire/package.json",
  "vendor/@0xray/repertoire/package.json",
  "node_modules/0xray/vendor/@0xray/repertoire/package.json",
];

export type SuitSources = {
  activityLogPath: string;
  inferenceStatePath: string;
  repertoirePackageJson: string | null;
  xrayPackageJson: string;
  tail?: number;
};

export type SuitPicture = {
  activityLines: string[];
  inferenceStatePresent: boolean;
  inferenceLastRun: string | null;
  repertoireVersion: string | null;
  xrayVersion: string | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isConstructor(value: unknown): value is new (filePath?: string) => unknown {
  return typeof value === "function";
}

export function resolveRepertoirePackageJson(cwd: string): string | null {
  for (const rel of REPERTOIRE_PACKAGE_CANDIDATES) {
    const abs = resolve(cwd, rel);
    if (existsSync(abs)) return abs;
  }
  return null;
}

export function defaultSuitSources(cwd: string, xrayPackageJson: string): SuitSources {
  return {
    activityLogPath: join(cwd, "logs", "framework", "activity.log"),
    inferenceStatePath: join(cwd, ".xray", "state", "repertoire", "inference-state.json"),
    repertoirePackageJson: resolveRepertoirePackageJson(cwd),
    xrayPackageJson,
  };
}

function readPackageVersion(packageJsonPath: string): string | null {
  try {
    const raw: unknown = JSON.parse(readFileSync(packageJsonPath, "utf8"));
    if (!isRecord(raw) || typeof raw.version !== "string") return null;
    return raw.version;
  } catch {
    return null;
  }
}

function readLastActivityLines(logPath: string, tail: number): string[] {
  if (!existsSync(logPath) || tail <= 0) return [];
  try {
    const lines = readFileSync(logPath, "utf8")
      .split(/\r?\n/)
      .filter((line) => line.length > 0);
    return lines.slice(-tail);
  } catch {
    return [];
  }
}

function inferenceModuleFromPackage(packageJsonPath: string): string | null {
  const modulePath = join(dirname(packageJsonPath), "dist", "registry", "InferenceStateManager.js");
  return existsSync(modulePath) ? modulePath : null;
}

/** Reuse the organ's read. A missing file stays absent; load() is not a second parser. */
async function loadLastRun(modulePath: string, filePath: string): Promise<string | null> {
  try {
    const loaded: unknown = await import(pathToFileURL(modulePath).href);
    if (!isRecord(loaded) || !isConstructor(loaded.InferenceStateManager)) return null;
    const instance: unknown = new loaded.InferenceStateManager(filePath);
    if (!isRecord(instance) || typeof instance.load !== "function") return null;
    const state: unknown = instance.load();
    if (!isRecord(state) || typeof state.lastRun !== "string") return null;
    return state.lastRun;
  } catch {
    return null;
  }
}

export async function readSuitPicture(sources: SuitSources): Promise<SuitPicture> {
  const tail = sources.tail ?? 8;
  const modulePath = sources.repertoirePackageJson
    ? inferenceModuleFromPackage(sources.repertoirePackageJson)
    : null;
  const inferenceStatePresent = existsSync(sources.inferenceStatePath);
  const inferenceLastRun = inferenceStatePresent && modulePath
    ? await loadLastRun(modulePath, sources.inferenceStatePath)
    : null;

  return {
    activityLines: readLastActivityLines(sources.activityLogPath, tail),
    inferenceStatePresent,
    inferenceLastRun,
    repertoireVersion: sources.repertoirePackageJson
      ? readPackageVersion(sources.repertoirePackageJson)
      : null,
    xrayVersion: readPackageVersion(sources.xrayPackageJson),
  };
}

export function formatSuitPicture(picture: SuitPicture): string {
  const inference = picture.inferenceStatePresent
    ? `present${picture.inferenceLastRun ? ` lastRun ${picture.inferenceLastRun}` : ""}`
    : "absent";
  const activity = picture.activityLines.length > 0
    ? picture.activityLines.map((line) => `  ${line}`).join("\n")
    : "  (none)";
  return [
    "suit monitor",
    `xray: ${picture.xrayVersion ?? "missing"}`,
    `repertoire: ${picture.repertoireVersion ?? "missing"}`,
    `inference state: ${inference}`,
    "activity:",
    activity,
  ].join("\n");
}

export async function printSuitMonitor(cwd: string, packageRoot: string, lines = 8): Promise<void> {
  const sources = defaultSuitSources(cwd, join(packageRoot, "package.json"));
  sources.tail = lines;
  const picture = await readSuitPicture(sources);
  process.stdout.write(`${formatSuitPicture(picture)}\n`);
}
