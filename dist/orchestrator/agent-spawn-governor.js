/**
 * Agent Spawn Governor
 *
 * Critical governance component that prevents infinite agent spawning
 * and enforces spawn limits across the multi-agent orchestration system.
 *
 * @version 1.0.0
 * @since 2026-01-23
 */
import { frameworkLogger } from "../core/framework-logger.js";
export class AgentSpawnGovernor {
    limits;
    activeAgents = new Map();
    spawnHistory = [];
    maxHistorySize = 100; // Reduced from 1000
    cleanupInterval = 30000; // 30 second cleanup interval
    persistenceTimeout = 5000; // 5 second timeout
    maxRetries = 3;
    retryDelay = 1000; // 1 second base delay
    cleanupTimer;
    memoryMonitorInterval;
    authorizationQueue = []; // Queue for serializing authorizations
    isProcessingAuthorization = false;
    getDefaultLimits() {
        // Try to load from features.json
        let configLimits = {};
        try {
            const { getAgentSpawn } = require("../core/features-config.js");
            const agentSpawn = getAgentSpawn();
            if (agentSpawn) {
                configLimits = {
                    totalConcurrent: agentSpawn.max_concurrent,
                    perAgentType: {
                        researcher: 1,
                        orchestrator: agentSpawn.max_per_type,
                        enforcer: agentSpawn.max_per_type,
                        architect: agentSpawn.max_per_type,
                        "bug-triage-specialist": agentSpawn.max_per_type,
                        "code-reviewer": agentSpawn.max_per_type,
                        "security-auditor": agentSpawn.max_per_type,
                        refactorer: agentSpawn.max_per_type,
                        "testing-lead": agentSpawn.max_per_type,
                        explore: 1,
                    },
                    spawnRateLimit: {
                        maxPerMinute: agentSpawn.rate_limit_per_minute,
                        windowMs: 60000,
                    },
                };
            }
        }
        catch {
            // Silently use hardcoded defaults
        }
        const defaults = {
            perAgentType: {
                researcher: 1,
                orchestrator: 3,
                enforcer: 2,
                architect: 2,
                "bug-triage-specialist": 2,
                "code-reviewer": 2,
                "security-auditor": 2,
                refactorer: 2,
                "testing-lead": 2,
                explore: 1,
            },
            totalConcurrent: 8, // System-wide concurrent limit
            spawnRateLimit: {
                maxPerMinute: 10,
                windowMs: 60000, // 1 minute
            },
            memoryLimit: {
                maxMemoryMB: 100, // 100MB ceiling
                emergencyThresholdMB: 80, // Emergency cleanup trigger
                cleanupIntervalMs: 30000, // 30 second cleanup interval
            },
        };
        return { ...defaults, ...configLimits };
    }
    defaultLimits;
    constructor(limits = {}, autoStart = false) {
        this.limits = limits;
        this.defaultLimits = this.getDefaultLimits();
        this.limits = { ...this.defaultLimits, ...limits };
        if (autoStart) {
            this.startPeriodicCleanup();
            this.startMemoryMonitoring();
        }
    }
    startPeriodicCleanup() {
        this.cleanupTimer = setInterval(() => {
            this.aggressiveCleanup();
        }, this.cleanupInterval);
    }
    startMemoryMonitoring() {
        this.memoryMonitorInterval = setInterval(() => {
            this.checkMemoryBudget();
        }, this.limits.memoryLimit?.cleanupIntervalMs ?? 30000);
    }
    checkMemoryBudget() {
        const memUsage = process.memoryUsage();
        const heapUsedMB = memUsage.heapUsed / 1024 / 1024;
        const maxMemoryMB = this.limits.memoryLimit?.maxMemoryMB ?? 100;
        const emergencyThresholdMB = this.limits.memoryLimit?.emergencyThresholdMB ?? 80;
        if (heapUsedMB > maxMemoryMB) {
            this.emergencyMemoryCleanup(heapUsedMB);
        }
        else if (heapUsedMB > emergencyThresholdMB) {
            this.aggressiveCleanup();
        }
    }
    emergencyMemoryCleanup(heapUsedMB) {
        frameworkLogger.log("agent-spawn-governor", "emergency-memory-cleanup-triggered", "error", {
            heapUsedMB,
            maxMemoryMB: this.limits.memoryLimit?.maxMemoryMB ?? 100,
            activeAgents: this.getTotalActive(),
            historySize: this.spawnHistory.length,
        });
        this.spawnHistory = this.spawnHistory.filter((r) => r.status === "active");
        const oneMinuteAgo = Date.now() - 60000;
        for (const [agentType, records] of this.activeAgents.entries()) {
            const filtered = records.filter((r) => r.status === "active" || r.timestamp > oneMinuteAgo);
            if (filtered.length === 0) {
                this.activeAgents.delete(agentType);
            }
            else {
                this.activeAgents.set(agentType, filtered);
            }
        }
        if (global.gc) {
            global.gc();
        }
    }
    aggressiveCleanup() {
        const now = Date.now();
        const activeRecordAge = 60 * 60 * 1000; // 1 hour for active records
        const completedRecordAge = 5 * 60 * 1000; // 5 minutes for completed records
        let cleanedCount = 0;
        for (const [agentType, records] of this.activeAgents.entries()) {
            const filtered = records.filter((r) => {
                if (r.status === "active") {
                    return now - r.timestamp < activeRecordAge;
                }
                else {
                    return now - r.timestamp < completedRecordAge;
                }
            });
            if (filtered.length !== records.length) {
                cleanedCount += records.length - filtered.length;
            }
            if (filtered.length === 0) {
                this.activeAgents.delete(agentType);
            }
            else {
                this.activeAgents.set(agentType, filtered);
            }
        }
        this.deepCleanupContexts();
        if (this.spawnHistory.length > this.maxHistorySize) {
            const cutoffTime = now - 10 * 60 * 1000;
            this.spawnHistory = this.spawnHistory.filter((r) => r.status === "active" || r.timestamp > cutoffTime);
            if (this.spawnHistory.length > this.maxHistorySize) {
                this.spawnHistory = this.spawnHistory.slice(-this.maxHistorySize);
            }
        }
        if (cleanedCount > 0) {
            frameworkLogger.log("agent-spawn-governor", "memory-cleanup", "info", {
                cleanedRecords: cleanedCount,
                remainingActive: this.getTotalActive(),
                historySize: this.spawnHistory.length,
            });
        }
    }
    deepCleanupContexts() {
        for (const records of this.activeAgents.values()) {
            for (const record of records) {
                if (record.context && typeof record.context === "object") {
                    this.sanitizeContext(record.context);
                }
            }
        }
    }
    sanitizeContext(context) {
        if ("largeObject" in context) {
            delete context.largeObject;
        }
    }
    /**
     * Authorize a new agent spawn
     */
    async authorizeSpawn(context) {
        const trackingId = this.generateTrackingId();
        return new Promise((resolve, reject) => {
            const processAuthorization = async () => {
                try {
                    const result = await this.withTimeout(this.performAuthorization(context, trackingId), this.persistenceTimeout, "Spawn authorization timeout");
                    resolve(result);
                }
                catch (error) {
                    await this.handleAuthorizationError(error instanceof Error ? error : new Error(String(error)), trackingId, context);
                    reject(error);
                }
                finally {
                    // Process next authorization in queue
                    this.isProcessingAuthorization = false;
                    this.processNextAuthorization();
                }
            };
            // Add to queue and process if not already processing
            this.authorizationQueue.push(processAuthorization);
            if (!this.isProcessingAuthorization) {
                this.processNextAuthorization();
            }
        });
    }
    processNextAuthorization() {
        if (this.authorizationQueue.length > 0 && !this.isProcessingAuthorization) {
            this.isProcessingAuthorization = true;
            const nextAuthorization = this.authorizationQueue.shift();
            if (nextAuthorization) {
                nextAuthorization();
            }
        }
    }
    async performAuthorization(context, trackingId) {
        const { agentType } = context;
        try {
            // Check spawn rate limits with retry
            const rateLimitOk = await this.withRetry(() => Promise.resolve(this.checkSpawnRateLimit(agentType)), "Rate limit check");
            if (!rateLimitOk) {
                return {
                    authorized: false,
                    trackingId,
                    reason: `Spawn rate limit exceeded for ${agentType}`,
                    warnings: ["Too many spawn attempts in short time window"],
                };
            }
            // Check per-agent type limits with retry
            const canSpawn = await this.checkAgentLimitsWithRetry(agentType);
            if (!canSpawn) {
                return {
                    authorized: false,
                    trackingId,
                    reason: `Agent type limit exceeded for ${agentType}`,
                    warnings: ["Maximum concurrent agents reached"],
                };
            }
            // Check total concurrent limit with retry
            const totalActive = await this.getTotalActiveWithRetry();
            const concurrentLimit = this.limits.totalConcurrent ?? 8;
            if (totalActive >= concurrentLimit) {
                return {
                    authorized: false,
                    trackingId,
                    reason: `Total concurrent limit exceeded: ${totalActive}/${concurrentLimit}`,
                    warnings: ["System at maximum concurrent agent capacity"],
                };
            }
            // Detect potential infinite spawn patterns
            if (this.detectInfiniteSpawn(agentType, context)) {
                return {
                    authorized: false,
                    trackingId,
                    reason: "Infinite spawn pattern detected",
                    warnings: [
                        "Recursive spawning prevented to avoid system instability",
                    ],
                };
            }
            // Register the spawn with retry
            await this.registerSpawnWithRetry(context, trackingId);
            return {
                authorized: true,
                trackingId,
            };
        }
        catch (error) {
            throw new Error(`Authorization failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    async checkAgentLimitsWithRetry(agentType) {
        return this.withRetry(async () => {
            const currentCount = this.getActiveCount(agentType);
            const typeLimit = this.limits.perAgentType?.[agentType] ?? 1;
            return currentCount < typeLimit;
        }, "Agent limit check");
    }
    async getTotalActiveWithRetry() {
        return this.withRetry(() => {
            return Promise.resolve(this.getTotalActive());
        }, "Total active count");
    }
    async registerSpawnWithRetry(context, trackingId) {
        return this.withRetry(async () => {
            const record = {
                id: trackingId,
                agentType: context.agentType,
                parentAgent: context.parentAgent,
                timestamp: Date.now(),
                status: "active",
                context,
            };
            this.registerSpawn(record);
            await frameworkLogger.log("agent-spawn-governor", "spawn-authorized", "info", {
                trackingId,
                agentType: context.agentType,
                parentAgent: context.parentAgent,
                activeCount: this.getActiveCount(context.agentType),
                totalActive: this.getTotalActive(),
            });
        }, "Spawn registration");
    }
    async handleAuthorizationError(error, trackingId, context) {
        const errorType = this.categorizeError(error);
        await frameworkLogger.log("agent-spawn-governor", "spawn-authorization-error", "error", {
            trackingId,
            agentType: context.agentType,
            errorType,
            error: error instanceof Error ? error.message : String(error),
        });
        if (errorType === "persistence") {
            this.emergencyCleanup(`Authorization failure: ${errorType}`);
        }
    }
    categorizeError(error) {
        if (error.message?.includes("timeout"))
            return "timeout";
        if (error.message?.includes("persistence"))
            return "persistence";
        if (error.message?.includes("memory"))
            return "memory";
        return "unknown";
    }
    emergencyCleanup(reason) {
        this.aggressiveCleanup();
        frameworkLogger.log("agent-spawn-governor", "emergency-cleanup", "error", {
            reason,
            remainingActive: this.getTotalActive(),
            historySize: this.spawnHistory.length,
        });
    }
    /**
     * Complete an agent spawn (mark as completed)
     */
    async completeSpawn(trackingId, result) {
        const record = this.findRecord(trackingId);
        if (record) {
            record.status = "completed";
            await frameworkLogger.log("agent-spawn-governor", "spawn-completed", "info", {
                trackingId,
                agentType: record.agentType,
                duration: Date.now() - record.timestamp,
                result: result === false ? "failure" : "success",
            });
        }
    }
    /**
     * Fail an agent spawn
     */
    async failSpawn(trackingId, error) {
        const record = this.findRecord(trackingId);
        if (record) {
            record.status = "failed";
            await frameworkLogger.log("agent-spawn-governor", "spawn-failed", "error", {
                trackingId,
                agentType: record.agentType,
                duration: Date.now() - record.timestamp,
                error: error?.message,
            });
        }
    }
    /**
     * Terminate an agent spawn (force stop)
     */
    async terminateSpawn(trackingId, reason) {
        const record = this.findRecord(trackingId);
        if (record) {
            record.status = "terminated";
            await frameworkLogger.log("agent-spawn-governor", "spawn-terminated", "info", {
                trackingId,
                agentType: record.agentType,
                duration: Date.now() - record.timestamp,
                reason,
            });
        }
    }
    /**
     * Get current active count for agent type
     */
    getActiveCount(agentType) {
        return (this.activeAgents.get(agentType)?.filter((r) => r.status === "active")
            .length ?? 0);
    }
    /**
     * Get total active agents system-wide
     */
    getTotalActive() {
        let total = 0;
        for (const records of this.activeAgents.values()) {
            total += records.filter((r) => r.status === "active").length;
        }
        return total;
    }
    /**
     * Get spawn statistics
     */
    getSpawnStats() {
        const perAgentType = {};
        for (const [agentType, records] of this.activeAgents.entries()) {
            const active = records.filter((r) => r.status === "active").length;
            const total = records.length;
            perAgentType[agentType] = { active, total };
        }
        return {
            perAgentType,
            totalActive: this.getTotalActive(),
            totalHistory: this.spawnHistory.length,
        };
    }
    /**
     * Emergency: Terminate all active agents
     */
    async emergencyShutdown(reason) {
        const activeRecords = [];
        for (const records of this.activeAgents.values()) {
            activeRecords.push(...records.filter((r) => r.status === "active"));
        }
        for (const record of activeRecords) {
            await this.terminateSpawn(record.id, reason || "Emergency shutdown");
        }
        await frameworkLogger.log("agent-spawn-governor", "emergency-shutdown", "error", {
            terminatedCount: activeRecords.length,
            reason: reason || "Emergency shutdown initiated",
        });
    }
    // Private methods
    registerSpawn(record) {
        const { agentType } = record;
        if (!this.activeAgents.has(agentType)) {
            this.activeAgents.set(agentType, []);
        }
        this.activeAgents.get(agentType).push(record);
        this.spawnHistory.push(record);
        // Maintain history size limit
        if (this.spawnHistory.length > this.maxHistorySize) {
            this.spawnHistory.shift();
        }
        // Clean up old completed records periodically
        this.cleanupOldRecords();
    }
    checkSpawnRateLimit(agentType) {
        const now = Date.now();
        const rateLimit = this.limits.spawnRateLimit ?? this.defaultLimits.spawnRateLimit;
        const windowStart = now - rateLimit.windowMs;
        const recentSpawns = this.spawnHistory.filter((r) => r.agentType === agentType &&
            r.timestamp >= windowStart &&
            r.timestamp <= now);
        return recentSpawns.length < rateLimit.maxPerMinute;
    }
    detectInfiniteSpawn(agentType, context) {
        // Check for rapid repeated spawns of same type
        const recentSpawns = this.getRecentSpawns(agentType, 300000); // 5 minutes
        if (recentSpawns.length > 5) {
            return true;
        }
        // Check for recursive spawning (agent spawning itself)
        if (context.parentAgent === agentType) {
            return true;
        }
        // Check for cascading researcher spawns (specific known issue)
        if (agentType === "researcher") {
            const researcherSpawns = recentSpawns.filter((r) => r.agentType === "researcher");
            if (researcherSpawns.length > 2) {
                return true;
            }
        }
        return false;
    }
    getRecentSpawns(agentType, timeWindowMs) {
        const now = Date.now();
        const windowStart = now - timeWindowMs;
        return this.spawnHistory.filter((r) => r.agentType === agentType && r.timestamp >= windowStart);
    }
    findRecord(trackingId) {
        for (const records of this.activeAgents.values()) {
            const record = records.find((r) => r.id === trackingId);
            if (record)
                return record;
        }
        return undefined;
    }
    generateTrackingId() {
        return `spawn_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    }
    cleanupOldRecords() {
        const now = Date.now();
        const maxAge = 24 * 60 * 60 * 1000; // 24 hours
        for (const [agentType, records] of this.activeAgents.entries()) {
            const filtered = records.filter((r) => r.status === "active" || now - r.timestamp < maxAge);
            if (filtered.length === 0) {
                this.activeAgents.delete(agentType);
            }
            else {
                this.activeAgents.set(agentType, filtered);
            }
        }
        // Clean up spawn history to prevent memory leaks (retains active records and recent history for 7 days)
        const historyMaxAge = 7 * 24 * 60 * 60 * 1000;
        this.spawnHistory = this.spawnHistory.filter((r) => r.status === "active" || now - r.timestamp < historyMaxAge);
    }
    async withTimeout(promise, timeoutMs, timeoutMessage) {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error(timeoutMessage));
            }, timeoutMs);
            promise
                .then(resolve)
                .catch(reject)
                .finally(() => clearTimeout(timeout));
        });
    }
    async withRetry(operation, operationName) {
        let lastError = null;
        for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
            try {
                return await operation();
            }
            catch (error) {
                lastError = error instanceof Error ? error : new Error(String(error));
                if (attempt < this.maxRetries) {
                    const delay = this.retryDelay * Math.pow(2, attempt - 1);
                    await new Promise((resolve) => setTimeout(resolve, delay));
                    await frameworkLogger.log("agent-spawn-governor", "retry-attempt", "info", {
                        operation: operationName,
                        attempt,
                        delay,
                        error: error instanceof Error ? error.message : String(error),
                    });
                }
            }
        }
        throw lastError;
    }
    start() {
        this.startPeriodicCleanup();
        this.startMemoryMonitoring();
    }
    destroy() {
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
        }
        if (this.memoryMonitorInterval) {
            clearInterval(this.memoryMonitorInterval);
        }
        this.aggressiveCleanup();
    }
}
export const agentSpawnGovernor = new AgentSpawnGovernor(undefined, false);
//# sourceMappingURL=agent-spawn-governor.js.map