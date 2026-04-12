/**
 * Routing Outcome Tracker
 *
 * Tracks routing outcomes and provides statistics for performance analysis.
 * Extracted from task-skill-router.ts as part of Phase 2 refactoring.
 *
 * @version 1.0.0
 * @since 2026-03-12
 */
import { RoutingOutcome, AgentStats, PromptDataPoint, RoutingDecision } from '../config/types.js';
/**
 * RoutingOutcomeTracker class
 *
 * Tracks routing outcomes with circular buffer pattern for memory efficiency.
 * Provides methods for recording outcomes, calculating statistics, and
 * retrieving data for analytics.
 *
 * Persists outcomes to logs/framework/routing-outcomes.json for analytics to read.
 */
export declare class RoutingOutcomeTracker {
    private outcomes;
    private readonly maxOutcomes;
    private readonly persistencePath;
    private saveTimeout;
    private readonly SAVE_DEBOUNCE_MS;
    /**
     * Create a new outcome tracker
     * @param maxOutcomes Maximum number of outcomes to retain (default: 1000)
     */
    constructor(maxOutcomes?: number);
    /**
     * Ensure the log directory and file exist on initialization
     */
    private initializeFile;
    /**
     * Load outcomes from disk on initialization
     */
    private loadFromDisk;
    /**
     * Save outcomes to disk (debounced)
     */
    private scheduleSave;
    /**
     * Immediately save to disk (synchronous for reliability)
     */
    private saveToDisk;
    /**
     * Record a new routing outcome
     * @param outcome The outcome to record (timestamp will be added)
     */
    recordOutcome(outcome: Omit<RoutingOutcome, 'timestamp'>): void;
    /**
     * Update an existing outcome by taskId
     * @param taskId The task ID to update
     * @param updates The fields to update
     * @returns true if updated, false if not found
     */
    updateOutcome(taskId: string, updates: Partial<RoutingOutcome>): boolean;
    /**
     * Force reload from disk - call this before analytics to get latest data
     */
    reloadFromDisk(): Promise<void>;
    /**
     * Get all outcomes, optionally filtered by agent
     * @param agent Optional agent name to filter by
     * @returns Array of routing outcomes
     */
    getOutcomes(agent?: string): RoutingOutcome[];
    /**
     * Calculate success rate for a specific agent
     * @param agent The agent name
     * @returns Success rate between 0 and 1
     */
    getSuccessRate(agent: string): number;
    /**
     * Get statistics for all agents
     * @returns Array of agent statistics
     */
    getStats(): AgentStats[];
    /**
     * Clear all recorded outcomes
     */
    clear(): void;
    /**
     * Get the count of recorded outcomes
     * @returns Number of outcomes
     */
    getCount(): number;
    /**
     * Export outcomes to JSON string
     * @returns JSON string of all outcomes
     */
    toJSON(): string;
    /**
     * Convert outcomes to prompt data points for pattern analysis
     * @returns Array of prompt data points
     */
    getPromptData(): PromptDataPoint[];
    /**
     * Convert outcomes to routing decisions
     * @returns Array of routing decisions
     */
    getRoutingDecisions(): RoutingDecision[];
    /**
     * Apply routing refinements to existing outcomes
     * @param changes Array of changes to apply
     */
    applyRoutingRefinements(changes: Array<{
        taskId: string;
        agent?: string;
        skill?: string;
        confidence?: number;
    }>): void;
}
/**
 * Global routing outcome tracker instance
 */
export declare const routingOutcomeTracker: RoutingOutcomeTracker;
//# sourceMappingURL=outcome-tracker.d.ts.map