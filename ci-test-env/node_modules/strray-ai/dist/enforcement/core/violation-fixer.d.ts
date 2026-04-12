/**
 * Violation Fixer - Handle violation fixes via agent delegation
 *
 * This class maps rule violations to appropriate agents/skills and attempts
 * automatic fixes. It serves as the central governance point for all
 * violation remediation in the 0xRay framework.
 *
 * Phase 5 refactoring: Extracted from RuleEnforcer.
 *
 * @module enforcement/core
 * @version 1.0.0
 *
 * @example
 * ```typescript
 * const fixer = new ViolationFixer();
 *
 * // Register a custom fix strategy
 * fixer.registerFixStrategy('my-rule', {
 *   agent: 'refactorer',
 *   skill: 'code-review',
 *   tool: 'analyze_code_quality',
 *   priority: 1
 * });
 *
 * // Fix violations
 * const fixes = await fixer.fixViolations(violations, context);
 * ```
 */
import { IViolationFixer, Violation, ViolationFix, FixStrategy, RuleValidationContext } from '../types.js';
/**
 * ViolationFixer handles violation fixes by delegating to appropriate agents/skills.
 *
 * Key responsibilities:
 * - Map violations to agents/skills
 * - Attempt automatic fixes via MCP skill invocation
 * - Track fix success/failure
 * - Handle fix strategies
 *
 * This is the central governance point for all codex compliance actions.
 */
export declare class ViolationFixer implements IViolationFixer {
    /** Map of rule IDs to their fix strategies */
    private fixStrategies;
    /** Default tool mapping for skills */
    private toolMappings;
    constructor();
    /**
     * Attempt to fix violations by delegating to appropriate agents/skills.
     *
     * For each violation:
     * - Finds the appropriate agent/skill mapping
     * - Invokes the skill via MCP
     * - Tracks the result
     *
     * @param violations - Array of violations to fix
     * @param context - Validation context with code and operation info
     * @returns Array of fix attempts with results
     *
     * @example
     * ```typescript
     * const violations = [{ rule: 'no-duplicate-code', message: 'Duplicate detected' }];
     * const fixes = await fixer.fixViolations(violations, context);
     * console.log(fixes[0].success); // true if fix succeeded
     * ```
     */
    fixViolations(violations: Violation[], context: RuleValidationContext): Promise<ViolationFix[]>;
    /**
     * Register a custom fix strategy for a rule.
     *
     * @param ruleId - The rule ID to register the strategy for
     * @param strategy - The fix strategy configuration
     *
     * @example
     * ```typescript
     * fixer.registerFixStrategy('custom-rule', {
     *   agent: 'refactorer',
     *   skill: 'code-review',
     *   tool: 'analyze_code_quality',
     *   priority: 1
     * });
     * ```
     */
    registerFixStrategy(ruleId: string, strategy: FixStrategy): void;
    /**
     * Get the fix strategy for a rule.
     *
     * @param ruleId - The rule ID to get the strategy for
     * @returns The fix strategy or undefined if not found
     */
    getFixStrategy(ruleId: string): FixStrategy | undefined;
    /**
     * Get the appropriate tool name for a skill.
     * Uses internal tool mappings or defaults to analyze_code_quality.
     *
     * @param skill - The skill name
     * @returns The tool name to use
     */
    private getToolForSkill;
    /**
     * Initialize default fix strategies for all known rules.
     * This maps rule IDs to their corresponding agents/skills.
     *
     * Central governance mapping for all codex compliance actions.
     */
    private initializeFixStrategies;
}
//# sourceMappingURL=violation-fixer.d.ts.map