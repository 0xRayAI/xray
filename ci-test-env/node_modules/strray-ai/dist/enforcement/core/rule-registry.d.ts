/**
 * Rule Registry - Storage and management for validation rules
 *
 * This class separates rule storage concerns from rule execution.
 * It provides a centralized registry for adding, retrieving, and
 * managing rule definitions with lifecycle operations.
 *
 * @module enforcement/core
 * @version 1.0.0
 *
 * @example
 * ```typescript
 * const registry = new RuleRegistry();
 * registry.addRule({
 *   id: "no-console",
 *   name: "No Console Logs",
 *   description: "Prevents console.log usage",
 *   category: "code-quality",
 *   severity: "warning",
 *   enabled: true,
 *   validator: async (ctx) => ({ passed: true, message: "OK" })
 * });
 * ```
 */
import { RuleDefinition, IRuleRegistry } from "../types.js";
/**
 * RuleRegistry provides storage and lifecycle management for validation rules.
 *
 * This class implements the IRuleRegistry interface and encapsulates
 * all rule storage logic, keeping the RuleEnforcer focused on execution.
 *
 * Key responsibilities:
 * - Rule storage and retrieval
 * - Enable/disable rule state management
 * - Rule statistics and metadata
 * - Rule lifecycle operations (add, remove, clear)
 */
export declare class RuleRegistry implements IRuleRegistry {
    /** Internal storage for rules */
    private rules;
    /**
     * Add a rule to the registry.
     *
     * @param rule - The rule definition to add
     * @throws Error if a rule with the same ID already exists
     *
     * @example
     * ```typescript
     * registry.addRule({
     *   id: "no-console",
     *   name: "No Console Logs",
     *   description: "Prevents console.log usage",
     *   category: "code-quality",
     *   severity: "warning",
     *   enabled: true,
     *   validator: async (ctx) => ({ passed: true, message: "OK" })
     * });
     * ```
     */
    addRule(rule: RuleDefinition): void;
    /**
     * Get all loaded rules as an array.
     *
     * @returns Array of all rule definitions
     *
     * @example
     * ```typescript
     * const allRules = registry.getRules();
     * console.log(`Loaded ${allRules.length} rules`);
     * ```
     */
    getRules(): RuleDefinition[];
    /**
     * Get a specific rule by its ID.
     *
     * @param ruleId - The unique identifier of the rule
     * @returns The rule definition or undefined if not found
     *
     * @example
     * ```typescript
     * const rule = registry.getRule("no-console");
     * if (rule) {
     *   console.log(rule.name);
     * }
     * ```
     */
    getRule(ruleId: string): RuleDefinition | undefined;
    /**
     * Enable a rule by its ID.
     *
     * @param ruleId - The unique identifier of the rule to enable
     * @returns true if the rule was found and enabled, false if not found
     *
     * @example
     * ```typescript
     * if (registry.enableRule("no-console")) {
     *   console.log("Rule enabled successfully");
     * }
     * ```
     */
    enableRule(ruleId: string): boolean;
    /**
     * Disable a rule by its ID.
     *
     * @param ruleId - The unique identifier of the rule to disable
     * @returns true if the rule was found and disabled, false if not found
     *
     * @example
     * ```typescript
     * if (registry.disableRule("no-console")) {
     *   console.log("Rule disabled successfully");
     * }
     * ```
     */
    disableRule(ruleId: string): boolean;
    /**
     * Check if a rule is enabled.
     *
     * @param ruleId - The unique identifier of the rule
     * @returns true if the rule exists and is enabled, false otherwise
     *
     * @example
     * ```typescript
     * if (registry.isRuleEnabled("no-console")) {
     *   // Rule is active
     * }
     * ```
     */
    isRuleEnabled(ruleId: string): boolean;
    /**
     * Get the total count of rules in the registry.
     *
     * @returns The number of rules stored
     *
     * @example
     * ```typescript
     * console.log(`Registry contains ${registry.getRuleCount()} rules`);
     * ```
     */
    getRuleCount(): number;
    /**
     * Get comprehensive statistics about rules in the registry.
     *
     * @returns Statistics including total, enabled, disabled counts and category breakdown
     *
     * @example
     * ```typescript
     * const stats = registry.getRuleStats();
     * console.log(`Enabled: ${stats.enabledRules}/${stats.totalRules}`);
     * console.log("By category:", stats.ruleCategories);
     * ```
     */
    getRuleStats(): {
        totalRules: number;
        enabledRules: number;
        disabledRules: number;
        ruleCategories: Record<string, number>;
    };
    /**
     * Check if a rule exists in the registry.
     *
     * @param ruleId - The unique identifier of the rule
     * @returns true if the rule exists, false otherwise
     *
     * @example
     * ```typescript
     * if (registry.hasRule("no-console")) {
     *   // Rule exists
     * }
     * ```
     */
    hasRule(ruleId: string): boolean;
    /**
     * Remove a rule from the registry.
     *
     * @param ruleId - The unique identifier of the rule to remove
     * @returns true if the rule was found and removed, false if not found
     *
     * @example
     * ```typescript
     * if (registry.removeRule("no-console")) {
     *   console.log("Rule removed successfully");
     * }
     * ```
     */
    removeRule(ruleId: string): boolean;
    /**
     * Clear all rules from the registry.
     *
     * @example
     * ```typescript
     * registry.clearRules();
     * console.log(`Registry cleared. Count: ${registry.getRuleCount()}`);
     * ```
     */
    clearRules(): void;
}
//# sourceMappingURL=rule-registry.d.ts.map