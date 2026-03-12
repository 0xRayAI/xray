/**
 * Routing Outcome Tracker
 *
 * Tracks routing outcomes and provides statistics for performance analysis.
 * Extracted from task-skill-router.ts as part of Phase 2 refactoring.
 *
 * @version 1.0.0
 * @since 2026-03-12
 */

import { ROUTING_CONFIG } from '../config/routing-config.js';
import {
  RoutingOutcome,
  AgentStats,
  PromptDataPoint,
  RoutingDecision,
} from '../config/types.js';

/**
 * RoutingOutcomeTracker class
 *
 * Tracks routing outcomes with circular buffer pattern for memory efficiency.
 * Provides methods for recording outcomes, calculating statistics, and
 * retrieving data for analytics.
 */
export class RoutingOutcomeTracker {
  private outcomes: RoutingOutcome[] = [];
  private readonly maxOutcomes: number;

  /**
   * Create a new outcome tracker
   * @param maxOutcomes Maximum number of outcomes to retain (default: 1000)
   */
  constructor(maxOutcomes = 1000) {
    this.maxOutcomes = maxOutcomes;
  }

  /**
   * Record a new routing outcome
   * @param outcome The outcome to record (timestamp will be added)
   */
  recordOutcome(outcome: Omit<RoutingOutcome, 'timestamp'>): void {
    if (!ROUTING_CONFIG.ENABLE_OUTCOME_TRACKING) return;

    this.outcomes.push({ ...outcome, timestamp: new Date() });

    // Keep only recent outcomes (circular buffer)
    if (this.outcomes.length > this.maxOutcomes) {
      this.outcomes = this.outcomes.slice(-this.maxOutcomes);
    }
  }

  /**
   * Get all outcomes, optionally filtered by agent
   * @param agent Optional agent name to filter by
   * @returns Array of routing outcomes
   */
  getOutcomes(agent?: string): RoutingOutcome[] {
    if (agent) {
      return this.outcomes.filter((o) => o.routedAgent === agent);
    }
    return [...this.outcomes];
  }

  /**
   * Calculate success rate for a specific agent
   * @param agent The agent name
   * @returns Success rate between 0 and 1
   */
  getSuccessRate(agent: string): number {
    const agentOutcomes = this.outcomes.filter(
      (o) => o.routedAgent === agent && o.success !== undefined
    );
    if (agentOutcomes.length === 0) return 0;

    const successes = agentOutcomes.filter((o) => o.success).length;
    return successes / agentOutcomes.length;
  }

  /**
   * Get statistics for all agents
   * @returns Array of agent statistics
   */
  getStats(): AgentStats[] {
    const stats = new Map<string, { total: number; successes: number }>();

    for (const outcome of this.outcomes) {
      if (outcome.success === undefined) continue;

      const current = stats.get(outcome.routedAgent) || { total: 0, successes: 0 };
      current.total++;
      if (outcome.success) current.successes++;
      stats.set(outcome.routedAgent, current);
    }

    return Array.from(stats.entries()).map(([agent, data]) => ({
      agent,
      total: data.total,
      attempts: data.total,
      successes: data.successes,
      successRate: data.total > 0 ? data.successes / data.total : 0,
    }));
  }

  /**
   * Clear all recorded outcomes
   */
  clear(): void {
    this.outcomes = [];
  }

  /**
   * Get the count of recorded outcomes
   * @returns Number of outcomes
   */
  getCount(): number {
    return this.outcomes.length;
  }

  /**
   * Export outcomes to JSON string
   * @returns JSON string of all outcomes
   */
  toJSON(): string {
    return JSON.stringify(this.outcomes);
  }

  /**
   * Convert outcomes to prompt data points for pattern analysis
   * @returns Array of prompt data points
   */
  getPromptData(): PromptDataPoint[] {
    return this.outcomes.map((outcome) => ({
      taskId: outcome.taskId,
      prompt: outcome.taskDescription,
      timestamp: outcome.timestamp,
      complexity: 0, // Would need to be calculated from prompt
      keywords: [], // Would need to be extracted from prompt
      context: {},
      routingDecision: {
        taskId: outcome.taskId,
        agent: outcome.routedAgent,
        skill: outcome.routedSkill,
        confidence: outcome.confidence,
        reason: outcome.feedback || 'Historical routing',
        timestamp: outcome.timestamp,
      },
      outcome: {
        success: outcome.success ?? false,
        agent: outcome.routedAgent,
        skill: outcome.routedSkill,
        feedback: outcome.feedback || '',
      },
    }));
  }

  /**
   * Convert outcomes to routing decisions
   * @returns Array of routing decisions
   */
  getRoutingDecisions(): RoutingDecision[] {
    return this.outcomes.map((outcome) => ({
      taskId: outcome.taskId,
      agent: outcome.routedAgent,
      skill: outcome.routedSkill,
      confidence: outcome.confidence,
      reason: outcome.feedback || 'Historical routing',
      timestamp: outcome.timestamp,
    }));
  }

  /**
   * Apply routing refinements to existing outcomes
   * @param changes Array of changes to apply
   */
  applyRoutingRefinements(changes: Array<{ taskId: string; agent?: string; skill?: string; confidence?: number }>): void {
    for (const change of changes) {
      const outcome = this.outcomes.find((o) => o.taskId === change.taskId);
      if (outcome) {
        if (change.agent) outcome.routedAgent = change.agent;
        if (change.skill) outcome.routedSkill = change.skill;
        if (change.confidence) outcome.confidence = change.confidence;
      }
    }
  }
}

/**
 * Global routing outcome tracker instance
 */
export const routingOutcomeTracker = new RoutingOutcomeTracker();
