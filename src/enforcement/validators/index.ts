/**
 * Validators Module
 *
 * Central export point for all validator classes and registries.
 * Part of Phase 3 refactoring to extract validators from rule-enforcer.ts.
 *
 * @module validators
 * @version 1.0.0
 */

// Base validator class
export { BaseValidator } from "./base-validator.js";

// Validator registry
export {
  ValidatorRegistry,
  globalValidatorRegistry,
} from "./validator-registry.js";

// Code quality validators
export {
  NoDuplicateCodeValidator,
  ContextAnalysisIntegrationValidator,
  MemoryOptimizationValidator,
  DocumentationRequiredValidator,
  NoOverEngineeringValidator,
  CleanDebugLogsValidator,
  ConsoleLogUsageValidator,
} from "./code-quality-validators.js";
