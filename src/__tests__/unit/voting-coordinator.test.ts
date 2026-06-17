/**
 * Voting Coordinator Tests
 *
 * Tests for the core voting coordinator with weighted voting, strategy resolution,
 * and history tracking
 *
 * @since 2026-04-16
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  VotingCoordinator,
  createVotingCoordinator,
} from "../../delegation/voting-coordinator.js";
import type { VotingSession, VotingResult, StrategySelectionContext } from "../../delegation/voting-types.js";

const createMockStateManager = () => ({
  get: vi.fn(() => undefined),
  set: vi.fn(),
  clear: vi.fn(),
  has: vi.fn(() => false),
  delete: vi.fn(),
});

const createMockSessionCoordinator = () => ({
  shareContext: vi.fn(),
  recordConflict: vi.fn(),
  getSharedContext: vi.fn(() => undefined),
  sendMessage: vi.fn(),
  receiveMessages: vi.fn(() => []),
  getSessions: vi.fn(() => new Map()),
  getSession: vi.fn(() => undefined),
  initializeSession: vi.fn(() => ({ sessionId: "test", createdAt: new Date(), active: true, agentCount: 3 })),
  registerDelegation: vi.fn(),
  recordInteraction: vi.fn(),
  resolveConflict: vi.fn(() => undefined),
  completeDelegation: vi.fn(),
  getSessionStatus: vi.fn(() => null),
  cleanupSession: vi.fn(),
});

describe("VotingCoordinator", () => {
  let coordinator: VotingCoordinator;
  let mockStateManager: ReturnType<typeof createMockStateManager>;
  let mockSessionCoordinator: ReturnType<typeof createMockSessionCoordinator>;

  beforeEach(() => {
    mockStateManager = createMockStateManager();
    mockSessionCoordinator = createMockSessionCoordinator();
    coordinator = new VotingCoordinator(
      mockStateManager as any,
      mockSessionCoordinator as any,
      { enableHistoryTracking: true, enableLearning: true },
    );
  });

  describe("initiateVoting", () => {
    it("should create a new voting session", async () => {
      const voteId = await coordinator.initiateVoting(
        "session_123",
        "Security Implementation",
        "Vote on security approach",
        ["architect", "security-auditor", "strategist"],
      );

      expect(voteId).toContain("vote_");
      expect(voteId.length).toBeGreaterThan(5);
    });

    it("should select majority_vote for low complexity", async () => {
      const voteId = await coordinator.initiateVoting(
        "session_123",
        "Test Vote",
        "Description",
        ["architect", "testing-lead"],
        { complexity: 10, riskLevel: "low", participantCount: 2, hasSecurityConcerns: false, hasArchitecturalImpact: false },
      );

      const session = coordinator.getVotingSession(voteId);
      expect(session?.strategy).toBe("majority_vote");
    });

    it("should select consensus for moderate complexity", async () => {
      const voteId = await coordinator.initiateVoting(
        "session_123",
        "Test Vote",
        "Description",
        ["architect", "security-auditor", "strategist"],
        { complexity: 30, riskLevel: "medium", participantCount: 3, hasSecurityConcerns: false, hasArchitecturalImpact: false },
      );

      const session = coordinator.getVotingSession(voteId);
      expect(session?.strategy).toBe("consensus");
    });

    it("should select expert_priority for high complexity", async () => {
      const voteId = await coordinator.initiateVoting(
        "session_123",
        "Test Vote",
        "Description",
        ["architect", "security-auditor", "strategist", "refactorer"],
        { complexity: 55, riskLevel: "high", participantCount: 4, hasSecurityConcerns: false, hasArchitecturalImpact: false },
      );

      const session = coordinator.getVotingSession(voteId);
      expect(session?.strategy).toBe("expert_priority");
    });

    it("should select expert_priority for security concerns", async () => {
      const voteId = await coordinator.initiateVoting(
        "session_123",
        "Security Vote",
        "Vote on security implementation",
        ["architect", "security-auditor"],
        { complexity: 15, riskLevel: "low", participantCount: 2, hasSecurityConcerns: true, hasArchitecturalImpact: false },
      );

      const session = coordinator.getVotingSession(voteId);
      expect(session?.strategy).toBe("expert_priority");
    });
  });

  describe("submitVote", () => {
    it("should accept valid vote", async () => {
      const voteId = await coordinator.initiateVoting(
        "session_123",
        "Test Vote",
        "Description",
        ["architect", "security-auditor"],
      );

      const success = coordinator.submitVote(voteId, "architect", "approve", 0.9, "Looks good");
      expect(success).toBe(true);
    });

    it("should reject vote from unauthorized agent", async () => {
      const voteId = await coordinator.initiateVoting(
        "session_123",
        "Test Vote",
        "Description",
        ["architect"],
      );

      const success = coordinator.submitVote(voteId, "security-auditor", "approve", 0.9);
      expect(success).toBe(false);
    });

    it("should reject vote for non-existent session", () => {
      const success = coordinator.submitVote("nonexistent", "architect", "approve", 0.9);
      expect(success).toBe(false);
    });

    it("should clamp confidence to 0-1 range", async () => {
      const voteId = await coordinator.initiateVoting(
        "session_123",
        "Test Vote",
        "Description",
        ["architect"],
      );

      coordinator.submitVote(voteId, "architect", "approve", 1.5);
      const session = coordinator.getVotingSession(voteId);
      expect(session?.votes[0].confidence).toBe(1);
    });
  });

  describe("resolveVoting", () => {
    it("should resolve majority_vote correctly", async () => {
      const voteId = await coordinator.initiateVoting(
        "session_123",
        "Test Vote",
        "Description",
        ["architect", "security-auditor", "strategist"],
        { complexity: 10, riskLevel: "low", participantCount: 3, hasSecurityConcerns: false, hasArchitecturalImpact: false },
      );

      coordinator.submitVote(voteId, "architect", "approve", 0.9);
      coordinator.submitVote(voteId, "security-auditor", "approve", 0.8);
      coordinator.submitVote(voteId, "strategist", "reject", 0.7);

      const result = coordinator.resolveVoting(voteId);
      expect(result?.decision).toBe("approve");
      expect(result?.winningVotes).toBeGreaterThan(0);
    });

    it("should resolve expert_priority with top expert", async () => {
      const voteId = await coordinator.initiateVoting(
        "session_123",
        "Test Vote",
        "Description",
        ["architect", "security-auditor"],
        { complexity: 55, riskLevel: "high", participantCount: 2, hasSecurityConcerns: false, hasArchitecturalImpact: false },
      );

      coordinator.submitVote(voteId, "architect", "option-a", 0.9);
      coordinator.submitVote(voteId, "security-auditor", "option-b", 0.8);

      const result = coordinator.resolveVoting(voteId);
      expect(result?.decision).toBeDefined();
    });

    it("should return null for empty votes", () => {
      const result = coordinator.resolveVoting("nonexistent");
      expect(result).toBeNull();
    });

    it("should track metrics on resolution", async () => {
      const voteId = await coordinator.initiateVoting(
        "session_123",
        "Test Vote",
        "Description",
        ["architect"],
      );

      coordinator.submitVote(voteId, "architect", "approve", 0.9);
      coordinator.resolveVoting(voteId);

      const metrics = coordinator.getMetrics();
      expect(metrics.totalVotes).toBeGreaterThan(0);
      expect(metrics.successfulVotes).toBeGreaterThan(0);
    });
  });

  describe("getVotingHistory", () => {
    it("should return empty history initially", () => {
      const history = coordinator.getVotingHistory();
      expect(history).toEqual([]);
    });

    it("should track resolved votes in history", async () => {
      const voteId = await coordinator.initiateVoting(
        "session_123",
        "Test Vote",
        "Description",
        ["architect"],
      );

      coordinator.submitVote(voteId, "architect", "approve", 0.9);
      coordinator.resolveVoting(voteId);

      const history = coordinator.getVotingHistory("session_123");
      expect(history.length).toBeGreaterThan(0);
    });
  });

  describe("getMetrics", () => {
    it("should return initialized metrics", () => {
      const metrics = coordinator.getMetrics();
      expect(metrics.totalVotes).toBe(0);
      expect(metrics.successfulVotes).toBe(0);
      expect(metrics.averageConfidence).toBe(0);
      expect(metrics.strategyUsage).toBeDefined();
    });
  });

  describe("getActiveVotingSessions", () => {
    it("should return empty initially", () => {
      const sessions = coordinator.getActiveVotingSessions();
      expect(sessions).toEqual([]);
    });

    it("should return pending votes", async () => {
      await coordinator.initiateVoting("session_123", "Vote 1", "Desc", ["architect"]);
      await coordinator.initiateVoting("session_123", "Vote 2", "Desc", ["architect"]);

      const sessions = coordinator.getActiveVotingSessions();
      expect(sessions.length).toBe(2);
    });
  });
});

describe("createVotingCoordinator", () => {
  it("should create coordinator instance", () => {
    const mockStateManager = createMockStateManager();
    const coordinator = createVotingCoordinator(mockStateManager as any);

    expect(coordinator).toBeInstanceOf(VotingCoordinator);
  });

  it("should accept optional session coordinator", () => {
    const mockStateManager = createMockStateManager();
    const mockSessionCoordinator = createMockSessionCoordinator();
    const coordinator = createVotingCoordinator(
      mockStateManager as any,
      mockSessionCoordinator as any,
    );

    expect(coordinator).toBeInstanceOf(VotingCoordinator);
  });
});