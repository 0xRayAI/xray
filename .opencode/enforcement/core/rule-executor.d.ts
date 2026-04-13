/**
 * Rule Executor - Orchestrate validation execution
 *
 * This class orchestrates the execution of validation rules, handling
 * single rule execution, batch execution, parallel vs serial execution,
 * dependency ordering, timeouts, and error handling.
 *
 * Phase 5 refactoring: Extracted from RuleEnforcer.
 *
 * @module enforcement/core
 * @version 1.0.0
 *
 * @example
 * ```typescript
 * const executor = new RuleExecutor(registry, hierarchy, validatorRegistry);
 *
 * // Execute all applicable rules for an operation
 * const report = await executor.execute('write', context);
 *
 * // Execute a specific rule
 * const result = await executor.executeSingle('no-duplicate-code', context);
 *
 * // Execute multiple rules in batch
 * const results = await executor.executeBatch(['rule1', 'rule2'], context);
 * ```
 */
import { IRuleExecutor, IRuleRegistry, IRuleHierarchy, IValidatorRegistry, RuleValidationContext, RuleValidationResult, ValidationReport, ExecutionOptions, BatchExecutionOptions } from '../types.js';
/**
 * RuleExecutor orchestrates the execution of validation rules.
 *
 * Key responsibilities:
 * - Execute single rules
 * - Execute rules in batch (parallel or serial)
 * - Sort rules by dependency order
 * - Handle timeouts and errors
 * - Generate validation reports
 */
export declare class RuleExecutor implements IRuleExecutor {
    private registry;
    private hierarchy;
    private validatorRegistry;
    /** Default timeout for rule validation in milliseconds */
    private readonly DEFAULT_TIMEOUT_MS;
    constructor(registry: IRuleRegistry, hierarchy: IRuleHierarchy, validatorRegistry: IValidatorRegistry);
    /**
     * Execute validation for an operation against all applicable rules.
     *
     * This method:
     * 1. Gets all applicable rules for the operation
     * 2. Sorts them by dependency order
     * 3. Executes each rule
     * 4. Collects results and generates a validation report
     *
     * @param operation - The operation being performed (e.g., 'write', 'create')
     * @param context - Validation context with code and operation info
     * @param options - Optional execution options
     * @returns Promise resolving to validation report
     *
     * @example
     * ```typescript
     * const report = await executor.execute('write', {
     *   operation: 'write',
     *   files: ['src/index.ts'],
     *   newCode: 'console.log("hello");'
     * });
     *
     * console.log(report.passed); // false if any rule failed
     * console.log(report.errors); // Array of error messages
     * ```
     */
    execute(operation: string, context: RuleValidationContext, options?: ExecutionOptions): Promise<ValidationReport>;
    /**
     * Execute a single rule by ID.
     *
     * @param ruleId - The ID of the rule to execute
     * @param context - Validation context
     * @returns Promise resolving to validation result
     * @throws Error if rule not found or not enabled
     *
     * @example
     * ```typescript
     * const result = await executor.executeSingle('no-duplicate-code', context);
     * console.log(result.passed); // true or false
     * ```
     */
    executeSingle(ruleId: string, context: RuleValidationContext): Promise<RuleValidationResult>;
    /**
     * Execute multiple rules in batch.
     *
     * Supports parallel or serial execution based on options.
     * Optionally sorts rules by dependency order before execution.
     *
     * @param ruleIds - Array of rule IDs to execute
     * @param context - Validation context
     * @param options - Optional batch execution options
     * @returns Promise resolving to array of validation results
     *
     * @example
     * ```typescript
     * const results = await executor.executeBatch(
     *   ['no-duplicate-code', 'tests-required'],
     *   context,
     *   { parallel: true, sortByDependencies: true }
     * );
     * ```
     */
    executeBatch(ruleIds: string[], context: RuleValidationContext, options?: BatchExecutionOptions): Promise<RuleValidationResult[]>;
    /**
     * Execute a rule with timeout protection.
     *
     * @param rule - The rule definition to execute
     * @param context - Validation context
     * @param timeoutMs - Timeout in milliseconds
     * @returns Promise resolving to validation result
     */
    private executeRuleWithTimeout;
    /**
     * Execute rules in parallel.
     *
     * @param rules - Array of rules to execute
     * @param context - Validation context
     * @param options - Execution options
     * @returns Promise resolving to array of results
     */
    private executeParallel;
    /**
     * Sort rules by dependency order using the hierarchy.
     *
     * @param rules - Array of rules to sort
     * @returns Sorted array of rules
     */
    private sortByDependencyOrder;
    /**
     * Process a single result and categorize errors/warnings.
     */
    private processResult;
    /**
     * Process multiple results and categorize errors/warnings.
     */
    private processResults;
    /**
     * Get applicable rules for an operation and context.
     *
     * @param operation - The operation being performed
     * @param context - Validation context
     * @returns Array of applicable rule definitions
     */
    private getApplicableRules;
    /**
     * Check if a rule is applicable to the current operation.
     *
     * @param rule - The rule definition
     * @param operation - The operation being performed
     * @param context - Validation context
     * @returns true if the rule is applicable
     */
    private isRuleApplicable;
}
//# sourceMappingURL=rule-executor.d.ts.map