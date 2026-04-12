/**
 * Status Handler
 *
 * Handles orchestration status requests
 */
import { frameworkLogger } from '../../../core/framework-logger.js';
/**
 * Status Handler
 * Processes get-orchestration-status requests
 */
export class StatusHandler {
    /**
     * Handle get-orchestration-status request
     */
    async handleGetOrchestrationStatus(args, deps) {
        const { sessionId, detailed = false } = args;
        await frameworkLogger.log('orchestrator.server', 'get-status-start', 'info', { sessionId, detailed });
        try {
            let status;
            if (sessionId) {
                status = deps.activeTasks.get(sessionId);
                if (!status) {
                    // Check history
                    const historyItem = deps.taskHistory.find((h) => h.sessionId === sessionId);
                    if (historyItem) {
                        status = { completed: true, ...historyItem.result };
                    }
                    else {
                        return {
                            content: [
                                {
                                    type: 'text',
                                    text: `❌ Session not found: ${sessionId}`,
                                },
                            ],
                        };
                    }
                }
            }
            else {
                // Overall status
                status = this.getOverallStatus(deps);
            }
            const response = this.formatStatusResponse(status, detailed);
            return { content: [{ type: 'text', text: response }] };
        }
        catch (error) {
            return {
                content: [
                    {
                        type: 'text',
                        text: `❌ Status check failed: ${error instanceof Error ? error.message : String(error)}`,
                    },
                ],
            };
        }
    }
    /**
     * Handle cancel-orchestration request
     */
    async handleCancelOrchestration(args, deps) {
        const { sessionId, taskId, force = false } = args;
        await frameworkLogger.log('orchestrator.server', 'cancel-orchestration-start', 'info', { sessionId, taskId, force });
        try {
            if (!sessionId) {
                return {
                    content: [
                        {
                            type: 'text',
                            text: '❌ sessionId is required for cancellation',
                        },
                    ],
                };
            }
            // Check if session exists
            const existingTask = deps.activeTasks.get(sessionId);
            if (!existingTask) {
                // Check history
                const historyItem = deps.taskHistory.find((h) => h.sessionId === sessionId);
                if (historyItem) {
                    return {
                        content: [
                            {
                                type: 'text',
                                text: `❌ Session already completed: ${sessionId}`,
                            },
                        ],
                    };
                }
                return {
                    content: [
                        {
                            type: 'text',
                            text: `❌ Session not found: ${sessionId}`,
                        },
                    ],
                };
            }
            // Cancel the session
            deps.activeTasks.delete(sessionId);
            return {
                content: [
                    {
                        type: 'text',
                        text: `✅ Orchestration cancelled: ${sessionId}${taskId ? ` (task: ${taskId})` : ''}`,
                    },
                ],
            };
        }
        catch (error) {
            return {
                content: [
                    {
                        type: 'text',
                        text: `❌ Cancellation failed: ${error instanceof Error ? error.message : String(error)}`,
                    },
                ],
            };
        }
    }
    /**
     * Handle optimize-orchestration request
     */
    async handleOptimizeOrchestration(args) {
        const { history = true, recommendations = true } = args;
        await frameworkLogger.log('orchestrator.server', 'optimize-orchestration-start', 'info', { history, recommendations });
        try {
            const optimizations = [];
            if (recommendations) {
                optimizations.push('Consider using "optimized" execution mode for most workflows');
                optimizations.push('Batch similar tasks together for better agent utilization');
                optimizations.push('Monitor agent utilization and adjust concurrent task limits');
            }
            if (history) {
                optimizations.push('Review historical data to identify recurring patterns');
                optimizations.push('Use complexity analysis to pre-plan task distribution');
            }
            return {
                content: [
                    {
                        type: 'text',
                        text: `🔧 Orchestration Optimization Results

**Optimizations Available:**
${optimizations.map((o) => `• ${o}`).join('\n')}

**Current Best Practices:**
• Use "optimized" mode for mixed task types
• Set appropriate timeouts based on task complexity
• Monitor bottleneck agents and redistribute load
• Leverage task dependencies for correct execution order`,
                    },
                ],
            };
        }
        catch (error) {
            return {
                content: [
                    {
                        type: 'text',
                        text: `❌ Optimization failed: ${error instanceof Error ? error.message : String(error)}`,
                    },
                ],
            };
        }
    }
    /**
     * Get overall orchestration status
     */
    getOverallStatus(deps) {
        const agentUtilization = {};
        // Aggregate from active tasks
        for (const [, task] of deps.activeTasks) {
            const taskAny = task;
            if (taskAny.agentUtilization) {
                const util = taskAny.agentUtilization;
                for (const [agent, count] of Object.entries(util)) {
                    agentUtilization[agent] = (agentUtilization[agent] || 0) + count;
                }
            }
        }
        // Get recent sessions from history
        const recentSessions = deps.taskHistory
            .slice(-10)
            .map((h) => ({
            sessionId: h.sessionId,
            status: 'completed',
            tasks: h.tasks,
            duration: h.result.duration,
        }));
        return {
            activeSessions: deps.activeTasks.size,
            totalTasks: deps.taskHistory.reduce((sum, h) => sum + h.tasks, 0),
            agentUtilization,
            recentSessions,
        };
    }
    /**
     * Format status response
     */
    formatStatusResponse(status, detailed) {
        const statusAny = status;
        // Check if it's a completed session
        if (statusAny.completed) {
            const result = statusAny;
            return `📊 Session Status: COMPLETED

**Success:** ${result.success ? '✅ Yes' : '❌ No'}
**Duration:** ${result.duration}ms
**Tasks:** ${result.completedTasks + result.failedTasks} (${result.completedTasks} ✅, ${result.failedTasks} ❌)`;
        }
        // Overall status
        const orchStatus = status;
        let response = `📊 Orchestration Status

**Active Sessions:** ${orchStatus.activeSessions}
**Total Tasks Executed:** ${orchStatus.totalTasks}`;
        if (Object.keys(orchStatus.agentUtilization).length > 0) {
            response += `\n\n**Agent Utilization:**`;
            for (const [agent, count] of Object.entries(orchStatus.agentUtilization)) {
                response += `\n• ${agent}: ${count} tasks`;
            }
        }
        if (detailed && orchStatus.recentSessions.length > 0) {
            response += `\n\n**Recent Sessions:**`;
            for (const session of orchStatus.recentSessions) {
                response += `\n• ${session.sessionId}: ${session.tasks} tasks, ${session.duration}ms`;
            }
        }
        return response;
    }
}
//# sourceMappingURL=status-handler.js.map