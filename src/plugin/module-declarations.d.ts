import type { FeaturesConfig } from "../../dist/core/features-config.js";
import type { TaskType } from "../../dist/core/features-config.js";

declare module "../../dist/core/features-config.js" {
  export function featuresConfigLoader(): FeaturesConfigLoaderInstance;
  export function detectTaskType(toolName: string, context?: { fileCount?: number; isComplex?: boolean }): TaskType;
}

declare module "../../node_modules/strray-ai/dist/core/features-config.js" {
  export function featuresConfigLoader(): FeaturesConfigLoaderInstance;
  export function detectTaskType(toolName: string, context?: { fileCount?: number; isComplex?: boolean }): TaskType;
}

interface FeaturesConfigLoaderInstance {
  loadConfig(): FeaturesConfig;
  getModelForTask(taskType: TaskType): string | undefined;
  isFeatureEnabled(feature: string): boolean;
}