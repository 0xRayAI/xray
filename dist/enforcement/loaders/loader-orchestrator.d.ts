/**
 * Loader Orchestrator
 *
 * Coordinates multiple rule loaders to load rules from various sources.
 * Manages loader execution, error handling, and rule aggregation.
 *
 * Phase 4 refactoring: Extracted loader orchestration from RuleEnforcer
 *
 * @module loaders/loader-orchestrator
 * @version 1.0.0
 */
import { IRuleLoader, RuleDefinition } from "../types.js";
/**
 * Options for LoaderOrchestrator configuration.
 */
export interface LoaderOrchestratorOptions {
    /** Whether to continue loading if one loader fails */
    continueOnError?: boolean;
    /** Whether to log loader activity */
    enableLogging?: boolean;
}
/**
 * Result from the orchestrator's load operation.
 */
export interface LoaderOrchestratorResult {
    /** All loaded rules */
    rules: RuleDefinition[];
    /** Number of successful loaders */
    successfulLoaders: number;
    /** Number of failed loaders */
    failedLoaders: number;
    /** Loader-specific results */
    loaderResults: Map<string, {
        success: boolean;
        ruleCount: number;
        error?: string;
    }>;
}
/**
 * Orchestrates multiple rule loaders to load rules from various sources.
 *
 * @example
 * ```typescript
 * const orchestrator = new LoaderOrchestrator();
 * const result = await orchestrator.loadAllRules();
 * console.log(`Loaded ${result.rules.length} rules from ${result.successfulLoaders} loaders`);
 * ```
 */
export declare class LoaderOrchestrator {
    private loaders;
    private options;
    /**
     * Create a new LoaderOrchestrator.
     * @param options - Configuration options
     */
    constructor(options?: LoaderOrchestratorOptions);
    /**
     * Register the default set of loaders.
     */
    private registerDefaultLoaders;
    /**
     * Load all rules from all available loaders.
     * @returns Promise resolving to orchestrator result
     */
    loadAllRules(): Promise<LoaderOrchestratorResult>;
    /**
     * Register a custom loader.
     * @param loader - Loader to register
     */
    registerLoader(loader: IRuleLoader): void;
    /**
     * Get all registered loaders.
     * @returns Array of registered loaders
     */
    getLoaders(): IRuleLoader[];
    /**
     * Get loader by name.
     * @param name - Loader name
     * @returns Loader instance or undefined
     */
    getLoader(name: string): IRuleLoader | undefined;
    /**
     * Remove a loader by name.
     * @param name - Loader name
     * @returns True if loader was removed
     */
    removeLoader(name: string): boolean;
    /**
     * Clear all registered loaders.
     */
    clearLoaders(): void;
    /**
     * Get count of registered loaders.
     * @returns Number of loaders
     */
    getLoaderCount(): number;
}
//# sourceMappingURL=loader-orchestrator.d.ts.map