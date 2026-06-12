/**
 * 0xRay Framework - Core Orchestrator (deprecated)
 *
 * Use thin-dispatch (src/nucleus/thin-dispatch.ts) for runtime agent routing
 * and src/utils/task-graph.ts for task graph utilities.
 * KernelOrchestrator is kept for backward compat with boot sequence integration.
 *
 * @deprecated since v3.0.0 — use thin-dispatch for routing, task-graph for utilities
 */

import { frameworkLogger } from "../core/framework-logger.js";
import { TaskDefinition, AgentConfig } from "../agents/types.js";
import { getKernel, KernelInferenceResult } from "./kernel-patterns.js";
import { topologicalSort, validateTaskDependencies, resolveConflicts } from "../utils/task-graph.js";

export interface OrchestrationResult {
  success: boolean;
  taskId: string;
  agentUsed: string;
  duration: number;
  result: unknown;
  error?: string;
  errors?: string[];
}

export interface OrchestratorConfig {
  maxConcurrentTasks?: number;
  taskTimeout?: number;
  conflictResolutionStrategy?: "majority_vote" | "expert_priority";
}

export class KernelOrchestrator {
  private taskQueue: Map<string, TaskDefinition> = new Map();
  private activeTasks: Set<string> = new Set();
  private totalProcessed: number = 0;
  private config: {
    maxConcurrentTasks: number;
    taskTimeout: number;
    conflictResolutionStrategy: "majority_vote" | "expert_priority";
  };
  private kernel: ReturnType<typeof getKernel>;

  constructor(config?: OrchestratorConfig) {
    this.config = { maxConcurrentTasks: 3, taskTimeout: 10000, conflictResolutionStrategy: "majority_vote", ...config };
    this.kernel = getKernel();
    frameworkLogger.log("orchestrator", "initialized", "info", { config: this.config });
  }

  /**
   * @deprecated since v3.0.0 — use thin-dispatch routing (scoreComplexity → routeToAgent)
   *             and agent-delegator for actual execution.
   */
  async executeTask(task: TaskDefinition): Promise<OrchestrationResult> {
    const taskId = this.generateTaskId();
    this.taskQueue.set(taskId, task);
    this.activeTasks.add(taskId);
    
    // KERNEL ANALYSIS: Apply kernel pattern recognition before task execution
    const kernelInsights = this.kernel.analyze(task.description);
    
    // Apply P7 (Release Readiness) pattern detection
    if (kernelInsights.cascadePatterns?.some(p => p.id === 'P7')) {
      const p7Pattern = kernelInsights.cascadePatterns?.find(p => p.id === 'P7');
      if (p7Pattern) {
        frameworkLogger.log(
          "orchestrator",
          "kernel-guided-release-readiness",
          "info",
          {
            taskId,
            taskType: task.type,
            complexity: task.complexity,
            detectedPattern: p7Pattern.id,
            guidance: 'Apply comprehensive validation before proceeding',
            kernelAction: kernelInsights.actionRequired || 'No action specified',
          }
        );
        
        // Release Readiness pattern - require comprehensive validation
        return {
          success: false,
          taskId: task.id,
          agentUsed: "kernel-guidance",
          duration: 0,
          result: {
            message: "Release readiness pattern detected",
            kernelGuidance: kernelInsights.actionRequired || 'No action specified',
            suggestedAction: "Run comprehensive validation (62-point checklist) before proceeding",
          },
          error: "Kernel P7 (RELEASE_READINESS) detected: Comprehensive validation required",
        };
      }
    }
    
    // Log kernel insights for debugging and learning
    frameworkLogger.log("orchestrator", "task-started", "info", {
      taskId,
      taskType: task.type,
      complexity: task.complexity,
      kernelLevel: kernelInsights.level,
      kernelConfidence: kernelInsights.confidence,
      detectedPatterns: kernelInsights.cascadePatterns?.length || 0,
      detectedAssumptions: kernelInsights.fatalAssumptions?.length || 0,
    });

    try {
      // Delegate to subagent for actual task execution
      const result = await this.delegateToSubagent(
        task.subagentType || "default-agent",
        task,
      );

      const executionTime = result.executionTime ?? 0;
      const agentName =
        result.agentName ?? task.subagentType ?? "default-agent";

      frameworkLogger.log("orchestrator", "task-completed", "success", {
        taskId,
        duration: executionTime,
      });

      // Ensure result is always an object
      const resultValue =
        typeof result.result === "object"
          ? result.result
          : { value: result.result };

      return {
        success: true,
        taskId: task.id,
        agentUsed: agentName,
        duration: executionTime,
        result: resultValue,
      };
    } catch (error) {
      frameworkLogger.log("orchestrator", "task-failed", "error", {
        taskId,
        error: error instanceof Error ? error.message : String(error),
      });

      const errorMessage =
        error instanceof Error ? error.message : String(error);
      // Return failure result instead of throwing
      return {
        success: false,
        taskId: task.id,
        agentUsed: task.subagentType || "default-agent",
        duration: 0,
        result: null,
        error: errorMessage,
        errors: [errorMessage],
      };
    } finally {
      this.activeTasks.delete(taskId);
      this.taskQueue.delete(taskId);
      this.totalProcessed++;
    }
  }

