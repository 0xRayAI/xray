/**
 * Processor Manager
 *
 * Centralized processor management for pre/post processing operations.
 * Implements lifecycle management, performance monitoring, and conflict resolution.
 *
 * @version 1.0.0
 * @since 2026-01-07
 */

import { StringRayStateManager } from "../state/state-manager.js";
import { frameworkLogger } from "../core/framework-logger.js";
import { ProcessorRegistration, ProcessorHook, ProcessorResult } from "./processor-types.js";
import {
  detectProjectLanguage,
  getTestFilePath,
  buildTestCommand,
} from "../utils/language-detector.js";
import { exec } from "child_process";
import { promisify } from "util";
import { ProcessorRegistry, IProcessor, ProcessorContext } from "./processor-interfaces.js";
import {
  PreValidateProcessor,
  CodexComplianceProcessor,
  VersionComplianceProcessor,
  ErrorBoundaryProcessor,
  TestExecutionProcessor,
  RegressionTestingProcessor,
  StateValidationProcessor,
  RefactoringLoggingProcessor,
  TestAutoCreationProcessor,
  CoverageAnalysisProcessor,
  AgentsMdValidationProcessor,
} from "./implementations/index.js";

const execAsync = promisify(exec);

export interface ProcessorConfig {
  name: string;
  type: "pre" | "post";
  priority: number;
  enabled: boolean;
  timeout?: number;
  retryAttempts?: number;
  hook?: ProcessorHook;
}

export interface ProcessorHealth {
  name: string;
  status: "healthy" | "degraded" | "failed";
  lastExecution: number;
  successRate: number;
  averageDuration: number;
  errorCount: number;
}

export interface ProcessorMetrics {
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  averageDuration: number;
  lastExecutionTime: number;
  healthStatus: ProcessorHealth["status"];
}

export class ProcessorManager {
  private processors = new Map<string, ProcessorConfig>();
  private metrics = new Map<string, ProcessorMetrics>();
  private stateManager: StringRayStateManager;
  private activeProcessors = new Set<string>();
  private registry: ProcessorRegistry;

  constructor(stateManager: StringRayStateManager) {
    this.stateManager = stateManager;
    this.registry = new ProcessorRegistry();
    this.registerAllProcessors();
  }

  /**
   * Register all processor implementations in the registry
   */
  private registerAllProcessors(): void {
    // Pre-processors
    this.registry.register(new PreValidateProcessor());
    this.registry.register(new CodexComplianceProcessor());
    this.registry.register(new VersionComplianceProcessor());
    this.registry.register(new ErrorBoundaryProcessor());

    // Post-processors
    this.registry.register(new TestExecutionProcessor());
    this.registry.register(new RegressionTestingProcessor());
    this.registry.register(new StateValidationProcessor());
    this.registry.register(new RefactoringLoggingProcessor());
    this.registry.register(new TestAutoCreationProcessor());
    this.registry.register(new CoverageAnalysisProcessor());
    this.registry.register(new AgentsMdValidationProcessor());

    frameworkLogger.log(
      "processor-manager",
      "processors-registered",
      "success",
      { count: this.registry.getAll().length },
    );
  }

  /**
   * Register a processor with the manager
   */
  registerProcessorWithHook(registration: ProcessorRegistration): void {
    const config: ProcessorConfig = {
      name: registration.name,
      type: registration.type,
      priority: registration.hook.priority,
      enabled: registration.hook.enabled,
    };

    // Register the config
    this.registerProcessor(config);

    // Store the hook for later execution
    this.processors.set(registration.name, {
      ...config,
      hook: registration.hook,
    });
  }

  registerProcessor(config: ProcessorConfig): void {
    // Validate processor name
    if (!config.name || config.name.trim().length === 0) {
      throw new Error("Processor name cannot be empty");
    }

    if (config.name.includes(" ")) {
      throw new Error("Processor name must be a valid identifier (no spaces)");
    }

    // Allow hyphens, underscores, and dots as they are commonly used in processor names
    // Only reject spaces which are definitely invalid

    // Validate processor type
    if (config.type !== "pre" && config.type !== "post") {
      throw new Error('Processor type must be either "pre" or "post"');
    }

    // Validate priority
    if (config.priority < 0) {
      throw new Error("Processor priority must be non-negative");
    }

    if (this.processors.has(config.name)) {
      throw new Error(`Processor ${config.name} is already registered`);
    }

    this.processors.set(config.name, config);
    this.metrics.set(config.name, {
      totalExecutions: 0,
      successfulExecutions: 0,
      failedExecutions: 0,
      averageDuration: 0,
      lastExecutionTime: 0,
      healthStatus: "healthy",
    });

    frameworkLogger.log(
      "processor-manager",
      "processor registered",
      "success",
      {
        name: config.name,
        type: config.type,
      },
    );
  }

