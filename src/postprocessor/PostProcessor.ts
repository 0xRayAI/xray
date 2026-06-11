/**
 * 0xRay Post-Processor - Core Infrastructure
 *
 * Automated CI/CD loop orchestration: commit → push → monitor → fix → redeploy → monitor
 * Provides systematic error prevention and deployment automation.
 *
 * @version 1.0.0
 * @since 2026-01-13
 */

import * as path from "path";
import { frameworkLogger } from "../core/framework-logger.js";
import { resolveConfigPath } from "../core/config-paths.js";
import { XrayStateManager } from "../state/state-manager.js";
import { SessionMonitor } from "../session/session-monitor.js";
import { GitHookTrigger } from "./triggers/GitHookTrigger.js";
import { WebhookTrigger } from "./triggers/WebhookTrigger.js";
import { APITrigger } from "./triggers/APITrigger.js";
import { PostProcessorMonitoringEngine } from "./monitoring/MonitoringEngine.js";
import { FailureAnalysisEngine } from "./analysis/FailureAnalysisEngine.js";
import { CodeChangeAnalyzer } from "./analysis/CodeChangeAnalyzer.js";
import { AutoFixEngine } from "./autofix/AutoFixEngine.js";
import { activity } from "../core/activity-logger.js";
import { FixValidator } from "./autofix/FixValidator.js";
import { mcpClientManager } from "../mcps/mcp-client.js";
import { RedeployCoordinator } from "./redeploy/RedeployCoordinator.js";
import { EscalationEngine } from "./escalation/EscalationEngine.js";
import { SuccessHandler } from "./success/SuccessHandler.js";
import type { RuleValidationContext } from "../enforcement/types.js";
import { PostProcessorConfig, PostProcessorResult, PostProcessorContext, MonitoringResult, FixResult, FailureAnalysis } from "./types.js";
import { defaultConfig } from "./config.js";
import { frameworkReportingSystem } from "../reporting/framework-reporting-system.js";
import { ReportContentValidator } from "../validation/report-content-validator.js";
import { PostProcessorReporter } from "./reporting/PostProcessorReporter.js";
import { RegressionAnalysisService } from "./services/RegressionAnalysisService.js";
import { ProcessorConfigLoader } from "./config/ProcessorConfigLoader.js";
import { ArchitecturalComplianceChecker } from "./compliance/ArchitecturalComplianceChecker.js";
import type { MetamorphosisEngine, MetamorphosisProposal } from "./metamorphosis/MetamorphosisEngine.js";
import { SelfProposalEngine } from "./metamorphosis/SelfProposalEngine.js";

export class PostProcessor {
  private config: PostProcessorConfig;
  private monitoringEngine: PostProcessorMonitoringEngine;
  private failureAnalysisEngine: FailureAnalysisEngine;
  private autoFixEngine: AutoFixEngine;
  private fixValidator: FixValidator;
  private reportValidator: ReportContentValidator;
  private reporter: PostProcessorReporter;
  private regressionAnalysisService: RegressionAnalysisService;
  private configLoader: ProcessorConfigLoader;
  private codeAnalyzer: CodeChangeAnalyzer;
  private redeployCoordinator: RedeployCoordinator;
  private escalationEngine: EscalationEngine;
  private successHandler: SuccessHandler;
  private triggers: {
    gitHook: GitHookTrigger;
    webhook: WebhookTrigger;
    api: APITrigger;
  };
  private complianceChecker: ArchitecturalComplianceChecker;
  private metamorphosisEngines: MetamorphosisEngine[];

