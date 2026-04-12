/**
 * Execution Planner
 *
 * Creates optimized execution plans for orchestration tasks
 */
import type { OrchestrationTask, ExecutionPlan, ComplexityAnalysis, TaskValidation } from '../types.js';
/**
 * Execution Planner
 * Plans and optimizes task execution strategies
 */
export declare class ExecutionPlanner {
    private capabilitiesManager;
    /**
     * Validate a list of tasks
     */
    validateTasks(tasks: OrchestrationTask[]): TaskValidation;
    /**
     * Create an execution plan based on tasks and mode
     */
    createExecutionPlan(tasks: OrchestrationTask[], executionMode: string): Promise<ExecutionPlan>;
    /**
     * Create a parallel execution plan
     */
    private createParallelPlan;
    /**
     * Create a sequential execution plan
     */
    private createSequentialPlan;
    /**
     * Create an optimized execution plan considering dependencies and complexity
     */
    private createOptimizedPlan;
    /**
     * Sort tasks by their dependencies
     */
    private sortByDependencies;
    /**
     * Assign tasks to agents based on capability
     */
    private assignTasksToAgents;
    /**
     * Estimate execution duration based on agent assignments
     */
    estimateExecutionDuration(agentAssignments: Map<string, OrchestrationTask[]>): number;
    /**
     * Analyze task complexity
     */
    analyzeTaskComplexity(tasks: OrchestrationTask[]): Promise<ComplexityAnalysis>;
    /**
     * Calculate complexity for a single task
     */
    calculateTaskComplexity(task: OrchestrationTask): number;
    /**
     * Recommend execution strategy based on complexity and task count
     */
    private recommendStrategy;
    /**
     * Calculate parallel execution potential
     */
    private calculateParallelPotential;
}
export declare function getExecutionPlanner(): ExecutionPlanner;
//# sourceMappingURL=execution-planner.d.ts.map