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
  isRuleValidationResult,
} from "./types.js";

// Enforcer tools (if any exports exist)
export * as enforcerTools from "./enforcer-tools.js";
