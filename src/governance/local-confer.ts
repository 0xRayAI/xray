import type { GovernanceMiss, GovernanceRole, GovernanceVote } from "./llm-governance-provider.js";

export type LocalConferInput = {
  role: GovernanceRole;
  highConfidenceTrapPresent?: boolean | undefined;
  recommendedAgent?: string | null | undefined;
  llmConfigured?: boolean | undefined;
  miss?: GovernanceMiss | undefined;
};

/** Receipt when nested LLM is absent or returned no vote. Never approve — analyze_proposal feeds mergeVotes. */
export function localConferVote(input: LocalConferInput): GovernanceVote {
  const role = input.role;
  if (input.miss && input.miss !== "not-configured") {
    return {
      decision: "abstain",
      confidence: 0.5,
      reasoning: `Local confer (${role}); nested LLM did not produce a vote (${input.miss}).`,
    };
  }
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

function abstainedWithoutUsableVote(vote: GovernanceVote): boolean {
  if (vote.decision !== "abstain") return false;
  return /nested LLM not configured|did not produce a vote|returned no vote/i.test(vote.reasoning);
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
  const reviewLine = abstainedWithoutUsableVote(vote) ? "\nVerdict: UNREVIEWED" : "";
  const reasoning = sanitizeGovernanceReasoning(vote.reasoning);
  return `DECISION: ${vote.decision}\nCONFIDENCE: ${vote.confidence.toFixed(2)}\nREASONING: ${reasoning}${reviewLine}${extra}`;
}
