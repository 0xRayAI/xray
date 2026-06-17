/**
 * Task-Skill Router TypeScript Definitions
 *
 * Pre-processor utility for intelligent task-to-agent/skill routing.
 * Complements the AgentDelegator by providing keyword-based preprocessing.
 *
 * @since 2026-02-22
 */

import { XrayStateManager } from "../state/state-manager.js";

/**
 * Routing result interface
 */
export interface RoutingResult {
  skill: string;
  agent: string;
  confidence: number;
  matchedKeyword?: string;
  fromHistory?: boolean;
  reason?: string;
  operation?: string;
  context?: Record<string, unknown>;
}

/**
 * Routing options
 */
export interface RoutingOptions {
  complexity?: number;
  taskId?: string;
  useHistoricalData?: boolean;
  sessionId?: string;
  stateManager?: XrayStateManager;
}

/**
 * Preprocess result for AgentDelegator integration
 */
export interface PreprocessResult {
  operation: string;
  context: Record<string, unknown>;
  routing: RoutingResult;
}

/**
 * Keyword mapping entry
 */
export interface KeywordMapping {
  keywords: string[];
  skill: string;
  agent: string;
  confidence: number;
}

/**
 * Routing statistics entry
 */
export interface RoutingStatsEntry {
  attempts: number;
  successes: number;
  successRate: number;
}

/**
 * TaskSkillRouter class
 * Provides intelligent routing based on keywords, history, and complexity
 * Designed as a PRE-PROCESSOR to AgentDelegator, not a replacement
 */
export class TaskSkillRouter {
  /**
   * Create a new TaskSkillRouter
   */
  constructor(stateManager?: XrayStateManager);

  /**
   * Set state manager after construction
   */
  setStateManager(stateManager: XrayStateManager): void;

  /**
   * Pre-process a task description to extract operation and context
   * This is the main integration point with AgentDelegator
   */
  preprocess(
    taskDescription: string,
    options?: RoutingOptions,
  ): PreprocessResult;

  /**
   * Route a task to the appropriate agent and skill
   */
  routeTask(taskDescription: string, options?: RoutingOptions): RoutingResult;

  /**
   * Get the skill name for a given agent
   */
  getSkillForAgent(agent: string): string;

  /**
   * Track routing result for learning
   */
  trackResult(taskId: string, agent: string, success: boolean): void;

  /**
   * Get routing statistics
   */
  getStats(): Record<string, RoutingStatsEntry>;

  /**
   * Add custom keyword mapping
   */
  addMapping(
    keywords: string | string[],
    skill: string,
    agent: string,
    confidence?: number,
  ): void;

  /**
   * Get all available mappings (for debugging/testing)
   */
  getMappings(): KeywordMapping[];
}

/**
 * Default instance (without state manager - must be set separately)
 */
export const taskSkillRouter: TaskSkillRouter;

/**
 * Factory function for creating with state manager
 */
export function createTaskSkillRouter(
  stateManager?: XrayStateManager,
): TaskSkillRouter;

/**
 * Convenience function for one-off routing
 */
export function routeTaskToAgent(
  taskDescription: string,
  options?: RoutingOptions,
): RoutingResult;

/**
 * Convenience function for preprocessing (recommended for AgentDelegator integration)
 */
export function preprocessTask(
  taskDescription: string,
  options?: RoutingOptions,
): PreprocessResult;
