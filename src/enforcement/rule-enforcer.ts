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

import { frameworkLogger } from "../core/framework-logger.js";
import {
  RuleDefinition,
  RuleValidationContext,
  RuleValidationResult,
  ValidationReport,
  Violation,
  ViolationFix,
  IRuleRegistry,
  IValidatorRegistry,
  IRuleHierarchy,
  IRuleExecutor,
  IViolationFixer,
} from "./types.js";
import {
  RuleRegistry,
  RuleHierarchy,
  RuleExecutor,
  ViolationFixer,
} from "./core/index.js";
import { ValidatorRegistry } from "./validators/index.js";
import { LoaderOrchestrator } from "./loaders/loader-orchestrator.js";

// Re-export types for backward compatibility
export {
  RuleDefinition,
  RuleValidationContext,
  RuleValidationResult,
  ValidationReport,
  Violation,
  ViolationFix,
  RuleFix,
  RuleFixType,
  isRuleValidationResult,
} from "./types.js";

// Re-export core components
export {
  RuleRegistry,
  RuleHierarchy,
  RuleExecutor,
  ViolationFixer,
} from "./core/index.js";

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
export class RuleEnforcer {
  private registry: IRuleRegistry;
  private hierarchy: IRuleHierarchy;
  private executor: IRuleExecutor;
  private fixer: IViolationFixer;
  private validatorRegistry: IValidatorRegistry;
  private initialized = false;

  constructor(options?: RuleEnforcerOptions) {
    // Initialize core components with dependency injection for testability
    this.registry = options?.registry ?? new RuleRegistry();
    this.hierarchy = options?.hierarchy ?? new RuleHierarchy();
    this.fixer = options?.fixer ?? new ViolationFixer();
    this.validatorRegistry = options?.validatorRegistry ?? new ValidatorRegistry();

    // Initialize rule executor
    this.executor = options?.executor ?? new RuleExecutor(
      this.registry,
      this.hierarchy,
      this.validatorRegistry,
    );

    // Initialize synchronously first
    this.initializeRules();
    this.initializeRuleHierarchy();
    // Load async rules in background
    this.loadAsyncRules();
  }

