/**
 * Task-Skill Router for StringRay
 *
 * Facade providing intelligent task-to-agent/skill routing.
 * Delegates all routing logic to specialized components in the routing/ directory.
 * 
 * Architecture:
 * - TaskSkillRouter: Facade providing unified API
 * - RouterCore: Orchestrates keyword, history, and complexity matching
 * - KeywordMatcher: Matches tasks against keyword mappings
 * - HistoryMatcher: Routes based on historical success rates
 * - ComplexityRouter: Routes based on task complexity scores
 *
 * @version 2.0.0 - Facade Pattern: Logic extracted to routing components
 * @since 2026-02-22
 */

import { frameworkLogger } from "../core/framework-logger.js";
import { StringRayStateManager } from "../state/state-manager.js";
import { DEFAULT_MAPPINGS, ROUTING_CONFIG } from './config/index.js';
import { loadMappingsFromConfig } from './config/routing-mappings.js';
import {
  RoutingOutcomeTracker,
  RoutingAnalytics,
  LearningEngine,
  routingOutcomeTracker,
} from './analytics/index.js';
import {
  RouterCore,
  KeywordMatcher,
  HistoryMatcher,
  ComplexityRouter,
} from './routing/index.js';

// Re-export analytics types for backward compatibility
export {
  RoutingOutcome,
  PromptDataPoint,
  RoutingDecision,
  AgentStats,
  DailyAnalyticsSummary,
  RoutingAnalyticsData,
  P9LearningStats,
  PatternDriftAnalysis,
  LearningResult,
  AdaptiveThresholds,
  RoutingRefinementChange,
  RoutingRefinementResult,
} from './config/types.js';

export { RoutingOutcomeTracker, RoutingAnalytics, LearningEngine };

// Re-export singleton instances for backward compatibility
export { routingOutcomeTracker, learningEngine } from './analytics/index.js';

// Re-export routing components
export {
  RouterCore,
  KeywordMatcher,
  HistoryMatcher,
  ComplexityRouter,
} from './routing/index.js';

// ===== TYPE DEFINITIONS =====

/**
 * Routing result with agent, skill, and confidence information
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
  escalateToLlm?: boolean;
  isRelease?: boolean;
}

/**
 * Options for task routing
 */
export interface RoutingOptions {
  complexity?: number;
  taskId?: string;
  useHistoricalData?: boolean;
  sessionId?: string;
  stateManager?: StringRayStateManager;
}

// ===== MAIN CLASS =====

/**
 * TaskSkillRouter - Facade for intelligent task routing
 * 
 * Provides a unified API for routing tasks to appropriate agents and skills.
 * All routing logic is delegated to specialized components:
 * - RouterCore: Orchestrates the routing strategies
 * - KeywordMatcher: Pattern-based matching
 * - HistoryMatcher: Historical success-based routing
 * - ComplexityRouter: Complexity-based routing
 */
export class TaskSkillRouter {
  private mappings: any[];
  private stateManager: StringRayStateManager | undefined;

  // Routing components (delegation targets)
  private keywordMatcher: KeywordMatcher;
  private historyMatcher: HistoryMatcher;
  private complexityRouter: ComplexityRouter;
  private routerCore: RouterCore;

  // Analytics components
  private outcomeTracker: RoutingOutcomeTracker;
  private analytics: RoutingAnalytics;
  private learningEngine: LearningEngine;

  constructor(stateManager?: StringRayStateManager) {
    // Initialize analytics - use singleton for shared state with CLI
    this.outcomeTracker = routingOutcomeTracker;
    this.analytics = new RoutingAnalytics(this.outcomeTracker);
    this.learningEngine = new LearningEngine(false);

    // Load routing mappings
    const configMappings = loadMappingsFromConfig();
    if (configMappings) {
      this.mappings = configMappings;
      frameworkLogger.log("task-skill-router", "loaded-from-config", "info", {
        count: configMappings.length,
        source: ROUTING_CONFIG.CONFIG_FILE_PATH,
      });
    } else {
      this.mappings = [...DEFAULT_MAPPINGS];
    }
    
    // Initialize routing components
    this.keywordMatcher = new KeywordMatcher(this.mappings);
    this.historyMatcher = new HistoryMatcher(ROUTING_CONFIG.MIN_HISTORY_SUCCESS_RATE);
    this.complexityRouter = new ComplexityRouter();
    this.routerCore = new RouterCore(
      this.keywordMatcher,
      this.historyMatcher,
      this.complexityRouter,
      {
        minConfidenceThreshold: ROUTING_CONFIG.MIN_CONFIDENCE_THRESHOLD,
        minHistorySuccessRate: ROUTING_CONFIG.MIN_HISTORY_SUCCESS_RATE,
        escalateOnLowConfidence: ROUTING_CONFIG.ESCALATE_ON_LOW_CONFIDENCE,
      },
      this.outcomeTracker
    );
    
    if (stateManager) {
      this.stateManager = stateManager;
      this.loadHistory();
    }
  }

