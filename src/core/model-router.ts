/**
 * StringRay AI v1.1.1 - Model Router
 *
 * Intelligent model routing based on task complexity and type.
 * Integrates with features-config for task-based model selection.
 *
 * @version 2.0.0
 * @since 2026-01-25
 */

import * as fs from "fs";
import * as path from "path";
import {
  featuresConfigLoader,
  detectTaskType,
  type TaskType,
} from "./features-config";

// ============================================================================
// Types
// ============================================================================

interface ModelConfig {
  model_routing?: Record<string, string>;
  model_default?: string;
  model_fallback?: string;
  available_models?: string[];
  deprecated_models?: string[];
}

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
  private configPath: string;
  private config: ModelConfig;
  private availableModels: string[];

  constructor(configPath?: string) {
    this.configPath =
      configPath ||
      path.resolve(process.cwd(), ".opencode", "oh-my-opencode.json");
    this.config = this.loadConfig();
    this.availableModels = this.discoverModels();
  }

  private loadConfig(): ModelConfig {
    try {
      const configData = fs.readFileSync(this.configPath, "utf8");
      return JSON.parse(configData);
    } catch {
      // Provide defaults if config not found
      return {
        model_routing: {},
        model_default: "claude-sonnet-4",
        model_fallback: "claude-haiku-4",
      };
    }
  }

  private discoverModels(): string[] {
    const defaultModels = [
      // Anthropic Claude models (preferred for StringRay)
      "claude-opus-4",
      "claude-sonnet-4",
      "claude-haiku-4",
      // Legacy model names
      "openrouter/xai-grok-2-1212-fast-1",
      "openai/gpt-4o",
      "openai/gpt-4o-mini",
      "anthropic/claude-3-5-sonnet-20241022",
      "google/gemini-pro-1.5",
      "google/gemini-flash-1.5",
      "meta/llama-3.1-70b-instruct",
      "mistral/mistral-7b-instruct",
    ];

    const configModels = this.config.available_models || [];
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
      if (context.fileCount !== undefined) taskContext.fileCount = context.fileCount;
      if (context.isComplex !== undefined) taskContext.isComplex = context.isComplex;
      
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
   * Get validated model for agent type (legacy method)
   */
  getValidatedModel(agentType?: string): string {
    // 1. User preference (future enhancement)
    const userModel = this.getUserPreference();
    if (userModel && this.isModelAvailable(userModel)) {
      return userModel;
    }

    // 2. Check features config for agent-specific model
    if (agentType) {
      const featuresConfig = featuresConfigLoader.loadConfig();
      const agentModel = featuresConfig.agent_management.agent_models[agentType];
      if (agentModel && this.isModelAvailable(agentModel)) {
        return agentModel;
      }

      // Fall back to oh-my-opencode.json model routing
      if (this.config.model_routing?.[agentType]) {
        const configModel = this.config.model_routing[agentType];
        if (this.isModelAvailable(configModel)) {
          return configModel;
        }
      }
    }

    // 3. Framework default from features config
    const featuresConfig = featuresConfigLoader.loadConfig();
    const defaultModel = featuresConfig.model_routing.default_model;
    if (this.isModelAvailable(defaultModel)) {
      return defaultModel;
    }

    // 4. Legacy default
    const legacyDefault =
      this.config.model_default || "claude-sonnet-4";
    if (this.isModelAvailable(legacyDefault)) {
      return legacyDefault;
    }

    // 5. Ultimate fallback
    const fallbackModel =
      featuresConfig.model_routing.fallback_model ||
      this.config.model_fallback ||
      "claude-haiku-4";
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

  private getUserPreference(): string | null {
    // Check for user-specific config (future enhancement)
    return null;
  }

  private isModelAvailable(model: string): boolean {
    if (this.config.deprecated_models?.includes(model)) {
      return false;
    }
    // For now, accept all models - the API will validate
    return true;
  }

  /**
   * Reload configuration from disk
   */
  reloadConfig(): void {
    this.config = this.loadConfig();
    this.availableModels = this.discoverModels();
    featuresConfigLoader.clearCache();
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
      defaultModel: featuresConfig.model_routing.default_model,
      fallbackModel: featuresConfig.model_routing.fallback_model,
      taskRoutingEnabled: featuresConfig.model_routing.enabled,
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