  /**
   * Initialize default framework rules
   * All validators are delegated to the ValidatorRegistry
   */
  private initializeRules(): void {
    // Code Quality Rules
    this.addRule({
      id: "no-duplicate-code",
      name: "No Duplicate Code Creation",
      description: "Prevents creation of code that already exists",
      category: "code-quality",
      severity: "error",
      enabled: true,
      validator: this.validateNoDuplicateCode.bind(this),
    });

    this.addRule({
      id: "context-analysis-integration",
      name: "Context Analysis Integration",
      description: "Ensures new code integrates properly with context analysis",
      category: "architecture",
      severity: "warning",
      enabled: true,
      validator: this.validateContextAnalysisIntegration.bind(this),
    });

    this.addRule({
      id: "memory-optimization",
      name: "Memory Optimization Compliance",
      description: "Ensures code follows memory optimization patterns",
      category: "performance",
      severity: "warning",
      enabled: true,
      validator: this.validateMemoryOptimization.bind(this),
    });

    this.addRule({
      id: "dependency-management",
      name: "Proper Dependency Management",
      description: "Validates dependency declarations and imports",
      category: "architecture",
      severity: "error",
      enabled: true,
      validator: this.validateDependencyManagement.bind(this),
    });

    // Build Process Rules
    this.addRule({
      id: "src-dist-integrity",
      name: "Source-Dist Integrity",
      description:
        "Prevents direct file copying between src/ and dist/. All changes must be made in src/ and compiled via npm run build",
      category: "architecture",
      severity: "error",
      enabled: true,
      validator: this.validateSrcDistIntegrity.bind(this),
    });

    // Security Rules
    this.addRule({
      id: "input-validation",
      name: "Input Validation Required",
      description: "Requires input validation for user-facing functions",
      category: "security",
      severity: "warning",
      enabled: true,
      validator: this.validateInputValidation.bind(this),
    });

    // Testing Rules
    this.addRule({
      id: "tests-required",
      name: "Tests Required for New Code",
      description:
        "Requires tests when creating new components or modifying functionality",
      category: "testing",
      severity: "error",
      enabled: true,
      validator: this.validateTestsRequired.bind(this),
    });

    // Documentation Rules - Codex Term #46
    this.addRule({
      id: "documentation-required",
      name: "Documentation Required (Codex Term #46)",
      description:
        "Requires comprehensive documentation for all new code, APIs, and architectural changes",
      category: "code-quality",
      severity: "error",
      enabled: true,
      validator: this.validateDocumentationRequired.bind(this),
    });

    // Codex Term #3: No Over-Engineering
    this.addRule({
      id: "no-over-engineering",
      name: "No Over-Engineering (Codex Term #3)",
      description:
        "Prevents over-engineering by enforcing simple, direct solutions without unnecessary abstractions",
      category: "architecture",
      severity: "error",
      enabled: true,
      validator: this.validateNoOverEngineering.bind(this),
    });

    // Codex Term #7: Resolve All Errors
    this.addRule({
      id: "resolve-all-errors",
      name: "Resolve All Errors (Codex Term #7)",
      description:
        "Ensures all runtime errors are properly handled and prevented",
      category: "architecture",
      severity: "blocking",
      enabled: true,
      validator: this.validateErrorResolution.bind(this),
    });

    // Codex Term #8: Prevent Infinite Loops
    this.addRule({
      id: "prevent-infinite-loops",
      name: "Prevent Infinite Loops (Codex Term #8)",
      description: "Ensures all loops have clear termination conditions",
      category: "architecture",
      severity: "blocking",
      enabled: true,
      validator: this.validateLoopSafety.bind(this),
    });

    // Codex Term #41: State Management Patterns (CRITICAL)
    this.addRule({
      id: "state-management-patterns",
      name: "State Management Patterns (Codex Term #41)",
      description:
        "Ensures proper state management patterns are used throughout the application",
      category: "architecture",
      severity: "high",
      enabled: true,
      validator: this.validateStateManagementPatterns.bind(this),
    });

    // Codex Term #46: Import Consistency (NEW - Addresses module resolution issues)
    this.addRule({
      id: "import-consistency",
      name: "Import Consistency (Codex Term #46)",
      description:
        "Ensures consistent import patterns that work in both development and production environments",
      category: "architecture",
      severity: "error",
      enabled: true,
      validator: this.validateImportConsistency.bind(this),
    });

    // Codex Term #24: Single Responsibility Principle
    this.addRule({
      id: "single-responsibility",
      name: "Single Responsibility Principle (Codex Term #24)",
      description: "Ensures each class/module has one reason to change",
      category: "architecture",
      severity: "warning",
      enabled: true,
      validator: this.validateSingleResponsibility.bind(this),
    });

    // Codex Term #26: Test Coverage >85%
    this.addRule({
      id: "test-coverage",
      name: "Test Coverage >85% (Codex Term #26)",
      description: "Maintains 85%+ behavioral test coverage",
      category: "testing",
      severity: "error",
      enabled: true,
      validator: this.validateTestCoverage.bind(this),
    });

    // Codex Term #29: Security by Design
    this.addRule({
      id: "security-by-design",
      name: "Security by Design (Codex Term #29)",
      description:
        "Validates all inputs (client and server) and sanitizes data",
      category: "security",
      severity: "error",
      enabled: true,
      validator: this.validateSecurityByDesign.bind(this),
    });

    // Codex Term #36: Continuous Integration
    this.addRule({
      id: "continuous-integration",
      name: "Continuous Integration (Codex Term #36)",
      description: "Ensures automated testing and linting on every commit",
      category: "testing",
      severity: "error",
      enabled: true,
      validator: this.validateContinuousIntegration.bind(this),
    });

    // Codex Term #43: Deployment Safety
    this.addRule({
      id: "deployment-safety",
      name: "Deployment Safety (Codex Term #43)",
      description: "Ensures zero-downtime deployments and rollback capability",
      category: "architecture",
      severity: "blocking",
      enabled: true,
      validator: this.validateDeploymentSafety.bind(this),
    });

    // Development Triage Rule: Clean Debug Logs
    this.addRule({
      id: "clean-debug-logs",
      name: "Clean Debug Logs (Development Triage)",
      description:
        "Ensures debug logs are removed before production deployment",
      category: "code-quality",
      severity: "error",
      enabled: true,
      validator: this.validateCleanDebugLogs.bind(this),
    });

    // Reporting Rules - Integrated with existing framework
    this.addRule({
      id: "test-failure-reporting",
      name: "Test Failure Report Generation",
      description: "Automatically generates reports when tests fail",
      category: "reporting",
      severity: "warning",
      enabled: true,
      validator: this.validateTestFailureReporting.bind(this),
    });

    this.addRule({
      id: "performance-regression-reporting",
      name: "Performance Regression Report Generation",
      description:
        "Generates reports when performance regressions are detected",
      category: "reporting",
      severity: "warning",
      enabled: true,
      validator: this.validatePerformanceRegressionReporting.bind(this),
    });

    this.addRule({
      id: "security-vulnerability-reporting",
      name: "Security Vulnerability Report Generation",
      description: "Automatically reports security vulnerabilities found",
      category: "reporting",
      severity: "error",
      enabled: true,
      validator: this.validateSecurityVulnerabilityReporting.bind(this),
    });

    // Phase 3: Multi-Agent Ensemble Rule
    this.addRule({
      id: "multi-agent-ensemble",
      name: "Multi-Agent Ensemble (Phase 3)",
      description:
        "Validates that multiple AI perspectives are considered in complex decisions",
      category: "architecture",
      severity: "warning",
      enabled: true,
      validator: this.validateMultiAgentEnsemble.bind(this),
    });

    // Phase 3: Substrate Pattern Externalization
    this.addRule({
      id: "substrate-externalization",
      name: "Substrate Externalization",
      description:
        "Validates that framework patterns mirror observed AI orchestration behaviors",
      category: "architecture",
      severity: "info",
      enabled: true,
      validator: this.validateSubstrateExternalization.bind(this),
    });

    // Phase 4: Self-Bootstrapping & Emergence Rules
    this.addRule({
      id: "framework-self-validation",
      name: "Framework Self-Validation",
      description:
        "Validates that the framework can validate and improve its own code",
      category: "architecture",
      severity: "info",
      enabled: true,
      validator: this.validateFrameworkSelfValidation.bind(this),
    });

    this.addRule({
      id: "emergent-improvement",
      name: "Emergent Framework Improvement",
      description:
        "Validates that the framework can identify and suggest its own improvements",
      category: "architecture",
      severity: "info",
      enabled: true,
      validator: this.validateEmergentImprovement.bind(this),
    });

    // Phase 4.1: Module System Consistency (CRITICAL FIX)
    this.addRule({
      id: "module-system-consistency",
      name: "Module System Consistency",
      description:
        "Enforces consistent use of ES modules, preventing CommonJS/ES module mixing",
      category: "architecture",
      severity: "error",
      enabled: true,
      validator: this.validateModuleSystemConsistency.bind(this),
    });

    // Console Log Usage Rule
    this.addRule({
      id: "console-log-usage",
      name: "Console Log Usage Restrictions",
      description:
        "Console.log must be used only for debugging in dev mode - retained logs must use framework logger",
      category: "code-quality",
      severity: "error",
      enabled: true,
      validator: this.validateConsoleLogUsage.bind(this),
    });
  }

