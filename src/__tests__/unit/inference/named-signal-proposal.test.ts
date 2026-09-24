import { describe, expect, it } from "vitest";
import type { InferenceCorpus } from "../../../inference/inference-accumulator.js";
import type { InferenceCycleResult } from "../../../inference/inference-cycle.js";
import { generateProposals } from "../../../inference/inference-proposal-generator.js";
import type { SessionInference } from "../../../inference/session-capture.js";

function session(id: string, overrides: Partial<SessionInference> = {}): SessionInference {
  return {
    sessionId: id,
    timestamp: "2026-09-23T00:00:00.000Z",
    span: { from: "HEAD~1", to: "HEAD" },
    problems: [],
    approaches: ["fix: observe the law"],
    wrongTurns: [],
    solutions: [],
    reasoningChain: [],
    patterns: [{ name: "wake-cascade", confidence: 0.7, evidence: [], description: "once" }],
    matched_primitives: ["wake-cascade"],
    metrics: {
      commits: 3,
      filesChanged: 1,
      insertions: 1,
      deletions: 0,
      filesAdded: 0,
      filesDeleted: 0,
      uniqueDirs: 1,
    },
    ...overrides,
  };
}

function corpus(sessions: SessionInference[], patterns: InferenceCorpus["recurringPatterns"] = []): InferenceCorpus {
  return {
    sessions,
    totalCommits: 3,
    recurringPatterns: patterns,
    recurringProblems: [],
    uniqueApproaches: [],
    allWrongTurns: sessions.flatMap((item) => item.wrongTurns),
    collectedAt: "2026-09-23T00:00:00.000Z",
  };
}

function rejectedCodifyHistory(): InferenceCycleResult[] {
  return [{
    cycleId: "prior",
    triggered: true,
    triggerReason: "test",
    corpusSummary: { sessions: 1, totalCommits: 1, recurringPatterns: 0, recurringProblems: 0 },
    proposals: [0, 1, 2].map((index) => ({
      id: `old-${index}`,
      type: "codify" as const,
      title: "Codify other",
      description: "unrelated",
      evidence: [],
      confidence: 0.44,
      source: "recurring_pattern" as const,
      status: "rejected" as const,
    })),
    votes: [],
    phase: "complete",
    completedAt: "2026-09-23T00:00:00.000Z",
    duration: 1,
  }];
}

