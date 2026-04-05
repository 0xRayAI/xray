/**
 * Model Router
 *
 * Intelligent model routing based on task complexity and type.
 * Integrates with features-config for task-based model selection.
 *
 * @version 2.0.0
 * @since 2026-01-25
 */
import { type TaskType } from "./features-config.js";
interface TaskContext {
    toolName?: string;
    fileCount?: number;
    isComplex?: boolean;
    agentType?: string;
}
declare class ModelRouter {
    private configPath;
    private config;
    private availableModels;
    constructor(configPath?: string);
    private loadConfig;
    private discoverModels;
    /**
     * Get the appropriate model for a specific task context
     * Uses features-config for task-based routing when available
     */
    getModelForTask(context: TaskContext): string;
    /**
     * Get validated model for agent type (legacy method)
     */
    getValidatedModel(agentType?: string): string;
    /**
     * Get model for a specific task type directly
     */
    getModelForTaskType(taskType: TaskType): string;
    /**
     * Get max tokens for a task type
     */
    getMaxTokensForTaskType(taskType: TaskType): number;
    private getUserPreference;
    private isModelAvailable;
    /**
     * Reload configuration from disk
     */
    reloadConfig(): void;
    /**
     * Get current configuration summary
     */
    getConfigSummary(): {
        defaultModel: string;
        fallbackModel: string;
        taskRoutingEnabled: boolean;
        availableModels: string[];
    };
}
export declare const modelRouter: ModelRouter;
export default modelRouter;
export declare const getModelForTask: (context: TaskContext) => string;
export declare const getModelForTaskType: (taskType: TaskType) => string;
export declare const getValidatedModel: (agentType?: string) => string;
//# sourceMappingURL=model-router.d.ts.map