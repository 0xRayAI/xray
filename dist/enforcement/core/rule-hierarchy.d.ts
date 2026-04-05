/**
 * Rule Hierarchy - Manage rule dependencies and execution order
 *
 * This class manages rule dependencies and calculates execution order.
 * It uses topological sorting to ensure dependencies are validated before dependents.
 *
 * Phase 5 refactoring: Extracted from RuleEnforcer.
 *
 * @module enforcement/core
 * @version 1.0.0
 *
 * @example
 * ```typescript
 * const hierarchy = new RuleHierarchy();
 * hierarchy.addDependency('tests-required', ['no-duplicate-code']);
 * hierarchy.addDependency('memory-optimization', ['context-analysis-integration']);
 *
 * const order = hierarchy.getExecutionOrder(['tests-required', 'memory-optimization']);
 * // Result: ['no-duplicate-code', 'tests-required', 'context-analysis-integration', 'memory-optimization']
 * ```
 */
import { IRuleHierarchy } from '../types.js';
/**
 * RuleHierarchy manages rule dependency relationships and execution ordering.
 *
 * Key responsibilities:
 * - Track rule dependencies (A depends on B)
 * - Calculate execution order via topological sort
 * - Detect circular dependencies
 * - Check dependency satisfaction
 */
export declare class RuleHierarchy implements IRuleHierarchy {
    /** Map of rule IDs to their dependencies */
    private dependencies;
    /** Map of rule IDs to rules that depend on them */
    private dependents;
    /**
     * Add a dependency relationship.
     * The rule will be executed after all its dependencies.
     *
     * @param ruleId - The rule that depends on others
     * @param dependsOn - Array of rule IDs that must be executed first
     *
     * @example
     * ```typescript
     * hierarchy.addDependency('tests-required', ['no-duplicate-code']);
     * // tests-required will be validated after no-duplicate-code
     * ```
     */
    addDependency(ruleId: string, dependsOn: string[]): void;
    /**
     * Get all dependencies for a rule.
     *
     * @param ruleId - The rule to get dependencies for
     * @returns Array of rule IDs that the rule depends on
     *
     * @example
     * ```typescript
     * const deps = hierarchy.getDependencies('tests-required');
     * console.log(deps); // ['no-duplicate-code']
     * ```
     */
    getDependencies(ruleId: string): string[];
    /**
     * Get all rules that depend on the given rule.
     *
     * @param ruleId - The rule to get dependents for
     * @returns Array of rule IDs that depend on this rule
     *
     * @example
     * ```typescript
     * const dependents = hierarchy.getDependents('no-duplicate-code');
     * console.log(dependents); // ['tests-required']
     * ```
     */
    getDependents(ruleId: string): string[];
    /**
     * Get the execution order for a set of rules using topological sort.
     * Rules are returned in order such that dependencies come before dependents.
     *
     * Uses Kahn's algorithm for topological sorting.
     *
     * @param ruleIds - Array of rule IDs to order
     * @returns Sorted array of rule IDs in dependency order
     *
     * @example
     * ```typescript
     * const order = hierarchy.getExecutionOrder(['tests-required', 'no-duplicate-code']);
     * // Result: ['no-duplicate-code', 'tests-required']
     * ```
     */
    getExecutionOrder(ruleIds: string[]): string[];
    /**
     * Check if any circular dependencies exist in the hierarchy.
     *
     * @returns true if circular dependencies exist, false otherwise
     *
     * @example
     * ```typescript
     * if (hierarchy.hasCircularDependencies()) {
     *   console.error('Circular dependencies detected!');
     * }
     * ```
     */
    hasCircularDependencies(): boolean;
    /**
     * Find all circular dependency cycles.
     * Uses DFS to detect cycles in the dependency graph.
     *
     * @returns Array of cycles, where each cycle is an array of rule IDs
     *
     * @example
     * ```typescript
     * const cycles = hierarchy.findCircularDependencies();
     * // cycles might be [['rule-a', 'rule-b', 'rule-c']]
     * ```
     */
    findCircularDependencies(): string[][];
    /**
     * Check if all dependencies for a rule have been executed.
     *
     * @param ruleId - The rule to check
     * @param executedRules - Set of rule IDs that have already been executed
     * @returns true if all dependencies are satisfied, false otherwise
     *
     * @example
     * ```typescript
     * const executed = new Set(['no-duplicate-code']);
     * if (hierarchy.isDependencySatisfied('tests-required', executed)) {
     *   // Safe to execute tests-required
     * }
     * ```
     */
    isDependencySatisfied(ruleId: string, executedRules: Set<string>): boolean;
    /**
     * Clear all dependency relationships.
     * Useful for testing or reinitializing.
     */
    clear(): void;
    /**
     * Get all rules that have dependencies registered.
     *
     * @returns Array of rule IDs with dependencies
     */
    getAllRules(): string[];
}
//# sourceMappingURL=rule-hierarchy.d.ts.map