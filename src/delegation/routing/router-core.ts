/**
 * Router Core
 *
 * Orchestrates keyword matching, history matching, and complexity routing
 * Extracted from task-skill-router.ts route() method
 * Phase 3 refactoring - Matching Logic Extraction
 */

import { RoutingResult, RoutingOptions, RoutingMapping } from '../config/types.js';
import { KeywordMatcher } from './keyword-matcher.js';
import { HistoryMatcher } from './history-matcher.js';
import { ComplexityRouter } from './complexity-router.js';
import { RoutingComponentConfig } from './interfaces.js';
import { frameworkLogger } from '../../core/framework-logger.js';
import { getKernel } from '../../core/kernel-patterns.js';

/**
 * Default configuration for routing components
 */
const DEFAULT_CONFIG: RoutingComponentConfig = {
  minConfidenceThreshold: 0.7,
  minHistorySuccessRate: 0.7,
  escalateOnLowConfidence: true,
};

/**
 * Default routing when no match is found
 */
const DEFAULT_ROUTING: RoutingResult = {
  skill: 'code-review',
  agent: 'enforcer',
  confidence: 0.5,
  reason: 'No match found - default to enforcer',
  escalateToLlm: true,
};

/**
 * Release workflow routing result
 */
const RELEASE_WORKFLOW_ROUTING: Omit<RoutingResult, 'context'> = {
  skill: 'release-workflow',
  agent: 'orchestrator',
  confidence: 0.99,
  matchedKeyword: 'release-workflow',
  isRelease: true,
};

/**
 * Core router that orchestrates all matching strategies
 */
export class RouterCore {
  private keywordMatcher: KeywordMatcher;
  private historyMatcher: HistoryMatcher;
  private complexityRouter: ComplexityRouter;
  private config: RoutingComponentConfig;
  private kernel: ReturnType<typeof getKernel>;

  /**
   * Create a new RouterCore
   * @param keywordMatcher - Keyword matcher instance
   * @param historyMatcher - History matcher instance
   * @param complexityRouter - Complexity router instance
   * @param config - Routing configuration
   */
  constructor(
    keywordMatcher: KeywordMatcher,
    historyMatcher: HistoryMatcher,
    complexityRouter: ComplexityRouter,
    config: Partial<RoutingComponentConfig> = {}
  ) {
    this.keywordMatcher = keywordMatcher;
    this.historyMatcher = historyMatcher;
    this.complexityRouter = complexityRouter;
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.kernel = getKernel();
  }

  /**
   * Main routing method - orchestrates all matching strategies
   * @param taskDescription - Task description to route
   * @param options - Routing options
   * @returns Routing result
   */
  route(taskDescription: string, options: RoutingOptions = {}): RoutingResult {
    const { complexity, taskId, useHistoricalData = true, sessionId } = options;

    // Validate input
    if (!taskDescription || typeof taskDescription !== 'string') {
      return {
        ...DEFAULT_ROUTING,
        reason: 'Invalid task description',
      };
    }

    // 0. SPECIAL CASE: Release/Publish detection
    const releaseDetection = this.keywordMatcher.detectReleaseWorkflow(taskDescription);
    if (releaseDetection.isRelease) {
      return this.createReleaseRouting(taskDescription, releaseDetection, sessionId);
    }

    const descLower = taskDescription.toLowerCase();

    // 1. Try keyword matching first (highest priority)
    const keywordResult = this.performKeywordMatching(descLower);
    if (keywordResult) {
      return this.applyKernelInsights(keywordResult, taskDescription);
    }

    // 2. Try historical data
    if (useHistoricalData && taskId) {
      const historyResult = this.historyMatcher.match(taskId);
      if (historyResult) {
        this.logHistoryMatch(taskId, historyResult, sessionId);
        return historyResult;
      }
    }

    // 3. Try complexity-based routing
    if (complexity !== undefined) {
      const complexityResult = this.complexityRouter.route(complexity, options);
      if (complexityResult) {
        return complexityResult;
      }
    }

    // 4. Default fallback
    return {
      ...DEFAULT_ROUTING,
      reason: 'No keyword match, no history, no complexity provided',
    };
  }

  /**
   * Perform keyword matching with multi-word phrase priority
   * @param descLower - Lowercase task description
   * @returns Routing result or null
   */
  private performKeywordMatching(descLower: string): RoutingResult | null {
    // First try multi-word phrases (higher specificity)
    const multiWordResult = this.keywordMatcher.matchMultiWord(descLower);
    if (multiWordResult) {
      return multiWordResult;
    }

    // Fall back to standard keyword matching
    const keywordResult = this.keywordMatcher.match(descLower);
    if (keywordResult) {
      // Check confidence threshold
      const shouldEscalate =
        this.config.escalateOnLowConfidence &&
        keywordResult.confidence < this.config.minConfidenceThreshold;

      if (shouldEscalate) {
        return { ...keywordResult, escalateToLlm: true };
      }

      return keywordResult;
    }

    return null;
  }

