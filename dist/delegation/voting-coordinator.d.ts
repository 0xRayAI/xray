/**
 * Voting Coordinator
 *
 * Multi-agent voting system with:
 * - Weighted confidence scoring based on agent expertise
 * - Adaptive strategy selection
 * - Historical learning and pattern detection
 * - Integration with session coordinator
 *
 * @version 1.0.0
 * @since 2026-04-16
 */
import type { VotingSession, VotingResult, StrategySelectionContext, VotingHistoryEntry, VotingMetrics, ConflictResolutionRequest, ConflictResolutionResponse } from "./voting-types.js";
import { SessionCoordinator } from "./session-coordinator.js";
import { StringRayStateManager } from "../state/state-manager.js";
export interface VotingCoordinatorConfig {
    enableHistoryTracking: boolean;
    enableLearning: boolean;
    minVotersForConsensus: number;
    consensusThreshold: number;
}
export declare class VotingCoordinator {
    private stateManager;
    private sessionCoordinator;
    private activeVotingSessions;
    private votingHistory;
    private metrics;
    private config;
    private aggregator;
    constructor(stateManager: StringRayStateManager, sessionCoordinator?: SessionCoordinator, config?: Partial<VotingCoordinatorConfig>);
    initiateVoting(sessionId: string, topic: string, description: string, participants: string[], context?: StrategySelectionContext): Promise<string>;
    submitVote(voteId: string, agentName: string, vote: string, confidence: number, reasoning?: string): boolean;
    resolveVoting(voteId: string): VotingResult | null;
    resolveConflict(request: ConflictResolutionRequest): ConflictResolutionResponse;
    getVotingSession(voteId: string): VotingSession | undefined;
    getActiveVotingSessions(): VotingSession[];
    getVotingHistory(sessionId?: string, limit?: number): VotingHistoryEntry[];
    getMetrics(): VotingMetrics;
    private resolveMajorityVote;
    private resolveConsensus;
    private resolveExpertPriority;
    private recordVotingHistory;
    private loadHistory;
    private initializeMetrics;
    private updateMetricsAfterVote;
}
export declare const createVotingCoordinator: (stateManager: StringRayStateManager, sessionCoordinator?: SessionCoordinator) => VotingCoordinator;
//# sourceMappingURL=voting-coordinator.d.ts.map