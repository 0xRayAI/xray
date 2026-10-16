/**
 * One line from streams the suit already writes.
 * Not a doctor, not a second memory.
 */

import { createRequire } from "node:module";
import {
  closeSync,
  existsSync,
  openSync,
  readFileSync,
  readSync,
  statSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);

export type SuitLens = "none" | "armed" | "spent";

export interface SuitPulseActivity {
  gate: string | null;
  decision: string;
  tool: string | null;
}

export interface SuitPulse {
  worn: { version: string; directory: string } | null;
  repertoire: string | null;
  inferenceSeconds: number | null;
  activity: SuitPulseActivity | null;
  lens: SuitLens;
  plant: boolean;
  line: string;
}

export interface SuitPulseOptions {
  /** Epoch ms. Tests pin this so inference age stays exact. */
  now?: number;
  /** Override the CLI directory. Hooks and node_modules/0xray are the default. */
  wornDir?: string;
}

interface InferenceReaderModule {
  InferenceStateManager?: new (filePath?: string) => { load: () => unknown };
}

const ACTIVITY_LINE =
  /^\S+\s+(?:\[[^\]]*\]\s+)?\[[^\]]+\]\s+(\S+)\s+-\s+\S+(?:\s+\|\s+(\{.*\}))?\s*$/;

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function rawText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function textField(value: unknown): string | null {
  const text = rawText(value);
  return text ? text.toLowerCase() : null;
}

function readVersion(pkgPath: string): string | null {
  if (!existsSync(pkgPath)) return null;
  try {
    const parsed: unknown = JSON.parse(readFileSync(pkgPath, "utf8"));
    const version = asRecord(parsed)?.version;
    return typeof version === "string" && version.trim() ? version.trim() : null;
  } catch {
    return null;
  }
}

/** Directory named by the fastened Grok hook, or null when the file names none. */
function hookLaunchDir(root: string): string | null {
  const file = join(root, ".grok", "plugins", "0xray", "hooks", "hooks.json");
  if (!existsSync(file)) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(file, "utf8"));
  } catch {
    return null;
  }
  const pre = asRecord(asRecord(parsed)?.hooks)?.PreToolUse;
  if (!Array.isArray(pre)) return null;
  for (const group of pre) {
    const hooks = asRecord(group)?.hooks;
    if (!Array.isArray(hooks)) continue;
    for (const hook of hooks) {
      const body = asRecord(hook);
      if (!body) continue;
      const envPath = rawText(asRecord(body.env)?.XRAY_AI_PATH);
      const fromEnv = envPath ? packageDir(envPath) : null;
      if (fromEnv) return fromEnv;
      const blobs: string[] = [];
      if (typeof body.command === "string") blobs.push(body.command);
      if (Array.isArray(body.args)) {
        for (const arg of body.args) {
          if (typeof arg === "string") blobs.push(arg);
        }
      }
      for (const blob of blobs) {
        const found = packageDirFromText(blob);
        if (found) return found;
      }
    }
  }
  return null;
}

function packageDir(spec: string): string | null {
  if (!spec.startsWith("/") || spec.includes("$")) return null;
  const marker = "/node_modules/0xray";
  const at = spec.indexOf(marker);
  if (at >= 0) return spec.slice(0, at + marker.length);
  return spec;
}

