/**
 * Voting Coordinator
 *
 * Multi-agent voting system with:
 * - Weighted confidence scoring based on agent expertise
 * - Adaptive strategy selection
 * - Historical learning and pattern detection
 * - Integration with session coordinator
 *
 * @since 2026-04-16
 */

import * as crypto from "crypto";
import type {
  VotingSession,
  VotingStrategy,
  VoteChoice,
  VotingResult,
  VotingResultDetail,
  StrategySelectionContext,
  VotingHistoryEntry,
  VotingMetrics,
  ConflictResolutionRequest,
  ConflictResolutionResponse,
} from "./voting-types.js";
import { getAgentExpertiseLevel, getVotingWeight } from "./agent-expertise.js";
import { selectVotingStrategy, adaptiveStrategySelector } from "./strategy-selector.js";
import { SessionCoordinator } from "./session-coordinator.js";
import { WeightedVotingAggregator } from "./weighted-voting-aggregator.js";
import { XrayStateManager } from "../state/state-manager.js";
import { frameworkLogger } from "../core/framework-logger.js";

const MAX_HISTORY_ENTRIES = 500;
const VOTE_TIMEOUT_MS = 30000;

export interface VotingCoordinatorConfig {
  enableHistoryTracking: boolean;
  enableLearning: boolean;
  minVotersForConsensus: number;
  consensusThreshold: number;
}

const DEFAULT_CONFIG: VotingCoordinatorConfig = {
  enableHistoryTracking: true,
  enableLearning: true,
  minVotersForConsensus: 3,
  consensusThreshold: 0.7,
};

export class VotingCoordinator {
  private stateManager: XrayStateManager;
  private sessionCoordinator: SessionCoordinator | undefined;
  private activeVotingSessions = new Map<string, VotingSession>();
  private votingHistory: VotingHistoryEntry[] = [];
  private metrics: VotingMetrics;
  private config: VotingCoordinatorConfig;
  private aggregator: WeightedVotingAggregator;

  constructor(
    stateManager: XrayStateManager,
    sessionCoordinator?: SessionCoordinator,
    config: Partial<VotingCoordinatorConfig> = {},
  ) {
    this.stateManager = stateManager;
    this.sessionCoordinator = sessionCoordinator ?? undefined;
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.aggregator = new WeightedVotingAggregator();
    this.metrics = this.initializeMetrics();
    this.loadHistory();
  }

  async initiateVoting(
    sessionId: string,
    topic: string,
    description: string,
    participants: string[],
    context?: StrategySelectionContext,
  ): Promise<string> {
    const complexity = context?.complexity ?? 25;
    const riskLevel = context?.riskLevel ?? "medium";
    const hasSecurity = context?.hasSecurityConcerns ?? false;
    const hasArch = context?.hasArchitecturalImpact ?? false;
    const participantCount = context?.participantCount ?? participants.length;

    const strategy = context
      ? adaptiveStrategySelector.selectStrategyWithDefaults(
          complexity,
          riskLevel,
          hasSecurity,
          hasArch,
          participantCount,
        )
      : selectVotingStrategy(
          complexity,
          riskLevel,
          hasSecurity,
          hasArch,
          participants.length,
        );

    const votingSession: VotingSession = {
      id: `vote_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`,
      sessionId,
      topic,
      description,
      strategy,
      complexity,
      riskLevel,
      participants,
      votes: [],
      createdAt: Date.now(),
    };

    this.activeVotingSessions.set(votingSession.id, votingSession);

    frameworkLogger.log("VotingCoordinator", "voting-initiated", "info", {
      sessionId: votingSession.id,
      topic,
      strategy,
      participantCount: participants.length,
    });

    if (this.sessionCoordinator) {
      this.sessionCoordinator.shareContext(
        sessionId,
        `vote:${votingSession.id}`,
        { topic, strategy, participants: [] },
        "voting-coordinator",
      );
    }

    return votingSession.id;
  }

