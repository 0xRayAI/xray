import type { InferenceProposal, InferenceCycleResult } from "./inference-cycle.js";
import type { InferenceCorpus, RecurringPattern, RecurringProblem } from "./inference-accumulator.js";
import { LESSON_TEXT_CAP } from "../memory-routing/types.js";

function primitivesForSessions(corpus: InferenceCorpus, sessionIds: string[]): string[] {
  const wanted = new Set(sessionIds);
  const names: string[] = [];
  for (const session of corpus.sessions) {
    if (!wanted.has(session.sessionId)) continue;
    const listed = session.matched_primitives ?? session.matchedPrimitives ?? [];
    for (const name of listed) names.push(name);
  }
  return [...new Set(names.filter((name) => name.length > 0))];
}

function signalsForPattern(corpus: InferenceCorpus, pattern: RecurringPattern): string[] {
  const names = primitivesForSessions(corpus, pattern.sessions);
  if (pattern.name.length > 0) names.push(pattern.name);
  return [...new Set(names)];
}

/** Solid band starts at 0.82. Landed work with no wrong turn clears it. */
const LANDED_RESONANCE = 0.85;
const WRONG_TURN_RESONANCE = 0.4;

function resonanceForNamedSignal(corpus: InferenceCorpus, sessionIds: string[]): number {
  const sessions = corpus.sessions.filter((session) => sessionIds.includes(session.sessionId));
  if (sessions.some((session) => (session.wrongTurns?.length ?? 0) > 0)) return WRONG_TURN_RESONANCE;
  if (sessions.some((session) => (session.approaches?.length ?? 0) > 0 || (session.solutions?.length ?? 0) > 0)) {
    return LANDED_RESONANCE;
  }
  let confidence = 0.7;
  for (const session of sessions) {
    for (const pattern of session.patterns) {
      if (pattern.confidence > confidence) confidence = pattern.confidence;
    }
  }
  return confidence;
}

function sessionsForWrongTurn(corpus: InferenceCorpus, turn: string): string[] {
  return corpus.sessions
    .filter((session) => session.wrongTurns.includes(turn))
    .map((session) => session.sessionId);
}

/** The trace a graded line stores. Wrong turns, then approaches, then solutions. */
function lessonTrace(corpus: InferenceCorpus, sessionIds: string[]): string {
  const wanted = new Set(sessionIds);
  const lines: string[] = [];
  for (const session of corpus.sessions) {
    if (!wanted.has(session.sessionId)) continue;
    for (const turn of session.wrongTurns ?? []) {
      if (turn.trim()) lines.push(turn.trim());
    }
    for (const line of [...(session.approaches ?? []), ...(session.solutions ?? [])]) {
      if (line.trim()) lines.push(line.trim());
    }
  }
  return [...new Set(lines)].join("; ").slice(0, LESSON_TEXT_CAP);
}

function sortedSessionIds(sessionIds: string[]): string[] {
  return [...new Set(sessionIds.filter((sessionId) => sessionId.length > 0))].sort();
}

/** Sessions already included in a prior proposal of this exact prefix. */
function coveredSessions(history: InferenceCycleResult[] | undefined, prefix: string): Set<string> {
  const seen = new Set<string>();
  for (const cycle of history ?? []) {
    for (const proposal of cycle.proposals) {
      if (!proposal.id.startsWith(prefix)) continue;
      for (const sessionId of proposal.id.slice(prefix.length).split(",")) {
        if (sessionId.length > 0) seen.add(sessionId);
      }
    }
  }
  return seen;
}

/** Sessions that have not already been graded under this prefix. */
function freshSessions(
  history: InferenceCycleResult[] | undefined,
  prefix: string,
  sessionIds: string[],
): string[] {
  const covered = coveredSessions(history, prefix);
  return sortedSessionIds(sessionIds).filter((sessionId) => !covered.has(sessionId));
}

function classifyProposalType(problemPattern: string): InferenceProposal["type"] {
  const lower = problemPattern.toLowerCase();
  if (lower.includes("bug") || lower.includes("fix") || lower.includes("stability")) return "fix";
  if (lower.includes("dead code") || lower.includes("remove") || lower.includes("health")) return "refactor";
  if (lower.includes("manual") || lower.includes("automate")) return "automate";
  if (lower.includes("guard") || lower.includes("path") || lower.includes("timing") || lower.includes("edge case")) return "guard";
  return "codify";
}