  /**
   * Initialize rule hierarchy (prerequisites)
   * Delegates to RuleHierarchy for dependency management
   */
  private initializeRuleHierarchy(): void {
    this.hierarchy.addDependency("tests-required", ["no-duplicate-code"]);
    this.hierarchy.addDependency("context-analysis-integration", [
      "tests-required",
      "no-duplicate-code",
    ]);
    this.hierarchy.addDependency("memory-optimization", [
      "context-analysis-integration",
    ]);
    this.hierarchy.addDependency("dependency-management", ["no-duplicate-code"]);
    this.hierarchy.addDependency("input-validation", ["tests-required"]);
    this.hierarchy.addDependency("documentation-required", ["tests-required"]);
    this.hierarchy.addDependency("no-over-engineering", ["tests-required"]);
  }

  /**
   * Load async rules in background using LoaderOrchestrator.
   * Delegates to LoaderOrchestrator for rule loading.
   */
  private async loadAsyncRules(): Promise<void> {
    try {
      const orchestrator = new LoaderOrchestrator({
        continueOnError: true,
        enableLogging: true,
      });

      const result = await orchestrator.loadAllRules();

      // Register all loaded rules
      for (const rule of result.rules) {
        this.addRule(rule);
      }

      this.initialized = true;

      await frameworkLogger.log(
        "rule-enforcer",
        "async-rules-loaded",
        "success",
        {
          message: `Loaded ${result.rules.length} async rules from ${result.successfulLoaders} loaders`,
          ruleCount: result.rules.length,
          successfulLoaders: result.successfulLoaders,
          failedLoaders: result.failedLoaders,
        }
      );
    } catch (error) {
      // Silent failure - async rules may not load in all environments
      await frameworkLogger.log(
        "rule-enforcer",
        "async-rules-load-failed",
        "error",
        {
          message: `Failed to load async rules: ${error instanceof Error ? error.message : String(error)}`,
          error: error instanceof Error ? error.message : String(error),
        }
      );
    }
  }

