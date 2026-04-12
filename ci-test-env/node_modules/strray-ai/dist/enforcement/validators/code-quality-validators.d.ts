/**
 * Code Quality Validators
 *
 * Validators for code-quality category rules extracted from rule-enforcer.ts.
 * Each validator encapsulates the validation logic for a specific rule.
 *
 * @module validators/code-quality-validators
 * @version 1.0.0
 */
import { RuleValidationContext, RuleValidationResult } from "../types.js";
import { BaseValidator } from "./base-validator.js";
/**
 * Validates no duplicate code creation (Codex Term #16 - DRY).
 * Prevents creation of code that already exists in the codebase.
 */
export declare class NoDuplicateCodeValidator extends BaseValidator {
    readonly id = "no-duplicate-code-validator";
    readonly ruleId = "no-duplicate-code";
    readonly category: "code-quality";
    readonly severity: "error";
    validate(context: RuleValidationContext): Promise<RuleValidationResult>;
}
/**
 * Validates context analysis integration.
 * Ensures new code integrates properly with context analysis patterns.
 */
export declare class ContextAnalysisIntegrationValidator extends BaseValidator {
    readonly id = "context-analysis-integration-validator";
    readonly ruleId = "context-analysis-integration";
    readonly category: "architecture";
    readonly severity: "warning";
    validate(context: RuleValidationContext): Promise<RuleValidationResult>;
}
/**
 * Validates memory optimization compliance.
 * Ensures code follows memory optimization patterns.
 */
export declare class MemoryOptimizationValidator extends BaseValidator {
    readonly id = "memory-optimization-validator";
    readonly ruleId = "memory-optimization";
    readonly category: "performance";
    readonly severity: "warning";
    validate(context: RuleValidationContext): Promise<RuleValidationResult>;
}
/**
 * Validates documentation requirements (Codex Term #34).
 * Enforces comprehensive documentation for all code changes.
 */
export declare class DocumentationRequiredValidator extends BaseValidator {
    readonly id = "documentation-required-validator";
    readonly ruleId = "documentation-required";
    readonly category: "code-quality";
    readonly severity: "warning";
    validate(context: RuleValidationContext): Promise<RuleValidationResult>;
}
/**
 * Validates no over-engineering (Codex Term #3).
 * Prevents unnecessary complexity and abstractions.
 */
export declare class NoOverEngineeringValidator extends BaseValidator {
    readonly id = "no-over-engineering-validator";
    readonly ruleId = "no-over-engineering";
    readonly category: "architecture";
    readonly severity: "error";
    validate(context: RuleValidationContext): Promise<RuleValidationResult>;
}
/**
 * Validates clean debug logs (Development Triage).
 * Ensures debug logs are removed before production deployment.
 */
export declare class CleanDebugLogsValidator extends BaseValidator {
    readonly id = "clean-debug-logs-validator";
    readonly ruleId = "clean-debug-logs";
    readonly category: "code-quality";
    readonly severity: "error";
    validate(context: RuleValidationContext): Promise<RuleValidationResult>;
}
/**
 * Validates console log usage restrictions.
 * Console.log must be used only for debugging in dev mode.
 * Retained logs must use framework logger.
 */
export declare class ConsoleLogUsageValidator extends BaseValidator {
    readonly id = "console-log-usage-validator";
    readonly ruleId = "console-log-usage";
    readonly category: "code-quality";
    readonly severity: "error";
    validate(context: RuleValidationContext): Promise<RuleValidationResult>;
}
//# sourceMappingURL=code-quality-validators.d.ts.map