import * as fs from "fs";
import * as path from "path";
import { captureReflectionInference, SessionInference } from "./session-capture.js";
import type { StructuralPattern } from "./semantic-patterns.js";

export interface InferenceCorpus {
  sessions: SessionInference[];
  totalCommits: number;
  recurringPatterns: RecurringPattern[];
  recurringProblems: RecurringProblem[];
  uniqueApproaches: string[];
  allWrongTurns: string[];
  collectedAt: string;
}

export interface RecurringPattern {
  name: string;
  occurrences: number;
  avgConfidence: number;
  sessions: string[];
  evidence: string[];
  description: string;
}

export interface RecurringProblem {
  pattern: string;
  occurrences: number;
  sessions: string[];
}

export function shouldTriggerCycle(inferenceDir: string, lastCycleFile: string): { trigger: boolean; reason: string } {
  const sessions = loadCorpusSessions(inferenceDir);
  if (sessions.length < 1) {
    return { trigger: false, reason: `no session files collected` };
  }

  const lastCycle = loadLastCycleDate(lastCycleFile);
  const daysSince = lastCycle ? daysBetween(new Date(lastCycle), new Date()) : Infinity;

  if (daysSince < 1) {
    return { trigger: false, reason: `${daysSince.toFixed(1)} days since last cycle (minimum 1)` };
  }

  const totalCommits = sessions.reduce((sum, s) => sum + s.metrics.commits, 0);
  if (totalCommits < 5 && daysSince < 3) {
    return { trigger: false, reason: `${totalCommits}/5 total commits, ${daysSince.toFixed(1)}/3 days` };
  }

  return {
    trigger: true,
    reason: `${sessions.length} sessions, ${totalCommits} commits, ${daysSince.toFixed(1)} days since last cycle`,
  };
}

export function accumulateCorpus(inferenceDir: string): InferenceCorpus {
  const sessions = loadCorpusSessions(inferenceDir);

  const totalCommits = sessions.reduce((sum, s) => sum + s.metrics.commits, 0);

  const patternMap = new Map<string, { count: number; confidence: number[]; sessions: string[]; evidence: string[]; description: string }>();
  for (const session of sessions) {
    for (const p of session.patterns) {
      const existing = patternMap.get(p.name);
      const evidence = patternEvidence(p);
      if (existing) {
        existing.count++;
        existing.confidence.push(p.confidence);
        existing.sessions.push(session.sessionId);
        for (const e of evidence) {
          if (!existing.evidence.includes(e)) existing.evidence.push(e);
        }
      } else {
        patternMap.set(p.name, {
          count: 1,
          confidence: [p.confidence],
          sessions: [session.sessionId],
          evidence: [...evidence],
          description: p.description,
        });
      }
    }
  }

  const recurringPatterns: RecurringPattern[] = [...patternMap.entries()]
    .filter(([, data]) => data.count >= 2)
    .map(([name, data]) => ({
      name,
      occurrences: data.count,
      avgConfidence: data.confidence.reduce((a, b) => a + b, 0) / data.confidence.length,
      sessions: data.sessions,
      evidence: data.evidence.slice(0, 5),
      description: data.description,
    }))
    .sort((a, b) => b.occurrences - a.occurrences || b.avgConfidence - a.avgConfidence);

  const problemMap = new Map<string, { count: number; sessions: string[] }>();
  for (const session of sessions) {
    for (const problem of session.problems) {
      const key = normalizeProblem(problem);
      const existing = problemMap.get(key);
      if (existing) {
        existing.count++;
        if (!existing.sessions.includes(session.sessionId)) existing.sessions.push(session.sessionId);
      } else {
        problemMap.set(key, { count: 1, sessions: [session.sessionId] });
      }
    }
  }

  const recurringProblems: RecurringProblem[] = [...problemMap.entries()]
    .filter(([, data]) => data.count >= 2)
    .map(([pattern, data]) => ({ pattern, occurrences: data.count, sessions: data.sessions }))
    .sort((a, b) => b.occurrences - a.occurrences);

  const uniqueApproaches = [...new Set(sessions.flatMap((s) => s.approaches))];
  const allWrongTurns = [...new Set(sessions.flatMap((s) => s.wrongTurns))];

  return {
    sessions,
    totalCommits,
    recurringPatterns,
    recurringProblems,
    uniqueApproaches,
    allWrongTurns,
    collectedAt: new Date().toISOString(),
  };
}

