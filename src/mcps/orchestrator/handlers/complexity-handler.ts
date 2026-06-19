/**
 * Complexity Handler
 * 
 * Handles complexity analysis requests
 */

import { frameworkLogger } from '../../../core/framework-logger.js';
import {
  buildLeadDevPlan,
  isLeadDevModeActive,
  persistLeadDevPlan,
} from '../../../nucleus/autonomy-kernel.js';
import { bindPlanToSession } from '../../../nucleus/lead-dev-plan-persistence.js';
import { clearPendingDelegations } from '../../../nucleus/pending-delegations.js';
import { getExecutionPlanner } from '../execution/execution-planner.js';
import { addObservations, extractComplexityObservations } from '../aside-context.js';
import type { OrchestrationTask, ComplexityAnalysis } from '../types.js';

type AnalyzeComplexityInput = {
  id?: string;
  description?: string;
  type?: string;
  files?: string[];
  dependencyCount?: number;
  dependencies?: string[] | number;
  riskLevel?: string;
  estimatedComplexity?: number;
  priority?: OrchestrationTask['priority'];
};

function normalizeAnalyzeTasks(raw: AnalyzeComplexityInput[]): OrchestrationTask[] {
  return raw.map((task, index) => {
    let deps: OrchestrationTask['dependencies'];
    if (Array.isArray(task.dependencies)) {
      deps = task.dependencies;
    } else if (typeof task.dependencies === 'number' && Number.isFinite(task.dependencies)) {
      deps = task.dependencies;
    } else if (
      typeof task.dependencyCount === 'number' &&
      Number.isFinite(task.dependencyCount)
    ) {
      deps = task.dependencyCount;
    }

    const normalized: OrchestrationTask = {
      id: task.id ?? `task-${index + 1}`,
      description: task.description ?? '',
      type: task.type ?? 'implement',
    };
    if (task.priority) normalized.priority = task.priority;
    if (deps !== undefined) normalized.dependencies = deps;
    if (task.estimatedComplexity !== undefined) {
      normalized.estimatedComplexity = task.estimatedComplexity;
    }
    return normalized;
  });
}

/**
 * Complexity Handler
 * Processes analyze-complexity requests
 */
export class ComplexityHandler {
  private planner = getExecutionPlanner();

  /**
   * Handle analyze-complexity request
   */
  async handleAnalyzeComplexity(
    args: { tasks: AnalyzeComplexityInput[]; sessionId?: string },
    asideId?: string,
  ): Promise<{ content: Array<{ type: string; text: string }> }> {
    const tasks = normalizeAnalyzeTasks(args.tasks ?? []);

    await frameworkLogger.log(
      'orchestrator.server',
      'analyze-complexity-start',
      'info',
      { taskCount: tasks.length }
    );

    try {
      const analysis = await this.planner.analyzeTaskComplexity(tasks);
      const recommendations = this.generateRecommendations(analysis);

      if (asideId) {
        addObservations(asideId, extractComplexityObservations(analysis));
      }

      const primaryDescription = tasks.map((t) => t.description).filter(Boolean).join(' ');
      const taskTypes = tasks.map((t) => t.type).filter(Boolean) as string[];
      const planTaskInputs = tasks
        .filter((t) => t.description?.trim())
        .map((t) => ({ description: t.description, type: t.type }));
      const leadDevPlan =
        isLeadDevModeActive() && (primaryDescription || planTaskInputs.length > 0)
          ? buildLeadDevPlan(
              primaryDescription,
              taskTypes.length ? taskTypes : ['implement'],
              planTaskInputs,
              analysis.overallComplexity,
            )
          : null;

      if (leadDevPlan) {
        try {
          const sessionId = args.sessionId ?? `analyze-${Date.now()}`;
          clearPendingDelegations();
          const planPath = persistLeadDevPlan(leadDevPlan);
          const bound = bindPlanToSession(sessionId);
          await frameworkLogger.log(
            'orchestrator.server',
            'lead-dev-plan-persisted',
            'info',
            {
              planPath,
              sessionId,
              planGeneration: bound?.planGeneration,
              phaseCount: leadDevPlan.phases.length,
              todoCount: leadDevPlan.phases.reduce((n, p) => n + p.todos.length, 0),
            },
          );
        } catch (err) {
          await frameworkLogger.log(
            'orchestrator.server',
            'lead-dev-plan-persist-failed',
            'warning',
            { error: err instanceof Error ? err.message : String(err) },
          );
        }
      }

      return {
        content: [
          {
            type: 'text',
            text: this.formatComplexityResponse(
              analysis,
              recommendations,
              tasks.length,
              leadDevPlan,
            ),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `❌ Complexity analysis failed: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
      };
    }
  }

  /**
   * Generate recommendations based on complexity analysis
   */
  private generateRecommendations(analysis: ComplexityAnalysis): string[] {
    const recommendations: string[] = [];

    if (analysis.overallComplexity > 70) {
      recommendations.push('Consider breaking down complex tasks into smaller subtasks');
      recommendations.push('Use sequential execution mode for high-complexity workflows');
    }

    if (analysis.parallelPotential > 0.7) {
      recommendations.push('High parallel potential - consider parallel execution mode');
    }

    if (analysis.parallelPotential < 0.3) {
      recommendations.push('Many dependencies - sequential or optimized mode recommended');
    }

    for (const assignment of analysis.agentAssignments) {
      if (assignment.utilization > 80) {
        recommendations.push(`${assignment.agent} is at ${assignment.utilization}% utilization - consider adding more agents`);
      }
    }

    if (recommendations.length === 0) {
      recommendations.push('Task distribution looks optimal');
    }

    return recommendations;
  }

  /**
   * Format complexity response
   */
  private formatComplexityResponse(
    analysis: ComplexityAnalysis,
    recommendations: string[],
    taskCount: number,
    leadDevPlan: ReturnType<typeof buildLeadDevPlan> = null,
  ): string {
    const leadDevSection = leadDevPlan
      ? `

**Lead-dev plan (codex ${leadDevPlan.codexTerms.join(', ')}):**
${leadDevPlan.phases
  .map(
    (p) =>
      `### ${p.id} — ${p.name}\n${p.todos
        .map((t) => `- [ ] ${t.id} (${t.subagent}): ${t.task}`)
        .join('\n')}`,
  )
  .join('\n\n')}

**Test protocol:** ${leadDevPlan.testProtocol.hint}

\`\`\`json
${JSON.stringify(leadDevPlan, null, 2)}
\`\`\``
      : '';

    return `🔍 Complexity Analysis Results

**Tasks Analyzed:** ${taskCount}
**Overall Complexity:** ${analysis.overallComplexity}/100
**Recommended Strategy:** ${analysis.recommendedStrategy}

**Complexity Breakdown:**
${analysis.taskComplexity
  .map(
    (task, index) =>
      `• Task ${index + 1}: ${task.complexity}/100 (${task.category})`
  )
  .join('\n')}

**Agent Assignments:**
${analysis.agentAssignments
  .map(
    (assignment) =>
      `• ${assignment.agent}: ${assignment.taskCount} tasks (${assignment.utilization}%)`
  )
  .join('\n')}

**Recommendations:**
${recommendations.map((r) => `• 💡 ${r}`).join('\n')}

**Execution Estimate:** ${analysis.estimatedDuration}ms
**Parallel Potential:** ${Math.round(analysis.parallelPotential * 100)}%${leadDevSection}`;
  }
}