  constructor(
    private stateManager: XrayStateManager,
    private sessionMonitor: SessionMonitor | null = null,
    config: Partial<PostProcessorConfig> = {},
    metamorphosisEngines?: MetamorphosisEngine[],
  ) {
    this.config = { ...defaultConfig, ...config };
    this.metamorphosisEngines = metamorphosisEngines ?? [new SelfProposalEngine()];

    // Initialize monitoring engine
    this.monitoringEngine = new PostProcessorMonitoringEngine(
      this.stateManager,
      this.sessionMonitor || undefined,
    );

    // Initialize failure analysis and auto-fix engines
    this.failureAnalysisEngine = new FailureAnalysisEngine();
    this.autoFixEngine = new AutoFixEngine(
      this.config.autoFix.confidenceThreshold,
    );
    this.fixValidator = new FixValidator();
    this.reportValidator = new ReportContentValidator();
    this.reporter = new PostProcessorReporter(this.config, this.reportValidator);
    this.regressionAnalysisService = new RegressionAnalysisService();
    this.configLoader = new ProcessorConfigLoader();
    this.codeAnalyzer = new CodeChangeAnalyzer();

    // Initialize redeploy coordinator
    this.redeployCoordinator = new RedeployCoordinator(this.config.redeploy);

    // Initialize escalation and success handlers
    this.escalationEngine = new EscalationEngine(this.config.escalation);
    this.successHandler = new SuccessHandler(this.config.success);

    // Initialize trigger mechanisms
    this.triggers = {
      gitHook: new GitHookTrigger(this),
      webhook: new WebhookTrigger(this),
      api: new APITrigger(this, {}),  // Pass empty config object
    };

    // Initialize architectural compliance checker
    this.complianceChecker = new ArchitecturalComplianceChecker();
  }

