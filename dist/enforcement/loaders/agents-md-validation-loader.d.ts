/**
 * AGENTS.md Validation Rule Loader
 *
 * Loads validation rules for AGENTS.md file existence and currency.
 * Ensures that AGENTS.md exists and is properly maintained.
 *
 * Phase 4 refactoring: Extracted from RuleEnforcer.loadAgentsMdValidationRule()
 *
 * @module loaders/agents-md-validation-loader
 * @version 1.0.0
 */
import { BaseLoader } from "./base-loader.js";
import { RuleDefinition } from "../types.js";
/**
 * Loader for AGENTS.md validation rules.
 * Creates rules that validate AGENTS.md existence and currency.
 *
 * @example
 * ```typescript
 * const loader = new AgentsMdValidationLoader();
 * if (await loader.isAvailable()) {
 *   const rules = await loader.load();
 *   console.log(`Loaded ${rules.length} AGENTS.md validation rules`);
 * }
 * ```
 */
export declare class AgentsMdValidationLoader extends BaseLoader {
    readonly name = "agents-md-validation";
    /**
     * Path to the AGENTS.md file.
     */
    private get agentsPath();
    /**
     * Check if AGENTS.md exists.
     * @returns Promise resolving to true if AGENTS.md is available
     */
    isAvailable(): Promise<boolean>;
    /**
     * Load AGENTS.md validation rules.
     * @returns Promise resolving to array of rule definitions
     */
    load(): Promise<RuleDefinition[]>;
    /**
     * Create AGENTS.md existence rule.
     * @returns RuleDefinition for AGENTS.md existence
     */
    private createAgentsMdExistsRule;
    /**
     * Create AGENTS.md currency rule.
     * @returns RuleDefinition for AGENTS.md currency
     */
    private createAgentsMdCurrentRule;
    /**
     * Create AGENTS.md structure rule.
     * @returns RuleDefinition for AGENTS.md structure
     */
    private createAgentsMdStructureRule;
    /**
     * Validate that AGENTS.md exists.
     * @param context - Validation context
     * @returns Validation result
     */
    private validateAgentsMdExists;
    /**
     * Validate that AGENTS.md is current (updated within 30 days).
     * @param context - Validation context
     * @returns Validation result
     */
    private validateAgentsMdCurrent;
    /**
     * Validate AGENTS.md structure.
     * @param context - Validation context
     * @returns Validation result
     */
    private validateAgentsMdStructure;
}
//# sourceMappingURL=agents-md-validation-loader.d.ts.map