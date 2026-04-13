/**
 * RuleEnforcer - Facade for the enforcement system
 *
 * Orchestrates rule validation and fixing through specialized components:
 * - RuleRegistry: Rule storage and lifecycle
 * - RuleHierarchy: Dependency management
 * - RuleExecutor: Validation orchestration
 * - ViolationFixer: Fix delegation to agents
 * - LoaderOrchestrator: Async rule loading
 * - ValidatorRegistry: Individual rule validators
 *
 * Phase 6 refactoring: Final facade cleanup - RuleEnforcer is now a pure facade
 * with all business logic delegated to specialized components.
 *
 * @example
 * const enforcer = new RuleEnforcer();
 * const report = await enforcer.validateOperation('write', context);
 * const fixes = await enforcer.attemptRuleViolationFixes(report.violations, context);
 */
import { RuleDefinition, RuleValidationContext, ValidationReport, Violation, ViolationFix, IRuleRegistry, IValidatorRegistry, IRuleHierarchy, IRuleExecutor, IViolationFixer } from "./types.js";
export { RuleDefinition, RuleValidationContext, RuleValidationResult, ValidationReport, Violation, ViolationFix, RuleFix, RuleFixType, isRuleValidationResult, } from "./types.js";
export { RuleRegistry, RuleHierarchy, RuleExecutor, ViolationFixer, } from "./core/index.js";
/**
 * Options for RuleEnforcer constructor.
 * Supports dependency injection for testability.
 */
export interface RuleEnforcerOptions {
    /** Custom rule registry (optional) */
    registry?: IRuleRegistry;
    /** Custom rule hierarchy (optional) */
    hierarchy?: IRuleHierarchy;
    /** Custom rule executor (optional) */
    executor?: IRuleExecutor;
    /** Custom violation fixer (optional) */
    fixer?: IViolationFixer;
    /** Custom validator registry (optional) */
    validatorRegistry?: IValidatorRegistry;
}
/**
 * RuleEnforcer - Facade for the rule enforcement system
 *
 * This class acts as a unified interface to the enforcement system,
 * delegating all operations to specialized components:
 *
 * - RuleRegistry: Stores and manages rule definitions
 * - RuleHierarchy: Manages rule dependencies and execution order
 * - RuleExecutor: Orchestrates validation execution
 * - ViolationFixer: Delegates fixes to appropriate agents/skills
 * - ValidatorRegistry: Registers and retrieves individual rule validators
 *
 * All validation logic has been extracted to individual validator classes
 * in the validators/ directory. This facade only coordinates between components.
 */
export declare class RuleEnforcer {
    private registry;
    private hierarchy;
    private executor;
    private fixer;
    private validatorRegistry;
    private initialized;
    constructor(options?: RuleEnforcerOptions);
    /**
     * Initialize default framework rules using compact metadata.
     * All validators are delegated to the ValidatorRegistry via createValidatorDelegate.
     */
    private initializeRules;
    /**
     * Initialize rule hierarchy (prerequisites)
     * Delegates to RuleHierarchy for dependency management
     */
    private initializeRuleHierarchy;
    /**
     * Load async rules in background using LoaderOrchestrator.
     * Delegates to LoaderOrchestrator for rule loading.
     */
    private loadAsyncRules;
    /**
     * Add a rule to the enforcer
     * Delegates to RuleRegistry for storage
     */
    addRule(rule: RuleDefinition): void;
    /**
     * Get all loaded rules
     * Delegates to RuleRegistry for retrieval
     */
    getRules(): RuleDefinition[];
    /**
     * Get rule count
     * Delegates to RuleRegistry for count
     */
    getRuleCount(): number;
    /**
     * Get rule by ID
     * Delegates to RuleRegistry for retrieval
     */
    getRule(id: string): RuleDefinition | undefined;
    /**
     * Enable a rule by ID
     * Delegates to RuleRegistry for state management
     */
    enableRule(ruleId: string): boolean;
    /**
     * Disable a rule by ID
     * Delegates to RuleRegistry for state management
     */
    disableRule(ruleId: string): boolean;
    /**
     * Check if a rule is enabled
     * Delegates to RuleRegistry for state check
     */
    isRuleEnabled(ruleId: string): boolean;
    /**
     * Get rule statistics
     * Delegates to RuleRegistry for statistics
     */
    getRuleStats(): {
        totalRules: number;
        enabledRules: number;
        disabledRules: number;
        ruleCategories: Record<string, number>;
    };
    /**
     * Check if rule enforcer is fully initialized
     */
    isInitialized(): boolean;
    /**
     * Validate operation against all applicable rules
     * Delegates to RuleExecutor for validation orchestration
     */
    validateOperation(operation: string, context: RuleValidationContext): Promise<ValidationReport>;
    /**
     * Attempt to fix rule violations by delegating to appropriate agents/skills
     * Delegates to ViolationFixer for fix orchestration
     */
    attemptRuleViolationFixes(violations: Violation[], context: RuleValidationContext): Promise<ViolationFix[]>;
    /**
     * Creates a validator delegate function that looks up and calls the appropriate validator.
     * Eliminates the need for 30+ individual wrapper methods.
     */
    private createValidatorDelegate;
}
export declare const ruleEnforcer: RuleEnforcer;
//# sourceMappingURL=rule-enforcer.d.ts.map