  submitVote(
    voteId: string,
    agentName: string,
    vote: string,
    confidence: number,
    reasoning?: string,
  ): boolean {
    const session = this.activeVotingSessions.get(voteId);
    if (!session) {
      frameworkLogger.log("VotingCoordinator", "vote-submission-failed", "warning", {
        voteId,
        reason: "Session not found",
      });
      return false;
    }

    if (!session.participants.includes(agentName)) {
      frameworkLogger.log("VotingCoordinator", "vote-submission-failed", "warning", {
        voteId,
        agentName,
        reason: "Agent not authorized",
      });
      return false;
    }

    const existingVoteIndex = session.votes.findIndex((v) => v.agentName === agentName);
    const voteChoice: VoteChoice = {
      agentName,
      vote,
      confidence: Math.max(0, Math.min(1, confidence)),
      reasoning,
      timestamp: Date.now(),
    };

    if (existingVoteIndex >= 0) {
      session.votes[existingVoteIndex] = voteChoice;
    } else {
      session.votes.push(voteChoice);
    }

    this.metrics.totalVotes++;

    if (this.sessionCoordinator) {
      this.sessionCoordinator.shareContext(
        session.sessionId,
        `vote:${voteId}`,
        { topic: session.topic, strategy: session.strategy, votes: session.votes },
        agentName,
      );
    }

    frameworkLogger.log("VotingCoordinator", "vote-submitted", "info", {
      voteId,
      agentName,
      vote,
      confidence,
    });

    return true;
  }

  resolveVoting(voteId: string): VotingResult | null {
    const session = this.activeVotingSessions.get(voteId);
    if (!session) {
      return null;
    }

    if (session.votes.length === 0) {
      frameworkLogger.log("VotingCoordinator", "resolve-failed", "error", {
        voteId,
        reason: "No votes cast",
      });
      return null;
    }

    let result: VotingResult;

    switch (session.strategy) {
      case "majority_vote":
        result = this.resolveMajorityVote(session);
        break;
      case "consensus":
        result = this.resolveConsensus(session);
        break;
      case "expert_priority":
        result = this.resolveExpertPriority(session);
        break;
      default:
        result = this.resolveMajorityVote(session);
    }

    session.result = result;
    session.resolvedAt = Date.now();

    this.recordVotingHistory(session, result);

    this.metrics.successfulVotes++;
    this.updateMetricsAfterVote(result);

    this.activeVotingSessions.delete(voteId);

    if (this.sessionCoordinator) {
      this.sessionCoordinator.recordConflict(
        session.sessionId,
        session.participants,
        session.strategy,
        result.decision,
      );
    }

    frameworkLogger.log("VotingCoordinator", "voting-resolved", "info", {
      voteId,
      strategy: session.strategy,
      decision: result.decision,
      confidence: result.confidence,
    });

    return result;
  }

  resolveConflict(request: ConflictResolutionRequest): ConflictResolutionResponse {
    const { sessionId, topic, description, agents, requiresSecurityVote, requiresArchitectureVote, complexity, riskLevel } = request;

    const context: StrategySelectionContext = {
      complexity,
      riskLevel,
      participantCount: agents.length,
      hasSecurityConcerns: requiresSecurityVote,
      hasArchitecturalImpact: requiresArchitectureVote,
    };

    const strategy = adaptiveStrategySelector.selectStrategy(context);

    const votingId = this.initiateVoting(sessionId, topic, description, agents, context);

    const response: ConflictResolutionResponse = {
      resolved: true,
      strategy,
      confidence: 0,
      details: `Conflict resolution initiated with strategy: ${strategy}`,
      participatingAgents: agents,
    };

    return response;
  }

   getAggregator(): WeightedVotingAggregator {
    return this.aggregator;
  }

  getVotingSession(voteId: string): VotingSession | undefined {
    return this.activeVotingSessions.get(voteId);
  }

  getActiveVotingSessions(): VotingSession[] {
    return Array.from(this.activeVotingSessions.values());
  }

