/**
 * Task Handler
 * 
 * Handles task orchestration requests
 */

import { frameworkLogger } from '../../../core/framework-logger.js';
import { getExecutionPlanner } from '../execution/execution-planner.js';
import { mcpClientManager } from '../../../mcps/mcp-client.js';
import { addObservations, extractOrchestrationObservations, spawnAside } from '../aside-context.js';
import { getProvider } from '../config/memory-routing-bridge.js';
import type { OrchestrationResult, OrchestrationTask } from '../types.js';

export interface TaskHandlerDeps {
  taskHistory: OrchestrationHistoryItem[];
  activeTasks: Map<string, unknown>;
  asideId?: string;
}

interface OrchestrationHistoryItem {
  sessionId: string;
  description: string;
  tasks: number;
  result: OrchestrationResult;
  timestamp: string;
}

/**
 * Task Handler
 * Processes orchestrate-task requests
 */
export class TaskHandler {
  private planner = getExecutionPlanner();

  /**
   * Handle orchestrate-task request
   */
  async handleOrchestrateTask(
    args: {
      description: string;
      tasks?: OrchestrationTask[];
      sessionId?: string;
      executionMode?: string;
      timeout?: number;
    },
    deps: TaskHandlerDeps
  ): Promise<{ content: Array<{ type: string; text: string }> }> {
    const { description, tasks = [], sessionId = `session_${Date.now()}`, executionMode = 'optimized', timeout = 300000 } = args;

    await frameworkLogger.log(
      'orchestrator.server',
      'orchestrate-task-start',
      'info',
      { description, taskCount: tasks.length, sessionId, executionMode }
    );

    const orchestrationResult: OrchestrationResult = {
      sessionId,
      success: false,
      completedTasks: 0,
      failedTasks: 0,
      duration: 0,
      agentUtilization: {},
      bottlenecks: [],
      recommendations: [],
    };

    const startTime = Date.now();

    try {
      // Validate tasks
      const validation = this.planner.validateTasks(tasks);
      if (!validation.valid) {
        throw new Error(`Task validation failed: ${validation.errors.join(', ')}`);
      }

      // Analyze complexity and create execution plan
      const executionPlan = await this.planner.createExecutionPlan(tasks, executionMode);

      const memoryProvider = getProvider();
      if (memoryProvider.id !== 'null' && executionPlan.memoryContext) {
        await spawnAside({
          description: `Orchestrate: ${description}`,
          sessionId,
          inheritedContext: {
            memoryRouting: executionPlan.memoryContext,
          },
        });
      }

      const results = await this.executePlan(executionPlan, sessionId, timeout);

      // Feed per-task outcomes back to memory provider (not aggregate session stats)
      if (memoryProvider.ingestFeedback) {
        const outcomeByKey = new Map(
          results.taskOutcomes.map((o) => [`${o.agent}:${o.taskId}`, o]),
        );

        for (const [agent, assignedTasks] of executionPlan.agentAssignments) {
          for (const task of assignedTasks) {
            const outcome = outcomeByKey.get(`${agent}:${task.id}`);
            memoryProvider.ingestFeedback({
              timestamp: new Date().toISOString(),
              sessionId,
              taskId: task.id,
              assignedAgent: agent,
              memorySignals: task.metadata?.memorySignals ?? [],
              complexity: task.estimatedComplexity ?? 30,
              success: outcome?.success ?? false,
              durationMs: outcome?.durationMs ?? 0,
            });
          }
        }
      }

      // Update result
      orchestrationResult.success = results.success;
      orchestrationResult.completedTasks = results.completedTasks;
      orchestrationResult.failedTasks = results.failedTasks;
      orchestrationResult.deferredTasks = results.deferredTasks;
      orchestrationResult.recommendations.push(...results.recommendations);
      orchestrationResult.agentUtilization = results.agentUtilization;
      orchestrationResult.bottlenecks = results.bottlenecks;
      orchestrationResult.recommendations = results.recommendations;
      if (results.agentOutputs) {
        orchestrationResult.agentOutputs = results.agentOutputs;
      }

      // Push observations into aside context if active
      if (deps.asideId) {
        addObservations(deps.asideId, extractOrchestrationObservations(orchestrationResult));
      }

      // Store in history
      deps.taskHistory.push({
        sessionId,
        description,
        tasks: tasks.length,
        result: orchestrationResult,
        timestamp: new Date().toISOString(),
      });

      // Store in active tasks
      deps.activeTasks.set(sessionId, { status: 'completed', ...orchestrationResult });
    } catch (error) {
      orchestrationResult.recommendations.push(
        `Orchestration error: ${error instanceof Error ? error.message : String(error)}`
      );
    }

    orchestrationResult.duration = Date.now() - startTime;

    const response = this.formatOrchestrationResponse(description, orchestrationResult, executionMode);

    return { content: [{ type: 'text', text: response }] };
  }