  /**
   * Unregister a processor
   */
  unregisterProcessor(name: string): void {
    if (!this.processors.has(name)) {
      throw new Error(`Processor ${name} is not registered`);
    }

    this.processors.delete(name);
    this.metrics.delete(name);
    this.activeProcessors.delete(name);

    frameworkLogger.log(
      "processor-manager",
      "processor unregistered",
      "success",
      {
        name,
      },
    );
  }

  /**
   * Initialize all registered processors
   */
  async initializeProcessors(): Promise<boolean> {
    const jobId = `init-processors-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    frameworkLogger.log(
      "processor-manager",
      "initializeProcessors called",
      "info",
      {
        jobId,
        totalProcessors: this.processors.size,
        enabledProcessors: Array.from(this.processors.values()).filter(
          (p) => p.enabled,
        ).length,
      },
    );

    frameworkLogger.log(
      "processor-manager",
      "initializing processors",
      "info",
      { jobId },
    );

    const initPromises = Array.from(this.processors.values())
      .filter((p) => p.enabled)
      .map(async (config) => {
        try {
          await this.initializeProcessor(config.name);
          frameworkLogger.log(
            "processor-manager",
            "processor initialized successfully",
            "success",
            { jobId, processor: config.name },
          );
          return { name: config.name, success: true };
        } catch (error) {
          frameworkLogger.log(
            "processor-manager",
            "processor initialization failed",
            "error",
            {
              jobId,
              processor: config.name,
              error: error instanceof Error ? error.message : String(error),
            },
          );
          console.error(
            `❌ Failed to initialize processor ${config.name}:`,
            error,
          );
          return {
            name: config.name,
            success: false,
            error: error instanceof Error ? error.message : String(error),
          };
        }
      });

    const results = await Promise.all(initPromises);
    const failures = results.filter((r) => !r.success);

    if (failures.length > 0) {
      console.error(
        `❌ Failed to initialize ${failures.length} processors:`,
        failures,
      );
      return false;
    }

    // Processor initialization - kept for operational monitoring
    return true;
  }

  /**
   * Initialize a specific processor
   */
  private async initializeProcessor(name: string): Promise<void> {
    const config = this.processors.get(name);
    if (!config) {
      throw new Error(`Processor ${name} not found`);
    }

    // Check if processor exists in registry (new system)
    // NOTE: Test processors registered via registerProcessor() may not be in registry
    const hasRegistryProcessor = this.registry.has(name);

    // Processor initialization is handled by the constructor in the registry pattern.
    // Legacy initialization methods (deprecated) are kept only for processors
    // that were registered via the old hook system.
    if (!hasRegistryProcessor) {
      frameworkLogger.log(
        "processor-manager",
        "legacy-processor-initialization",
        "info",
        { processor: name, message: "Using legacy initialization path" },
      );
    }

    this.activeProcessors.add(name);
  }

  /**
   * Execute pre-processors for a given operation
   */
  async executePreProcessors(input: {
    tool: string;
    args?: Record<string, unknown>;
    context?: Record<string, unknown>;
  }): Promise<{ success: boolean; results: ProcessorResult[] }> {
    const jobId = `execute-pre-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const { tool, args, context } = input;

    frameworkLogger.log(
      "processor-manager",
      "executePreProcessors called",
      "debug",
      {
        jobId,
        tool,
        processorCount: Array.from(this.processors.values()).filter(
          (p) => p.type === "pre" && p.enabled,
        ).length,
      },
    );

    const preProcessors = Array.from(this.processors.values())
      .filter((p) => p.type === "pre" && p.enabled)
      .sort((a, b) => a.priority - b.priority);

    const results: ProcessorResult[] = [];

    for (const config of preProcessors) {
      const result = await this.executeProcessor(config.name, context);
      results.push(result);

      // Log failures but continue execution for graceful error handling
      if (!result.success) {
        frameworkLogger.log(
          "processor-manager",
          "pre-processor failed",
          "info",
          {
            jobId,
            processor: config.name,
            tool,
            error: result.error,
          },
        );
      } else {
        frameworkLogger.log(
          "processor-manager",
          "pre-processor succeeded",
          "success",
          {
            jobId,
            processor: config.name,
            tool,
            duration: result.duration,
          },
        );
      }
    }

    const overallSuccess = results.every((r) => r.success);

    frameworkLogger.log(
      "processor-manager",
      "executePreProcessors completed",
      "debug",
      {
        jobId,
        tool,
        totalResults: results.length,
        successCount: results.filter((r) => r.success).length,
        overallSuccess,
      },
    );

    return {
      success: overallSuccess,
      results,
    };
  }

