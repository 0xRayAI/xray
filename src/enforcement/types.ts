/**
 * Rule Enforcement System Types
 * 
 * This module contains all TypeScript type definitions for the rule enforcement system.
 * Extracted from rule-enforcer.ts as part of Phase 1 refactoring.
 * 
 * @module types
 * @version 1.0.0
 */

/**
 * Rule severity levels
 */
export type RuleSeverity = "error" | "warning" | "info" | "blocking" | "high";

/**
 * Rule categories for organizing and filtering rules
 */
export type RuleCategory =
  | "code-quality"
  | "architecture"
  | "performance"
  | "security"
  | "testing"
  | "reporting"
  | "codex";

/**
 * Rule fix action types
 */
export type RuleFixType = "create-file" | "modify-file" | "add-dependency" | "run-command";

/**
 * Defines a validation rule with its metadata and validator function.
 * 
 * @example
 * ```typescript
 * const rule: RuleDefinition = {
 *   id: "no-console",
 *   name: "No Console Logs",
 *   description: "Prevents console.log usage in production code",
 *   category: "code-quality",
 *   severity: "warning",
 *   validator: async (context) => ({ passed: true, message: "OK" }),
 *   enabled: true
 * };
 * ```
 */
export interface RuleDefinition {
  /** Unique identifier for the rule */
  id: string;
  /** Human-readable name of the rule */
  name: string;
  /** Detailed description of what the rule validates */
  description: string;
  /** Category for organizing rules */
  category: RuleCategory;
  /** Severity level of violations */
  severity: RuleSeverity;
  /** Async validator function that performs the validation */
  validator: (context: RuleValidationContext) => Promise<RuleValidationResult>;
  /** Whether the rule is currently active */
  enabled: boolean;
}

/**
 * Context object passed to rule validators containing operation details.
 * 
 * @example
 * ```typescript
 * const context: RuleValidationContext = {
 *   operation: "write",
 *   files: ["src/index.ts"],
 *   newCode: "console.log('hello');"
 * };
 * ```
 */
export interface RuleValidationContext {
  /** The operation being performed (write, create, modify, etc.) */
  operation: string;
  /** List of files involved in the operation */
  files?: string[];
  /** Name of the component being created/modified */
  component?: string;
  /** Map of existing file paths to their content */
  existingCode?: Map<string, string>;
  /** New code being written */
  newCode?: string;
  /** List of declared dependencies */
  dependencies?: string[];
  /** List of test files */
  tests?: string[];
}

/**
 * Result of a rule validation operation.
 * 
 * @example
 * ```typescript
 * const result: RuleValidationResult = {
 *   passed: false,
 *   message: "Console.log detected",
 *   suggestions: ["Use frameworkLogger instead"],
 *   fixes: [{ type: "modify-file", description: "Replace console.log" }]
 * };
 * ```
 */
export interface RuleValidationResult {
  /** Whether validation passed */
  passed: boolean;
  /** Human-readable message describing the result */
  message: string;
  /** Optional list of improvement suggestions */
  suggestions?: string[];
  /** Optional list of automated fixes that can be applied */
  fixes?: RuleFix[];
}

/**
 * Complete validation report for an operation.
 * 
 * @example
 * ```typescript
 * const report: ValidationReport = {
 *   operation: "write",
 *   passed: false,
 *   errors: ["Rule 1 failed"],
 *   warnings: ["Rule 2 warning"],
 *   results: [...],
 *   timestamp: new Date()
 * };
 * ```
 */
export interface ValidationReport {
  /** The operation that was validated */
  operation: string;
  /** Whether all rules passed */
  passed: boolean;
  /** List of error messages */
  errors: string[];
  /** List of warning messages */
  warnings: string[];
  /** Detailed results from each rule */
  results: RuleValidationResult[];
  /** When the validation was performed */
  timestamp: Date;
}

/**
 * Tracks an attempt to fix a rule violation.
 * 
 * @example
 * ```typescript
 * const fix: ViolationFix = {
 *   ruleId: "no-console",
 *   agent: "refactorer",
 *   skill: "code-review",
 *   context: {...},
 *   attempted: true,
 *   success: true
 * };
 * ```
 */
export interface ViolationFix {
  /** ID of the rule that was violated */
  ruleId: string;
  /** Agent that attempted the fix */
  agent: string;
  /** Skill that was invoked */
  skill: string;
  /** Context at the time of the fix attempt */
  context: unknown;
  /** Whether a fix was attempted */
  attempted: boolean;
  /** Whether the fix succeeded (if attempted) */
  success?: boolean;
  /** Error message if fix failed */
  error?: string;
}