  getVotingHistory(sessionId?: string, limit?: number): VotingHistoryEntry[] {
    let history = this.votingHistory;

    if (sessionId) {
      history = history.filter((entry) => entry.sessionId === sessionId);
    }

    if (limit) {
      history = history.slice(-limit);
    }

    return history;
  }

  getMetrics(): VotingMetrics {
    return { ...this.metrics };
  }

  private resolveMajorityVote(session: VotingSession): VotingResult {
    const aggregated = this.aggregator.aggregateVotes(session.votes);

    if (aggregated.length === 0) {
      return {
        decision: "",
        confidence: 0,
        strategy: "majority_vote",
        voteCount: 0,
        winningVotes: 0,
        totalVoters: session.participants.length,
        tied: false,
        details: [],
      };
    }

    const winner = aggregated[0]!;
    const second = aggregated[1];
    const tied = Boolean(second && Math.abs(winner.totalWeight - second.totalWeight) < 0.01);

    const totalWeight = aggregated.reduce((sum, agg) => sum + agg.totalWeight, 0);
    const confidence = totalWeight > 0 ? winner.totalWeight / totalWeight : 0;

    const details: VotingResultDetail[] = session.votes.map((vote) => ({
      agentName: vote.agentName,
      expertiseLevel: getAgentExpertiseLevel(vote.agentName),
      vote: vote.vote,
      weight: this.aggregator.calculateTotalVoteWeight(vote.agentName, vote.confidence),
      contributed: vote.vote === winner.option,
    }));

    return {
      decision: winner.option,
      confidence,
      strategy: "majority_vote",
      voteCount: session.votes.length,
      winningVotes: winner.contributingAgents.length,
      totalVoters: session.participants.length,
      tied,
      details,
    };
  }

  private resolveConsensus(session: VotingSession): VotingResult {
    const aggregated = this.aggregator.aggregateVotes(session.votes);
    if (aggregated.length === 0) {
      return {
        decision: "", confidence: 0, strategy: "consensus",
        voteCount: 0, winningVotes: 0, totalVoters: session.participants.length,
        tied: false, details: [],
      };
    }

    const winner = aggregated[0]!;
    const requiredVotes = Math.ceil(session.participants.length * this.config.consensusThreshold);
    const hasConsensus = winner.contributingAgents.length >= requiredVotes;

    if (hasConsensus) {
      const winnerVotes = session.votes.filter((v) => v.vote === winner.option);
      const avgConfidence = winnerVotes.reduce((s, v) => s + v.confidence, 0) / winnerVotes.length;
      const expertiseSum = winnerVotes.reduce(
        (s, v) => s + this.aggregator.calculateTotalVoteWeight(v.agentName, v.confidence), 0,
      );
      const totalWeight = winnerVotes.reduce((s, v) => s + getVotingWeight(v.agentName), 0);
      const confidence = totalWeight > 0 ? avgConfidence * (expertiseSum / (totalWeight * 10)) : avgConfidence;

      return {
        decision: winner.option, confidence, strategy: "consensus",
        voteCount: session.votes.length, winningVotes: winnerVotes.length,
        totalVoters: session.participants.length, tied: false,
        details: winnerVotes.map((v) => ({
          agentName: v.agentName, expertiseLevel: getAgentExpertiseLevel(v.agentName),
          vote: v.vote, weight: this.aggregator.calculateTotalVoteWeight(v.agentName, v.confidence),
          contributed: true,
        })),
      };
    }

    const second = aggregated[1];
    const tied = Boolean(second && Math.abs(winner.totalWeight - second.totalWeight) < 0.01);
    const winnerVotes = session.votes.filter((v) => v.vote === winner.option);
    const avgConfidence = winnerVotes.length > 0 ? winnerVotes.reduce((s, v) => s + v.confidence, 0) / winnerVotes.length : 0;

    return {
      decision: winner.option, confidence: avgConfidence * 0.5, strategy: "consensus",
      voteCount: session.votes.length, winningVotes: winnerVotes.length,
      totalVoters: session.participants.length, tied,
      details: winnerVotes.map((v) => ({
        agentName: v.agentName, expertiseLevel: getAgentExpertiseLevel(v.agentName),
        vote: v.vote, weight: this.aggregator.calculateTotalVoteWeight(v.agentName, v.confidence),
        contributed: true,
      })),
    };
  }

