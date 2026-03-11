/**
 * Rule Enforcement Module
 *
 * This module provides rule enforcement capabilities for the StringRay framework.
 * It validates code against development rules and codex compliance requirements.
 *
 * @module enforcement
 * @version 1.0.0
 *
 * @example
 * ```typescript
 * import { RuleEnforcer, RuleDefinition, ValidationReport } from './enforcement/index.js';
 *
 * const enforcer = new RuleEnforcer();
 * const report = await enforcer.validateOperation('write', context);
 * ```
 */

// Core enforcer
export { RuleEnforcer } from "./rule-enforcer.js";

// Rule Registry for managing rules separately from execution
export { RuleRegistry } from "./core/rule-registry.js";

// All types
export {
  RuleDefinition,
  RuleValidationContext,
  RuleValidationResult,
  ValidationReport,
  ViolationFix,
  RuleFix,
  RuleCategory,
  RuleSeverity,
  RuleFixType,
  IRuleRegistry,
  IValidator,
  IValidatorRegistry,
  isRuleValidationResult,
} from "./types.js";

// Validators (Phase 3 refactoring)
export {
  // Base class
  BaseValidator,
  // Registry
  ValidatorRegistry,
  globalValidatorRegistry,
  // Code quality validators
  NoDuplicateCodeValidator,
  ContextAnalysisIntegrationValidator,
  MemoryOptimizationValidator,
  DocumentationRequiredValidator,
  NoOverEngineeringValidator,
  CleanDebugLogsValidator,
  ConsoleLogUsageValidator,
} from "./validators/index.js";

// Enforcer tools (if any exports exist)
export * as enforcerTools from "./enforcer-tools.js";