  // ==================== PUBLIC API ====================

  /**
   * Add a rule to the enforcer
   * Delegates to RuleRegistry for storage
   */
  addRule(rule: RuleDefinition): void {
    this.registry.addRule(rule);
  }

  /**
   * Get all loaded rules
   * Delegates to RuleRegistry for retrieval
   */
  getRules(): RuleDefinition[] {
    return this.registry.getRules();
  }

  /**
   * Get rule count
   * Delegates to RuleRegistry for count
   */
  getRuleCount(): number {
    return this.registry.getRuleCount();
  }

  /**
   * Get rule by ID
   * Delegates to RuleRegistry for retrieval
   */
  getRule(id: string): RuleDefinition | undefined {
    return this.registry.getRule(id);
  }

  /**
   * Enable a rule by ID
   * Delegates to RuleRegistry for state management
   */
  enableRule(ruleId: string): boolean {
    return this.registry.enableRule(ruleId);
  }

  /**
   * Disable a rule by ID
   * Delegates to RuleRegistry for state management
   */
  disableRule(ruleId: string): boolean {
    return this.registry.disableRule(ruleId);
  }

  /**
   * Check if a rule is enabled
   * Delegates to RuleRegistry for state check
   */
  isRuleEnabled(ruleId: string): boolean {
    return this.registry.isRuleEnabled(ruleId);
  }

  /**
   * Get rule statistics
   * Delegates to RuleRegistry for statistics
   */
  getRuleStats(): {
    totalRules: number;
    enabledRules: number;
    disabledRules: number;
    ruleCategories: Record<string, number>;
  } {
    return this.registry.getRuleStats();
  }

  /**
   * Check if rule enforcer is fully initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Validate operation against all applicable rules
   * Delegates to RuleExecutor for validation orchestration
   */
  async validateOperation(
    operation: string,
    context: RuleValidationContext,
  ): Promise<ValidationReport> {
    // Ensure async rules are loaded
    if (!this.initialized) {
      await this.loadAsyncRules();
    }

    // Delegate to executor
    return this.executor.execute(operation, context);
  }

  /**
   * Attempt to fix rule violations by delegating to appropriate agents/skills
   * Delegates to ViolationFixer for fix orchestration
   */
  async attemptRuleViolationFixes(
    violations: Violation[],
    context: RuleValidationContext,
  ): Promise<ViolationFix[]> {
    // Delegate to fixer
    return this.fixer.fixViolations(violations, context);
  }

  // ==================== PRIVATE VALIDATION METHODS ====================
  // All methods below delegate to specialized validators via ValidatorRegistry
  // These are bound to rules in initializeRules() and called by RuleExecutor

  /**
   * Validate no duplicate code creation
   * Delegates to NoDuplicateCodeValidator
   */
  private async validateNoDuplicateCode(
    context: RuleValidationContext,
  ): Promise<RuleValidationResult> {
    return this.validatorRegistry.getValidator("no-duplicate-code")!.validate(context);
  }

  /**
   * Validate tests are required
   * Delegates to TestsRequiredValidator
   */
  private async validateTestsRequired(
    context: RuleValidationContext,
  ): Promise<RuleValidationResult> {
    return this.validatorRegistry.getValidator("tests-required")!.validate(context);
  }

