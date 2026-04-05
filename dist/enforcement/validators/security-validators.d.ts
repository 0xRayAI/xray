/**
 * Security Validators
 *
 * Security-related validators extracted from rule-enforcer.ts during Phase 3 refactoring.
 * These validators enforce security best practices and input validation requirements.
 *
 * @module validators/security-validators
 * @version 1.0.0
 */
import { BaseValidator } from "./base-validator.js";
import { RuleValidationContext, RuleValidationResult } from "../types.js";
/**
 * Validates input validation patterns in code.
 * Checks for proper input validation, sanitization, and parameter validation.
 *
 * @example
 * ```typescript
 * const validator = new InputValidationValidator();
 * const result = await validator.validate({
 *   newCode: 'function processUser(req) { return req.body.name; }',
 *   operation: 'write'
 * });
 * // result.passed === false (missing validation)
 * ```
 */
export declare class InputValidationValidator extends BaseValidator {
    readonly id = "input-validation-validator";
    readonly ruleId = "input-validation";
    readonly category: "security";
    readonly severity: "blocking";
    validate(context: RuleValidationContext): Promise<RuleValidationResult>;
}
/**
 * Validates security by design principles.
 * Checks for security architecture patterns, input sanitization, and vulnerability prevention.
 *
 * @example
 * ```typescript
 * const validator = new SecurityByDesignValidator();
 * const result = await validator.validate({
 *   newCode: 'app.post("/api", (req, res) => { db.query(req.body.sql); })',
 *   operation: 'write'
 * });
 * // result.passed === false (SQL injection risk)
 * ```
 */
export declare class SecurityByDesignValidator extends BaseValidator {
    readonly id = "security-by-design-validator";
    readonly ruleId = "security-by-design";
    readonly category: "security";
    readonly severity: "blocking";
    validate(context: RuleValidationContext): Promise<RuleValidationResult>;
}
//# sourceMappingURL=security-validators.d.ts.map