  /**
   * Set state manager after construction
   */
  setStateManager(stateManager: StringRayStateManager): void {
    this.stateManager = stateManager;
    this.loadHistory();
  }

  /**
   * Load routing history from state manager
   */
  private loadHistory(): void {
    if (!this.stateManager) return;

    try {
      const history = this.stateManager.get("routing_history") as
        | Record<string, unknown>
        | undefined;
      if (history) {
        for (const [taskId, data] of Object.entries(history)) {
          const entry = data as {
            taskId: string;
            agent: string;
            skill: string;
            totalAttempts: number;
            successCount: number;
          };
          // Replay history into HistoryMatcher
          const successCount = entry.successCount;
          const totalAttempts = entry.totalAttempts;
          for (let i = 0; i < totalAttempts; i++) {
            this.historyMatcher.track(taskId, entry.agent, entry.skill, i < successCount);
          }
        }
      }
    } catch (error) {
      frameworkLogger.log(
        "task-skill-router",
        "history-load-failed",
        "debug",
        { error: String(error) },
        undefined,
      );
    }
  }

  /**
   * Save routing history to state manager
   */
  private saveHistory(): void {
    if (!this.stateManager) return;

    try {
      const historyData = this.historyMatcher.exportHistory();
      const history: Record<string, unknown> = {};
      for (const [taskId, entry] of Object.entries(historyData)) {
        history[taskId] = {
          taskId,
          agent: entry.agent,
          skill: entry.skill,
          totalAttempts: entry.totalAttempts,
          successCount: entry.successCount,
        };
      }
      this.stateManager.set("routing_history", history);
    } catch (error) {
      frameworkLogger.log(
        "task-skill-router",
        "history-save-failed",
        "debug",
        { error: String(error) },
        undefined,
      );
    }
  }

  /**
   * Pre-process a task description to extract operation and context
   * Main integration point with AgentDelegator
   */
  preprocess(
    taskDescription: string,
    options: RoutingOptions = {},
  ): {
    operation: string;
    context: Record<string, unknown>;
    routing: RoutingResult;
  } {
    const result = this.routeTask(taskDescription, options);

    return {
      operation: this.skillToOperation(result.skill),
      context: {
        ...result.context,
        suggestedSkill: result.skill,
        suggestedAgent: result.agent,
        routingConfidence: result.confidence,
        routingReason: result.reason,
      },
      routing: result,
    };
  }

  /**
   * Route a task to the appropriate agent and skill
   * Delegates to RouterCore for all routing logic
   */
  routeTask(
    taskDescription: string,
    options: RoutingOptions = {},
  ): RoutingResult {
    const result = this.routerCore.route(taskDescription, options);
    
    if (result.matchedKeyword) {
      frameworkLogger.log(
        "task-skill-router",
        "keyword-matched",
        "debug",
        {
          taskDescription: taskDescription.substring(0, 100),
          matchedKeyword: result.matchedKeyword,
          agent: result.agent,
          skill: result.skill,
          confidence: result.confidence,
          escalateToLlm: result.escalateToLlm,
        },
        options.sessionId,
      );
    }
    
    return result;
  }

  /**
   * Convert skill name to operation type for AgentDelegator
   */
  private skillToOperation(skill: string): string {
    const skillToOperationMap: Record<string, string> = {
      "security-audit": "security",
      "testing-strategy": "test",
      "testing-best-practices": "test",
      "refactoring-strategies": "refactor",
      "performance-optimization": "optimize",
      "code-review": "review",
      "ui-ux-design": "ui design",
      "architecture-patterns": "architecture",
      "api-design": "api design",
      "database-design": "database design",
      "documentation-generation": "document",
      "project-analysis": "analyze",
      "state-manager": "configure",
      "session-management": "configure",
      "git-workflow": "manage",
      "boot-orchestrator": "initialize",
      "devops-deployment": "deploy",
      "processor-pipeline": "process",
    };
    return skillToOperationMap[skill] || "analyze";
  }

