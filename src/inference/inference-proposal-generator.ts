import type { InferenceProposal, InferenceCycleResult } from "./inference-cycle.js";
import type { InferenceCorpus, RecurringPattern, RecurringProblem } from "./inference-accumulator.js";

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

  for (const problem of corpus.recurringProblems) {
    proposals.push({
      id: `prop-${Date.now()}-${proposals.length}`,
      type: classifyProposalType(problem.pattern),
      title: generateTitle(problem),
      description: `Recurring across ${problem.occurrences} sessions: ${problem.pattern}`,
      evidence: problem.sessions.map((s) => `Seen in session ${s}`),
      confidence: Math.min(0.95, 0.5 + problem.occurrences * 0.15),
      source: "recurring_problem",
      status: "pending",
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

    proposals.push({
      id: `prop-${Date.now()}-${proposals.length}`,
      type: classifyProposalType(problem),
      title: `Investigate: ${problem.substring(0, 80)}`,
      description: `Observed in session ${session}: ${problem}`,
      evidence: [problem],
      confidence: 0.4,
      source: "recurring_problem",
      status: "pending",
    });
    seenPatterns.add(normalized);
  }

  for (const pattern of corpus.recurringPatterns) {
    if (pattern.occurrences < 2) continue;

    const type = patternToProposalType(pattern);
    proposals.push({
      id: `prop-${Date.now()}-${proposals.length}`,
      type,
      title: `Codify ${pattern.name} pattern`,
      description: `${pattern.name} detected across ${pattern.occurrences} sessions (avg confidence: ${Math.round(pattern.avgConfidence * 100)}%). ${pattern.description}`,
      evidence: pattern.evidence,
      confidence: pattern.avgConfidence,
      source: "recurring_pattern",
      status: "pending",
    });
  }

  const wrongTurns = corpus.allWrongTurns.slice(0, 2);
  for (const wt of wrongTurns) {
    const summary = wt.length > 50 ? `${wt.substring(0, 47)}...` : wt;
    proposals.push({
      id: `prop-${Date.now()}-${proposals.length}`,
      type: "guard",
      title: `Guard against: ${summary}`,
      description: `Recurring wrong turn detected: ${wt}. Add a guard or validation to prevent this pattern.`,
      evidence: [wt],
      confidence: 0.7,
      source: "wrong_turn",
      status: "pending",
    });
  }

  const sorted = proposals.sort((a, b) => b.confidence - a.confidence).slice(0, 3);

  if (history && history.length > 0) {
    adjustConfidenceFromHistory(sorted, history);
    sorted.sort((a, b) => b.confidence - a.confidence);
  }

  return sorted;
}
