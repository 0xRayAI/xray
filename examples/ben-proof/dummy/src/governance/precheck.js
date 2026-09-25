import { randomUUID } from "node:crypto";
import { applyDecisionMatrix, mergeVotes } from "./decision-matrix.js";
import { log } from "../lib/logger.js";

/**
 * Governance pre-check before persisting a lesson (mirrors govern-before-apply).
 * @param {{ title: string; description: string; resonance?: number }} proposalInput
 */
export function runGovernancePrecheck(proposalInput) {
  const proposalId = randomUUID();
  const resonance = proposalInput.resonance ?? 0.88;

  const matrix = applyDecisionMatrix({
    resonance,
    historicalCoherence: 0.85,
    solarActivity: "quiet",
    moralTension: "Aligned",
    moralScore: 0.91,
  });

  log("governance", "matrix-applied", "info", {
    proposalId,
    recommendation: matrix.recommendation,
    confidence: matrix.confidence,
  });

  const votes = [
    {
      server: "code-review",
      decision:
        matrix.recommendation === "PASS"
          ? "approve"
          : matrix.recommendation === "REJECT"
            ? "reject"
            : "needs_revision",
      confidence: matrix.confidence,
      reasoning: matrix.reasons.join(" | "),
      weight: matrix.voteWeight,
    },
    {
      server: "enforcer",
      decision: matrix.recommendation === "REJECT" ? "reject" : "approve",
      confidence: 0.9,
      reasoning: "Codex pre-tool gate",
      weight: 1.2,
    },
  ];

  const merged = mergeVotes(votes);
  if (merged.finalDecision === "reject") {
    const err = new Error(`Governance rejected proposal ${proposalId}`);
    err.code = "GOVERNANCE_REJECT";
    throw err;
  }

  return {
    proposalId,
    finalDecision: merged.finalDecision,
    averageConfidence: merged.averageConfidence,
    votes,
    reasoningSummary: merged.reasoningSummary,
    matrix,
  };
}
