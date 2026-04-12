/**
 * Task Handler
 *
 * Handles task orchestration requests
 */
import type { OrchestrationResult, OrchestrationTask } from '../types.js';
export interface TaskHandlerDeps {
    taskHistory: OrchestrationHistoryItem[];
    activeTasks: Map<string, unknown>;
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
export declare class TaskHandler {
    private planner;
    /**
     * Handle orchestrate-task request
     */
    handleOrchestrateTask(args: {
        description: string;
        tasks?: OrchestrationTask[];
        sessionId?: string;
        executionMode?: string;
        timeout?: number;
    }, deps: TaskHandlerDeps): Promise<{
        content: Array<{
            type: string;
            text: string;
        }>;
    }>;
    /**
     * Execute the orchestration plan (simulated for MCP)
     */
    private executePlan;
    /**
     * Format orchestration response
     */
    private formatOrchestrationResponse;
}
export {};
//# sourceMappingURL=task-handler.d.ts.map