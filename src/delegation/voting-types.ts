/**
 * Voting System Types
 *
 * Comprehensive type definitions for the multi-agent voting system
 * with weighted confidence scoring and adaptive conflict resolution.
 *
 * @since 2026-04-16
 */

export type VotingStrategy = "majority_vote" | "consensus" | "expert_priority";

export type VoteChoice = {
  agentName: string;
  vote: string;
  confidence: number;
  reasoning: string | undefined;
  timestamp: number;
};

export type VotingResult = {
  decision: string;
  confidence: number;
  strategy: VotingStrategy;
  voteCount: number;
  winningVotes: number;
  totalVoters: number;
  tied: boolean;
  details: VotingResultDetail[];
};

export type VotingResultDetail = {
  agentName: string;
  expertiseLevel: number;
  vote: string;
  weight: number;
  contributed: boolean;
};

export type AgentExpertise = {
  name: string;
  expertiseLevel: number;
  domain: string;
  specialties: string[];
};

export type VotingSession = {
  id: string;
  sessionId: string;
  topic: string;
  description: string;
  strategy: VotingStrategy;
  complexity: number;
  riskLevel: string;
  participants: string[];
  votes: VoteChoice[];
  result?: VotingResult;
  createdAt: number;
  resolvedAt?: number;
};

export type StrategySelectionContext = {
  complexity: number;
  riskLevel: string;
  participantCount: number;
  hasSecurityConcerns: boolean | undefined;
  hasArchitecturalImpact: boolean | undefined;
  timeConstraint?: number;
};

export type VotingHistoryEntry = {
  id: string;
  sessionId: string;
  topic: string;
  voteCount: number;
  strategy: VotingStrategy;
  decision: string;
  confidence: number;
  participantCount: number;
  successRating?: number;
  timestamp: number;
  resolvedAt: number;
  agentPerformance?: Record<string, AgentPerformanceEntry>;
};

export type AgentPerformanceEntry = {
  agentName: string;
  correctVotes: number;
  totalVotes: number;
  averageConfidence: number;
  lastVotedAt: number;
  successRate: number;
};

export type AdaptiveStrategyConfig = {
  simple: VotingStrategy;
  moderate: VotingStrategy;
  complex: VotingStrategy;
  enterprise: VotingStrategy;
  securityDominant: VotingStrategy;
  architecturalDominant: VotingStrategy;
};

export type VotingMetrics = {
  totalVotes: number;
  successfulVotes: number;
  failedVotes: number;
  averageConfidence: number;
  strategyUsage: Record<VotingStrategy, number>;
  agentParticipation: Record<string, number>;
  averageVoterTurnout: number;
};

export interface ConflictResolutionRequest {
  sessionId: string;
  topic: string;
  description: string;
  agents: string[];
  requiresSecurityVote: boolean;
  requiresArchitectureVote: boolean;
  complexity: number;
  riskLevel: string;
  context?: Record<string, unknown>;
}

export interface ConflictResolutionResponse {
  resolved: boolean;
  decision?: string;
  strategy: VotingStrategy;
  confidence: number;
  details: string;
  participatingAgents: string[];
}

export interface HistoricalWeightConfig {
  decayFactor: number;
  minWeight: number;
  maxWeight: number;
  lookbackPeriod: number;
  successThreshold: number;
}

export interface AgentHistoricalPerformance {
  agentName: string;
  totalVotes: number;
  correctVotes: number;
  averageConfidence: number;
  weightedScore: number;
  lastActivity: number;
  streakCount: number;
  domainPerformance: Record<string, { correct: number; total: number }>;
}

export interface ConfidenceWeightConfig {
  expertiseMultiplier: number;
  confidenceMultiplier: number;
  minConfidenceThreshold: number;
  normalizeScores: boolean;
}

export interface WeightedVoteAggregation {
  option: string;
  baseWeight: number;
  expertiseWeight: number;
  confidenceWeight: number;
  historicalWeight: number;
  totalWeight: number;
  contributingAgents: string[];
}