  /**
   * Validate context analysis integration
   * Delegates to ContextAnalysisIntegrationValidator
   */
  private async validateContextAnalysisIntegration(
    context: RuleValidationContext,
  ): Promise<RuleValidationResult> {
    return this.validatorRegistry.getValidator("context-analysis-integration")!.validate(context);
  }

  /**
   * Validate memory optimization
   * Delegates to MemoryOptimizationValidator
   */
  private async validateMemoryOptimization(
    context: RuleValidationContext,
  ): Promise<RuleValidationResult> {
    return this.validatorRegistry.getValidator("memory-optimization")!.validate(context);
  }

  /**
   * Validate dependency management
   * Delegates to DependencyManagementValidator
   */
  private async validateDependencyManagement(
    context: RuleValidationContext,
  ): Promise<RuleValidationResult> {
    return this.validatorRegistry.getValidator("dependency-management")!.validate(context);
  }

  /**
   * Validate src-dist integrity
   * Delegates to SrcDistIntegrityValidator
   */
  private async validateSrcDistIntegrity(
    context: RuleValidationContext,
  ): Promise<RuleValidationResult> {
    return this.validatorRegistry.getValidator("src-dist-integrity")!.validate(context);
  }

  /**
   * Validate input validation requirements
   * Delegates to InputValidationValidator
   */
  private async validateInputValidation(
    context: RuleValidationContext,
  ): Promise<RuleValidationResult> {
    return this.validatorRegistry.getValidator("input-validation")!.validate(context);
  }

  /**
   * Validate comprehensive documentation requirements (Codex Term #46)
   * Delegates to DocumentationRequiredValidator
   */
  private async validateDocumentationRequired(
    context: RuleValidationContext,
  ): Promise<RuleValidationResult> {
    return this.validatorRegistry.getValidator("documentation-required")!.validate(context);
  }

  /**
   * Validate no over-engineering (Codex Term #3)
   * Delegates to NoOverEngineeringValidator
   */
  private async validateNoOverEngineering(
    context: RuleValidationContext,
  ): Promise<RuleValidationResult> {
    return this.validatorRegistry.getValidator("no-over-engineering")!.validate(context);
  }

  /**
   * Validate import consistency (Codex Term #46)
   * Delegates to ImportConsistencyValidator
   */
  private async validateImportConsistency(
    context: RuleValidationContext,
  ): Promise<RuleValidationResult> {
    return this.validatorRegistry.getValidator("import-consistency")!.validate(context);
  }

  /**
   * Validate module system consistency (Codex Term #47)
   * Delegates to ModuleSystemConsistencyValidator
   */
  private async validateModuleSystemConsistency(
    context: RuleValidationContext,
  ): Promise<RuleValidationResult> {
    return this.validatorRegistry.getValidator("module-system-consistency")!.validate(context);
  }

  /**
   * Validate error resolution (Codex Term #7)
   * Delegates to ErrorResolutionValidator
   */
  private async validateErrorResolution(
    context: RuleValidationContext,
  ): Promise<RuleValidationResult> {
    return this.validatorRegistry.getValidator("error-resolution")!.validate(context);
  }

  /**
   * Validate loop safety (Codex Term #8)
   * Delegates to LoopSafetyValidator
   */
  private async validateLoopSafety(
    context: RuleValidationContext,
  ): Promise<RuleValidationResult> {
    return this.validatorRegistry.getValidator("loop-safety")!.validate(context);
  }

  /**
   * Validate state management patterns (Codex Term #41)
   * Delegates to StateManagementPatternsValidator
   */
  private async validateStateManagementPatterns(
    context: RuleValidationContext,
  ): Promise<RuleValidationResult> {
    return this.validatorRegistry.getValidator("state-management-patterns")!.validate(context);
  }

  /**
   * Validate single responsibility principle (Codex Term #24)
   * Delegates to SingleResponsibilityValidator
   */
  private async validateSingleResponsibility(
    context: RuleValidationContext,
  ): Promise<RuleValidationResult> {
    return this.validatorRegistry.getValidator("single-responsibility")!.validate(context);
  }