  /**
   * Get the skill name for a given agent
   */
  getSkillForAgent(agent: string): string {
    const mapping = this.mappings.find((m) => m.agent === agent);
    return mapping ? mapping.skill : "unknown";
  }

  /**
   * Track routing result for learning
   * Uses RouterCore.recordExecutionOutcome to update existing pending outcome
   */
  trackResult(taskId: string, agent: string, success: boolean, skill?: string): void {
    const skillName = skill || this.getSkillForAgent(agent);
    
    this.historyMatcher.track(taskId, agent, skillName, success);
    
    // Update existing pending outcome in RouterCore
    this.routerCore.recordExecutionOutcome(taskId, agent, skillName, success);
    
    this.saveHistory();

    frameworkLogger.log(
      "task-skill-router",
      "result-tracked",
      "debug",
      { taskId, agent, success },
      undefined,
    );
  }

  /**
   * Record a routing outcome for analytics tracking
   */
  recordOutcome(outcome: {
    taskId: string;
    taskDescription: string;
    routedAgent: string;
    routedSkill: string;
    confidence: number;
    success?: boolean;
    feedback?: string;
  }): void {
    this.outcomeTracker.recordOutcome(outcome);
  }

  // ===== ANALYTICS ACCESSORS =====

  getOutcomeTracker(): RoutingOutcomeTracker {
    return this.outcomeTracker;
  }

  getAnalytics(): RoutingAnalytics {
    return this.analytics;
  }

  getLearningEngine(): LearningEngine {
    return this.learningEngine;
  }

  getStats(): Record<string, { attempts: number; successes: number; successRate: number }> {
    return this.analytics.getRawStats();
  }

  getDailyAnalyticsSummary() {
    return this.analytics.getDailySummary();
  }

  getRoutingAnalytics() {
    return this.analytics.getFullAnalytics();
  }

  applyRoutingRefinements(apply: boolean) {
    return this.analytics.applyRoutingRefinements(apply);
  }

  getP9LearningStats() {
    return this.learningEngine.getP9LearningStats();
  }

  getPatternDriftAnalysis() {
    return this.learningEngine.getPatternDriftAnalysis();
  }

  getAdaptiveThresholds() {
    return this.learningEngine.getAdaptiveThresholds();
  }

  async triggerP9Learning() {
    return this.learningEngine.triggerLearning();
  }

  // ===== MAPPING MANAGEMENT =====

  /**
   * Add custom keyword mapping
   */
  addMapping(
    keywords: string | string[],
    skill: string,
    agent: string,
    confidence = 0.8,
  ): void {
    this.mappings.push({
      keywords: Array.isArray(keywords) ? keywords : [keywords],
      skill,
      agent,
      confidence,
    });
    this.keywordMatcher.setMappings(this.mappings);
  }

  /**
   * Get all available mappings
   */
  getMappings(): Array<{
    keywords: string[];
    skill: string;
    agent: string;
    confidence: number;
  }> {
    return [...this.mappings];
  }

  // ===== COMPONENT ACCESSORS =====

  getRouterCore(): RouterCore {
    return this.routerCore;
  }

  getKeywordMatcher(): KeywordMatcher {
    return this.keywordMatcher;
  }

  getHistoryMatcher(): HistoryMatcher {
    return this.historyMatcher;
  }

  getComplexityRouter(): ComplexityRouter {
    return this.complexityRouter;
  }
}

// ===== CONVENIENCE EXPORTS =====

export const taskSkillRouter = new TaskSkillRouter();

export function createTaskSkillRouter(
  stateManager?: StringRayStateManager,
): TaskSkillRouter {
  return new TaskSkillRouter(stateManager);
}

export function routeTaskToAgent(
  taskDescription: string,
  options?: RoutingOptions,
): RoutingResult {
  return taskSkillRouter.routeTask(taskDescription, options);
}

export function preprocessTask(
  taskDescription: string,
  options?: RoutingOptions,
): {
  operation: string;
  context: Record<string, unknown>;
  routing: RoutingResult;
} {
  return taskSkillRouter.preprocess(taskDescription, options);
}
