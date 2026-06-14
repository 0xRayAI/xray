import * as fs from "fs";
import * as path from "path";
import { SessionInference } from "./session-capture.js";
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
  const sessions = loadSessionInferences(inferenceDir);
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
  const sessions = loadSessionInferences(inferenceDir);

  const totalCommits = sessions.reduce((sum, s) => sum + s.metrics.commits, 0);

  const patternMap = new Map<string, { count: number; confidence: number[]; sessions: string[]; evidence: string[]; description: string }>();
  for (const session of sessions) {
    for (const p of session.patterns) {
      const existing = patternMap.get(p.name);
      if (existing) {
        existing.count++;
        existing.confidence.push(p.confidence);
        existing.sessions.push(session.sessionId);
        for (const e of p.evidence) {
          if (!existing.evidence.includes(e)) existing.evidence.push(e);
        }
      } else {
        patternMap.set(p.name, {
          count: 1,
          confidence: [p.confidence],
          sessions: [session.sessionId],
          evidence: [...p.evidence],
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

export function loadSessionInferences(dir: string): SessionInference[] {
  if (!fs.existsSync(dir)) return [];

  return fs.readdirSync(dir)
    .filter((f) => f.startsWith("session-") && f.endsWith(".json"))
    .map((f) => {
      try {
        return JSON.parse(fs.readFileSync(path.join(dir, f), "utf-8")) as SessionInference;
      } catch {
        return null;
      }
    })
    .filter((s): s is SessionInference => s !== null);
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
