/**
 * Spawn Governance Processor
 *
 * Enforces codex terms #52-57:
 *  - #52 Agent Spawn Governance
 *  - #53 Subagent Spawning Prevention
 *  - #54 Concurrent Agent Limits
 *  - #55 Emergency Memory Cleanup
 *  - #56 Infinite Spawn Pattern Detection
 *  - #57 Spawn Rate Limiting
 *
 * @version 1.0.0
 * @since 2026-03-28
 */
export interface SpawnGovernanceConfig {
    maxConcurrent: number;
    rateLimitWindowMs: number;
    maxSpawnsPerWindow: number;
    memoryThreshold: number;
    infiniteSpawnThreshold: number;
    infiniteSpawnWindowMs: number;
}
export declare class SpawnGovernanceProcessor {
    static readonly DEFAULT_MAX_CONCURRENT = 5;
    static readonly DEFAULT_RATE_LIMIT_WINDOW_MS = 10000;
    static readonly DEFAULT_MAX_SPAWNS_PER_WINDOW = 10;
    static readonly DEFAULT_MEMORY_THRESHOLD = 0.8;
    private readonly config;
    private activeSpawns;
    private spawnTimestamps;
    private agentSpawnTimestamps;
    private blockedCount;
    private subagentDepth;
    constructor(config?: Partial<SpawnGovernanceConfig>);
    checkSpawnAllowed(agentName: string): {
        allowed: boolean;
        reason?: string;
    };
    recordSpawn(agentName: string): void;
    recordSpawnComplete(agentName: string): void;
    getMetrics(): {
        activeSpawns: number;
        recentSpawns: number;
        blockedSpawns: number;
        memoryUsage: number;
    };
    emergencyCleanup(): void;
    setSubagentDepth(agentName: string, depth: number): void;
    private purgeOldTimestamps;
    private getMemoryUsageRatio;
}
export declare function runSpawnGovernance(context: any): Promise<{
    success: boolean;
    allowed: boolean;
    reason?: string;
    metrics: ReturnType<SpawnGovernanceProcessor["getMetrics"]>;
}>;
//# sourceMappingURL=spawn-governance-processor.d.ts.map