function packageDirFromText(text: string): string | null {
  const matches = text.match(/\/[^\s"']+/g);
  if (!matches) return null;
  for (const match of matches) {
    const dir = packageDir(match);
    if (dir) return dir;
  }
  return null;
}

function resolveWornDir(root: string, opts: SuitPulseOptions): string | null {
  if (opts.wornDir) return opts.wornDir;
  const hooked = hookLaunchDir(root);
  if (hooked) return hooked;
  const local = join(root, "node_modules", "0xray");
  return existsSync(local) ? local : null;
}

function readWorn(root: string, opts: SuitPulseOptions): SuitPulse["worn"] {
  const directory = resolveWornDir(root, opts);
  if (!directory || !existsSync(directory)) return null;
  const version = readVersion(join(directory, "package.json"));
  if (!version) return null;
  return { version, directory };
}

function repertoireVersion(root: string): string | null {
  return readVersion(join(root, "node_modules", "@0xray", "repertoire", "package.json"));
}

function repertoireIndex(root: string): string | null {
  const here = dirname(fileURLToPath(import.meta.url));
  const candidates = [
    join(root, "node_modules", "@0xray", "repertoire", "dist", "index.js"),
    join(root, "vendor", "@0xray", "repertoire", "dist", "index.js"),
    join(root, "node_modules", "0xray", "vendor", "@0xray", "repertoire", "dist", "index.js"),
    join(here, "..", "..", "vendor", "@0xray", "repertoire", "dist", "index.js"),
    join(here, "..", "..", "..", "vendor", "@0xray", "repertoire", "dist", "index.js"),
  ];
  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate;
  }
  return null;
}

/** Whole seconds since InferenceState.lastRun. A missing or null run is none. */
function secondsSinceLastRun(lastRun: unknown, now: number): number | null {
  if (typeof lastRun !== "string") return null;
  const parsed = Date.parse(lastRun);
  if (!Number.isFinite(parsed)) return null;
  return Math.max(0, Math.floor((now - parsed) / 1000));
}

function inferenceAge(root: string, now: number): number | null {
  const index = repertoireIndex(root);
  if (!index) return null;
  const file = join(root, ".xray", "state", "repertoire", "inference-state.json");
  try {
    const loaded = require(index) as InferenceReaderModule;
    const Manager = loaded.InferenceStateManager;
    if (typeof Manager !== "function") return null;
    const state = asRecord(new Manager(file).load());
    return secondsSinceLastRun(state?.lastRun, now);
  } catch {
    return null;
  }
}

function readTail(file: string, maxBytes = 65536): string {
  const size = statSync(file).size;
  const start = Math.max(0, size - maxBytes);
  const fd = openSync(file, "r");
  try {
    const buf = Buffer.alloc(size - start);
    readSync(fd, buf, 0, buf.length, start);
    let text = buf.toString("utf8");
    if (start > 0) {
      const cut = text.indexOf("\n");
      if (cut >= 0) text = text.slice(cut + 1);
    }
    return text;
  } finally {
    closeSync(fd);
  }
}

function parseActivityLine(line: string): SuitPulseActivity | null {
  const match = ACTIVITY_LINE.exec(line.trim());
  const action = match?.[1];
  if (!action) return null;
  const decision = action.toLowerCase();
  let gate: string | null = null;
  let tool: string | null = null;
  const detailsJson = match?.[2];
  if (detailsJson) {
    try {
      const details = asRecord(JSON.parse(detailsJson));
      gate = textField(details?.gate);
      tool = textField(details?.tool);
    } catch {
      /* the action still stands */
    }
  }
  return { gate, decision, tool };
}

function lastActivity(root: string): SuitPulseActivity | null {
  const file = join(root, "logs", "framework", "activity.log");
  if (!existsSync(file)) return null;
  let text = "";
  try {
    text = readTail(file);
  } catch {
    return null;
  }
  const lines = text.split("\n");
  for (let i = lines.length - 1; i >= 0; i -= 1) {
    const line = lines[i]?.trim();
    if (!line) continue;
    const parsed = parseActivityLine(line);
    if (parsed) return parsed;
  }
  return null;
}

/** absent → none. Same shape as the goggles read pass. */
function lensState(root: string): SuitLens {
  const file = join(root, ".xray", "state", "goggles-lens-pass.json");
  if (!existsSync(file)) return "none";
  try {
    const data = asRecord(JSON.parse(readFileSync(file, "utf8")));
    if (!data || data.read !== true) return "none";
    return data.spent === true ? "spent" : "armed";
  } catch {
    return "none";
  }
}

/** node_modules/0xray/package.json. Seat doctor already owns mill+inspect. */
function plantPresent(root: string): boolean {
  return existsSync(join(root, "node_modules", "0xray", "package.json"));
}

function activityToken(activity: SuitPulseActivity | null): string {
  if (!activity) return "none";
  const parts = [activity.gate, activity.decision, activity.tool].filter(
    (part): part is string => Boolean(part),
  );
  return parts.length ? parts.join(":") : "none";
}

export function readSuitPulse(root: string, opts: SuitPulseOptions = {}): SuitPulse {
  const now = opts.now ?? Date.now();
  const worn = readWorn(root, opts);
  const repertoire = repertoireVersion(root);
  const inferenceSeconds = inferenceAge(root, now);
  const activity = lastActivity(root);
  const lens = lensState(root);
  const plant = plantPresent(root);
  const head = worn ? `WORN ${worn.version}` : "BARE";
  const line = [
    head,
    `repertoire ${repertoire ?? "missing"}`,
    `inference ${inferenceSeconds === null ? "none" : `${inferenceSeconds}s`}`,
    `activity ${activityToken(activity)}`,
    `lens ${lens}`,
    `plant ${plant ? "yes" : "no"}`,
  ].join(" ");
  return { worn, repertoire, inferenceSeconds, activity, lens, plant, line };
}
