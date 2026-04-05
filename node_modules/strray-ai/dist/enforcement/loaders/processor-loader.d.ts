/**
 * Processor Rule Loader
 *
 * Loads processor-specific rules for the enforcement system.
 * This is a placeholder for future expansion of processor-specific validation.
 *
 * Phase 4 refactoring: Extracted from RuleEnforcer.loadProcessorRules()
 *
 * @module loaders/processor-loader
 * @version 1.0.0
 */
import { BaseLoader } from "./base-loader.js";
import { RuleDefinition } from "../types.js";
/**
 * Loader for processor-specific rules.
 * Currently provides a placeholder for future processor rule expansion.
 *
 * @example
 * ```typescript
 * const loader = new ProcessorLoader();
 * const rules = await loader.load();
 * console.log(`Loaded ${rules.length} processor rules`);
 * ```
 */
export declare class ProcessorLoader extends BaseLoader {
    readonly name = "processor";
    /**
     * Processor rules are always available.
     * @returns Always returns true
     */
    isAvailable(): Promise<boolean>;
    /**
     * Load processor-specific rules.
     * Currently returns placeholder rules for future expansion.
     * @returns Promise resolving to array of rule definitions
     */
    load(): Promise<RuleDefinition[]>;
    /**
     * Create processor validation rule.
     * @returns RuleDefinition for processor validation
     */
    private createProcessorValidationRule;
    /**
     * Create processor health check rule.
     * @returns RuleDefinition for processor health
     */
    private createProcessorHealthRule;
    /**
     * Validate processor operations.
     * @param context - Validation context
     * @returns Validation result
     */
    private validateProcessorOperations;
    /**
     * Validate processor health.
     * @param context - Validation context
     * @returns Validation result
     */
    private validateProcessorHealth;
}
//# sourceMappingURL=processor-loader.d.ts.map