  /**
   * Notify metamorphosis engines of a lifecycle phase.
   * No-op when no engines are configured.
   */
  private async notifyPhase(phase: string, context: unknown): Promise<void> {
    for (const engine of this.metamorphosisEngines) {
      try {
        await engine.onPhase?.(phase, context);
      } catch (err) {
        await frameworkLogger.log("postprocessor", "metamorphosis-phase-error", "error", {
          engine: engine.name,
          phase,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }

  /**
   * Notify metamorphosis engines of a generated proposal.
   * No-op when no engines are configured.
   */
  private async notifyProposal(proposal: MetamorphosisProposal): Promise<void> {
    for (const engine of this.metamorphosisEngines) {
      try {
        await engine.onProposal?.(proposal);
      } catch (err) {
        await frameworkLogger.log("postprocessor", "metamorphosis-proposal-error", "error", {
          engine: engine.name,
          proposalId: proposal.id,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }

  /**
   * Initialize the post-processor system
   */
  async initialize(): Promise<void> {
    await frameworkLogger.log(
      "postprocessor",
      "initialize",
      "info",
      { message: "🚀 Initializing 0xRay Post-Processor..." },
    );

    // Initialize monitoring
    if (this.config.monitoring.enabled) {
      await this.monitoringEngine.initialize();
      // Postprocessor initialization - removed unnecessary startup logging
    }

    // Initialize triggers
    if (this.config.triggers.gitHooks) {
      await this.triggers.gitHook.initialize();
      // Git hooks initialization - removed unnecessary startup logging
    }

    if (this.config.triggers.webhooks) {
      await this.triggers.webhook.initialize();
      // Webhook triggers initialization - removed unnecessary startup logging
    }

    if (this.config.triggers.api) {
      await this.triggers.api.initialize();
    }

    try {
      const { memoryMonitor } = await import("../monitoring/memory-monitor.js");
      memoryMonitor.start();
      frameworkLogger.log("postprocessor", "memory-monitor-started", "info", {
        message: "Memory monitor auto-started",
      });
    } catch {
      frameworkLogger.log("postprocessor", "memory-monitor-unavailable", "info", {
        message: "Memory monitor not available",
      });
    }

    await frameworkLogger.log(
      "postprocessor",
      "initialize-complete",
      "info",
      { message: "🎯 Post-Processor initialization complete" },
    );
  }


  /**
   * Execute the complete post-processor loop
   */
  async executePostProcessorLoop(
    context: PostProcessorContext,
  ): Promise<PostProcessorResult> {
    const jobId = `post-processor-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    const startTime = Date.now();
    const sessionId = `postprocessor-${context.commitSha}-${Date.now()}`;

    await frameworkLogger.log(
      "postprocessor",
      "loop-start",
      "info",
      {
        message: `🔄 Starting post-processor loop for commit: ${context.commitSha}`,
      },
    );

    // Validate architectural compliance before processing
    const compliancePassed =
        await this.complianceChecker.validateArchitecturalCompliance(context);
    if (!compliancePassed) {
      await frameworkLogger.log(
        "postprocessor",
        "compliance-validation-failed",
        "error",
        {
          message:
            "❌ Architectural compliance validation failed - blocking post-processing",
        },
      );
      return {
        success: false,
        commitSha: context.commitSha,
        sessionId: `validation-${context.commitSha}`,
        attempts: 0,
        error: "Architectural compliance validation failed",
      };
    }

    // Gate-sourced critical violations escalation
    const critical = context.criticalViolations ?? [];
    if (critical.length > 0) {
      await frameworkLogger.log("postprocessor", "gate-critical-violations", "error", {
        count: critical.length,
        violations: critical.map(v => `${v.ruleId}[${v.severity}]: ${v.message}`).join("; "),
      });
      const escalationResult = await this.escalationEngine.evaluateEscalation(
        context, 0,
        `Gate reported ${critical.length} critical violation(s): ${critical[0]!.message}`,
        [],
      );
      if (escalationResult) {
        await frameworkLogger.log("postprocessor", "gate-escalation-triggered", "error", {
          level: escalationResult.level,
          reason: escalationResult.reason,
        });
      }
    }

    // Codex compliance validation: Use processor-manager for proper rule enforcement and agent delegation
    // IMPROVED: Analyze actual code changes and pass meaningful context to processors
    const processorContext = await this.codeAnalyzer.analyzeCodeChanges(context);

    try {
      const { importResolver } = await import("../utils/import-resolver.js");
      const { ProcessorManager } = await importResolver.importModule(
        "processors/processor-manager",
      );

      const processorManager = new ProcessorManager(this.stateManager);

      const processorConfig = await this.configLoader.loadProcessorConfig();
      
      const PRE_PROCESSOR_DEFAULTS: Record<string, { type: "pre"; priority: number }> = {
        preValidate: { type: "pre", priority: 10 },
        codexCompliance: { type: "pre", priority: 20 },
        testAutoCreation: { type: "pre", priority: 22 },
        versionCompliance: { type: "pre", priority: 25 },
        errorBoundary: { type: "pre", priority: 30 },
        agentsMdValidation: { type: "pre", priority: 35 },
      };

      for (const [name, def] of Object.entries(PRE_PROCESSOR_DEFAULTS)) {
        const enabled = (processorConfig as any)[name]?.enabled ?? true;
        processorManager.registerProcessor({ name, type: def.type, priority: def.priority, enabled });
      }

      processorManager.registerProcessor({ name: "stateValidation", type: "post", priority: 130, enabled: true });

      const POST_PROCESSOR_MAP: Record<string, { type: "post"; priority: number }> = {
        storytellingTrigger: { type: "post", priority: 5 },
        sessionSummary: { type: "post", priority: 15 },
        testExecution: { type: "post", priority: 40 },
        regressionTesting: { type: "post", priority: 50 },
        inferenceImprovement: { type: "post", priority: 60 },
      };

      const postConfig = processorConfig.post_processors;
      const postEnabled = postConfig?.enabled !== false;
      const postOrder = postConfig?.priority_order || Object.keys(POST_PROCESSOR_MAP);

      if (postEnabled) {
        for (let i = 0; i < postOrder.length; i++) {
          const name = postOrder[i]!;
          const def = POST_PROCESSOR_MAP[name];
          if (def) {
            const cfg = processorConfig as Record<string, { enabled?: boolean }>;
            processorManager.registerProcessor({
              name,
              type: def.type,
              priority: 100 + (i * 10),
              enabled: cfg[name]?.enabled ?? true,
            });
          }
        }
      }

      // Initialize all registered processors
      await processorManager.initializeProcessors();

      const complianceResult =
        await processorManager.executeCodexCompliance(processorContext);

      // FIX #1: Run test auto-creation for ALL new files, NOT just non-compliant ones
      // Iterate over each file and create tests for new TypeScript files
      if (context.files && context.files.length > 0) {
        for (const filePath of context.files) {
          // Only process TypeScript source files (not test files)
          if (filePath.endsWith(".ts") && !filePath.endsWith(".test.ts")) {
            try {
// 1. First create the test
               await processorManager.executeProcessor("testAutoCreation", {
                 tool: "write",
                 operation: "commit",
                 args: {
                   filePath: filePath, // Pass filePath in args structure
                 },
                 directory: process.cwd(),
               });

              // 2. Then run the generated test
              await processorManager.executeProcessor("testExecution", {
                tool: "write",
                operation: "commit",
                args: {
                  filePath: filePath,
                },
                directory: process.cwd(),
              });
            } catch (testError) {
              // Non-blocking - log but continue
              await frameworkLogger.log(
                "postprocessor",
                "test-auto-creation-failed",
                "info",
                {
                  message: `Test auto-creation failed for ${filePath}: ${testError}`,
                },
              );
            }
          }
        }
      }

      if (!complianceResult.compliant) {
        await frameworkLogger.log(
          "codex-compliance",
          "validation-failed",
          "error",
          {
            jobId,
            commitSha: context.commitSha,
            violations: complianceResult.violations,
            reason:
              "Codex compliance violations found - processor-manager attempted automated fixes",
          },
        );

        await frameworkLogger.log(
          "postprocessor",
          "codex-compliance-violations-detected",
          "info",
          {
            message:
              "⚠️ Codex compliance violations detected - processor-manager handled automated fixes",
          },
        );
      }

      // Per-pipeline explicit validation wiring for PostProcessor claimed terms: 7,8,74,77
      // Convert PostProcessor context (Map-based newCode) to RuleValidationContext (string-based)
      const joinedNewCode = processorContext.newCode.size > 0
        ? Array.from(processorContext.newCode.values()).join("\n")
        : undefined;
      const validationContext: RuleValidationContext = {
        operation: processorContext.operation,
        files: processorContext.files,
        ...(joinedNewCode ? { newCode: joinedNewCode } : {}),
        existingCode: processorContext.existingCode,
        dependencies: processorContext.dependencies,
        tests: processorContext.tests,
      };

      try {
        const { globalValidatorRegistry } = await import("../enforcement/validators/validator-registry.js");

        const term7 = globalValidatorRegistry.getValidator("error-resolution");
        if (term7) {
          const res = await term7.validate(validationContext);
          if (!res.passed) {
            await frameworkLogger.log("postprocessor", "term-7-validation-failed", "error", {
              message: res.message,
              suggestions: res.suggestions,
            });
          }
        }

        const term8 = globalValidatorRegistry.getValidator("loop-safety");
        if (term8) {
          const res = await term8.validate(validationContext);
          if (!res.passed) {
            await frameworkLogger.log("postprocessor", "term-8-validation-failed", "error", {
              message: res.message,
              suggestions: res.suggestions,
            });
          }
        }

        const term74 = globalValidatorRegistry.getValidator("boot-wiring");
        if (term74) {
          const res = await term74.validate(validationContext);
          if (!res.passed) {
            await frameworkLogger.log("postprocessor", "term-74-validation-failed", "warning", {
              message: res.message,
              suggestions: res.suggestions,
            });
          }
        }

        const term77 = globalValidatorRegistry.getValidator("console-log-usage");
        if (term77) {
          const res = await term77.validate(validationContext);
          if (!res.passed) {
            await frameworkLogger.log("postprocessor", "term-77-validation-failed", "error", {
              message: res.message,
              suggestions: res.suggestions,
            });
          }
        }
      } catch (e) {
        await frameworkLogger.log("postprocessor", "per-pipeline-validation-error", "warning", {
          error: String(e),
        });
      }
    } catch (error) {
      await frameworkLogger.log(
        "postprocessor",
        "codex-compliance-check-failed",
        "error",
        {
          message: "⚠️ Codex compliance check failed - continuing with commit",
        },
      );
    }

    try {
      // Initialize session tracking
      await this.stateManager.set(`postprocessor:${sessionId}`, {
        status: "running",
        startTime,
        context,
        attempts: 0,
      });

      // Execute the monitoring → analysis → fix → redeploy loop
      const result = await this.executeMonitoringLoop(
        context,
        sessionId,
        jobId,
      );

      // Update final status
      await this.stateManager.set(`postprocessor:${sessionId}`, {
        ...result,
        endTime: Date.now(),
        duration: Date.now() - startTime,
      });

      await frameworkLogger.log(
        "postprocessor",
        "loop-completed",
        "success",
        {
          message: `✅ Post-processor loop completed: ${result.success ? "SUCCESS" : "FAILED"}`,
        },
      );

      await this.notifyPhase('post-process-complete', { context, result });

      return result;
    } catch (error) {
      await frameworkLogger.log(
        "postprocessor",
        "post-processor-loop-failed",
        "error",
        { error: String(error) },
      );

      const failureResult: PostProcessorResult = {
        success: false,
        commitSha: context.commitSha,
        sessionId,
        error: error instanceof Error ? error.message : String(error),
        attempts: 1,
        monitoringResults: [],
        fixesApplied: [],
      };

      await this.stateManager.set(`postprocessor:${sessionId}`, {
        ...failureResult,
        endTime: Date.now(),
        duration: Date.now() - startTime,
      });

      return failureResult;
    }
  }

  /**
   * Execute the monitoring loop until success or max attempts
   */
  private async executeMonitoringLoop(
    context: PostProcessorContext,
    sessionId: string,
    jobId: string,
  ): Promise<PostProcessorResult> {
    let attempts = 0;
    const maxAttempts = this.config.maxAttempts || 3;
    const monitoringResults: MonitoringResult[] = [];

    while (attempts < maxAttempts) {
      attempts++;

      await frameworkLogger.log(
        "postprocessor",
        "monitoring-attempt",
        "info",
        {
          message: `🔍 Monitoring attempt ${attempts}/${maxAttempts} for ${context.commitSha}`,
        },
      );

      // Monitor CI/CD status
      const monitoringResult = await this.monitoringEngine.monitorDeployment(
        context.commitSha,
      );

      monitoringResults.push(monitoringResult);

      if (monitoringResult.overallStatus === "success") {
        await frameworkLogger.log(
          "postprocessor",
          "pipeline-success",
          "success",
          { message: "✅ CI/CD pipeline successful - post-processor complete" },
        );

        await this.notifyPhase('monitoring-complete', { context, monitoringResult });

        const result = {
          success: true,
          commitSha: context.commitSha,
          sessionId,
          attempts,
          monitoringResults,
        };

        // Handle successful completion
        await this.successHandler.handleSuccess(
          context,
          result,
          monitoringResults,
        );

        // AGENTS.md auto-update with smart triggers
        // Only updates when agent-related files have changed
        const agentChangePatterns = [
          /\.opencode\/agents\//,
          /\/agents\//,
          /AGENTS\.md$/,
        ];

        const changedFiles = context.files || [];
        const hasAgentChanges = changedFiles.some((file: string) =>
          agentChangePatterns.some((pattern) => pattern.test(file))
        );

        if (hasAgentChanges || process.env.ENABLE_AGENTS_AUTO_UPDATE === "always") {
          try {
            const { librarianAgentsUpdater } =
              await import("../agents/librarian-agents-updater.js");
            
            activity.script("docs-sync-started", "AGENTS.md auto-sync triggered", {
              reason: hasAgentChanges ? "agent-files-changed" : "always-enabled",
              changedFiles: changedFiles.filter((f: string) =>
                agentChangePatterns.some((p) => p.test(f))
              ).length
            });
            
            await librarianAgentsUpdater.updateAgentsMd(process.cwd());
            
            activity.success("development", "docs-sync-complete", "AGENTS.md auto-sync completed");
            
            await frameworkLogger.log(
              "postprocessor",
              "agents-md-auto-updated",
              "info",
              { 
                message: "AGENTS.md updated due to agent-related changes",
                changedFiles: changedFiles.filter((f: string) =>
                  agentChangePatterns.some((p) => p.test(f))
                ).length
              },
            );
          } catch (error) {
            await frameworkLogger.log(
              "postprocessor",
              "agents-md-update-failed",
              "info",
              { message: `AGENTS.md auto-update failed: ${error}` },
            );
          }
        }

        // Regression analysis check
        try {
          const regressionDecision = await this.regressionAnalysisService.shouldAnalyze(context);
          if (regressionDecision.required) {
            await frameworkLogger.log("postprocessor", "regression-analysis-required", "info", {
              reason: regressionDecision.reason,
              agents: regressionDecision.agents,
              depth: regressionDecision.depth,
            });
            await this.regressionAnalysisService.invokeAnalysis(context, regressionDecision);
          }
        } catch (regressionError) {
          await frameworkLogger.log("postprocessor", "regression-analysis-failed", "warning", {
            error: String(regressionError),
          });
        }

        // Execute post-processors (storytelling, session summary, test execution, regression testing)
        try {
          const { importResolver: resolver } = await import("../utils/import-resolver.js");
          const { ProcessorManager: PM } = await resolver.importModule("processors/processor-manager");
          const pm = new PM(this.stateManager);

          const postProcessorConfig = await this.configLoader.loadProcessorConfig();
          const POST_MAP: Record<string, { type: "post"; priority: number }> = {
            storytellingTrigger: { type: "post", priority: 5 },
            sessionSummary: { type: "post", priority: 15 },
            testExecution: { type: "post", priority: 40 },
            regressionTesting: { type: "post", priority: 50 },
            inferenceImprovement: { type: "post", priority: 60 },
          };

          const postCfg = postProcessorConfig.post_processors;
          const postOrder = postCfg?.priority_order || Object.keys(POST_MAP);
          
          for (let i = 0; i < postOrder.length; i++) {
            const name = postOrder[i]!;
            const def = POST_MAP[name];
            if (def && (postCfg?.enabled !== false)) {
              pm.registerProcessor({ name, type: def.type, priority: 100 + i * 10, enabled: true });
            }
          }

          await pm.initializeProcessors();

          const postResults = await pm.executePostProcessors("commit", {
            files: context.files,
            commitSha: context.commitSha,
            operation: context.operation,
            sessionDurationMinutes: (Date.now() - (context as any).startTime) / 60000,
          }, []);

          const triggeredStorytelling = postResults.find(
            (r: { processorName?: string; success?: boolean }) => r.processorName === "storytellingTrigger" && r.success
          );
          if (triggeredStorytelling) {
            await frameworkLogger.log("postprocessor", "storytelling-trigger-activated", "info", {
              result: triggeredStorytelling.data,
            });
          }
        } catch (postError) {
          await frameworkLogger.log("postprocessor", "post-processors-failed", "warning", {
            error: String(postError),
          });
        }

        // Generate automated framework report if threshold met
        const complexityScore = this.calculateComplexityScore(
          monitoringResults,
          context,
        );
        const reportPath = await this.reporter.generateFrameworkReport(
          complexityScore,
          context,
          sessionId,
        );

        // Validate the generated report for hidden issues
        if (reportPath) {
          await this.reporter.validateGeneratedReport(reportPath, "framework");
        }

        return result;
      }

      // Pipeline failed - analyze and attempt fixes
      await frameworkLogger.log(
        "postprocessor",
        "ci-cd-pipeline-failed",
        "error",
        { jobId, action: "analyzing-issues" },
      );

      const analysis =
        await this.failureAnalysisEngine.analyzeFailure(monitoringResult);
      await frameworkLogger.log(
        "postprocessor",
        "analysis-complete",
        "info",
        {
          message: `🔍 Analysis complete: ${analysis.category} (${analysis.severity}) - ${analysis.rootCause}`,
        },
      );

      const fixResult = await this.autoFixEngine.applyFixes(analysis, context);

      if (fixResult.success && fixResult.appliedFixes.length > 0) {
        await frameworkLogger.log(
          "postprocessor",
          "fixes-applied",
          "success",
          {
            message: `🔧 ${fixResult.appliedFixes.length} fix(es) applied successfully`,
          },
        );

        // Validate that fixes resolve the issue
        const validationPassed = await this.fixValidator.validateFixes(
          fixResult.appliedFixes,
          analysis,
          context,
        );

        if (validationPassed) {
          await frameworkLogger.log(
            "postprocessor",
            "fix-validation-passed",
            "success",
            { message: "✅ Fix validation passed - redeploying..." },
          );
          await this.redeployWithFixes(context, fixResult, jobId);
          // Continue monitoring with next attempt
          continue;
        } else {
          await frameworkLogger.log(
            "postprocessor",
            "fix-validation-failed",
            "error",
            { jobId, action: "rolling-back" },
          );
          await this.fixValidator.rollbackFixes(fixResult.appliedFixes);
        }
      }

      // Check if escalation is needed before retry
      const escalationResult = await this.escalationEngine.evaluateEscalation(
        context,
        attempts,
        "CI/CD pipeline failure",
        monitoringResults,
      );

      if (escalationResult) {
        await frameworkLogger.log(
          "postprocessor",
          "escalation-triggered",
          "info",
          { message: `🚨 Escalation triggered: ${escalationResult.level}` },
        );
        await frameworkLogger.log(
          "postprocessor",
          "escalation-reason",
          "info",
          { message: `   Reason: ${escalationResult.reason}` },
        );

        // For emergency/rollback levels, stop the loop
        if (
          escalationResult.level === "emergency" ||
          escalationResult.level === "rollback"
        ) {
          return {
            success: false,
            commitSha: context.commitSha,
            sessionId,
            attempts,
            monitoringResults,
            fixesApplied: fixResult?.appliedFixes || [],
            error: `Escalation triggered: ${escalationResult.reason}`,
          };
        }
      }

      // Wait before retry (only if not escalated to emergency/rollback)
      await this.waitBeforeRetry(attempts);
    }

    // Max attempts exceeded - final escalation
    const finalEscalation = await this.escalationEngine.evaluateEscalation(
      context,
      attempts,
      "Max attempts exceeded - deployment failed",
      monitoringResults,
    );

    return {
      success: false,
      commitSha: context.commitSha,
      sessionId,
      attempts,
      monitoringResults,
      fixesApplied: [],
      error: "Max attempts exceeded",
    };
  }

  /**
   * Redeploy after applying fixes using the RedeployCoordinator
   */
  private async redeployWithFixes(
    context: PostProcessorContext,
    fixResult: FixResult,
    jobId: string,
  ): Promise<void> {
    await frameworkLogger.log(
      "postprocessor",
      "redeploy-start",
      "info",
      { message: "🔄 Executing redeployment with fixes..." },
    );

    const redeployResult = await this.redeployCoordinator.executeRedeploy(
      context,
      fixResult,
    );

    if (redeployResult.success) {
      await frameworkLogger.log(
        "postprocessor",
        "redeploy-success",
        "success",
        {
          message: `✅ Redeployment successful: ${redeployResult.deploymentId}`,
        },
      );
    } else {
      await frameworkLogger.log(
        "postprocessor",
        "redeployment-failed",
        "error",
        { jobId, error: redeployResult.error },
      );
      throw new Error(`Redeployment failed: ${redeployResult.error}`);
    }
  }

  /**
   * Attempt to apply automatic fixes
   */
  private async attemptAutoFix(
    analysis: FailureAnalysis,
    context: PostProcessorContext,
  ): Promise<{ success: boolean; requiresManualIntervention: boolean }> {
    // Placeholder for auto-fix - disabled for now
    return { success: false, requiresManualIntervention: true };
  }

  /**
   * Escalate to manual intervention
   */
  private async escalateToManualIntervention(
    context: PostProcessorContext,
    monitoringResult: MonitoringResult,
    attempts: number,
  ): Promise<void> {
    await frameworkLogger.log(
      "postprocessor",
      "escalate-manual",
      "info",
      { message: "🚨 Escalating to manual intervention" },
    );

    // Create detailed incident report
    const report = {
      commitSha: context.commitSha,
      attempts,
      monitoringResult,
      timestamp: new Date().toISOString(),
      recommendations: [
        "Review CI/CD pipeline logs for detailed error information",
        "Check failed test outputs and error messages",
        "Verify recent code changes for potential issues",
        "Consider manual fixes or rollback if necessary",
      ],
    };

    // Store escalation details
    await this.stateManager.set(`escalation:${context.commitSha}`, report);

    // TODO: Send notifications to development team
    await frameworkLogger.log(
      "postprocessor",
      "escalation-report-created",
      "info",
      { message: "📋 Escalation report created", report },
    );
  }

  /**
   * Wait before retry with exponential backoff
   */
  private async waitBeforeRetry(attempt: number): Promise<void> {
    const baseDelay = this.config.retryDelay || 30000; // 30 seconds
    const delay = baseDelay * Math.pow(2, attempt - 1);

    await frameworkLogger.log(
      "postprocessor",
      "wait-before-retry",
      "info",
      { message: `⏳ Waiting ${delay}ms before retry attempt ${attempt + 1}` },
    );
    await new Promise((resolve) => setTimeout(resolve, delay));
  }

  /**
   * Get post-processor status
   */
  async getStatus(): Promise<any> {
    return {
      activeSessions: 0, // Placeholder
      config: this.config,
      monitoringStatus: await this.monitoringEngine.getStatus(),
    };
  }


  /**
   * Calculate complexity score for automated report triggering
   */
  private calculateComplexityScore(
    monitoringResults: MonitoringResult[],
    context: PostProcessorContext,
  ): number {
    // Simple complexity calculation based on file count and monitoring results
    const fileCount = context.files?.length || 0;
    const monitoringIssues = monitoringResults?.length || 0;

    // Base score from file count (max 50 points)
    const fileScore = Math.min(fileCount * 2, 50);

    // Additional score from monitoring issues (max 30 points)
    const monitoringScore = Math.min(monitoringIssues * 5, 30);

    // Total score (0-100)
    return Math.min(fileScore + monitoringScore, 100);
  }

}
