/**
 * Status Handler — ported from xray src/mcps/orchestrator/handlers/status-handler.ts
 */

export class StatusHandler {
  async handleGetOrchestrationStatus(args, deps) {
    const { sessionId, detailed = false } = args;
    try {
      let status;
      if (sessionId) {
        status = deps.activeTasks.get(sessionId);
        if (!status) {
          const historyItem = deps.taskHistory.find((h) => h.sessionId === sessionId);
          if (historyItem) {
            status = { completed: true, ...historyItem.result };
          } else {
            return { content: [{ type: 'text', text: `❌ Session not found: ${sessionId}` }] };
          }
        }
      } else {
        status = this.getOverallStatus(deps);
      }
      let response = this.formatStatusResponse(status, detailed);
      if (detailed && deps.asideCount !== undefined) {
        response += `\n\n**Active Aside Contexts:**`;
        response += `\n• Count: ${deps.asideCount}`;
        if (deps.asideIds && deps.asideIds.length > 0) {
          response += `\n• IDs: ${deps.asideIds.join(', ')}`;
        }
      }
      return { content: [{ type: 'text', text: response }] };
    } catch (error) {
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

  async handleCancelOrchestration(args, deps) {
    const { sessionId, taskId } = args;
    try {
      if (!sessionId) {
        return { content: [{ type: 'text', text: '❌ sessionId is required for cancellation' }] };
      }
      const existingTask = deps.activeTasks.get(sessionId);
      if (!existingTask) {
        const historyItem = deps.taskHistory.find((h) => h.sessionId === sessionId);
        if (historyItem) {
          return { content: [{ type: 'text', text: `❌ Session already completed: ${sessionId}` }] };
        }
        return { content: [{ type: 'text', text: `❌ Session not found: ${sessionId}` }] };
      }
      deps.activeTasks.delete(sessionId);
      return {
        content: [
          {
            type: 'text',
            text: `✅ Orchestration cancelled: ${sessionId}${taskId ? ` (task: ${taskId})` : ''}`,
          },
        ],
      };
    } catch (error) {
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

  async handleOptimizeOrchestration(args) {
    const { history = true, recommendations = true } = args;
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
    } catch (error) {
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

  getOverallStatus(deps) {
    const agentUtilization = {};
    for (const [, task] of deps.activeTasks) {
      const taskAny = task;
      if (taskAny.agentUtilization) {
        const util = taskAny.agentUtilization;
        for (const [agent, count] of Object.entries(util)) {
          agentUtilization[agent] = (agentUtilization[agent] || 0) + count;
        }
      }
    }
    const recentSessions = deps.taskHistory.slice(-10).map((h) => ({
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

  formatStatusResponse(status, detailed) {
    const statusAny = status;
    if (statusAny.completed) {
      const result = statusAny;
      return `📊 Session Status: COMPLETED

**Success:** ${result.success ? '✅ Yes' : '❌ No'}
**Duration:** ${result.duration}ms
**Tasks:** ${result.completedTasks + result.failedTasks} (${result.completedTasks} ✅, ${result.failedTasks} ❌)`;
    }
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

export function createStatusHandlerDepsForWear(sessionId) {
  return {
    activeTasks: new Map(),
    taskHistory: [],
    asideCount: 0,
    asideIds: [],
    wearSessionId: sessionId,
  };
}
