/**
 * Complexity Handler
 *
 * Handles complexity analysis requests
 */
import { frameworkLogger } from '../../../core/framework-logger.js';
import { getExecutionPlanner } from '../execution/execution-planner.js';
/**
 * Complexity Handler
 * Processes analyze-complexity requests
 */
export class ComplexityHandler {
    planner = getExecutionPlanner();
    /**
     * Handle analyze-complexity request
     */
    async handleAnalyzeComplexity(args) {
        const { tasks = [] } = args;
        await frameworkLogger.log('orchestrator.server', 'analyze-complexity-start', 'info', { taskCount: tasks.length });
        try {
            const analysis = await this.planner.analyzeTaskComplexity(tasks);
            const recommendations = this.generateRecommendations(analysis);
            return {
                content: [
                    {
                        type: 'text',
                        text: this.formatComplexityResponse(analysis, recommendations, tasks.length),
                    },
                ],
            };
        }
        catch (error) {
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
    generateRecommendations(analysis) {
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
    formatComplexityResponse(analysis, recommendations, taskCount) {
        return `🔍 Complexity Analysis Results

**Tasks Analyzed:** ${taskCount}
**Overall Complexity:** ${analysis.overallComplexity}/100
**Recommended Strategy:** ${analysis.recommendedStrategy}

**Complexity Breakdown:**
${analysis.taskComplexity
            .map((task, index) => `• Task ${index + 1}: ${task.complexity}/100 (${task.category})`)
            .join('\n')}

**Agent Assignments:**
${analysis.agentAssignments
            .map((assignment) => `• ${assignment.agent}: ${assignment.taskCount} tasks (${assignment.utilization}%)`)
            .join('\n')}

**Recommendations:**
${recommendations.map((r) => `• 💡 ${r}`).join('\n')}

**Execution Estimate:** ${analysis.estimatedDuration}ms
**Parallel Potential:** ${Math.round(analysis.parallelPotential * 100)}%`;
    }
}
//# sourceMappingURL=complexity-handler.js.map