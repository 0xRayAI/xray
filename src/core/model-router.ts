/**
 * Model Router
 *
 * Intelligent model routing based on task complexity and type.
 * Uses featuresConfigLoader as the single source of truth for all model config.
 *
 * @since 2026-01-25
 */

import {
  featuresConfigLoader,
  detectTaskType,
  type TaskType,
} from "./features-config.js";

// ============================================================================
// Types
// ============================================================================

interface TaskContext {
  toolName?: string;
  fileCount?: number;
  isComplex?: boolean;
  agentType?: string;
}

// ============================================================================
// Model Router Class
// ============================================================================

class ModelRouter {
  private availableModels: string[];

  constructor() {
    this.availableModels = this.discoverModels();
  }

  private discoverModels(): string[] {
    const defaultModels = [
      "claude-opus-4",
      "claude-sonnet-4",
      "claude-haiku-4",
      "openai/gpt-4o",
      "openai/gpt-4o-mini",
      "google/gemini-pro-1.5",
      "google/gemini-flash-1.5",
      "meta/llama-3.1-70b-instruct",
      "mistral/mistral-7b-instruct",
    ];

    const featuresConfig = featuresConfigLoader.loadConfig();
    const configModels: string[] = [];
    if (featuresConfig.model_routing?.task_routing) {
      for (const route of Object.values(featuresConfig.model_routing.task_routing)) {
        if (route?.model && !configModels.includes(route.model)) {
          configModels.push(route.model);
        }
      }
    }
    const uniqueModels = new Set([...defaultModels, ...configModels]);
    return Array.from(uniqueModels);
  }

  /**
   * Get the appropriate model for a specific task context
   * Uses features-config for task-based routing when available
   */
  getModelForTask(context: TaskContext): string {
    const featuresConfig = featuresConfigLoader.loadConfig();

    if (featuresConfig.model_routing.enabled && context.toolName) {
      const taskContext: { fileCount?: number; isComplex?: boolean } = {};
      if (context.fileCount !== undefined)
        taskContext.fileCount = context.fileCount;
      if (context.isComplex !== undefined)
        taskContext.isComplex = context.isComplex;

      const taskType = detectTaskType(context.toolName, taskContext);

      if (taskType !== "unknown") {
        const model = featuresConfigLoader.getModelForTask(taskType);
        if (this.isModelAvailable(model)) {
          return model;
        }
      }
    }

    // Fall back to agent-specific routing
    if (context.agentType) {
      return this.getValidatedModel(context.agentType);
    }

    return this.getValidatedModel();
  }

  /**
   * Get validated model for agent type
   */
  getValidatedModel(agentType?: string): string {
    const featuresConfig = featuresConfigLoader.loadConfig();

    // 1. Check features config for agent-specific model
    if (agentType) {
      const agentModel =
        featuresConfig.agent_management?.agent_models?.[agentType];
      if (agentModel && this.isModelAvailable(agentModel)) {
        return agentModel;
      }
    }

    // 2. Framework default from features config
    const defaultModel = featuresConfig.model_routing?.default_model;
    if (defaultModel && this.isModelAvailable(defaultModel)) {
      return defaultModel;
    }

    // 3. Hardcoded default
    if (this.isModelAvailable("claude-sonnet-4")) {
      return "claude-sonnet-4";
    }

    // 4. Ultimate fallback
    const fallbackModel =
      featuresConfig.model_routing?.fallback_model || "claude-haiku-4";
    return fallbackModel;
  }

  /**
   * Get model for a specific task type directly
   */
  getModelForTaskType(taskType: TaskType): string {
    return featuresConfigLoader.getModelForTask(taskType);
  }

  /**
   * Get max tokens for a task type
   */
  getMaxTokensForTaskType(taskType: TaskType): number {
    return featuresConfigLoader.getMaxTokensForTask(taskType);
  }

  private isModelAvailable(_model: string): boolean {
    return true;
  }

  /**
   * Reload configuration from disk
   */
  reloadConfig(): void {
    featuresConfigLoader.clearCache();
    this.availableModels = this.discoverModels();
  }

  /**
   * Get current configuration summary
   */
  getConfigSummary(): {
    defaultModel: string;
    fallbackModel: string;
    taskRoutingEnabled: boolean;
    availableModels: string[];
  } {
    const featuresConfig = featuresConfigLoader.loadConfig();
    return {
      defaultModel:
        featuresConfig.model_routing?.default_model || "claude-sonnet-4",
      fallbackModel:
        featuresConfig.model_routing?.fallback_model || "claude-haiku-4",
      taskRoutingEnabled: featuresConfig.model_routing?.enabled || false,
      availableModels: this.availableModels,
    };
  }
}

// Export singleton instance
export const modelRouter = new ModelRouter();
export default modelRouter;

// Export convenience functions
export const getModelForTask = (context: TaskContext) =>
  modelRouter.getModelForTask(context);

export const getModelForTaskType = (taskType: TaskType) =>
  modelRouter.getModelForTaskType(taskType);

export const getValidatedModel = (agentType?: string) =>
  modelRouter.getValidatedModel(agentType);