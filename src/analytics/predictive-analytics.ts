/**
 * Predictive Analytics for Optimal Agent Routing
 *
 * Predicts the best agent to route a task to based on historical
 * success rates using simple keyword overlap scoring.
 *
 */

import { routingOutcomeTracker } from '../delegation/analytics/outcome-tracker.js';
import { patternPerformanceTracker } from './pattern-performance-tracker.js';
import type { RoutingOutcome, AgentStats } from '../delegation/config/types.js';

export interface RoutingPrediction {
  agent: string;
  confidence: number;
  historicalSuccessRate: number;
  sampleSize: number;
  /** Risk level based on confidence and success probability */
  riskLevel?: "low" | "medium" | "high";
  /** Estimated task duration in milliseconds */
  estimatedDuration?: number;
  /** Agent performance metrics used for prediction */
  agentMetrics?: AgentPerformanceSummary;
}

export interface AgentPerformanceSummary {
  totalTasks: number;
  successfulTasks: number;
  failedTasks: number;
  averageExecutionTime: number;
  successRate: number;
  recentPerformance: number[];
  taskTypeBreakdown: Record<string, { count: number; successRate: number }>;
}

export type RiskLevel = "low" | "medium" | "high";

export interface PredictiveAnalytics {
  predict(taskDescription: string): Promise<RoutingPrediction | null>;
  predictOptimalAgent(): Promise<RoutingPrediction | null>;
  /** Synchronous prediction using in-memory data (no disk reload). */
  predictSync(taskDescription: string): RoutingPrediction | null;
  [key: string]: any;
}

/**
 * Calculate keyword overlap score between a task description and a set of
 * historical task descriptions routed to a specific agent.
 */
function keywordOverlapScore(description: string, historicalDescriptions: string[]): number {
  const descWords = new Set(
    description.toLowerCase().split(/\W+/).filter(w => w.length > 2)
  );
  if (descWords.size === 0 || historicalDescriptions.length === 0) return 0;

  let totalScore = 0;
  let matchCount = 0;

  for (const hist of historicalDescriptions) {
    const histWords = new Set(
      hist.toLowerCase().split(/\W+/).filter(w => w.length > 2)
    );
    let overlap = 0;
    for (const w of descWords) {
      if (histWords.has(w)) overlap++;
    }
    if (overlap > 0) {
      totalScore += overlap / Math.max(descWords.size, histWords.size);
      matchCount++;
    }
  }

  return matchCount > 0 ? totalScore / matchCount : 0;
}

/**
 * Calculate risk level based on confidence and success probability.
 * Ported from advanced-features for enhanced decision-making.
 */
function calculateRiskLevel(confidence: number, successProbability: number): RiskLevel {
  const riskScore = 1 - confidence + (1 - successProbability);
  if (riskScore < 0.3) return "low";
  if (riskScore < 0.7) return "medium";
  return "high";
}

/**
 * Estimate task duration based on agent's historical performance.
 */
function estimateTaskDuration(agentOutcomes: RoutingOutcome[]): number {
  if (agentOutcomes.length === 0) return 0;
  
  const durations = agentOutcomes
    .filter(o => o.executionTimeMs !== undefined)
    .map(o => o.executionTimeMs as number);
  
  if (durations.length === 0) return 0;
  
  const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
  
  const variance = durations.reduce((acc, d) => acc + Math.pow(d - avg, 2), 0) / durations.length;
  const stdDev = Math.sqrt(variance);
  const coefficientOfVariation = avg > 0 ? stdDev / avg : 0;
  
  return Math.max(avg * (1 + coefficientOfVariation * 0.1), 10);
}

/**
 * Build agent performance summary from historical outcomes.
 */
function buildAgentMetrics(agentOutcomes: RoutingOutcome[]): AgentPerformanceSummary {
  const totalTasks = agentOutcomes.length;
  const successfulTasks = agentOutcomes.filter(o => o.success).length;
  const failedTasks = totalTasks - successfulTasks;
  
  // Calculate average execution time
  const durations = agentOutcomes
    .filter(o => o.executionTimeMs !== undefined)
    .map(o => o.executionTimeMs as number);
  const averageExecutionTime = durations.length > 0 
    ? durations.reduce((a, b) => a + b, 0) / durations.length 
    : 0;
  
  // Recent performance (last 20 tasks)
  const recentPerformance = agentOutcomes
    .slice(-20)
    .map(o => o.success ? 1 : 0);
  
  // Task type breakdown
  const taskTypeBreakdown: Record<string, { count: number; successRate: number }> = {};
  for (const outcome of agentOutcomes) {
    const taskType = outcome.taskType || "unknown";
    if (!taskTypeBreakdown[taskType]) {
      taskTypeBreakdown[taskType] = { count: 0, successRate: 0 };
    }
    taskTypeBreakdown[taskType].count++;
  }
  
  // Calculate per-task-type success rates
  for (const taskType of Object.keys(taskTypeBreakdown)) {
    const taskOutcomes = agentOutcomes.filter(o => (o.taskType || "unknown") === taskType);
    const successes = taskOutcomes.filter(o => o.success).length;
    const entry = taskTypeBreakdown[taskType];
    if (entry) {
      entry.successRate = successes / taskOutcomes.length;
    }
  }
  
  return {
    totalTasks,
    successfulTasks,
    failedTasks,
    averageExecutionTime,
    successRate: totalTasks > 0 ? successfulTasks / totalTasks : 0,
    recentPerformance,
    taskTypeBreakdown,
  };
}