/**
 * Describes an automated fix that can be applied to resolve a violation.
 * 
 * @example
 * ```typescript
 * const fix: RuleFix = {
 *   type: "modify-file",
 *   description: "Remove console.log statements",
 *   filePath: "src/index.ts",
 *   content: "// cleaned code"
 * };
 * ```
 */
export interface RuleFix {
  /** Type of fix to apply */
  type: RuleFixType;
  /** Human-readable description of the fix */
  description: string;
  /** Target file path (for file operations) */
  filePath?: string;
  /** Content to write (for file operations) */
  content?: string;
  /** Command to execute (for command operations) */
  command?: string;
}

/**
 * Type guard to check if an object is a valid RuleValidationResult.
 *
 * @param obj - The object to check
 * @returns True if the object is a valid RuleValidationResult
 *
 * @example
 * ```typescript
 * if (isRuleValidationResult(value)) {
 *   console.log(value.passed);
 * }
 * ```
 */
export function isRuleValidationResult(obj: unknown): obj is RuleValidationResult {
  return (
    obj !== null &&
    typeof obj === "object" &&
    "passed" in obj &&
    typeof (obj as RuleValidationResult).passed === "boolean" &&
    "message" in obj &&
    typeof (obj as RuleValidationResult).message === "string"
  );
}

/**
 * Interface for individual validators extracted from RuleEnforcer.
 * Validators encapsulate specific validation logic and can be tested independently.
 *
 * @example
 * ```typescript
 * class MyValidator implements IValidator {
 *   readonly id = 'my-validator';
 *   readonly ruleId = 'my-rule';
 *   readonly category = 'code-quality';
 *   readonly severity = 'error';
 *
 *   async validate(context: RuleValidationContext): Promise<RuleValidationResult> {
 *     // validation logic
 *   }
 * }
 * ```
 */
export interface IValidator {
  /** Unique identifier for this validator instance */
  readonly id: string;
  /** The rule ID this validator validates */
  readonly ruleId: string;
  /** Category for organizing validators */
  readonly category: RuleCategory;
  /** Severity level of violations */
  readonly severity: RuleSeverity;

  /**
   * Perform validation on the given context.
   * @param context - The validation context containing code and operation info
   * @returns Promise resolving to validation result
   */
  validate(context: RuleValidationContext): Promise<RuleValidationResult>;
}

/**
 * Interface for validator registry implementations.
 * Manages validator instances and provides lookup capabilities.
 *
 * @example
 * ```typescript
 * const registry = new ValidatorRegistry();
 * registry.register(new NoDuplicateCodeValidator());
 * const validator = registry.getValidator('no-duplicate-code');
 * ```
 */
export interface IValidatorRegistry {
  /** Register a validator instance */
  register(validator: IValidator): void;

  /** Get a validator by rule ID */
  getValidator(ruleId: string): IValidator | undefined;

  /** Get all validators for a specific category */
  getValidatorsByCategory(category: RuleCategory): IValidator[];

  /** Get all registered validators */
  getAllValidators(): IValidator[];

  /** Check if a validator exists for a rule ID */
  hasValidator(ruleId: string): boolean;

  /** Remove a validator from the registry */
  unregister(ruleId: string): boolean;

  /** Clear all validators from the registry */
  clear(): void;

  /** Get count of registered validators */
  getCount(): number;
}

/**
 * Interface for rule registry implementations.
 * Provides storage and management of validation rules separate from execution.
 *
 * @example
 * ```typescript
 * const registry: IRuleRegistry = new RuleRegistry();
 * registry.addRule({ id: "no-console", name: "No Console", ... });
 * const rules = registry.getRules();
 * ```
 */
export interface IRuleRegistry {
  /** Add a rule to the registry */
  addRule(rule: RuleDefinition): void;

  /** Get all loaded rules */
  getRules(): RuleDefinition[];

  /** Get a specific rule by ID */
  getRule(ruleId: string): RuleDefinition | undefined;

  /** Enable a rule by ID */
  enableRule(ruleId: string): boolean;

  /** Disable a rule by ID */
  disableRule(ruleId: string): boolean;

  /** Check if a rule is enabled */
  isRuleEnabled(ruleId: string): boolean;

  /** Get total rule count */
  getRuleCount(): number;

  /** Get rule statistics by category and status */
  getRuleStats(): {
    totalRules: number;
    enabledRules: number;
    disabledRules: number;
    ruleCategories: Record<string, number>;
  };

  /** Check if a rule exists in the registry */
  hasRule(ruleId: string): boolean;

  /** Remove a rule from the registry */
  removeRule(ruleId: string): boolean;

  /** Clear all rules from the registry */
  clearRules(): void;
}