function patternToProposalType(pattern: RecurringPattern): InferenceProposal["type"] {
  const name = pattern.name.toLowerCase();
  if (name.includes("dead code")) return "refactor";
  if (name.includes("extract")) return "refactor";
  if (name.includes("registry") || name.includes("facade")) return "codify";
  if (name.includes("test")) return "guard";
  if (name.includes("stability")) return "fix";
  return "codify";
}

const ACTION_MAP: [RegExp, string][] = [
  [/^Bug fix$/i, "Fix recurring bug pattern"],
  [/^Code health cleanup$/i, "Clean up code health issues"],
  [/^Accumulated dead code$/i, "Remove accumulated dead code"],
  [/^Incomplete implementation$/i, "Complete partial implementation"],
  [/^Technical debt/i, "Address technical debt"],
  [/^Missing guard/i, "Add missing guard"],
  [/^Manual step/i, "Automate manual step"],
];

function generateTitle(problem: RecurringProblem): string {
  const pattern = problem.pattern;

  for (const [re, title] of ACTION_MAP) {
    if (re.test(pattern)) {
      return `${title} (${problem.occurrences}x across ${problem.sessions.length} sessions)`;
    }
  }

  if (pattern.length > 80) {
    return `Address: ${pattern.substring(0, 77)}... (${problem.occurrences}x)`;
  }

  return `Address: ${pattern} (${problem.occurrences}x)`;
}

function adjustConfidenceFromHistory(
  proposals: InferenceProposal[],
  history: InferenceCycleResult[],
): void {
  if (history.length === 0) return;

  const recentVotes = history.slice(-10).flatMap((h) => h.votes);
  const approvedIds = new Set(
    recentVotes.filter((v) => v.decision === "approve").map((v) => v.proposalId),
  );

  const approvedTypes = new Map<string, number>();
  const rejectedTypes = new Map<string, number>();

  for (const h of history.slice(-10)) {
    for (const p of h.proposals) {
      if (p.status === "approved" || p.status === "applied") {
        approvedTypes.set(p.type, (approvedTypes.get(p.type) ?? 0) + 1);
      } else if (p.status === "rejected" || p.status === "failed") {
        rejectedTypes.set(p.type, (rejectedTypes.get(p.type) ?? 0) + 1);
      }
    }
  }

  for (const proposal of proposals) {
    if (proposal.id.startsWith("named:")) continue;
    const approved = approvedTypes.get(proposal.type) ?? 0;
    const rejected = rejectedTypes.get(proposal.type) ?? 0;
    const total = approved + rejected;
    if (total >= 3) {
      const successRate = approved / total;
      if (successRate < 0.3) {
        proposal.confidence *= 0.8;
      } else if (successRate > 0.7) {
        proposal.confidence = Math.min(0.95, proposal.confidence * 1.05);
      }
    }
  }
}

