/**
 * Agent Spawn Governor
 *
 * Critical governance component that prevents infinite agent spawning
 * and enforces spawn limits across the multi-agent orchestration system.
 *
 * @version 1.0.0
 * @since 2026-01-23
 */
export interface SpawnContext {
    agentType: string;
    parentAgent?: string;
    operation?: string;
    triggeredBy?: string;
    sessionId?: string;
    priority?: "high" | "medium" | "low";
}
export interface SpawnRecord {
    id: string;
    agentType: string;
    parentAgent?: string | undefined;
    timestamp: number;
    status: "active" | "completed" | "failed" | "terminated";
    context: SpawnContext;
}
export interface SpawnLimits {
    perAgentType: Record<string, number>;
    totalConcurrent: number;
    spawnRateLimit: {
        maxPerMinute: number;
        windowMs: number;
    };
    memoryLimit: {
        maxMemoryMB: number;
        emergencyThresholdMB: number;
        cleanupIntervalMs: number;
    };
}
export interface SpawnAuthorization {
    authorized: boolean;
    trackingId?: string;
    reason?: string;
    warnings?: string[];
}
export declare class AgentSpawnGovernor {
    private limits;
    private activeAgents;
    private spawnHistory;
    private readonly maxHistorySize;
    private readonly cleanupInterval;
    private readonly persistenceTimeout;
    private readonly maxRetries;
    private readonly retryDelay;
    private cleanupTimer?;
    private memoryMonitorInterval?;
    private authorizationQueue;
    private isProcessingAuthorization;
    private getDefaultLimits;
    private readonly defaultLimits;
    constructor(limits?: Partial<SpawnLimits>, autoStart?: boolean);
    private startPeriodicCleanup;
    private startMemoryMonitoring;
    private checkMemoryBudget;
    private emergencyMemoryCleanup;
    private aggressiveCleanup;
    private deepCleanupContexts;
    private sanitizeContext;
    /**
     * Authorize a new agent spawn
     */
    authorizeSpawn(context: SpawnContext): Promise<SpawnAuthorization>;
    private processNextAuthorization;
    private performAuthorization;
    private checkAgentLimitsWithRetry;
    private getTotalActiveWithRetry;
    private registerSpawnWithRetry;
    private handleAuthorizationError;
    private categorizeError;
    private emergencyCleanup;
    /**
     * Complete an agent spawn (mark as completed)
     */
    completeSpawn(trackingId: string, result?: boolean): Promise<void>;
    /**
     * Fail an agent spawn
     */
    failSpawn(trackingId: string, error?: Error): Promise<void>;
    /**
     * Terminate an agent spawn (force stop)
     */
    terminateSpawn(trackingId: string, reason?: string): Promise<void>;
    /**
     * Get current active count for agent type
     */
    getActiveCount(agentType: string): number;
    /**
     * Get total active agents system-wide
     */
    getTotalActive(): number;
    /**
     * Get spawn statistics
     */
    getSpawnStats(): {
        perAgentType: Record<string, {
            active: number;
            total: number;
        }>;
        totalActive: number;
        totalHistory: number;
    };
    /**
     * Emergency: Terminate all active agents
     */
    emergencyShutdown(reason?: string): Promise<void>;
    private registerSpawn;
    private checkSpawnRateLimit;
    private detectInfiniteSpawn;
    private getRecentSpawns;
    private findRecord;
    private generateTrackingId;
    private cleanupOldRecords;
    private withTimeout;
    private withRetry;
    start(): void;
    destroy(): void;
}
export declare const agentSpawnGovernor: AgentSpawnGovernor;
//# sourceMappingURL=agent-spawn-governor.d.ts.map