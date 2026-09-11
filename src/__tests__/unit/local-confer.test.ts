import { describe, expect, it } from "vitest";
import { formatGovernanceVoteText, localConferVote } from "../../governance/local-confer.js";

describe("localConferVote", () => {
  it("abstains without nested LLM when no trap is present", () => {
    const vote = localConferVote({ role: "code-review" });
    expect(vote.decision).toBe("abstain");
    expect(vote.confidence).toBeGreaterThan(0.5);
    expect(vote.reasoning).not.toMatch(/Install Hermes/);
    expect(vote.reasoning).toContain("nested LLM not configured");
  });

  it("abstains and routes on a high-confidence trap", () => {
    const vote = localConferVote({
      role: "researcher",
      highConfidenceTrapPresent: true,
      recommendedAgent: "architect",
    });
    expect(vote.decision).toBe("abstain");
    expect(vote.reasoning).toContain("high-confidence ontological trap");
    expect(vote.reasoning).toContain("architect");
    expect(vote.reasoning).not.toMatch(/Install Hermes/);
  });

  it("abstains when nested LLM is configured but returned no vote", () => {
    const vote = localConferVote({ role: "security-audit", llmConfigured: true });
    expect(vote.decision).toBe("abstain");
    expect(vote.reasoning).toContain("returned no vote");
    expect(vote.reasoning).not.toContain("not configured");
  });

  it("formats a confer receipt", () => {
    const text = formatGovernanceVoteText(
      { decision: "approve", confidence: 0.58, reasoning: "ok" },
      "\nMEMORY_ROUTING: on",
    );
    expect(text).toContain("DECISION: approve");
    expect(text).toContain("CONFIDENCE: 0.58");
    expect(text).toContain("MEMORY_ROUTING: on");
  });
});