  private resolveExpertPriority(session: VotingSession): VotingResult {
    const experts = new Map<string, { expertise: number; vote: VoteChoice }>();

    for (const vote of session.votes) {
      const expertise = getAgentExpertiseLevel(vote.agentName);
      const existing = experts.get(vote.agentName);

      if (!existing || expertise > existing.expertise) {
        experts.set(vote.agentName, { expertise, vote });
      }
    }

    const sortedByExpertise = Array.from(experts.values()).sort(
      (a, b) => b.expertise - a.expertise,
    );

    const topExpert = sortedByExpertise[0];
    const secondExpert = sortedByExpertise[1];

    const tied = Boolean(secondExpert && topExpert && topExpert.expertise === secondExpert.expertise);

    const details: VotingResultDetail[] = session.votes.map((v) => ({
      agentName: v.agentName,
      expertiseLevel: getAgentExpertiseLevel(v.agentName),
      vote: v.vote,
      weight: getVotingWeight(v.agentName),
      contributed: v.agentName === topExpert?.vote?.agentName,
    }));

    return {
      decision: topExpert?.vote?.vote ?? "",
      confidence: ((topExpert?.vote?.confidence ?? 0) * (topExpert?.expertise ?? 5)) / 10,
      strategy: "expert_priority",
      voteCount: session.votes.length,
      winningVotes: topExpert ? 1 : 0,
      totalVoters: session.participants.length,
      tied,
      details,
    };
  }

  private recordVotingHistory(session: VotingSession, result: VotingResult): void {
    if (!this.config.enableHistoryTracking) return;

    const entry: VotingHistoryEntry = {
      id: session.id,
      sessionId: session.sessionId,
      topic: session.topic,
      voteCount: session.votes.length,
      strategy: session.strategy,
      decision: result.decision,
      confidence: result.confidence,
      participantCount: session.participants.length,
      timestamp: session.createdAt,
      resolvedAt: session.resolvedAt ?? Date.now(),
    };

    this.votingHistory.push(entry);

    if (this.votingHistory.length > MAX_HISTORY_ENTRIES) {
      this.votingHistory = this.votingHistory.slice(-MAX_HISTORY_ENTRIES);
    }

    this.stateManager.set("voting:history", this.votingHistory);
  }

  private loadHistory(): void {
    if (!this.config.enableHistoryTracking) return;

    try {
      const history = this.stateManager.get("voting:history") as VotingHistoryEntry[] | undefined;
      if (Array.isArray(history)) {
        this.votingHistory = history;
      }
    } catch (error) {
      frameworkLogger.log("VotingCoordinator", "history-load-failed", "warning", { error });
    }
  }

  private initializeMetrics(): VotingMetrics {
    return {
      totalVotes: 0,
      successfulVotes: 0,
      failedVotes: 0,
      averageConfidence: 0,
      strategyUsage: {
        majority_vote: 0,
        consensus: 0,
        expert_priority: 0,
      },
      agentParticipation: {},
      averageVoterTurnout: 0,
    };
  }

  private updateMetricsAfterVote(result: VotingResult): void {
    this.metrics.strategyUsage[result.strategy]++;

    if (result.confidence > 0) {
      const total = this.metrics.successfulVotes;
      this.metrics.averageConfidence =
        (this.metrics.averageConfidence * (total - 1) + result.confidence) / total;
    }
  }
}

export const createVotingCoordinator = (
  stateManager: XrayStateManager,
  sessionCoordinator?: SessionCoordinator,
): VotingCoordinator => {
  return new VotingCoordinator(stateManager, sessionCoordinator);
};