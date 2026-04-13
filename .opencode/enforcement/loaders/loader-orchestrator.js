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
import { frameworkLogger } from "../../core/framework-logger.js";
import { CodexLoader } from "./codex-loader.js";
import { AgentTriageLoader } from "./agent-triage-loader.js";
import { ProcessorLoader } from "./processor-loader.js";
import { AgentsMdValidationLoader } from "./agents-md-validation-loader.js";
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
export class LoaderOrchestrator {
    loaders = [];
    options;
    /**
     * Create a new LoaderOrchestrator.
     * @param options - Configuration options
     */
    constructor(options = {}) {
        this.options = {
            continueOnError: true,
            enableLogging: true,
            ...options,
        };
        // Register default loaders
        this.registerDefaultLoaders();
    }
    /**
     * Register the default set of loaders.
     */
    registerDefaultLoaders() {
        this.loaders = [
            new CodexLoader(),
            new AgentTriageLoader(),
            new ProcessorLoader(),
            new AgentsMdValidationLoader(),
        ];
    }
    /**
     * Load all rules from all available loaders.
     * @returns Promise resolving to orchestrator result
     */
    async loadAllRules() {
        const allRules = [];
        const loaderResults = new Map();
        let successfulLoaders = 0;
        let failedLoaders = 0;
        for (const loader of this.loaders) {
            try {
                const isAvailable = await loader.isAvailable();
                if (!isAvailable) {
                    if (this.options.enableLogging) {
                        await frameworkLogger.log("loader-orchestrator", "loader-not-available", "info", {
                            message: `Loader ${loader.name} not available, skipping`,
                            loader: loader.name,
                        });
                    }
                    loaderResults.set(loader.name, { success: true, ruleCount: 0 });
                    continue;
                }
                const rules = await loader.load();
                allRules.push(...rules);
                successfulLoaders++;
                loaderResults.set(loader.name, { success: true, ruleCount: rules.length });
                if (this.options.enableLogging) {
                    await frameworkLogger.log("loader-orchestrator", "loader-success", "success", {
                        message: `Loader ${loader.name} loaded ${rules.length} rules`,
                        loader: loader.name,
                        ruleCount: rules.length,
                    });
                }
            }
            catch (error) {
                failedLoaders++;
                const errorMessage = error instanceof Error ? error.message : String(error);
                loaderResults.set(loader.name, { success: false, ruleCount: 0, error: errorMessage });
                if (this.options.enableLogging) {
                    await frameworkLogger.log("loader-orchestrator", "loader-failed", "error", {
                        message: `Loader ${loader.name} failed: ${errorMessage}`,
                        loader: loader.name,
                        error: errorMessage,
                    });
                }
                if (!this.options.continueOnError) {
                    throw error;
                }
            }
        }
        const result = {
            rules: allRules,
            successfulLoaders,
            failedLoaders,
            loaderResults,
        };
        if (this.options.enableLogging) {
            await frameworkLogger.log("loader-orchestrator", "load-complete", "success", {
                message: `Loaded ${allRules.length} rules from ${successfulLoaders} loaders (${failedLoaders} failed)`,
                totalRules: allRules.length,
                successfulLoaders,
                failedLoaders,
            });
        }
        return result;
    }
    /**
     * Register a custom loader.
     * @param loader - Loader to register
     */
    registerLoader(loader) {
        this.loaders.push(loader);
    }
    /**
     * Get all registered loaders.
     * @returns Array of registered loaders
     */
    getLoaders() {
        return [...this.loaders];
    }
    /**
     * Get loader by name.
     * @param name - Loader name
     * @returns Loader instance or undefined
     */
    getLoader(name) {
        return this.loaders.find((loader) => loader.name === name);
    }
    /**
     * Remove a loader by name.
     * @param name - Loader name
     * @returns True if loader was removed
     */
    removeLoader(name) {
        const index = this.loaders.findIndex((loader) => loader.name === name);
        if (index >= 0) {
            this.loaders.splice(index, 1);
            return true;
        }
        return false;
    }
    /**
     * Clear all registered loaders.
     */
    clearLoaders() {
        this.loaders = [];
    }
    /**
     * Get count of registered loaders.
     * @returns Number of loaders
     */
    getLoaderCount() {
        return this.loaders.length;
    }
}
//# sourceMappingURL=loader-orchestrator.js.map