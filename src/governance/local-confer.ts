import type { GovernanceRole, GovernanceVote } from "./llm-governance-provider.js";

export type LocalConferInput = {
  role: GovernanceRole;
  highConfidenceTrapPresent?: boolean | undefined;
  recommendedAgent?: string | null | undefined;
  llmConfigured?: boolean | undefined;
};

/** Receipt when nested LLM is absent or returned no vote. Never approve — analyze_proposal feeds mergeVotes. */
export function localConferVote(input: LocalConferInput): GovernanceVote {
  const role = input.role;
  if (input.llmConfigured) {
    return {
      decision: "abstain",
      confidence: 0.5,
      reasoning: `Local confer (${role}); nested LLM configured but returned no vote.`,
    };
  }
  if (input.highConfidenceTrapPresent) {
    const agent = input.recommendedAgent?.trim() || "architect";
    return {
      decision: "abstain",
      confidence: 0.62,
      reasoning: `Local confer (${role}); nested LLM not configured. Repertoire high-confidence ontological trap — route to ${agent} before implementation.`,
    };
  }
  return {
    decision: "abstain",
    confidence: 0.58,
    reasoning: `Local confer (${role}); nested LLM not configured.`,
  };
}

/** Stop a model from planting a second DECISION or Verdict line inside the reasoning body. */
export function sanitizeGovernanceReasoning(reasoning: string): string {
  return reasoning
    .split("\n")
    .map((line) =>
      /^\s*(?:[-*•]\s*)?(?:Verdict:|DECISION:)/i.test(line) ? `> ${line.trim()}` : line,
    )
    .join("\n");
}

export function formatGovernanceVoteText(vote: GovernanceVote, extra = ""): string {
  const reasoning = sanitizeGovernanceReasoning(vote.reasoning);
  return `DECISION: ${vote.decision}\nCONFIDENCE: ${vote.confidence.toFixed(2)}\nREASONING: ${reasoning}${extra}`;
}
