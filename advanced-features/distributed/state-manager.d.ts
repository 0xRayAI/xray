/**
 */
import { EventEmitter } from "events";
export interface DistributedStateConfig {
    redisUrl: string;
    clusterMode: boolean;
    keyPrefix: string;
    ttlSeconds: number;
    consistencyLevel: "strong" | "eventual";
    replicationFactor: number;
    heartbeatInterval: number;
    failoverTimeout: number;
}
export interface StateOperation {
    id: string;
    type: "set" | "get" | "delete" | "watch";
    key: string;
    value?: any;
    timestamp: number;
    instanceId: string;
    version: number;
}
export interface StateConflict {
    key: string;
    localVersion: number;
    remoteVersion: number;
    localValue: any;
    remoteValue: any;
    timestamp: number;
    resolution?: "local" | "remote" | "merge";
}
export interface InstanceHealth {
    instanceId: string;
    lastHeartbeat: number;
    status: "healthy" | "unhealthy" | "failed";
    loadFactor: number;
    activeSessions: number;
    memoryUsage: number;
}
/**
 */
export declare class DistributedStateManager extends EventEmitter {
    private redis;
    private config;
    private instanceId;
    private localCache;
    private pendingOperations;
    private watchers;
    private heartbeatTimer?;
    private conflictResolver;
    private raftConsensus;
    private circuitBreakerRegistry;
    constructor(config?: Partial<DistributedStateConfig>);
    private initializeRedis;
    private startHeartbeat;
    private setupEventHandlers;
    /**
     */
    set<T>(key: string, value: T, options?: {
        ttl?: number;
        force?: boolean;
    }): Promise<boolean>;
    /**
     */
    get<T>(key: string): Promise<T | undefined>;
    /**
     */
    watch<T>(key: string, callback: (value: T, version: number) => void): () => void;
    /**
     */
    delete(key: string): Promise<boolean>;
    /**
     */
    getActiveInstances(): Promise<InstanceHealth[]>;
    /**
     */
    electLeader(): Promise<string>;
    /**
     */
    isLeader(): Promise<boolean>;
    private checkForConflicts;
    private handleRemoteStateChange;
    private notifyStateChange;
    private triggerWatchers;
    private getNextVersion;
    private isCacheValid;
    private getActiveSessionCount;
    private cleanupStaleInstances;
    shutdown(): Promise<void>;
}
/**
 */
export declare class ConflictResolver {
    private stateManager;
    constructor(stateManager: DistributedStateManager);
    resolve(conflict: StateConflict): Promise<boolean>;
}
/**
 */
export declare class DistributedLockManager {
    private redis;
    private locks;
    constructor(redis: Redis);
    acquireLock(key: string, ttlMs?: number): Promise<string | null>;
    releaseLock(key: string, token: string): Promise<boolean>;
}
export declare const createDistributedStateManager: (config?: Partial<DistributedStateConfig>) => DistributedStateManager;
//# sourceMappingURL=state-manager.d.ts.map