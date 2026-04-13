/**
 * Architecture Validators
 *
 * Validators for architecture category rules extracted from rule-enforcer.ts.
 * Each validator encapsulates the validation logic for a specific architectural rule.
 *
 * @module validators/architecture-validators
 * @version 1.0.0
 */
import { RuleValidationContext, RuleValidationResult } from "../types.js";
import { BaseValidator } from "./base-validator.js";
/**
 * Validates dependency management (Codex Term #46).
 * Ensures dependencies are properly declared and used.
 */
export declare class DependencyManagementValidator extends BaseValidator {
    readonly id = "dependency-management-validator";
    readonly ruleId = "dependency-management";
    readonly category: "architecture";
    readonly severity: "error";
    validate(context: RuleValidationContext): Promise<RuleValidationResult>;
}
/**
 * Validates src-dist integrity.
 * Prevents direct file copying between src/ and dist/.
 * All changes must be made in src/ and compiled via npm run build.
 */
export declare class SrcDistIntegrityValidator extends BaseValidator {
    readonly id = "src-dist-integrity-validator";
    readonly ruleId = "src-dist-integrity";
    readonly category: "architecture";
    readonly severity: "error";
    validate(context: RuleValidationContext): Promise<RuleValidationResult>;
}
/**
 * Validates import consistency (Codex Term #46).
 * Ensures consistent import patterns throughout the codebase.
 */
export declare class ImportConsistencyValidator extends BaseValidator {
    readonly id = "import-consistency-validator";
    readonly ruleId = "import-consistency";
    readonly category: "architecture";
    readonly severity: "error";
    validate(context: RuleValidationContext): Promise<RuleValidationResult>;
}
/**
 * Validates module system consistency (Codex Term #47).
 * Enforces ES module consistency and prevents CommonJS/ES module mixing.
 */
export declare class ModuleSystemConsistencyValidator extends BaseValidator {
    readonly id = "module-system-consistency-validator";
    readonly ruleId = "module-system-consistency";
    readonly category: "architecture";
    readonly severity: "error";
    validate(context: RuleValidationContext): Promise<RuleValidationResult>;
}
/**
 * Validates error resolution (Codex Term #7).
 * Ensures proper error handling and prevents console.log debugging.
 */
export declare class ErrorResolutionValidator extends BaseValidator {
    readonly id = "error-resolution-validator";
    readonly ruleId = "error-resolution";
    readonly category: "architecture";
    readonly severity: "error";
    validate(context: RuleValidationContext): Promise<RuleValidationResult>;
}
/**
 * Validates loop safety (Codex Term #8).
 * Prevents infinite loops by checking for proper termination conditions.
 */
export declare class LoopSafetyValidator extends BaseValidator {
    readonly id = "loop-safety-validator";
    readonly ruleId = "loop-safety";
    readonly category: "architecture";
    readonly severity: "error";
    validate(context: RuleValidationContext): Promise<RuleValidationResult>;
}
/**
 * Validates state management patterns (Codex Term #41).
 * Ensures proper state management throughout the application.
 */
export declare class StateManagementPatternsValidator extends BaseValidator {
    readonly id = "state-management-patterns-validator";
    readonly ruleId = "state-management-patterns";
    readonly category: "architecture";
    readonly severity: "error";
    validate(context: RuleValidationContext): Promise<RuleValidationResult>;
}
/**
 * Validates single responsibility principle (Codex Term #24).
 * Ensures classes and functions don't do too many things.
 */
export declare class SingleResponsibilityValidator extends BaseValidator {
    readonly id = "single-responsibility-validator";
    readonly ruleId = "single-responsibility";
    readonly category: "architecture";
    readonly severity: "warning";
    validate(context: RuleValidationContext): Promise<RuleValidationResult>;
}
/**
 * Validates deployment safety (Codex Term #43).
 * Ensures deployments have proper safety checks.
 */
export declare class DeploymentSafetyValidator extends BaseValidator {
    readonly id = "deployment-safety-validator";
    readonly ruleId = "deployment-safety";
    readonly category: "architecture";
    readonly severity: "blocking";
    validate(context: RuleValidationContext): Promise<RuleValidationResult>;
}
/**
 * Validates multi-agent ensemble patterns.
 * Ensures multi-agent configurations follow best practices.
 */
export declare class MultiAgentEnsembleValidator extends BaseValidator {
    readonly id = "multi-agent-ensemble-validator";
    readonly ruleId = "multi-agent-ensemble";
    readonly category: "architecture";
    readonly severity: "warning";
    validate(context: RuleValidationContext): Promise<RuleValidationResult>;
}
/**
 * Validates substrate externalization patterns.
 * Ensures proper abstraction boundaries.
 */
export declare class SubstrateExternalizationValidator extends BaseValidator {
    readonly id = "substrate-externalization-validator";
    readonly ruleId = "substrate-externalization";
    readonly category: "architecture";
    readonly severity: "info";
    validate(context: RuleValidationContext): Promise<RuleValidationResult>;
}
/**
 * Validates framework self-validation capability.
 * Ensures framework can validate itself.
 */
export declare class FrameworkSelfValidationValidator extends BaseValidator {
    readonly id = "framework-self-validation-validator";
    readonly ruleId = "framework-self-validation";
    readonly category: "architecture";
    readonly severity: "info";
    validate(context: RuleValidationContext): Promise<RuleValidationResult>;
}
/**
 * Validates emergent improvement patterns.
 * Ensures continuous improvement mechanisms exist.
 */
export declare class EmergentImprovementValidator extends BaseValidator {
    readonly id = "emergent-improvement-validator";
    readonly ruleId = "emergent-improvement";
    readonly category: "architecture";
    readonly severity: "info";
    validate(context: RuleValidationContext): Promise<RuleValidationResult>;
}
//# sourceMappingURL=architecture-validators.d.ts.map