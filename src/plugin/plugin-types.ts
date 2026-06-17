import type { ProcessorConfig, ProcessorResult } from "../processors/processor-manager.js";
import type { ProcessorContext } from "../processors/processor-types.js";
import type { StateManager } from "../state/state-manager.js";
import type { FeaturesConfig, TaskType } from "../core/features-config.js";
import type { RuleValidationContext } from "../enforcement/types.js";

export type {
  ProcessorConfig, ProcessorResult,
  ProcessorContext,
  StateManager,
  FeaturesConfig, TaskType,
  RuleValidationContext,
};

export interface FrameworkLoggerLike {
  log(module: string, event: string, status: string, data?: Record<string, string | number | boolean>): void;
}

export interface ProcessorRegistrationConfig {
  name: string;
  type: "pre" | "post";
  priority: number;
  enabled: boolean;
}

export interface PreProcessorInput {
  tool?: string;
  args?: unknown;
  context?: unknown;
}

export interface PreProcessorContext {
  filePath?: string;
  operation?: string;
  content?: string;
  directory?: string;
  tool?: string;
}

export interface PreProcessorResult {
  success: boolean;
  results: ProcessorResult[];
}

export interface StateManagerLike {
  get<T>(key: string): T | undefined;
  set<T>(key: string, value: T): void;
}

export interface FeaturesConfigLoaderLike {
  loadConfig(): FeaturesConfig;
}

export type ResolveCodexPathFn = (root: string) => string[];
export type ResolveStateDirFn = (projectRoot?: string) => string;
export type SystemPromptGeneratorFn = (config: SystemPromptConfigLike) => Promise<string>;

export interface SystemPromptConfigLike {
  showWelcomeBanner?: boolean;
  showCodexContext?: boolean;
  enableTokenOptimization?: boolean;
  maxTokenBudget?: number;
  showCriticalTermsOnly?: boolean;
  showEssentialLinks?: boolean;
}

export interface ToolExecuteAfterInput {
  tool: string;
  args?: ToolArguments;
  result?: ToolResult;
}

export interface ToolExecuteBeforeOutput {
  model?: string;
}

export interface ToolArguments {
  content?: string;
  filePath?: string;
  command?: string;
  prompt?: string;
  message?: string;
  directory?: string;
  replace?: boolean;
}

export interface ToolResult {
  success?: boolean;
  error?: string;
  content?: string;
}

export interface ProcessorManagerLike {
  registerProcessor(config: ProcessorConfig): void;
  executePreProcessors(input: PreProcessorInput): Promise<PreProcessorResult>;
  executePostProcessors(operation: string, data: ProcessorContext, preResults: ProcessorResult[]): Promise<ProcessorResult[]>;
}

export type DetectTaskTypeFn = (toolName: string, context?: { fileCount?: number; isComplex?: boolean }) => TaskType;

export type ModuleWithProcessorManager = { ProcessorManager: new (sm: StateManagerLike) => ProcessorManagerLike };
export type ModuleWithStateManager = { XrayStateManager: new (persistencePath?: string) => StateManagerLike };
export type ModuleWithFeaturesConfig = { featuresConfigLoader: FeaturesConfigLoaderLike; detectTaskType: DetectTaskTypeFn };
export type ModuleWithSystemPrompt = { generateLeanSystemPrompt: SystemPromptGeneratorFn };
