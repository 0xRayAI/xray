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
import { routingOutcomeTracker, RoutingOutcomeTracker } from '../analytics/outcome-tracker.js';
import { patternPerformanceTracker } from '../../analytics/pattern-performance-tracker.js';
import { getAdaptiveKernel } from '../../core/adaptive-kernel.js';

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
  private adaptiveKernel: ReturnType<typeof getAdaptiveKernel>;
  private outcomeTracker: RoutingOutcomeTracker;
  private routingCount: number = 0;
  private readonly LEARN_EVERY_N_ROUTINGS: number = 10;
  
  // Track pending outcomes for post-execution recording
  private pendingOutcomes: Map<string, { 
    agent: string; 
    skill: string; 
    confidence: number;
    timestamp: number;
    complexity?: number;
    routingMethod?: 'keyword' | 'history' | 'complexity' | 'default';
  }> = new Map();

  /**
   * Create a new RouterCore
   * @param keywordMatcher - Keyword matcher instance
   * @param historyMatcher - History matcher instance
   * @param complexityRouter - Complexity router instance
   * @param config - Routing configuration
   * @param outcomeTracker - Optional outcome tracker (injected for shared state)
   */
  constructor(
    keywordMatcher: KeywordMatcher,
    historyMatcher: HistoryMatcher,
    complexityRouter: ComplexityRouter,
    config: Partial<RoutingComponentConfig> = {},
    outcomeTracker?: RoutingOutcomeTracker
  ) {
    this.keywordMatcher = keywordMatcher;
    this.historyMatcher = historyMatcher;
    this.complexityRouter = complexityRouter;
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.kernel = getKernel();
    this.adaptiveKernel = getAdaptiveKernel();
    this.outcomeTracker = outcomeTracker || routingOutcomeTracker;
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
      frameworkLogger.log('router-core', 'routing-fallback', 'info', {
        reason: 'Invalid task description',
        agent: DEFAULT_ROUTING.agent,
        skill: DEFAULT_ROUTING.skill,
      }, sessionId);
      return {
        ...DEFAULT_ROUTING,
        reason: 'Invalid task description',
      };
    }

    // 0. SPECIAL CASE: Release/Publish detection
    const releaseDetection = this.keywordMatcher.detectReleaseWorkflow(taskDescription);
    if (releaseDetection.isRelease) {
      frameworkLogger.log('router-core', 'release-workflow-detected', 'info', {
        taskDescription: taskDescription.slice(0, 100),
        agent: RELEASE_WORKFLOW_ROUTING.agent,
        skill: RELEASE_WORKFLOW_ROUTING.skill,
        confidence: RELEASE_WORKFLOW_ROUTING.confidence,
      }, sessionId);
      const result = this.createReleaseRouting(taskDescription, releaseDetection, sessionId);
      
      // Track outcome for release workflow
      if (taskId) {
        this.recordRoutingOutcome(taskId, result.agent, result.skill, result.confidence, true, complexity, 'keyword');
      }
      return result;
    }

    const descLower = taskDescription.toLowerCase();

    // 1. Try keyword matching first (highest priority)
    const keywordResult = this.performKeywordMatching(descLower);
    if (keywordResult) {
      frameworkLogger.log('router-core', 'keyword-match', 'info', {
        taskDescription: taskDescription.slice(0, 100),
        agent: keywordResult.agent,
        skill: keywordResult.skill,
        confidence: keywordResult.confidence,
        matchedKeyword: keywordResult.matchedKeyword,
      }, sessionId);
      
      // Track keyword match outcome
      if (taskId) {
        this.recordRoutingOutcome(taskId, keywordResult.agent, keywordResult.skill, keywordResult.confidence, true, complexity, 'keyword');
      }
      
      return this.applyKernelInsights(keywordResult, taskDescription);
    }

    // 2. Try historical data
    if (useHistoricalData && taskId) {
      const historyResult = this.historyMatcher.match(taskId);
      if (historyResult) {
        this.logHistoryMatch(taskId, historyResult, sessionId);
        frameworkLogger.log('router-core', 'history-match', 'info', {
          taskId,
          agent: historyResult.agent,
          skill: historyResult.skill,
          confidence: historyResult.confidence,
        }, sessionId);
        
        // Track history match outcome
        this.recordRoutingOutcome(taskId, historyResult.agent, historyResult.skill, historyResult.confidence, true, complexity, 'history');
        
        return historyResult;
      }
    }

    // 3. Try complexity-based routing
    if (complexity !== undefined) {
      const complexityResult = this.complexityRouter.route(complexity, options);
      if (complexityResult) {
        frameworkLogger.log('router-core', 'complexity-match', 'info', {
          taskDescription: taskDescription.slice(0, 100),
          complexity,
          agent: complexityResult.agent,
          skill: complexityResult.skill,
          confidence: complexityResult.confidence,
        }, sessionId);
        
        // Track complexity match outcome
        if (taskId) {
          this.recordRoutingOutcome(taskId, complexityResult.agent, complexityResult.skill, complexityResult.confidence, true, complexity, 'complexity');
        }
        
        return complexityResult;
      }
    }

    // 4. Default fallback
    frameworkLogger.log('router-core', 'routing-fallback', 'info', {
      taskDescription: taskDescription.slice(0, 100),
      reason: 'No keyword match, no history, no complexity provided',
      agent: DEFAULT_ROUTING.agent,
      skill: DEFAULT_ROUTING.skill,
    }, sessionId);
    
    // Track default fallback outcome
    if (taskId) {
      this.recordRoutingOutcome(taskId, DEFAULT_ROUTING.agent, DEFAULT_ROUTING.skill, DEFAULT_ROUTING.confidence, true, complexity, 'default');
    }
    
    // Trigger periodic learning
    this.routingCount++;
    if (this.routingCount % this.LEARN_EVERY_N_ROUTINGS === 0) {
      this.triggerPeriodicLearning();
    }
    
    return {
      ...DEFAULT_ROUTING,
      reason: 'No keyword match, no history, no complexity provided',
    };
  }

  /**
   * Trigger periodic learning cycle
   */
  private triggerPeriodicLearning(): void {
    try {
      // Reload fresh data from disk
      this.outcomeTracker.reloadFromDisk();
      
      // Load pattern metrics from disk
      const { patternPerformanceTracker } = require('../../analytics/pattern-performance-tracker.js');
      patternPerformanceTracker.loadFromDisk();
      
      const outcomes = this.outcomeTracker.getOutcomes();
      const patterns = patternPerformanceTracker.getAllPatternMetrics();
      
      if (outcomes.length >= 5 || patterns.length >= 3) {
        // Trigger learning via AdaptiveKernel with outcomes
        const mappedOutcomes = outcomes.map(o => ({
          taskId: o.taskId,
          taskDescription: o.taskDescription,
          routedAgent: o.routedAgent,
          routedSkill: o.routedSkill,
          confidence: o.confidence,
          success: o.success ?? true,
        }));
        
        this.adaptiveKernel.triggerLearning(mappedOutcomes, []);
        
        const stats = this.adaptiveKernel.getLearningStats();
        
        frameworkLogger.log(
          'router-core',
          'periodic-learning',
          'info',
          { 
            routingCount: this.routingCount,
            outcomesLoaded: outcomes.length,
            patternsTracked: patterns.length,
            driftDetected: stats.driftDetected,
            lastLearningRun: stats.lastLearningRun 
          }
        );
      }
    } catch (error) {
      // Silent fail - don't break routing
      frameworkLogger.log(
        'router-core',
        'periodic-learning-error',
        'debug',
        { error: String(error) }
      );
    }
  }

  /**
   * Record routing outcome for analytics
   */
  private recordRoutingOutcome(
    taskId: string,
    agent: string,
    skill: string,
    confidence: number,
    success: boolean = true,
    complexity?: number,
    routingMethod?: 'keyword' | 'history' | 'complexity' | 'default'
  ): void {
    const outcomeData: Record<string, unknown> = {
      taskId,
      routedAgent: agent,
      routedSkill: skill,
      confidence,
      success,
      feedback: success ? 'success' : 'failed',
      taskDescription: taskId,
    };
    
    if (complexity !== undefined) {
      outcomeData.complexity = complexity;
    }
    if (routingMethod) {
      outcomeData.routingMethod = routingMethod;
    }

    // Record to outcome tracker with full data
    this.outcomeTracker.recordOutcome(outcomeData as Parameters<typeof this.outcomeTracker.recordOutcome>[0]);

    // Track in pattern performance tracker
    const perfData: { success: boolean; confidence: number; complexity?: number } = { success, confidence };
    if (complexity !== undefined) {
      perfData.complexity = complexity;
    }
    patternPerformanceTracker.trackPatternPerformance(
      `${agent}:${skill}`,
      perfData
    );

    // Store pending outcome for later update
    const pendingData: {
      agent: string;
      skill: string;
      confidence: number;
      timestamp: number;
      complexity?: number;
      routingMethod?: 'keyword' | 'history' | 'complexity' | 'default';
    } = {
      agent,
      skill,
      confidence,
      timestamp: Date.now(),
    };
    if (complexity !== undefined) {
      pendingData.complexity = complexity;
    }
    if (routingMethod) {
      pendingData.routingMethod = routingMethod;
    }
    this.pendingOutcomes.set(taskId, pendingData);
  }

  /**
   * Record outcome after agent execution completes
   * Updates the existing pending outcome with success/failure
   */
  recordExecutionOutcome(
    taskId: string,
    agent: string,
    skill: string,
    success: boolean
  ): void {
    const pending = this.pendingOutcomes.get(taskId);
    if (pending) {
      // Update existing pending outcome with execution result
      const updated = this.outcomeTracker.updateOutcome(taskId, {
        success,
        feedback: success ? 'success' : 'failed',
      });

      // Track in pattern performance tracker
      const perfData: { success: boolean; confidence: number; complexity?: number } = {
        success,
        confidence: pending.confidence
      };
      if (pending.complexity !== undefined) {
        perfData.complexity = pending.complexity;
      }
      patternPerformanceTracker.trackPatternPerformance(
        `${agent}:${skill}`,
        perfData
      );

      this.pendingOutcomes.delete(taskId);
    }
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
