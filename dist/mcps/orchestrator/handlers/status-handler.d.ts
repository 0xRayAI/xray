/**
 * Status Handler
 *
 * Handles orchestration status requests
 */
import type { OrchestrationResult } from '../types.js';
interface HistoryItem {
    sessionId: string;
    description: string;
    tasks: number;
    result: OrchestrationResult;
    timestamp: string;
}
interface StatusHandlerDeps {
    activeTasks: Map<string, unknown>;
    taskHistory: HistoryItem[];
}
/**
 * Status Handler
 * Processes get-orchestration-status requests
 */
export declare class StatusHandler {
    /**
     * Handle get-orchestration-status request
     */
    handleGetOrchestrationStatus(args: {
        sessionId?: string;
        detailed?: boolean;
    }, deps: StatusHandlerDeps): Promise<{
        content: Array<{
            type: string;
            text: string;
        }>;
    }>;
    /**
     * Handle cancel-orchestration request
     */
    handleCancelOrchestration(args: {
        sessionId?: string;
        taskId?: string;
        force?: boolean;
    }, deps: StatusHandlerDeps): Promise<{
        content: Array<{
            type: string;
            text: string;
        }>;
    }>;
    /**
     * Handle optimize-orchestration request
     */
    handleOptimizeOrchestration(args: {
        history?: boolean;
        recommendations?: boolean;
    }): Promise<{
        content: Array<{
            type: string;
            text: string;
        }>;
    }>;
    /**
     * Get overall orchestration status
     */
    private getOverallStatus;
    /**
     * Format status response
     */
    private formatStatusResponse;
}
export {};
//# sourceMappingURL=status-handler.d.ts.map