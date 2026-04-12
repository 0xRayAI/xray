/**
 * 0xRay Framework - Core Orchestrator
 * Main orchestration engine for multi-agent task coordination
 */
import { TaskDefinition } from "../agents/types.js";
export interface OrchestrationResult {
    success: boolean;
    taskId: string;
    agentUsed: string;
    duration: number;
    result: any;
    error?: string;
    errors?: string[];
}
export interface OrchestratorConfig {
    maxConcurrentTasks?: number;
    taskTimeout?: number;
    conflictResolutionStrategy?: "majority_vote" | "expert_priority";
}
export declare class KernelOrchestrator {
    private taskQueue;
    private activeTasks;
    private totalProcessed;
    private config;
    private kernel;
    constructor(config?: OrchestratorConfig);
    executeTask(task: TaskDefinition): Promise<OrchestrationResult>;
    /**
     * Execute a single task by delegating to appropriate subagent
     */
    private executeSingleTask;
    private dispatchToAgent;
    executeComplexTask(description: string, tasks: TaskDefinition[], sessionId?: string): Promise<OrchestrationResult[]>;
    private topologicalSort;
    /**
     * Validates that all task dependencies are within the current task batch.
     * Prevents cross-orchestrator dependency errors by failing fast with a clear message.
     */
    private validateTaskDependencies;
    executeComplexTaskSingle(task: TaskDefinition): Promise<OrchestrationResult>;
    resolveConflicts(conflicts: any[]): {
        response: string;
        expertiseScore: number;
    };
    private generateTaskId;
    /**
     * Delegate a task to a specific agent with timeout protection
     */
    delegateToSubagent(agentName: string, task: any): Promise<any>;
    private performDelegation;
    getStatus(): {
        queueSize: number;
        activeTasks: number;
        totalProcessed: number;
        config: {
            maxConcurrentTasks: number;
            taskTimeout: number;
            conflictResolutionStrategy: "majority_vote" | "expert_priority";
        };
    };
}
export declare const strRayOrchestrator: KernelOrchestrator;
//# sourceMappingURL=orchestrator.d.ts.map