  /**
   * Execute the orchestration plan.
   * For known MCP skill servers (code-review, security-audit, researcher, etc.),
   * we actually call the target tool. For other agents we record the assignment.
   */
  private async executePlan(
    plan: { agentAssignments: Map<string, OrchestrationTask[]> },
    sessionId: string,
    _timeout: number
  ): Promise<{
    success: boolean;
    completedTasks: number;
    failedTasks: number;
    deferredTasks: number;
    agentUtilization: Record<string, number>;
    bottlenecks: string[];
    recommendations: string[];
    agentOutputs?: Record<string, string>;
    taskOutcomes: Array<{
      taskId: string;
      agent: string;
      success: boolean;
      durationMs: number;
    }>;
  }> {
    const agentUtilization: Record<string, number> = {};
    let completedTasks = 0;
    let failedTasks = 0;
    let deferredTasks = 0;
    const agentOutputs: Record<string, string> = {};
    const taskOutcomes: Array<{
      taskId: string;
      agent: string;
      success: boolean;
      durationMs: number;
    }> = [];

    const skillServers = new Set([
      'code-review', 'code-reviewer',
      'security-audit', 'security-auditor',
      'researcher',
      'performance-optimization',
      'testing-strategy', 'testing-lead',
      'bug-triage-specialist',
      'refactorer', 'refactoring-strategies',
      'architect', 'architecture-patterns'
    ]);

    for (const [agent, tasks] of plan.agentAssignments) {
      agentUtilization[agent] = tasks.length;

      if (skillServers.has(agent)) {
        for (const task of tasks) {
          const taskStart = Date.now();
          try {
            const toolName = this.mapAgentToTool(agent);
            const result = await mcpClientManager.callServerTool(agent, toolName, {
              description: task.description,
              type: task.type,
              priority: task.priority,
            });

            const outputText = this.extractTextFromMcpResult(result);
            agentOutputs[`${agent}:${task.id}`] = outputText;
            completedTasks++;
            taskOutcomes.push({
              taskId: task.id,
              agent,
              success: true,
              durationMs: Date.now() - taskStart,
            });
          } catch (err) {
            failedTasks++;
            agentOutputs[`${agent}:${task.id}`] = `Error: ${err instanceof Error ? err.message : String(err)}`;
            taskOutcomes.push({
              taskId: task.id,
              agent,
              success: false,
              durationMs: Date.now() - taskStart,
            });
            frameworkLogger.log('orchestrator.task-handler', 'task-execution-failed', 'warning', {
              agent,
              taskId: task.id,
              error: String(err),
            });
          }
        }
      } else {
        for (const task of tasks) {
          deferredTasks++;
          taskOutcomes.push({
            taskId: task.id,
            agent,
            success: false,
            durationMs: 0,
          });
          await frameworkLogger.log(
            'orchestrator.task-handler',
            'delegate-deferred',
            'info',
            { agent, taskId: task.id, sessionId },
          );
        }
      }
    }

    const recommendations: string[] = [];
    const bottlenecks: string[] = [];

    if (deferredTasks > 0) {
      recommendations.push(
        `${deferredTasks} task(s) require host delegation (Task/spawn_subagent per lead-dev-plan) — orchestrate-task only invokes MCP consult skills directly`,
      );
    }

    if (plan.agentAssignments.size > 5) {
      recommendations.push('Consider reducing the number of agents for better coordination');
    }
    for (const [agent, tasks] of plan.agentAssignments) {
      if (tasks.length > 3) {
        bottlenecks.push(`${agent} is handling ${tasks.length} tasks - may be overloaded`);
      }
    }

    return {
      success: failedTasks === 0 && deferredTasks === 0,
      completedTasks,
      failedTasks,
      deferredTasks,
      agentUtilization,
      bottlenecks,
      recommendations,
      agentOutputs,
      taskOutcomes,
    };
  }

  private mapAgentToTool(agent: string): string {
    const map: Record<string, string> = {
      // Servers that have analyze_proposal
      'code-review': 'analyze_proposal',
      'security-audit': 'analyze_proposal',
      'researcher': 'analyze_proposal',
      'bug-triage-specialist': 'analyze_proposal',

      // Legacy aliases that should resolve to the above
      'code-reviewer': 'analyze_proposal',
      'security-auditor': 'analyze_proposal',
      'refactorer': 'analyze_proposal',
      'architect': 'analyze_proposal',
      'architecture-patterns': 'analyze_proposal',

      // Implementation / apply focused tools
      'refactoring-strategies': 'suggest_refactor',
      'testing-strategy': 'analyze_test_coverage',
      'testing-lead': 'analyze_test_coverage',
    };
    return map[agent] || 'analyze_proposal';
  }

  private extractTextFromMcpResult(result: unknown): string {
    const content = (result as any)?.content;
    if (Array.isArray(content)) {
      return content.map((c: any) => c.text ?? '').join('\n');
    }
    return JSON.stringify(result);
  }

  /**
   * Format orchestration response
   */
  private formatOrchestrationResponse(
    description: string,
    result: OrchestrationResult,
    executionMode: string
  ): string {
    return `🎯 Orchestration Complete: "${description}"

**Session ID:** ${result.sessionId}
**Success:** ${result.success ? '✅ COMPLETED' : '❌ FAILED'}
**Duration:** ${result.duration}ms
**Tasks:** ${result.completedTasks + result.failedTasks + (result.deferredTasks ?? 0)} total
  - ✅ Completed: ${result.completedTasks}
  - ❌ Failed: ${result.failedTasks}
  - ⏸ Deferred (host delegation required): ${result.deferredTasks ?? 0}

**Agent Utilization:**
${Object.entries(result.agentUtilization)
  .map(([agent, count]) => `• ${agent}: ${count} tasks`)
  .join('\n')}

${result.bottlenecks.length > 0 ? `**Bottlenecks Detected:**\n${result.bottlenecks.map((b) => `• 🚧 ${b}`).join('\n')}\n` : ''}
**Recommendations:**
${result.recommendations.length > 0 ? result.recommendations.map((r) => `• 💡 ${r}`).join('\n') : 'No recommendations'}

**Execution Mode:** ${executionMode}
**Status:** ${result.success ? '🟢 SUCCESS' : '🔴 ISSUES DETECTED'}

${result.agentOutputs && Object.keys(result.agentOutputs).length > 0 
  ? `**Agent Outputs (real MCP responses):**\n${Object.entries(result.agentOutputs).map(([k, v]) => `• ${k}: ${v.substring(0, 200)}${v.length > 200 ? '...' : ''}`).join('\n')}\n`
  : ''}`;
  }
}
