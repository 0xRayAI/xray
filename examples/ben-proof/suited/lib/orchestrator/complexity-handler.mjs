/**
 * Complexity intake — ported from xray complexity-handler.ts (normalizeAnalyzeTasks + recommendations).
 */
import { getExecutionPlanner } from '../processors/execution-planner.mjs';

export function normalizeAnalyzeTasks(raw) {
  return (raw ?? []).map((task, index) => {
    let deps;
    if (Array.isArray(task.dependencies)) deps = task.dependencies;
    else if (typeof task.dependencies === 'number' && Number.isFinite(task.dependencies)) deps = task.dependencies;
    else if (typeof task.dependencyCount === 'number' && Number.isFinite(task.dependencyCount)) {
      deps = task.dependencyCount;
    }
    const normalized = {
      id: task.id ?? `task-${index + 1}`,
      description: task.description ?? '',
      type: task.type ?? 'implement',
    };
    if (task.priority) normalized.priority = task.priority;
    if (deps !== undefined) normalized.dependencies = deps;
    if (task.estimatedComplexity !== undefined) normalized.estimatedComplexity = task.estimatedComplexity;
    return normalized;
  });
}

export function generateRecommendations(analysis) {
  const recommendations = [];
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
  for (const assignment of analysis.agentAssignments ?? []) {
    if (assignment.utilization > 80) {
      recommendations.push(
        `${assignment.agent} is at ${assignment.utilization}% utilization - consider adding more agents`,
      );
    }
  }
  if (recommendations.length === 0) recommendations.push('Task distribution looks optimal');
  return recommendations;
}

export async function analyzeComplexityForWear(task, sessionId) {
  const tasks = normalizeAnalyzeTasks([
    { id: `wear:${sessionId}`, description: task, type: 'implementation', priority: 'high' },
  ]);
  const planner = getExecutionPlanner();
  const validation = planner.validateTasks(tasks);
  const analysis = await planner.analyzeTaskComplexity(tasks);
  const recommendations = generateRecommendations(analysis);
  return { tasks, validation, analysis, recommendations };
}

export function formatComplexityReport(analysis, recommendations, taskCount) {
  return [
    'Complexity Analysis Results',
    `Tasks Analyzed: ${taskCount}`,
    `Overall Complexity: ${analysis.overallComplexity}/100`,
    `Recommended Strategy: ${analysis.recommendedStrategy}`,
    'Recommendations:',
    ...recommendations.map((r) => `• ${r}`),
    `Parallel Potential: ${Math.round((analysis.parallelPotential ?? 0) * 100)}%`,
  ].join('\n');
}
