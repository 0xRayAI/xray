import type { GovernanceRole, GovernanceVote } from "./llm-governance-provider.js";

export type LocalConferInput = {
  role: GovernanceRole;
  highConfidenceTrapPresent?: boolean;
  recommendedAgent?: string | null;
};

/**
 * Host-side confer when no nested Hermes/direct LLM is configured.
 * Grok (and any floor that *is* the model) must still get a vote.
 * Nested LLM stays optional enrichment — not the gate.
 */
export function localConferVote(input: LocalConferInput): GovernanceVote {
  const role = input.role;
  if (input.highConfidenceTrapPresent) {
    const agent = input.recommendedAgent?.trim() || "architect";
    return {
      decision: "approve",
      confidence: 0.62,
      reasoning: `Local confer (${role}); nested LLM not configured. Repertoire high-confidence ontological trap — route to ${agent} before implementation. Nested Hermes/direct LLM remains optional enrichment.`,
    };
  }
  return {
    decision: "approve",
    confidence: 0.58,
    reasoning: `Local confer (${role}); nested LLM not configured. No hard blocker in the proposal. Nested Hermes/direct LLM remains optional enrichment, not the gate.`,
  };
}

export function formatGovernanceVoteText(vote: GovernanceVote, extra = ""): string {
  return `DECISION: ${vote.decision}\nCONFIDENCE: ${vote.confidence.toFixed(2)}\nREASONING: ${vote.reasoning}${extra}`;
}
