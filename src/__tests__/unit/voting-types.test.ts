/**
 * Voting Types Tests
 *
 * Tests for all voting system type definitions
 *
 * @since 2026-04-16
 */

import { describe, it, expect } from "vitest";
import {
  VotingStrategy,
  VoteChoice,
  VotingResult,
  VotingSession,
  StrategySelectionContext,
  VotingHistoryEntry,
} from "../../delegation/voting-types.js";
import type { ConflictResolutionRequest, ConflictResolutionResponse } from "../../delegation/voting-types.js";

describe("VotingStrategy", () => {
  it("should allow majority_vote strategy", () => {
    const strategy: VotingStrategy = "majority_vote";
    expect(strategy).toBe("majority_vote");
  });

  it("should allow consensus strategy", () => {
    const strategy: VotingStrategy = "consensus";
    expect(strategy).toBe("consensus");
  });

  it("should allow expert_priority strategy", () => {
    const strategy: VotingStrategy = "expert_priority";
    expect(strategy).toBe("expert_priority");
  });
});

describe("VoteChoice", () => {
  it("should create valid vote choice", () => {
    const vote: VoteChoice = {
      agentName: "architect",
      vote: "approve",
      confidence: 0.9,
      reasoning: "Design looks solid",
      timestamp: Date.now(),
    };

    expect(vote.agentName).toBe("architect");
    expect(vote.vote).toBe("approve");
    expect(vote.confidence).toBe(0.9);
  });

  it("should allow undefined reasoning", () => {
    const vote: VoteChoice = {
      agentName: "security-auditor",
      vote: "reject",
      confidence: 0.8,
      reasoning: undefined,
      timestamp: Date.now(),
    };

    expect(vote.reasoning).toBeUndefined();
  });
});

describe("VotingResult", () => {
  it("should create valid voting result", () => {
    const result: VotingResult = {
      decision: "approve",
      confidence: 0.85,
      strategy: "majority_vote",
      voteCount: 5,
      winningVotes: 3,
      totalVoters: 5,
      tied: false,
      details: [],
    };

    expect(result.decision).toBe("approve");
    expect(result.confidence).toBe(0.85);
    expect(result.strategy).toBe("majority_vote");
  });
});

describe("VotingSession", () => {
  it("should create valid voting session", () => {
    const session: VotingSession = {
      id: "vote_123",
      sessionId: "session_123",
      topic: "Security Implementation",
      description: "Vote on security implementation approach",
      strategy: "expert_priority",
      complexity: 35,
      riskLevel: "high",
      participants: ["architect", "security-auditor", "strategist"],
      votes: [],
      createdAt: Date.now(),
    };

    expect(session.id).toBe("vote_123");
    expect(session.participants).toHaveLength(3);
    expect(session.strategy).toBe("expert_priority");
  });
});

describe("StrategySelectionContext", () => {
  it("should create valid context", () => {
    const context: StrategySelectionContext = {
      complexity: 45,
      riskLevel: "high",
      participantCount: 4,
      hasSecurityConcerns: true,
      hasArchitecturalImpact: false,
    };

    expect(context.complexity).toBe(45);
    expect(context.riskLevel).toBe("high");
    expect(context.hasSecurityConcerns).toBe(true);
  });

  it("should allow optional fields to be undefined", () => {
    const context: StrategySelectionContext = {
      complexity: 20,
      riskLevel: "low",
      participantCount: 2,
      hasSecurityConcerns: false,
      hasArchitecturalImpact: false,
    };

    expect(context.hasSecurityConcerns).toBe(false);
  });
});

describe("VotingHistoryEntry", () => {
  it("should create valid history entry", () => {
    const entry: VotingHistoryEntry = {
      id: "vote_123",
      sessionId: "session_123",
      topic: "API Design",
      voteCount: 4,
      strategy: "consensus",
      decision: "REST",
      confidence: 0.9,
      participantCount: 4,
      timestamp: Date.now(),
      resolvedAt: Date.now(),
    };

    expect(entry.decision).toBe("REST");
    expect(entry.confidence).toBe(0.9);
  });
});

describe("ConflictResolutionRequest", () => {
  it("should create valid resolution request", () => {
    const request: ConflictResolutionRequest = {
      sessionId: "session_123",
      topic: "Architecture Decision",
      description: "Choose between microservices and monolith",
      agents: ["architect", "strategist", "backend-engineer"],
      requiresSecurityVote: false,
      requiresArchitectureVote: true,
      complexity: 55,
      riskLevel: "high",
    };

    expect(request.agents).toHaveLength(3);
    expect(request.requiresArchitectureVote).toBe(true);
  });

  it("should require all required fields", () => {
    const request: ConflictResolutionRequest = {
      sessionId: "session_456",
      topic: "Security Choice",
      description: "Vote on authentication method",
      agents: ["security-auditor", "architect"],
      requiresSecurityVote: true,
      requiresArchitectureVote: false,
      complexity: 30,
      riskLevel: "critical",
    };

    expect(request.complexity).toBe(30);
    expect(request.riskLevel).toBe("critical");
  });
});

describe("ConflictResolutionResponse", () => {
  it("should create valid resolution response", () => {
    const response: ConflictResolutionResponse = {
      resolved: true,
      decision: "microservices",
      strategy: "expert_priority",
      confidence: 0.95,
      details: "Architecture decision made by architect",
      participatingAgents: ["architect", "strategist"],
    };

    expect(response.resolved).toBe(true);
    expect(response.decision).toBe("microservices");
    expect(response.participatingAgents).toHaveLength(2);
  });
});