  /**
   * Apply kernel pattern insights to routing decision
   * @param result - Current routing result
   * @param taskDescription - Original task description
   * @returns Enhanced routing result
   */
  private applyKernelInsights(
    result: RoutingResult,
    taskDescription: string
  ): RoutingResult {
    const kernelInsights = this.kernel.analyze(taskDescription);

    // Apply P8 (Infrastructure Hardening) pattern detection
    if (kernelInsights.cascadePatterns?.some((p: { id: string }) => p.id === 'P8')) {
      const p8Pattern = kernelInsights.cascadePatterns?.find(
        (p: { id: string }) => p.id === 'P8'
      );
      if (p8Pattern) {
        frameworkLogger.log(
          'router-core',
          'kernel-guided-infrastructure',
          'info',
          {
            taskDescription: taskDescription.substring(0, 100),
            detectedPattern: p8Pattern.id,
            guidance: 'Handle infrastructure issues before routing',
            kernelAction: p8Pattern.fix,
          }
        );
      }
    }

    // Return kernel-enhanced routing decision
    return {
      ...result,
      kernelInsights,
      escalateToLlm:
        result.escalateToLlm ||
        kernelInsights.confidence < this.config.minConfidenceThreshold,
    };
  }

  /**
   * Create release workflow routing result
   * @param taskDescription - Task description
   * @param detection - Release detection result
   * @param sessionId - Optional session ID
   * @returns Release workflow routing
   */
  private createReleaseRouting(
    taskDescription: string,
    detection: { bumpType: 'major' | 'minor' | 'patch'; createTag: boolean },
    sessionId?: string
  ): RoutingResult {
    frameworkLogger.log(
      'router-core',
      'release-workflow-detected',
      'info',
      {
        taskDescription: taskDescription.substring(0, 100),
        bumpType: detection.bumpType,
        createTag: detection.createTag,
      },
      sessionId
    );

    return {
      ...RELEASE_WORKFLOW_ROUTING,
      context: {
        bumpType: detection.bumpType,
        createTag: detection.createTag,
        workflow: [
          '1. Run version-manager (auto-generates changelog from git)',
          '2. Git commit + push',
          '3. npm publish',
          '4. Generate tweet via release-tweet.mjs',
          '5. @growth-strategist posts tweet',
        ],
      },
    };
  }

  /**
   * Log history match for debugging
   * @param taskId - Task ID
   * @param result - History routing result
   * @param sessionId - Optional session ID
   */
  private logHistoryMatch(
    taskId: string,
    result: RoutingResult,
    sessionId?: string
  ): void {
    frameworkLogger.log(
      'router-core',
      'history-matched',
      'debug',
      { taskId, agent: result.agent },
      sessionId
    );
  }

  /**
   * Get all keyword matches for a task (for analysis/debugging)
   * @param taskDescription - Task description
   * @returns All potential keyword matches
   */
  getAllKeywordMatches(taskDescription: string) {
    return this.keywordMatcher.getAllMatches(taskDescription);
  }

  /**
   * Get history statistics
   * @returns History stats array
   */
  getHistoryStats() {
    return this.historyMatcher.getStats();
  }

  /**
   * Track a routing result
   * @param taskId - Task ID
   * @param agent - Agent used
   * @param skill - Skill used
   * @param success - Whether successful
   */
  trackResult(taskId: string, agent: string, skill: string, success: boolean): void {
    this.historyMatcher.track(taskId, agent, skill, success);
  }

  /**
   * Get complexity tier for a score
   * @param complexity - Complexity score
   * @returns Complexity tier
   */
  getComplexityTier(complexity: number) {
    return this.complexityRouter.getTier(complexity);
  }

  /**
   * Update configuration
   * @param config - New configuration values
   */
  updateConfig(config: Partial<RoutingComponentConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   * @returns Current configuration
   */
  getConfig(): RoutingComponentConfig {
    return { ...this.config };
  }

  /**
   * Get the keyword matcher instance
   * @returns Keyword matcher
   */
  getKeywordMatcher(): KeywordMatcher {
    return this.keywordMatcher;
  }

  /**
   * Get the history matcher instance
   * @returns History matcher
   */
  getHistoryMatcher(): HistoryMatcher {
    return this.historyMatcher;
  }

  /**
   * Get the complexity router instance
   * @returns Complexity router
   */
  getComplexityRouter(): ComplexityRouter {
    return this.complexityRouter;
  }
}