  /**
   * Validate test coverage requirements (Codex Term #26)
   * Delegates to TestCoverageValidator
   */
  private async validateTestCoverage(
    context: RuleValidationContext,
  ): Promise<RuleValidationResult> {
    return this.validatorRegistry.getValidator("test-coverage")!.validate(context);
  }

  /**
   * Validate security by design (Codex Term #29)
   * Delegates to SecurityByDesignValidator
   */
  private async validateSecurityByDesign(
    context: RuleValidationContext,
  ): Promise<RuleValidationResult> {
    return this.validatorRegistry.getValidator("security-by-design")!.validate(context);
  }

  /**
   * Validate continuous integration requirements (Codex Term #36)
   * Delegates to ContinuousIntegrationValidator
   */
  private async validateContinuousIntegration(
    context: RuleValidationContext,
  ): Promise<RuleValidationResult> {
    return this.validatorRegistry.getValidator("continuous-integration")!.validate(context);
  }

  /**
   * Validate deployment safety (Codex Term #43)
   * Delegates to DeploymentSafetyValidator
   */
  private async validateDeploymentSafety(
    context: RuleValidationContext,
  ): Promise<RuleValidationResult> {
    return this.validatorRegistry.getValidator("deployment-safety")!.validate(context);
  }

  /**
   * Validate clean debug logs (Development Triage)
   * Delegates to CleanDebugLogsValidator
   */
  private async validateCleanDebugLogs(
    context: RuleValidationContext,
  ): Promise<RuleValidationResult> {
    return this.validatorRegistry.getValidator("clean-debug-logs")!.validate(context);
  }

  /**
   * Validate console log usage restrictions
   * Delegates to ConsoleLogUsageValidator
   */
  private async validateConsoleLogUsage(
    context: RuleValidationContext,
  ): Promise<RuleValidationResult> {
    return this.validatorRegistry.getValidator("console-log-usage")!.validate(context);
  }

  /**
   * Validate test failure reporting requirements
   * Delegates to TestFailureReportingValidator
   */
  private async validateTestFailureReporting(
    context: RuleValidationContext,
  ): Promise<RuleValidationResult> {
    return this.validatorRegistry.getValidator("test-failure-reporting")!.validate(context);
  }

  /**
   * Validate performance regression reporting
   * Delegates to PerformanceRegressionReportingValidator
   */
  private async validatePerformanceRegressionReporting(
    context: RuleValidationContext,
  ): Promise<RuleValidationResult> {
    return this.validatorRegistry.getValidator("performance-regression-reporting")!.validate(context);
  }

  /**
   * Validate security vulnerability reporting
   * Delegates to SecurityVulnerabilityReportingValidator
   */
  private async validateSecurityVulnerabilityReporting(
    context: RuleValidationContext,
  ): Promise<RuleValidationResult> {
    return this.validatorRegistry.getValidator("security-vulnerability-reporting")!.validate(context);
  }

  /**
   * Validate multi-agent ensemble
   * Delegates to MultiAgentEnsembleValidator
   */
  private async validateMultiAgentEnsemble(
    context: RuleValidationContext,
  ): Promise<RuleValidationResult> {
    return this.validatorRegistry.getValidator("multi-agent-ensemble")!.validate(context);
  }

  /**
   * Validate substrate externalization
   * Delegates to SubstrateExternalizationValidator
   */
  private async validateSubstrateExternalization(
    context: RuleValidationContext,
  ): Promise<RuleValidationResult> {
    return this.validatorRegistry.getValidator("substrate-externalization")!.validate(context);
  }

  /**
   * Validate framework self-validation
   * Delegates to FrameworkSelfValidationValidator
   */
  private async validateFrameworkSelfValidation(
    context: RuleValidationContext,
  ): Promise<RuleValidationResult> {
    return this.validatorRegistry.getValidator("framework-self-validation")!.validate(context);
  }

  /**
   * Validate emergent improvement
   * Delegates to EmergentImprovementValidator
   */
  private async validateEmergentImprovement(
    context: RuleValidationContext,
  ): Promise<RuleValidationResult> {
    return this.validatorRegistry.getValidator("emergent-improvement")!.validate(context);
  }
}

// Export singleton instance
export const ruleEnforcer = new RuleEnforcer();