  /**
   * Execute a single task by delegating to appropriate subagent
   */
  private async executeSingleTask(
    task: TaskDefinition,
    jobId: string,
  ): Promise<OrchestrationResult> {
    const startTime = Date.now();

    try {
      // Delegate to subagent for actual task execution
      const result = await this.delegateToSubagent(
        task.subagentType || "default-agent",
        task,
      );

      const duration = Date.now() - startTime;
      const agentName =
        result.agentName ?? task.subagentType ?? "default-agent";

      await frameworkLogger.log(
        "orchestrator",
        "complex-task-completed",
        "success",
        { jobId, taskExecuted: true },
      );

      // Ensure result is always an object
      const resultValue =
        typeof result.result === "object"
          ? result.result
          : { value: result.result };

      return {
        success: true,
        taskId: task.id,
        agentUsed: agentName,
        duration,
        result: resultValue,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      await frameworkLogger.log(
        "orchestrator",
        "complex-task-failed",
        "error",
        { jobId, taskId: task.id, error: errorMessage },
      );

      return {
        success: false,
        taskId: task.id,
        agentUsed: task.subagentType || "default-agent",
        duration,
        result: null,
        error: errorMessage,
        errors: [errorMessage],
      };
    }
  }

  async executeComplexTask(
    description: string,
    tasks: TaskDefinition[],
    sessionId?: string,
  ): Promise<OrchestrationResult[]> {
    // Validate that all task dependencies are within this orchestrator's batch
    validateTaskDependencies(tasks);

    frameworkLogger.log("orchestrator", "complex-task-started", "info", {
      description,
      taskCount: tasks.length,
    });

    const results: OrchestrationResult[] = [];
    const completedTaskIds: Set<string> = new Set();

    // Sort tasks by dependencies (simple topological sort)
    const sortedTasks = topologicalSort(tasks);

    for (const task of sortedTasks) {
      // Check dependencies
      if (task.dependencies && task.dependencies.length > 0) {
        const missingDeps = task.dependencies.filter(
          (dep) => !completedTaskIds.has(dep),
        );

        if (missingDeps.length > 0) {
          frameworkLogger.log("orchestrator", "dependency-failed", "error", {
            taskId: task.id,
            missingDependencies: missingDeps,
          });

          results.push({
            success: false,
            taskId: task.id,
            agentUsed: task.subagentType || "default-agent",
            duration: 0,
            result: null,
            errors: [`Missing dependencies: ${missingDeps.join(", ")}`],
          });
          continue;
        }
      }

      try {
        const result = await this.executeTask(task);
        results.push(result);
        completedTaskIds.add(task.id);
      } catch (error) {
        results.push({
          success: false,
          taskId: task.id,
          agentUsed: task.subagentType || "default-agent",
          duration: 0,
          result: null,
          errors: [error instanceof Error ? error.message : String(error)],
        });
      }
    }

    frameworkLogger.log("orchestrator", "complex-task-completed", "success", {
      description,
      taskCount: tasks.length,
      successCount: results.filter((r) => r.success).length,
    });

    return results;
  }



  resolveConflicts(conflicts: Array<{ response?: unknown; proposed?: unknown; expertiseScore?: number }>): {
    response: string;
    expertiseScore: number;
  } {
    return resolveConflicts(conflicts, this.config.conflictResolutionStrategy);
  }

  private generateTaskId(): string {
    return `task-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  }

  /**
   * Delegate a task to a specific agent with timeout protection
   */
  async delegateToSubagent(agentName: string, task: TaskDefinition): Promise<{ success: boolean; result: unknown; agentName: string; executionTime: number }> {
    const timeoutMs = this.config.taskTimeout;

    frameworkLogger.log("orchestrator", "delegate-to-subagent", "info", {
      agentName,
      taskType: task.type,
      timeoutMs,
    });

    try {
      const result = await Promise.race([
        this.performDelegation(agentName, task),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error(`Delegation to ${agentName} timed out after ${timeoutMs}ms`)), timeoutMs)
        ),
      ]);

      return result;
    } catch (error) {
      frameworkLogger.log("orchestrator", "delegate-to-subagent-failed", "error", {
        agentName,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  private async performDelegation(agentName: string, task: TaskDefinition): Promise<{ success: boolean; result: unknown; agentName: string; executionTime: number }> {
    const { scoreAndRoute } = await import("../nucleus/thin-dispatch.js");
    const routing = scoreAndRoute(task.description, { taskType: task.type, agentName });

    frameworkLogger.log("orchestrator", "thin-dispatch-routing", "info", {
      requestedAgent: agentName,
      routedAgent: routing.agent,
      score: routing.score.score,
      level: routing.score.level,
    });

    return {
      success: true,
      result: `Task routed to ${routing.agent} via thin-dispatch`,
      agentName: routing.agent,
      executionTime: 0,
    };
  }

  getStatus() {
    return {
      queueSize: this.taskQueue.size,
      activeTasks: this.activeTasks.size,
      totalProcessed: this.totalProcessed,
      config: this.config,
    };
  }
}

export const xrayOrchestrator = new KernelOrchestrator();
export const strRayOrchestrator = xrayOrchestrator; // backward compat