function loadCorpusSessions(inferenceDir: string): SessionInference[] {
  return [...loadSessionInferences(inferenceDir), ...loadReflectionInferences(inferenceDir)];
}

/** Reflection files are graded in memory. They are not copied into session-*.json. */
export function loadReflectionInferences(inferenceDir: string): SessionInference[] {
  const projectRoot = path.resolve(inferenceDir, "..", "..");
  const signalNames = readDestSignalNames(projectRoot);
  const root = path.join(projectRoot, "docs", "reflections");
  const sessions: SessionInference[] = [];
  for (const file of listMarkdown(root)) {
    const relativePath = path.relative(root, file);
    if (/template/i.test(path.basename(file))) continue;
    let text = "";
    try {
      text = fs.readFileSync(file, "utf-8");
    } catch {
      continue;
    }
    const modifiedAt = fs.statSync(file).mtime;
    const session = captureReflectionInference({ relativePath, text, modifiedAt, signalNames });
    if (session) sessions.push(session);
  }
  return sessions;
}

function listMarkdown(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const found: string[] = [];
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    let stat: fs.Stats;
    try {
      stat = fs.statSync(full);
    } catch {
      continue;
    }
    if (stat.isDirectory()) {
      found.push(...listMarkdown(full));
      continue;
    }
    if (name.endsWith(".md")) found.push(full);
  }
  return found;
}

function readDestSignalNames(projectRoot: string): string[] {
  const dest = path.join(projectRoot, ".xray", "state", "repertoire", "curated_signals.json");
  if (!fs.existsSync(dest)) return [];
  try {
    const parsed = JSON.parse(fs.readFileSync(dest, "utf-8")) as { signals?: unknown };
    if (!Array.isArray(parsed.signals)) return [];
    const names: string[] = [];
    for (const signal of parsed.signals) {
      if (!signal || typeof signal !== "object") continue;
      const name = (signal as { name?: unknown }).name;
      if (typeof name === "string" && name.trim().length > 0) names.push(name.trim());
    }
    return names;
  } catch {
    return [];
  }
}

export function loadSessionInferences(dir: string): SessionInference[] {
  if (!fs.existsSync(dir)) return [];

  return fs.readdirSync(dir)
    .filter((f) => f.startsWith("session-") && f.endsWith(".json"))
    .map((f) => {
      try {
        const parsed = JSON.parse(fs.readFileSync(path.join(dir, f), "utf-8")) as SessionInference;
        const named = readMatchedPrimitives(parsed);
        parsed.matched_primitives = named;
        parsed.matchedPrimitives = named;
        return parsed;
      } catch {
        return null;
      }
    })
    .filter((s): s is SessionInference => isSessionInference(s));
}

/** Captured patterns sometimes omit evidence. That is an empty list, not a throw. */
function readMatchedPrimitives(value: unknown): string[] {
  if (!value || typeof value !== "object") return [];
  const raw = (value as { matched_primitives?: unknown }).matched_primitives
    ?? (value as { matchedPrimitives?: unknown }).matchedPrimitives;
  if (!Array.isArray(raw)) return [];
  return [...new Set(raw.filter((item): item is string => typeof item === "string" && item.length > 0))];
}

function patternEvidence(pattern: { evidence?: unknown }): string[] {
  if (!Array.isArray(pattern.evidence)) return [];
  return pattern.evidence.filter((item): item is string => typeof item === "string");
}

/** Notes and partial JSON under docs/inference are not sessions. */
function isSessionInference(value: unknown): value is SessionInference {
  if (!value || typeof value !== "object") return false;
  const session = value as SessionInference;
  return typeof session.sessionId === "string"
    && Array.isArray(session.patterns)
    && Array.isArray(session.problems)
    && Array.isArray(session.approaches)
    && Array.isArray(session.wrongTurns)
    && typeof session.metrics?.commits === "number";
}

function loadLastCycleDate(filePath: string): string | null {
  if (!fs.existsSync(filePath)) return null;
  try {
    const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    return data.completedAt || data.timestamp || null;
  } catch {
    return null;
  }
}

function normalizeProblem(problem: string): string {
  return problem
    .replace(/\([a-f0-9]{7}\)/g, "")
    .replace(/\d+ commits affected/g, "N commits affected")
    .replace(/\d+ files?/g, "N files")
    .trim();
}

function daysBetween(a: Date, b: Date): number {
  return (b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24);
}
