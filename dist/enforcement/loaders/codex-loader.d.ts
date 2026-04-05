/**
 * Codex Rule Loader
 *
 * Loads codex terms from the resolved codex path and converts them
 * to RuleDefinition objects for the rule enforcement system.
 *
 * Phase 4 refactoring: Extracted from RuleEnforcer.loadCodexRules()
 *
 * @module loaders/codex-loader
 * @version 1.0.0
 */
import { BaseLoader } from "./base-loader.js";
import { RuleDefinition } from "../types.js";
/**
 * Loader for codex terms from codex.json.
 * Converts codex terms to RuleDefinition objects.
 *
 * @example
 * ```typescript
 * const loader = new CodexLoader();
 * if (await loader.isAvailable()) {
 *   const rules = await loader.load();
 *   console.log(`Loaded ${rules.length} codex rules`);
 * }
 * ```
 */
export declare class CodexLoader extends BaseLoader {
    readonly name = "codex";
    /**
     * Path to the codex.json file.
     * Uses the standard config-paths resolver which checks .strray/, .opencode/strray/, etc.
     */
    private get codexPath();
    /**
     * Check if codex.json exists.
     * @returns Promise resolving to true if codex.json is available
     */
    isAvailable(): Promise<boolean>;
    /**
     * Load codex terms and convert to RuleDefinition objects.
     * @returns Promise resolving to array of rule definitions
     */
    load(): Promise<RuleDefinition[]>;
    /**
     * Type guard to check if an object is a valid CodexTerm.
     * @param term - Object to validate
     * @returns True if the object is a valid CodexTerm
     */
    private isValidCodexTerm;
    /**
     * Convert a codex term to a RuleDefinition.
     * @param key - Term key (number as string)
     * @param term - Codex term data
     * @returns RuleDefinition object
     */
    private convertTermToRule;
    /**
     * Map codex category to RuleCategory.
     * @param category - Codex category string
     * @returns Mapped RuleCategory
     */
    private mapCodexCategory;
    /**
     * Map codex severity to RuleSeverity.
     * @param enforcementLevel - Codex enforcement level
     * @param zeroTolerance - Whether term has zero tolerance
     * @returns Mapped RuleSeverity
     */
    private mapCodexSeverity;
    /**
     * Create a validator function for a codex term.
     * Now actually validates code against the term requirements.
     * @param term - Codex term data
     * @returns Validator function that performs real validation
     */
    private createCodexValidator;
}
//# sourceMappingURL=codex-loader.d.ts.map