export function generateProposals(
  corpus: InferenceCorpus,
  history?: InferenceCycleResult[],
): InferenceProposal[] {
  const proposals: InferenceProposal[] = [];
  const proposalSessions = new Map<string, string[]>();

  for (const problem of corpus.recurringProblems) {
    const prefix = `problem:${problem.pattern}:`;
    const sessions = freshSessions(history, prefix, problem.sessions);
    if (sessions.length === 0) continue;
    const id = `${prefix}${sessions.join(",")}`;
    proposalSessions.set(id, sessions);
    proposals.push({
      id,
      type: classifyProposalType(problem.pattern),
      title: generateTitle(problem),
      description: `Recurring across ${problem.occurrences} sessions: ${problem.pattern}`,
      evidence: sessions.map((s) => `Seen in session ${s}`),
      confidence: Math.min(0.95, 0.5 + problem.occurrences * 0.15),
      source: "recurring_problem",
      status: "pending",
      namedSignals: primitivesForSessions(corpus, sessions),
      lesson: lessonTrace(corpus, sessions),
    });
  }

  const seenPatterns = new Set(corpus.recurringProblems.map((p) => p.pattern));
  const allProblems = corpus.sessions.flatMap((s) =>
    s.problems.map((p) => ({ problem: p, session: s.sessionId })),
  );
  for (const { problem, session } of allProblems) {
    const normalized = problem.replace(/\([a-f0-9]{7}\)/g, "").trim();
    if (seenPatterns.has(normalized)) continue;
    if (proposals.length >= 5) break;

    const prefix = `problem:${normalized}:`;
    const sessions = freshSessions(history, prefix, [session]);
    if (sessions.length === 0) {
      seenPatterns.add(normalized);
      continue;
    }
    const id = `${prefix}${sessions.join(",")}`;
    proposalSessions.set(id, sessions);
    proposals.push({
      id,
      type: classifyProposalType(problem),
      title: `Investigate: ${problem.substring(0, 80)}`,
      description: `Observed in session ${session}: ${problem}`,
      evidence: [problem],
      confidence: 0.4,
      source: "recurring_problem",
      status: "pending",
      namedSignals: primitivesForSessions(corpus, sessions),
      lesson: lessonTrace(corpus, sessions),
    });
    seenPatterns.add(normalized);
  }

  for (const pattern of corpus.recurringPatterns) {
    if (pattern.occurrences < 2) continue;
    const prefix = `pattern:${pattern.name}:`;
    const sessions = freshSessions(history, prefix, pattern.sessions);
    if (sessions.length === 0) continue;

    const type = patternToProposalType(pattern);
    const id = `${prefix}${sessions.join(",")}`;
    proposalSessions.set(id, sessions);
    proposals.push({
      id,
      type,
      title: `Codify ${pattern.name} pattern`,
      description: `${pattern.name} detected across ${pattern.occurrences} sessions (avg confidence: ${Math.round(pattern.avgConfidence * 100)}%). ${pattern.description}`,
      evidence: pattern.evidence,
      confidence: pattern.avgConfidence,
      source: "recurring_pattern",
      status: "pending",
      namedSignals: signalsForPattern(corpus, { ...pattern, sessions }),
      lesson: lessonTrace(corpus, sessions),
    });
  }

  const wrongTurns = corpus.allWrongTurns.slice(0, 2);
  for (const wt of wrongTurns) {
    const summary = wt.length > 50 ? `${wt.substring(0, 47)}...` : wt;
    const prefix = `wrong:${wt}:`;
    const sessions = freshSessions(history, prefix, sessionsForWrongTurn(corpus, wt));
    if (sessions.length === 0) continue;
    const id = `${prefix}${sessions.join(",")}`;
    proposalSessions.set(id, sessions);
    proposals.push({
      id,
      type: "guard",
      title: `Guard against: ${summary}`,
      description: `Recurring wrong turn detected: ${wt}. Add a guard or validation to prevent this pattern.`,
      evidence: [wt],
      confidence: 0.7,
      source: "wrong_turn",
      status: "pending",
      namedSignals: primitivesForSessions(corpus, sessions),
      lesson: lessonTrace(corpus, sessions),
    });
  }

  const sorted = proposals.sort((a, b) => b.confidence - a.confidence).slice(0, 3);
  const sessionsAlreadyNamed = new Map<string, Set<string>>();
  for (const proposal of sorted) {
    const covered = proposalSessions.get(proposal.id) ?? [];
    for (const name of proposal.namedSignals ?? []) {
      if (name.length === 0) continue;
      const set = sessionsAlreadyNamed.get(name) ?? new Set<string>();
      for (const sessionId of covered) set.add(sessionId);
      sessionsAlreadyNamed.set(name, set);
    }
  }
  const bySignal = new Map<string, string[]>();
  for (const session of corpus.sessions) {
    const listed = session.matched_primitives ?? session.matchedPrimitives ?? [];
    for (const name of listed) {
      if (name.length === 0) continue;
      if (sessionsAlreadyNamed.get(name)?.has(session.sessionId)) continue;
      const sessions = bySignal.get(name) ?? [];
      if (!sessions.includes(session.sessionId)) sessions.push(session.sessionId);
      bySignal.set(name, sessions);
    }
  }
  for (const [name, sessionIds] of bySignal) {
    const sessions = freshSessions(history, `named:${name}:`, sessionIds);
    if (sessions.length === 0) continue;
    const id = `named:${name}:${sessions.join(",")}`;
    sorted.push({
      id,
      type: "codify",
      title: `Grade named signal ${name}`,
      description: `Sessions ${sessions.join(", ")} named ${name}.`,
      evidence: sessions.map((sessionId) => `Seen in session ${sessionId}`),
      confidence: resonanceForNamedSignal(corpus, sessions),
      source: "recurring_pattern",
      status: "pending",
      namedSignals: [name],
      lesson: lessonTrace(corpus, sessions),
    });
  }

  if (history && history.length > 0) {
    adjustConfidenceFromHistory(sorted, history);
    sorted.sort((a, b) => b.confidence - a.confidence);
  }

  return sorted;
}