describe("named signal proposals", () => {
  it("learns speech that names no stored signal, once", () => {
    const fresh = session("sess-new", {
      matched_primitives: [],
      patterns: [],
      approaches: ["I tried the route table and the check failed closed"],
    });
    const first = generateProposals(corpus([fresh]));
    const minted = first.find((proposal) => proposal.id.startsWith("mint:"));
    expect(minted?.namedSignals?.[0]).toBe("tried-the-route-table-and-the");
    expect(minted?.lesson).toContain("failed closed");
    const again = generateProposals(corpus([fresh]), [{
      cycleId: "prior",
      triggered: true,
      triggerReason: "test",
      corpusSummary: { sessions: 1, totalCommits: 1, recurringPatterns: 0, recurringProblems: 0 },
      proposals: [{
        id: minted?.id ?? "",
        type: "codify",
        title: "Learn",
        description: minted?.lesson ?? "",
        evidence: [],
        confidence: 0.85,
        source: "recurring_pattern",
        status: "approved",
      }],
      votes: [],
      phase: "complete",
      completedAt: "2026-09-23T00:00:00.000Z",
      duration: 1,
    }]);
    expect(again.some((proposal) => proposal.id.startsWith("mint:"))).toBe(false);
  });

  it("grades a signal a session named once when the work landed", () => {
    const proposals = generateProposals(corpus([session("sess-landed")]));
    const grade = proposals.find((proposal) => proposal.id === "named:wake-cascade:sess-landed");
    expect(grade?.namedSignals).toEqual(["wake-cascade"]);
    expect(grade?.confidence).toBe(0.85);
    expect(grade?.lesson).toBe("fix: observe the law");
  });

  it("keeps a wrong turn below the cutoff when no kept proposal already names it", () => {
    const wrong = session("sess-wrong", {
      wrongTurns: ["looked up a route and called it a lesson"],
      matched_primitives: ["wake-cascade"],
    });
    const other = session("sess-other", { matched_primitives: [], patterns: [], approaches: [] });
    const proposals = generateProposals(corpus([wrong, other], [
      { name: "alpha", occurrences: 2, avgConfidence: 0.9, sessions: ["sess-other"], evidence: [], description: "a" },
      { name: "beta", occurrences: 2, avgConfidence: 0.88, sessions: ["sess-other"], evidence: [], description: "b" },
      { name: "gamma", occurrences: 2, avgConfidence: 0.86, sessions: ["sess-other"], evidence: [], description: "c" },
    ]));
    const grade = proposals.find((proposal) => proposal.id.startsWith("named:wake-cascade:"));
    expect(grade?.confidence).toBe(0.4);
  });

  it("does not let earlier codify rejects pull a landed grade under the solid band", () => {
    const proposals = generateProposals(corpus([session("sess-landed")]), rejectedCodifyHistory());
    const grade = proposals.find((proposal) => proposal.id === "named:wake-cascade:sess-landed");
    expect(grade?.confidence).toBe(0.85);
  });

  it("does not grade the same named sessions twice", () => {
    const first = generateProposals(corpus([session("sess-landed")]));
    const again = generateProposals(corpus([session("sess-landed")]), [{
      ...rejectedCodifyHistory()[0]!,
      proposals: first,
    }]);
    expect(again.some((proposal) => proposal.id.startsWith("named:"))).toBe(false);
  });

  it("grades only the new session when an earlier session already named the signal", () => {
    const prior = generateProposals(corpus([session("sess-old")]));
    const proposals = generateProposals(
      corpus([session("sess-old"), session("sess-new")]),
      [{ ...rejectedCodifyHistory()[0]!, proposals: prior }],
    );
    const grade = proposals.find((proposal) => proposal.id.startsWith("named:wake-cascade:"));
    expect(grade?.id).toBe("named:wake-cascade:sess-new");
  });

  it("does not propose a pattern whose sessions were already graded", () => {
    const pattern = {
      name: "test-expansion",
      occurrences: 2,
      avgConfidence: 0.44,
      sessions: ["sess-a", "sess-b"],
      evidence: [],
      description: "tests",
    };
    const first = generateProposals(corpus([
      session("sess-a", { matched_primitives: [] }),
      session("sess-b", { matched_primitives: [] }),
    ], [pattern]));
    const again = generateProposals(corpus([
      session("sess-a", { matched_primitives: [] }),
      session("sess-b", { matched_primitives: [] }),
    ], [pattern]), [{ ...rejectedCodifyHistory()[0]!, proposals: first }]);
    expect(first.some((proposal) => proposal.id === "pattern:test-expansion:sess-a,sess-b")).toBe(true);
    expect(again.some((proposal) => proposal.id.startsWith("pattern:test-expansion:"))).toBe(false);
  });

  it("does not add a second grade when a kept proposal already names the signal", () => {
    const landed = session("sess-a");
    const other = session("sess-b");
    const proposals = generateProposals(corpus([landed, other], [{
      name: "Extract Method",
      occurrences: 2,
      avgConfidence: 0.9,
      sessions: ["sess-a", "sess-b"],
      evidence: ["methods"],
      description: "extracted",
    }]));
    expect(proposals.filter((proposal) => proposal.id.startsWith("named:wake-cascade:"))).toEqual([]);
    expect(proposals.some((proposal) => proposal.namedSignals?.includes("wake-cascade"))).toBe(true);
  });

  it("grades a new session when a kept proposal already named the signal for other sessions", () => {
    const proposals = generateProposals(corpus([
      session("sess-a"),
      session("sess-b"),
      session("sess-new"),
    ], [{
      name: "Extract Method",
      occurrences: 2,
      avgConfidence: 0.9,
      sessions: ["sess-a", "sess-b"],
      evidence: ["methods"],
      description: "extracted",
    }]));
    expect(proposals.some((proposal) => proposal.id === "named:wake-cascade:sess-new")).toBe(true);
    expect(proposals.some((proposal) => proposal.id.startsWith("named:wake-cascade:") && proposal.id.includes("sess-a"))).toBe(false);
    expect(proposals.some((proposal) => proposal.id.startsWith("named:wake-cascade:") && proposal.id.includes("sess-b"))).toBe(false);
  });

  it("does not treat a longer graded id as covering a new session id", () => {
    const prior = generateProposals(corpus([session("sess-landed-extra")]));
    const proposals = generateProposals(
      corpus([session("sess-landed-extra"), session("sess-landed")]),
      [{ ...rejectedCodifyHistory()[0]!, proposals: prior }],
    );
    const grade = proposals.find((proposal) => proposal.id.startsWith("named:wake-cascade:"));
    expect(grade?.id).toBe("named:wake-cascade:sess-landed");
  });
});