export const predictiveAnalytics: PredictiveAnalytics = {
  /**
   * Predict the optimal agent for a given task description.
   *
   * Loads outcomes from routingOutcomeTracker, groups by agent,
   * and picks the agent with the best historical success rate
   * among those that have keyword overlap with the task.
   */
  async predict(taskDescription: string): Promise<RoutingPrediction | null> {
    await routingOutcomeTracker.reloadFromDisk();
    const outcomes = routingOutcomeTracker.getOutcomes();

    // Filter to outcomes that have a resolved success field
    const resolved = outcomes.filter(
      (o: RoutingOutcome) => o.success !== undefined && o.taskDescription
    );
    if (resolved.length === 0) return null;

    // Group outcomes by agent
    const agentMap = new Map<string, RoutingOutcome[]>();
    for (const o of resolved) {
      const list = agentMap.get(o.routedAgent) || [];
      list.push(o);
      agentMap.set(o.routedAgent, list);
    }

    let bestPrediction: RoutingPrediction | null = null;
    let bestScore = -1;

    for (const [agent, agentOutcomes] of agentMap.entries()) {
      const descriptions = agentOutcomes.map(o => o.taskDescription);
      const overlap = keywordOverlapScore(taskDescription, descriptions);

      if (overlap <= 0) continue; // skip agents with no keyword overlap

      const successes = agentOutcomes.filter(o => o.success).length;
      const successRate = successes / agentOutcomes.length;

      // Weighted score: 70% keyword overlap, 30% success rate
      const score = (overlap * 0.7) + (successRate * 0.3);

      if (score > bestScore) {
        bestScore = score;
        const riskLevel = calculateRiskLevel(score, successRate);
        const estimatedDuration = estimateTaskDuration(agentOutcomes);
        const agentMetrics = buildAgentMetrics(agentOutcomes);
        
        bestPrediction = {
          agent,
          confidence: Math.min(score, 1),
          historicalSuccessRate: successRate,
          sampleSize: agentOutcomes.length,
          riskLevel,
          estimatedDuration,
          agentMetrics,
        };
      }
    }

    return bestPrediction;
  },

  /**
   * Predict the globally optimal agent regardless of task description.
   *
   * Returns the agent with the highest success rate that has at least
   * 3 historical samples.
   */
  async predictOptimalAgent(): Promise<RoutingPrediction | null> {
    await routingOutcomeTracker.reloadFromDisk();
    const stats: AgentStats[] = routingOutcomeTracker.getStats();

    // Filter to agents with >= 3 samples
    const qualified = stats.filter(s => s.total >= 3);
    if (qualified.length === 0) return null;

    // Sort by success rate descending, then by total samples descending
    qualified.sort((a, b) => {
      if (b.successRate !== a.successRate) return b.successRate - a.successRate;
      return b.total - a.total;
    });

    const top = qualified[0]!;
    const outcomes = routingOutcomeTracker.getOutcomes();
    const agentOutcomes = outcomes.filter(o => o.routedAgent === top.agent);
    const riskLevel = calculateRiskLevel(top.successRate, top.successRate);
    const estimatedDuration = estimateTaskDuration(agentOutcomes);
    const agentMetrics = buildAgentMetrics(agentOutcomes);
    
    return {
      agent: top.agent,
      confidence: top.successRate,
      historicalSuccessRate: top.successRate,
      sampleSize: top.total,
      riskLevel,
      estimatedDuration,
      agentMetrics,
    };
  },

  /**
   * Synchronous prediction — uses in-memory outcome data without disk reload.
   * Suitable for hot-path usage in agent-delegator.
   */
  predictSync(taskDescription: string): RoutingPrediction | null {
    const stats: AgentStats[] = routingOutcomeTracker.getStats();
    const outcomes = routingOutcomeTracker.getOutcomes();
    if (stats.length === 0 || outcomes.length === 0) return null;

    // Group outcomes by agent
    const byAgent = new Map<string, RoutingOutcome[]>();
    for (const o of outcomes) {
      const arr = byAgent.get(o.routedAgent) || [];
      arr.push(o);
      byAgent.set(o.routedAgent, arr);
    }

    let bestAgent: string | null = null;
    let bestScore = -1;
    let bestRate = 0;
    let bestSamples = 0;
    let bestAgentOutcomes: RoutingOutcome[] = [];

    for (const [agent, agentOutcomes] of byAgent) {
      const descriptions = agentOutcomes.map(o => o.taskDescription);
      const overlap = keywordOverlapScore(taskDescription, descriptions);
      const agentStat = stats.find(s => s.agent === agent);
      const successRate = agentStat?.successRate ?? 0;
      const total = agentStat?.total ?? 0;

      // Weighted score: 70% keyword overlap + 30% historical success rate
      const score = (0.7 * overlap) + (0.3 * successRate);
      if (score > bestScore && total >= 3) {
        bestScore = score;
        bestAgent = agent;
        bestRate = successRate;
        bestSamples = total;
        
        // Store for enhanced return
        bestAgentOutcomes = agentOutcomes;
      }
    }

    if (!bestAgent || bestScore < 0.3) return null;
    
    const riskLevel = calculateRiskLevel(bestScore, bestRate);
    const estimatedDuration = estimateTaskDuration(bestAgentOutcomes);
    const agentMetrics = buildAgentMetrics(bestAgentOutcomes);
    
    return {
      agent: bestAgent,
      confidence: Math.min(bestScore, 1.0),
      historicalSuccessRate: bestRate,
      sampleSize: bestSamples,
      riskLevel,
      estimatedDuration,
      agentMetrics,
    };
  },
};