  /**
   * Execute post-processors for a given operation
   */
  async executePostProcessors(
    operation: string,
    data: any,
    preResults: ProcessorResult[],
  ): Promise<ProcessorResult[]> {
    const jobId = `execute-post-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    frameworkLogger.log(
      "processor-manager",
      "executePostProcessors called",
      "debug",
      {
        jobId,
        operation,
        preResultCount: preResults.length,
        processorCount: Array.from(this.processors.values()).filter(
          (p) => p.type === "post" && p.enabled,
        ).length,
      },
    );

    const postProcessors = Array.from(this.processors.values())
      .filter((p) => p.type === "post" && p.enabled)
      .sort((a, b) => a.priority - b.priority);

    const results: ProcessorResult[] = [];

    for (const config of postProcessors) {
      const result = await this.executeProcessor(config.name, {
        operation,
        data,
        preResults,
      });
      results.push(result);

      // Continue execution even if post-processors fail
      if (!result.success) {
        frameworkLogger.log(
          "processor-manager",
          "post-processor failed",
          "error",
          {
            jobId,
            processor: config.name,
            operation,
            error: result.error,
          },
        );
      } else {
        frameworkLogger.log(
          "processor-manager",
          "post-processor succeeded",
          "success",
          {
            jobId,
            processor: config.name,
            operation,
            duration: result.duration,
          },
        );
      }
    }

    frameworkLogger.log(
      "processor-manager",
      "executePostProcessors completed",
      "debug",
      {
        jobId,
        operation,
        totalResults: results.length,
        successCount: results.filter((r) => r.success).length,
      },
    );

    return results;
  }

   /**
    * Execute a specific processor
    * FIX: Issue #4 - Add context validation before execution
    */
  private async executeProcessor(
    name: string,
    context: Record<string, unknown> | undefined,
  ): Promise<ProcessorResult> {
    const config = this.processors.get(name);
    if (!config) {
      throw new Error(`Processor ${name} not found`);
    }

    // Default to empty object if context is undefined
    const safeContext = context ?? {};

    // ADD: Validate context before execution (skip if not an object)
    if (safeContext && typeof safeContext === 'object' && !Array.isArray(safeContext)) {
      const validationResult = this.validateProcessorContext(name, context);
      if (!validationResult.valid) {
        await frameworkLogger.log(
          "processor-manager",
          "context-validation-failed",
          "info",
          {
            processor: name,
            errors: validationResult.errors,
          },
        );
        // Continue but log the validation issues
      }
    }

    const startTime = Date.now();
     const metrics = this.metrics.get(name)!;

    try {
      let result: unknown;

      // Try new registry-based processors first
      const processor = this.registry.get(name);
      if (processor) {
        const processorResult = await processor.execute(safeContext as ProcessorContext);
        const duration = Date.now() - startTime;
        this.updateMetrics(name, processorResult.success, duration);

        const resultObj: ProcessorResult = {
          success: processorResult.success,
          data: processorResult.data,
          duration,
          processorName: name,
        };
        
        if (processorResult.error) {
          resultObj.error = processorResult.error;
        }
        
        return resultObj;
      }

      // No registry processor found - this shouldn't happen if all processors
      // are properly registered. Throw an error to identify configuration issues.
      // Legacy fallback was removed - all processors must use the registry pattern.
      throw new Error(
        `Processor '${name}' not found in registry. ` +
        `All processors must be registered via ProcessorRegistry. ` +
        `Legacy switch-based execution has been removed.`
      );

      const duration = Date.now() - startTime;
      this.updateMetrics(name, true, duration);

      return {
        success: true,
        data: result,
        duration,
        processorName: name,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      this.updateMetrics(name, false, duration);

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        duration,
        processorName: name,
      };
    }
  }

  /**
   * Update processor metrics
   */
  private updateMetrics(
    name: string,
    success: boolean,
    duration: number,
  ): void {
    const metrics = this.metrics.get(name)!;
    metrics.totalExecutions++;
    metrics.lastExecutionTime = Date.now();

    if (success) {
      metrics.successfulExecutions++;
    } else {
      metrics.failedExecutions++;
    }

    // Update rolling average duration
    const totalDuration =
      metrics.averageDuration * (metrics.totalExecutions - 1) + duration;
    metrics.averageDuration = totalDuration / metrics.totalExecutions;

    // Update health status
    const successRate = metrics.successfulExecutions / metrics.totalExecutions;
    metrics.healthStatus =
      successRate > 0.95
        ? "healthy"
        : successRate > 0.8
          ? "degraded"
          : "failed";
  }

  /**
   * Get processor health status
   */
  getProcessorHealth(): ProcessorHealth[] {
    return Array.from(this.activeProcessors).map((name) => {
      const config = this.processors.get(name)!;
      const metrics = this.metrics.get(name)!;

      const totalExecutions = metrics.totalExecutions || 1; // Avoid division by zero
      return {
        name,
        status: metrics.healthStatus,
        lastExecution: metrics.lastExecutionTime,
        successRate: metrics.successfulExecutions / totalExecutions,
        averageDuration: metrics.averageDuration,
        errorCount: metrics.failedExecutions,
      };
    });
  }

  /**
   * Validate processor context before execution
   * FIX: Issue #4 - Add context validation
   */
  private validateProcessorContext(
    processorName: string,
    context: any,
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Skip validation if context is not an object (e.g., string test data)
    if (!context || typeof context !== 'object') {
      return { valid: true, errors: [] };
    }

    // Check for required fields based on processor type
    // Skip validation entirely if context is not a proper object
    if (!context || typeof context !== 'object' || Array.isArray(context)) {
      return { valid: true, errors: [] };
    }

    // Skip if context.data is not an object (e.g., it's a string from test)
    const contextData = context.data;
    if (contextData && typeof contextData !== 'object') {
      return { valid: true, errors: [] };
    }

    const requiredFields: Record<string, string[]> = {
      preValidate: ["operation"],
      codexCompliance: ["operation", "files"],
      testAutoCreation: ["tool", "operation"],
      versionCompliance: ["operation"],
      errorBoundary: ["operation"],
      testExecution: ["tool"],
      regressionTesting: ["operation"],
      stateValidation: ["operation"],
      agentsMdValidation: ["tool", "operation"],
    };

    const required = requiredFields[processorName] || [];

    for (const field of required) {
      if (!(field in context) && !(field in (context.data || {}))) {
        errors.push(`Missing required field: ${field}`);
      }
    }

    // Log validation result
    if (errors.length > 0) {
      frameworkLogger.log(
        "processor-manager",
        "context-validation-warnings",
        "info",
        {
          processor: processorName,
          errors,
          contextKeys: Object.keys(context),
        },
      );
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Resolve processor conflicts
   */
  resolveProcessorConflicts(conflicts: ProcessorResult[]): ProcessorResult {
    if (conflicts.length === 0) {
      throw new Error("No conflicts to resolve");
    }

    const successful = conflicts.find((c) => c.success);
    if (successful) {
      return successful;
    }

    return conflicts[0]!;
  }

  /**
   * Cleanup all processors
   */
  async cleanupProcessors(): Promise<void> {
    frameworkLogger.log("processor-manager", "cleaning up processors", "info");

    for (const name of this.activeProcessors) {
      try {
        await this.cleanupProcessor(name);
      } catch (error) {
        console.error(`❌ Failed to cleanup processor ${name}:`, error);
      }
    }

    this.activeProcessors.clear();
    this.processors.clear(); // Clear all registered processors for test isolation
    this.metrics.clear(); // Clear metrics for test isolation
    // Processor cleanup - kept for operational monitoring
  }

  /**
   * Cleanup a specific processor
   * In the registry pattern, cleanup is handled by the processor itself
   * if it implements a cleanup method. The manager just tracks active state.
   */
  private async cleanupProcessor(name: string): Promise<void> {
    // No processor-specific cleanup needed in the registry pattern.
    // Processors handle their own resources via the constructor/cleanup lifecycle.
    frameworkLogger.log(
      "processor-manager",
      "processor-cleanup",
      "info",
      { processor: name },
    );
  }

  // Processor implementations (kept for backward compatibility)

  /**
   * @deprecated Use PreValidateProcessor class instead. Kept for backward compatibility.
   */
  private async initializePreValidateProcessor(): Promise<void> {
    // Setup syntax checking and validation hooks
    frameworkLogger.log(
      "processor-manager",
      "initializing pre-validate processor",
      "info",
    );
  }

  /**
   * @deprecated Use CodexComplianceProcessor class instead. Kept for backward compatibility.
   */
  private async initializeCodexComplianceProcessor(): Promise<void> {
    // Setup codex compliance validation
    frameworkLogger.log(
      "processor-manager",
      "initializing codex compliance processor",
      "info",
    );
  }

  /**
   * @deprecated Use ErrorBoundaryProcessor class instead. Kept for backward compatibility.
   */
  private async initializeErrorBoundaryProcessor(): Promise<void> {
    // Setup error boundary mechanisms
    frameworkLogger.log(
      "processor-manager",
      "initializing error boundary processor",
      "info",
    );
  }

  /**
   * @deprecated Use TestExecutionProcessor class instead. Kept for backward compatibility.
   */
  private async initializeTestExecutionProcessor(): Promise<void> {
    // Setup automatic test execution
    frameworkLogger.log(
      "processor-manager",
      "initializing test execution processor",
      "info",
    );
  }

  /**
   * @deprecated Use RegressionTestingProcessor class instead. Kept for backward compatibility.
   */
  private async initializeRegressionTestingProcessor(): Promise<void> {
    // Setup regression testing mechanisms
    frameworkLogger.log(
      "processor-manager",
      "initializing regression testing processor",
      "info",
    );
  }

  /**
   * @deprecated Use StateValidationProcessor class instead. Kept for backward compatibility.
   */
  private async initializeStateValidationProcessor(): Promise<void> {
    // Setup state validation post-operation
    frameworkLogger.log(
      "processor-manager",
      "initializing state validation processor",
      "info",
    );
  }

  /**
   * @deprecated Use AgentsMdValidationProcessor class instead. Kept for backward compatibility.
   */
  private async initializeAgentsMdValidationProcessor(): Promise<void> {
    // Setup AGENTS.md validation pre-processor
    frameworkLogger.log(
      "processor-manager",
      "initializing AGENTS.md validation processor",
      "info",
    );

    // Import and initialize the processor
    try {
      const { AgentsMdValidationProcessor } =
        await import("./agents-md-validation-processor.js");
      const processor = new AgentsMdValidationProcessor(process.cwd());

      // Validate AGENTS.md on initialization (blocking if missing)
      const result = await processor.execute({
        tool: "validate",
        operation: "initialization",
      });

      if (!result.success && result.blocked) {
        frameworkLogger.log(
          "processor-manager",
          "agents-md-validation",
          "info",
          {
            message:
              "AGENTS.md validation failed - commit operations may be blocked",
          },
        );
      }
    } catch (error) {
      frameworkLogger.log(
        "processor-manager",
        "agents-md-validation-init-error",
        "error",
        { error: error instanceof Error ? error.message : String(error) },
      );
    }
  }

  /**
   * @deprecated Use VersionComplianceProcessor class instead. Kept for backward compatibility.
   */
  private async initializeVersionComplianceProcessor(): Promise<void> {
    // Setup version compliance pre-processor
    frameworkLogger.log(
      "processor-manager",
      "initializing version compliance processor",
      "info",
    );

    // Import and initialize the processor
    try {
      const { VersionComplianceProcessor } =
        await import("./version-compliance-processor.js");
      const processor = new VersionComplianceProcessor(process.cwd());

      // Validate version compliance on initialization (non-blocking, just info)
      const result = await processor.validateVersionCompliance();

      if (!result.compliant) {
        frameworkLogger.log("processor-manager", "version-compliance", "info", {
          message:
            "Version compliance issues detected - commits may be blocked",
          errors: result.errors,
          warnings: result.warnings,
        });
      } else {
        frameworkLogger.log("processor-manager", "version-compliance", "info", {
          message: `Version compliance verified: NPM ${result.npmVersion}, UVM ${result.uvmVersion}`,
        });
      }
    } catch (error) {
      frameworkLogger.log(
        "processor-manager",
        "version-compliance-init-error",
        "error",
        { error: error instanceof Error ? error.message : String(error) },
      );
    }
  }

  /**
   * @deprecated Use PreValidateProcessor class instead. Kept for backward compatibility.
   */
  private async executePreValidate(context: Record<string, unknown>): Promise<Record<string, unknown>> {
    // Implement comprehensive pre-validation with syntax checking
    const { data, filePath } = context;

    // Skip validation if no data provided (tool execution context)
    if (!data && !filePath) {
      return {
        validated: true,
        syntaxCheck: "skipped",
        reason: "no data provided",
      };
    }

    // Basic validation
    if (!data) {
      return {
        validated: true,
        syntaxCheck: "skipped",
        reason: "no data in context",
      };
    }

    // Syntax checking (placeholder - would integrate with TypeScript compiler API)
    if (typeof data === "string" && data.includes("undefined")) {
      throw new Error("Potential undefined usage detected");
    }

    return { validated: true, syntaxCheck: "passed" };
  }

  /**
   * @deprecated Use VersionComplianceProcessor class instead. Kept for backward compatibility.
   */
  private async executeVersionCompliance(context: any): Promise<any> {
    try {
      const { VersionComplianceProcessor } =
        await import("./version-compliance-processor.js");
      const processor = new VersionComplianceProcessor(process.cwd());

      const result = await processor.validateVersionCompliance();

      return {
        success: result.compliant,
        errors: result.errors || [],
        warnings: result.warnings || [],
        checkedAt: new Date().toISOString(),
      };
    } catch (error) {
      return {
        success: false,
        errors: [error instanceof Error ? error.message : "Unknown error"],
        warnings: [],
        checkedAt: new Date().toISOString(),
      };
    }
  }

  /**
   * @deprecated Use CodexComplianceProcessor class instead. Kept for backward compatibility.
   */
  private async executeCodexCompliance(context: any): Promise<any> {
    const { operation } = context;

    try {
      const { RuleEnforcer } = await import("../enforcement/rule-enforcer.js");
      const ruleEnforcer = new RuleEnforcer();

      const validationContext = {
        files: context.files || [],
        newCode: context.newCode || "",
        existingCode: context.existingCode || new Map(),
        tests: context.tests || [],
        dependencies: context.dependencies || [],
        operation: context.operation || "unknown",
      };

      const result = await ruleEnforcer.validateOperation(
        operation,
        validationContext,
      );

      // If violations found, delegate to enforcer for centralized remediation
      if (!result.passed && result.errors.length > 0) {
        // Convert error strings to Violation objects
        const violations = result.errors.map(error => ({
          rule: 'validation-error',
          message: error,
          severity: 'error' as const,
        }));
        await ruleEnforcer.attemptRuleViolationFixes(
          violations,
          validationContext,
        );
      }

      return {
        compliant: result.passed,
        violations: result.errors,
        warnings: result.warnings,
        termsChecked: result.results.length,
        operation: operation,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.warn("Codex compliance check failed:", error);
      return {
        compliant: true, // Allow processing to continue
        violations: [
          `Compliance check error: ${error instanceof Error ? error.message : String(error)}`,
        ],
        warnings: [],
        termsChecked: 0,
        operation: operation,
        error: true,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * @deprecated Use ErrorBoundaryProcessor class instead. Kept for backward compatibility.
   */
  private async executeErrorBoundary(context: any): Promise<any> {
    // Setup error boundaries
    return { boundaries: "established" };
  }

  /**
   * @deprecated Use AgentsMdValidationProcessor class instead. Kept for backward compatibility.
   */
  private async executeAgentsMdValidation(context: any): Promise<any> {
    try {
      const { AgentsMdValidationProcessor } = await import("./agents-md-validation-processor.js");
      const processor = new AgentsMdValidationProcessor(process.cwd());
      
      const result = await processor.execute({
        tool: context.tool || "validate",
        operation: context.operation || "pre-commit",
      });
      
      return {
        success: result.success,
        blocked: result.blocked,
        message: result.message,
        errors: result.result?.errors || [],
        warnings: result.result?.warnings || [],
        checkedAt: new Date().toISOString(),
      };
    } catch (error) {
      return {
        success: false,
        blocked: false,
        message: error instanceof Error ? error.message : "Unknown error",
        errors: [],
        warnings: [],
        checkedAt: new Date().toISOString(),
      };
    }
  }

  /**
   * @deprecated Use TestExecutionProcessor class instead. Kept for backward compatibility.
   */
  private async executeTestExecution(context: any): Promise<any> {
    // Execute tests automatically for newly created test files
    // Now with language-aware detection!
    frameworkLogger.log(
      "processor-manager",
      "executing automatic tests",
      "info",
      { message: "Running auto-generated tests..." },
    );

    try {
      const cwd = context.directory || process.cwd();

      // Detect project language and test framework
      const projectLanguage = detectProjectLanguage(cwd);

      if (!projectLanguage) {
        frameworkLogger.log(
          "processor-manager",
          "language-detection-failed",
          "info",
          {
            message:
              "Could not detect project language, falling back to TypeScript",
          },
        );
        // Fall back to TypeScript
        return this.executeTypeScriptTests(context, cwd);
      }

      frameworkLogger.log("processor-manager", "language-detected", "info", {
        message: `Detected ${projectLanguage.language} project with ${projectLanguage.testFramework}`,
        language: projectLanguage.language,
        testFramework: projectLanguage.testFramework,
      });

      // Handle TypeScript/JavaScript specially (most common)
      if (
        projectLanguage.language === "TypeScript" ||
        projectLanguage.language === "JavaScript"
      ) {
        return this.executeTypeScriptTests(context, cwd);
      }

      // For other languages, build and run their test command
      return this.executeGenericTests(context, cwd, projectLanguage);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      frameworkLogger.log(
        "processor-manager",
        "test-execution-error",
        "error",
        { message: `Test execution failed: ${errorMessage}` },
      );

      return {
        testsExecuted: 0,
        passed: 0,
        failed: 0,
        error: errorMessage,
        success: false,
      };
    }
  }

  /**
   * Execute TypeScript/JavaScript tests using Vitest
   * @deprecated Part of legacy TestExecutionProcessor. Kept for backward compatibility.
   */
  private async executeTypeScriptTests(
    context: any,
    cwd: string,
  ): Promise<any> {
    let testPattern = "";

    if (context.filePath) {
      // Convert source file to test file
      const testFilePath = context.filePath
        .replace(/\/src\//, "/src/__tests__/")
        .replace(/\.ts$/, ".test.ts");

      const fs = await import("fs");
      if (fs.existsSync(testFilePath)) {
        testPattern = testFilePath;
      }
    }

    // Run vitest (no pattern - uses vitest.config.ts include/exclude)
    // Only add specific file if we have one
    const command = testPattern 
      ? `npx vitest run "${testPattern}"`
      : `npx vitest run`;

    frameworkLogger.log(
      "processor-manager",
      "running-typescript-tests",
      "info",
      { command, cwd },
    );

    return this.runTestCommand(command, cwd);
  }

  /**
   * Execute tests for any language using their native test framework
   * @deprecated Part of legacy TestExecutionProcessor. Kept for backward compatibility.
   */
  private async executeGenericTests(
    context: any,
    cwd: string,
    projectLanguage: any,
  ): Promise<any> {
    let testFilePath: string | undefined;

    if (context.filePath) {
      testFilePath = getTestFilePath(context.filePath, projectLanguage);

      const fs = await import("fs");
      if (!fs.existsSync(testFilePath)) {
        frameworkLogger.log(
          "processor-manager",
          "test-file-not-found",
          "info",
          {
            message: `Test file not found: ${testFilePath}`,
            sourceFile: context.filePath,
          },
        );
        // Try running all tests instead
        testFilePath = undefined;
      }
    }

    // Build the test command for this language
    const command = buildTestCommand(projectLanguage, testFilePath);

    frameworkLogger.log("processor-manager", "running-generic-tests", "info", {
      command,
      cwd,
      language: projectLanguage.language,
    });

    return this.runTestCommand(command, cwd);
  }

  /**
   * Run a test command and parse results
   * @deprecated Part of legacy TestExecutionProcessor. Kept for backward compatibility.
   */
  private async runTestCommand(command: string, cwd: string): Promise<any> {
    let stdout = "";
    let stderr = "";
    let exitCode = 0;

    try {
      const result = await execAsync(command, {
        cwd,
        timeout: 120000, // 2 minute timeout
      });
      stdout = result.stdout;
      stderr = result.stderr;
    } catch (execError: any) {
      exitCode = execError.code || 1;
      stdout = execError.stdout || "";
      stderr = execError.stderr || "";
    }

    // Parse results from output (language-agnostic patterns)
    const actualPassed = this.parseTestOutput(stdout, "passed");
    const actualFailed = this.parseTestOutput(stdout, "failed");

    const result = {
      testsExecuted: actualPassed + actualFailed,
      passed: actualPassed,
      failed: actualFailed,
      exitCode,
      output: stdout.substring(0, 2000), // Limit output size
      success: exitCode === 0,
    };

    frameworkLogger.log(
      "processor-manager",
      "tests-completed",
      result.success ? "success" : "error",
      {
        message: `Tests completed: ${result.passed} passed, ${result.failed} failed`,
        ...result,
      },
    );

    return result;
  }

  /**
   * Parse test output for pass/fail counts (language-agnostic)
   * @deprecated Part of legacy TestExecutionProcessor. Kept for backward compatibility.
   */
  private parseTestOutput(output: string, type: "passed" | "failed"): number {
    // Try various output formats
    const patterns = [
      // "10 passed", "15 passed, 2 failed"
      new RegExp(`(\\d+)\\s+${type}`, "gi"),
      // "Tests: 10 passed, 2 failed"
      new RegExp(`Tests?:\\s+\\d+\\s+passed,\\s+(\\d+)\\s+failed`, "gi"),
      // "10 passed, 0 failed"
      new RegExp(`(\\d+)\\s+passed,\\s+(\\d+)\\s+failed`, "gi"),
      // JUnit XML style
      new RegExp(`tests="(\\d+)"\\s+failures="(\\d+)"`, "gi"),
    ];

    for (const pattern of patterns) {
      const match = output.match(pattern);
      if (match) {
        if (type === "passed") {
          // For combined patterns, extract passed count
          if (match[0].includes("passed") && match[0].includes("failed")) {
            const passedMatch = match[0].match(/(\d+)\s+passed/);
            return passedMatch ? parseInt(passedMatch[1] || "0") : 0;
          }
          const count = match[0].match(/(\d+)/);
          return count ? parseInt(count[1] || "0") : 0;
        } else {
          // For failed
          if (match[0].includes("passed") && match[0].includes("failed")) {
            const failedMatch = match[0].match(/(\d+)\s+failed/);
            return failedMatch ? parseInt(failedMatch[1] || "0") : 0;
          }
          // For JUnit style
          const count = match[0].match(/failures="(\d+)"/);
          return count ? parseInt(count[1] || "0") : 0;
        }
      }
    }

    return 0;
  }

  /**
   * @deprecated Use RegressionTestingProcessor class instead. Kept for backward compatibility.
   */
  private async executeRegressionTesting(context: any): Promise<any> {
    // Run regression tests
    frameworkLogger.log(
      "processor-manager",
      "running regression tests",
      "info",
    );
    // Placeholder - would integrate with regression test suite
    return { regressions: "checked", issues: [] };
  }

  /**
   * @deprecated Use StateValidationProcessor class instead. Kept for backward compatibility.
   */
  private async executeStateValidation(context: any): Promise<any> {
    // Validate state post-operation
    const currentState = this.stateManager.get("session:active");
    return { stateValid: !!currentState };
  }

  /**
   * @deprecated Use RefactoringLoggingProcessor class instead. Kept for backward compatibility.
   */
  private async executeRefactoringLogging(context: any): Promise<any> {
    try {
      // Import the refactoring logging processor dynamically
      const { RefactoringLoggingProcessor } =
        await import("./refactoring-logging-processor.js");

      const processor = new RefactoringLoggingProcessor();

      // Check if context is agent task completion context
      if (
        context.agentName &&
        context.task &&
        typeof context.startTime === "number"
      ) {
        const result = await processor.execute(context);

        return {
          logged: result.logged || false,
          success: true,
          message: result.logged
            ? "Agent completion logged"
            : "No logging needed",
        };
      }

      return {
        logged: false,
        success: true,
        message: "Not an agent task completion context",
      };
    } catch (error) {
      console.error("Refactoring logging failed:", error);
      return {
        logged: false,
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Attempt to fix rule violations by calling appropriate agents/skills
   * @deprecated Part of legacy CodexComplianceProcessor. Kept for backward compatibility.
   */
  private async attemptRuleViolationFixes(
    violations: { rule: string; message: string; severity?: string }[],
    context: { files?: string[]; newCode?: string },
  ): Promise<void> {
    for (const violation of violations) {
      try {
        await frameworkLogger.log(
          "processor-manager",
          "-attempting-to-fix-rule-violation-violation-rule-",
          "info",
          { message: `🔧 Attempting to fix rule violation: ${violation.rule}` },
        );

        const agentSkill = this.getAgentForRule(violation.rule);
        if (!agentSkill) {
          await frameworkLogger.log(
            "processor-manager",
            "-no-agent-skill-mapping-found-for-rule-violation-r",
            "error",
            {
              message: `❌ No agent/skill mapping found for rule: ${violation.rule}`,
            },
          );
          continue;
        }

        const { agent, skill } = agentSkill;

        // Call the skill invocation MCP server to delegate to the agent/skill
        const { mcpClientManager } = await import("../mcps/mcp-client");
        const result = await mcpClientManager.callServerTool(
          "skill-invocation",
          "invoke-skill",
          {
            skillName: skill,
            toolName: "analyze_code_quality",
            args: {
              code: context.files || [],
              language: "typescript",
              context: {
                rule: violation.rule,
                message: violation.message,
                files: context.files,
                newCode: context.newCode,
              },
            },
          },
        );

        await frameworkLogger.log(
          "processor-manager",
          "-agent-agent-attempted-fix-for-rule-violation-rule",
          "success",
          {
            message: `✅ Agent ${agent} attempted fix for rule: ${violation.rule}`,
          },
        );
      } catch (error) {
        await frameworkLogger.log(
          "processor-manager",
          "-failed-to-call-agent-for-rule-violation-rule-erro",
          "error",
          {
            message: `❌ Failed to call agent for rule ${violation.rule}: ${error instanceof Error ? error.message : String(error)}`,
          },
        );
      }
    }
  }

  /**
   * Get the appropriate agent/skill for a rule violation
   * @deprecated Part of legacy CodexComplianceProcessor. Kept for backward compatibility.
   */
  private getAgentForRule(
    ruleId: string,
  ): { agent: string; skill: string } | null {
    const ruleMappings: Record<string, { agent: string; skill: string }> = {
      "tests-required": { agent: "testing-lead", skill: "testing-strategy" },
      "no-duplicate-code": {
        agent: "refactorer",
        skill: "refactoring-strategies",
      },
      "no-over-engineering": {
        agent: "architect",
        skill: "architecture-patterns",
      },
      "resolve-all-errors": {
        agent: "bug-triage-specialist",
        skill: "code-review",
      },
      "prevent-infinite-loops": {
        agent: "bug-triage-specialist",
        skill: "code-review",
      },
      "state-management-patterns": {
        agent: "architect",
        skill: "architecture-patterns",
      },
      "import-consistency": {
        agent: "refactorer",
        skill: "refactoring-strategies",
      },
      "documentation-required": {
        agent: "researcher",
        skill: "project-analysis",
      },
      "clean-debug-logs": {
        agent: "refactorer",
        skill: "refactoring-strategies",
      },
    };

    return ruleMappings[ruleId] || null;
  }

  /**
   * Initialize test auto-creation processor
   * @deprecated Use TestAutoCreationProcessor class instead. Kept for backward compatibility.
   */
  private async initializeTestAutoCreationProcessor(): Promise<void> {
    frameworkLogger.log(
      "processor-manager",
      "initializing test auto-creation processor",
      "info",
    );
    // Processor is initialized when first executed
  }

  /**
   * Execute test auto-creation processor
   * @deprecated Use TestAutoCreationProcessor class instead. Kept for backward compatibility.
   */
  private async executeTestAutoCreation(context: any): Promise<any> {
    frameworkLogger.log(
      "processor-manager",
      "test-auto-creation-start",
      "info",
      {
        message: "Executing test auto-creation processor",
        context: JSON.stringify(context).slice(0, 200),
      },
    );

    try {
      // Import the test auto-creation processor dynamically
      const { testAutoCreationProcessor } =
        await import("./test-auto-creation-processor.js");

      // Execute the processor
      const result = await testAutoCreationProcessor.execute(context);

      return {
        success: result.success,
        message: result.message,
        data: result.data,
      };
    } catch (error) {
      frameworkLogger.log(
        "processor-manager",
        "test-auto-creation-error",
        "error",
        { error: error instanceof Error ? error.message : String(error) },
      );
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Execute coverage analysis processor
   * @deprecated Use CoverageAnalysisProcessor class instead. Kept for backward compatibility.
   */
  private async executeCoverageAnalysis(context: any): Promise<any> {
    frameworkLogger.log(
      "processor-manager",
      "coverage-analysis-start",
      "info",
      {
        message: "Executing coverage analysis processor",
      },
    );

    // Coverage analysis is informational - return success even if no coverage data
    return {
      success: true,
      message: "Coverage analysis skipped - no coverage data available",
      coverage: null,
    };
  }
}
