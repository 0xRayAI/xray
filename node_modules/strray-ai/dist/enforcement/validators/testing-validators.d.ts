/**
 * Testing Validators
 *
 * Validators for testing category rules extracted from rule-enforcer.ts.
 * Each validator encapsulates the validation logic for a specific testing rule.
 *
 * @module validators/testing-validators
 * @version 1.0.0
 */
import { RuleValidationContext, RuleValidationResult } from "../types.js";
import { BaseValidator } from "./base-validator.js";
/**
 * Validates that tests are required for new code (Codex Term #26).
 * Checks if tests exist for new components or modified functionality.
 */
export declare class TestsRequiredValidator extends BaseValidator {
    readonly id = "tests-required-validator";
    readonly ruleId = "tests-required";
    readonly category: "testing";
    readonly severity: "error";
    validate(context: RuleValidationContext): Promise<RuleValidationResult>;
}
/**
 * Validates test coverage thresholds (Codex Term #26).
 * Maintains 85%+ behavioral test coverage.
 */
export declare class TestCoverageValidator extends BaseValidator {
    readonly id = "test-coverage-validator";
    readonly ruleId = "test-coverage";
    readonly category: "testing";
    readonly severity: "warning";
    validate(context: RuleValidationContext): Promise<RuleValidationResult>;
}
/**
 * Validates continuous integration requirements (Codex Term #36).
 * Ensures automated testing and linting on every commit.
 */
export declare class ContinuousIntegrationValidator extends BaseValidator {
    readonly id = "continuous-integration-validator";
    readonly ruleId = "continuous-integration";
    readonly category: "testing";
    readonly severity: "error";
    validate(context: RuleValidationContext): Promise<RuleValidationResult>;
}
/**
 * Validates test failure reporting requirements.
 * Ensures proper test failure handling and reporting mechanisms.
 */
export declare class TestFailureReportingValidator extends BaseValidator {
    readonly id = "test-failure-reporting-validator";
    readonly ruleId = "test-failure-reporting";
    readonly category: "reporting";
    readonly severity: "high";
    validate(context: RuleValidationContext): Promise<RuleValidationResult>;
    /**
     * Create a warning validation result (convenience method).
     */
    private createWarningResult;
}
/**
 * Validates performance regression reporting requirements.
 * Ensures performance metrics are tracked and reported.
 */
export declare class PerformanceRegressionReportingValidator extends BaseValidator {
    readonly id = "performance-regression-reporting-validator";
    readonly ruleId = "performance-regression-reporting";
    readonly category: "reporting";
    readonly severity: "warning";
    validate(context: RuleValidationContext): Promise<RuleValidationResult>;
}
/**
 * Validates security vulnerability reporting requirements.
 * Ensures security issues are properly reported.
 */
export declare class SecurityVulnerabilityReportingValidator extends BaseValidator {
    readonly id = "security-vulnerability-reporting-validator";
    readonly ruleId = "security-vulnerability-reporting";
    readonly category: "reporting";
    readonly severity: "error";
    validate(context: RuleValidationContext): Promise<RuleValidationResult>;
}
//# sourceMappingURL=testing-validators.d.ts.map