/**
 * Pattern Learning Engine for P9 - ADAPTIVE_PATTERN_LEARNING
 *
 * Learns from performance data, generates adaptive modifications,
 * and creates self-improving pattern definitions.
 *
 * @version 1.0.0
 * @since 2026-03-05
 */

import { frameworkLogger } from "../core/framework-logger.js";
import type { PatternUpdate, EmergentPattern, AdaptiveThresholds } from "../core/kernel-patterns.js";
import { patternPerformanceTracker, type PatternMetrics, type PatternDriftAnalysis } from "./pattern-performance-tracker.js";
import { emergingPatternDetector, type ClusterResult } from "./emerging-pattern-detector.js";

export interface LearningResult {
  newPatterns: PatternUpdate[];
  modifiedPatterns: PatternUpdate[];
  removedPatterns: PatternUpdate[];
  thresholdUpdates: PatternUpdate[];
  recommendations: string[];
}

export interface AdaptiveLearningConfig {
  enableAutoAddition: boolean;
  enableAutoRemoval: boolean;
  enableThresholdCalibration: boolean;
  minConfidenceForAddition: number;
  minSuccessRateForAddition: number;
  maxPatterns: number;
}

export class PatternLearningEngine {
  private config: AdaptiveLearningConfig;
  private learningHistory: LearningResult[] = [];
  private readonly maxHistory = 100;

  constructor(config?: Partial<AdaptiveLearningConfig>) {
    this.config = {
      enableAutoAddition: config?.enableAutoAddition ?? true,
      enableAutoRemoval: config?.enableAutoRemoval ?? true,
      enableThresholdCalibration: config?.enableThresholdCalibration ?? true,
      minConfidenceForAddition: config?.minConfidenceForAddition ?? 0.8,
      minSuccessRateForAddition: config?.minSuccessRateForAddition ?? 0.85,
      maxPatterns: config?.maxPatterns ?? 500
    };
  }

  /**
   * Main learning function - analyzes data and generates adaptive modifications
   */
  learnFromData(
    outcomes: Array<{
      taskId: string;
      taskDescription: string;
      routedAgent: string;
      routedSkill: string;
      confidence: number;
      success: boolean;
    }>,
    existingMappings: Array<{
      keywords: string[];
      skill: string;
      agent: string;
      confidence: number;
    }>
  ): LearningResult {
    const result: LearningResult = {
      newPatterns: [],
      modifiedPatterns: [],
      removedPatterns: [],
      thresholdUpdates: [],
      recommendations: []
    };

    // Track performance for each agent:skill combination
    const agentSkillMetrics = new Map<string, PatternMetrics>();

    for (const outcome of outcomes) {
      const patternId = `${outcome.routedAgent}:${outcome.routedSkill}`;

      // Track in performance tracker
      patternPerformanceTracker.trackPatternPerformance(patternId, {
        success: outcome.success,
        confidence: outcome.confidence
      });

      // Track in local metrics
      if (!agentSkillMetrics.has(patternId)) {
        agentSkillMetrics.set(patternId, {
          patternId,
          totalUsages: 0,
          successfulUsages: 0,
          failedUsages: 0,
          successRate: 0,
          avgConfidence: 0,
          avgResponseTime: 0,
          lastUpdated: new Date(),
          timeSeries: []
        });
      }

      const metrics = agentSkillMetrics.get(patternId)!;
      metrics.totalUsages++;
      if (outcome.success) {
        metrics.successfulUsages++;
      } else {
        metrics.failedUsages++;
      }
      metrics.successRate = metrics.successfulUsages / metrics.totalUsages;
      metrics.avgConfidence = (metrics.avgConfidence * 0.9) + (outcome.confidence * 0.1);
      metrics.lastUpdated = new Date();
    }

    // Generate pattern modifications
    result.modifiedPatterns = this.generatePatternModifications(agentSkillMetrics);
    result.removedPatterns = this.generatePatternRemovals(agentSkillMetrics, existingMappings);

    // Generate threshold updates
    if (this.config.enableThresholdCalibration) {
      result.thresholdUpdates = this.generateThresholdUpdates(agentSkillMetrics);
    }

    // Detect emerging patterns for new additions
    if (this.config.enableAutoAddition) {
      const emergentResult = emergingPatternDetector.detectEmergingPatterns(
        outcomes.map(o => ({
          taskId: o.taskId,
          taskDescription: o.taskDescription,
          routedAgent: o.routedAgent,
          routedSkill: o.routedSkill,
          confidence: o.confidence,
          timestamp: new Date(),
          success: o.success
        }))
      );

      result.newPatterns = this.generateNewPatterns(
        emergentResult.emergentPatterns,
        existingMappings
      );
    }

    // Generate recommendations
    result.recommendations = this.generateRecommendations(result);

    // Store in history
    this.learningHistory.push(result);
    if (this.learningHistory.length > this.maxHistory) {
      this.learningHistory.shift();
    }

    frameworkLogger.log(
      "pattern-learning-engine",
      "learning-complete",
      "info",
      {
        newPatterns: result.newPatterns.length,
        modifiedPatterns: result.modifiedPatterns.length,
        removedPatterns: result.removedPatterns.length,
        thresholdUpdates: result.thresholdUpdates.length
      },
      undefined
    );

    return result;
  }

  /**
   * Generate pattern modifications based on performance
   */
  private generatePatternModifications(
    metrics: Map<string, PatternMetrics>
  ): PatternUpdate[] {
    const updates: PatternUpdate[] = [];

    for (const [patternId, metric] of metrics.entries()) {
      // Skip if not enough data
      if (metric.totalUsages < 5) continue;

      // Check for confidence adjustment needed
      if (Math.abs(metric.avgConfidence - 0.75) > 0.15) {
        const newConfidence = Math.max(0.5, Math.min(0.99, metric.successRate));
        
        updates.push({
          updateType: 'modify',
          patternId,
          changes: [
            { type: 'CONFIDENCE', oldValue: metric.avgConfidence, newValue: newConfidence }
          ],
          type: 'CONFIDENCE',
          oldValue: metric.avgConfidence,
          newValue: newConfidence,
          timestamp: new Date(),
          reason: `Performance-based confidence adjustment: ${metric.successRate.toFixed(2)} success rate`,
          confidence: Math.min(1, metric.totalUsages / 20),
          validated: false
        });
      }
    }

    return updates;
  }

  /**
   * Generate patterns for removal based on poor performance
   */
  private generatePatternRemovals(
    metrics: Map<string, PatternMetrics>,
    existingMappings: Array<{ keywords: string[]; skill: string; agent: string; confidence: number }>
  ): PatternUpdate[] {
    const removals: PatternUpdate[] = [];

    for (const [patternId, metric] of metrics.entries()) {
      // Skip if not enough data
      if (metric.totalUsages < 10) continue;

      // Remove if success rate is too low
      if (metric.successRate < 0.4 && metric.totalUsages >= 20) {
        // Find the corresponding mapping
        const [agent, skill] = patternId.includes(':') ? patternId.split(':') : [patternId, 'default'];
        
        removals.push({
          updateType: 'remove',
          patternId,
          changes: [
            { type: 'REMOVAL', oldValue: patternId, newValue: 'REMOVED' }
          ],
          type: 'FREQUENCY',
          oldValue: patternId,
          newValue: 'REMOVED',
          timestamp: new Date(),
          reason: `Low success rate: ${(metric.successRate * 100).toFixed(1)}% over ${metric.totalUsages} usages`,
          confidence: Math.min(1, metric.totalUsages / 30),
          validated: false
        });
      }
    }

    return removals;
  }

  /**
   * Generate adaptive threshold updates
   */
  private generateThresholdUpdates(
    metrics: Map<string, PatternMetrics>
  ): PatternUpdate[] {
    const updates: PatternUpdate[] = [];

    // Get adaptive thresholds from performance tracker
    const thresholds = patternPerformanceTracker.calculateAdaptiveThresholds();

    // Generate updates for agents with enough data
    if (thresholds.perAgent) {
      for (const [agent, threshold] of Object.entries(thresholds.perAgent)) {
        const metric = metrics.get(agent);
        if (metric && metric.totalUsages >= 10) {
          updates.push({
            updateType: 'modify',
            patternId: `threshold:${agent}`,
            changes: [
              { type: 'TRIGGER', oldValue: agent, newValue: JSON.stringify(threshold) }
            ],
            type: 'TRIGGER',
            oldValue: agent,
            newValue: JSON.stringify(threshold),
            timestamp: new Date(),
            reason: `Adaptive threshold calibration based on ${metric.totalUsages} historical usages`,
            confidence: Math.min(1, metric.totalUsages / 20),
            validated: false
          });
        }
      }
    }

    return updates;
  }

  /**
   * Generate new pattern suggestions from emergent patterns
   */
  private generateNewPatterns(
    emergentPatterns: EmergentPattern[],
    existingMappings: Array<{ keywords: string[]; skill: string; agent: string; confidence: number }>
  ): PatternUpdate[] {
    const newPatterns: PatternUpdate[] = [];

    for (const emergent of emergentPatterns) {
      // Skip if confidence is too low
      if (emergent.confidence < this.config.minConfidenceForAddition) continue;

      // Check if pattern already exists
      const keywords = emergent.pattern.split(' | ');
      const existingMatch = existingMappings.find(m =>
        m.keywords.some(kw => keywords.includes(kw))
      );

      if (existingMatch) continue; // Don't add duplicate

      // Add as new pattern
      newPatterns.push({
        updateType: 'add',
        patternId: `emerging_${emergent.pattern.substring(0, 20)}`,
        changes: [
          { type: 'ACTION', oldValue: '', newValue: emergent.suggestedAction || 'monitor' }
        ],
        type: 'ACTION',
        oldValue: '',
        newValue: JSON.stringify({ keywords, confidence: emergent.confidence }),
        timestamp: new Date(),
        reason: `Emerging pattern with ${emergent.frequency} occurrences and ${(emergent.confidence * 100).toFixed(0)}% confidence`,
        confidence: emergent.confidence,
        validated: false
      });
    }

    return newPatterns;
  }

  /**
   * Generate recommendations based on learning results
   */
  private generateRecommendations(result: LearningResult): string[] {
    const recommendations: string[] = [];

    if (result.newPatterns.length > 0) {
      recommendations.push(`${result.newPatterns.length} new patterns detected - review for addition`);
    }

    if (result.modifiedPatterns.length > 0) {
      recommendations.push(`${result.modifiedPatterns.length} patterns recommended for confidence adjustment`);
    }

    if (result.removedPatterns.length > 0) {
      recommendations.push(`${result.removedPatterns.length} underperforming patterns recommended for removal`);
    }

    if (result.thresholdUpdates.length > 0) {
      recommendations.push(`${result.thresholdUpdates.length} adaptive threshold updates available`);
    }

    if (recommendations.length === 0) {
      recommendations.push('No pattern modifications recommended at this time');
    }

    return recommendations;
  }

  /**
   * Get learning history
   */
  getLearningHistory(): LearningResult[] {
    return [...this.learningHistory];
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<AdaptiveLearningConfig>): void {
    this.config = {
      ...this.config,
      ...newConfig
    };

    frameworkLogger.log(
      "pattern-learning-engine",
      "config-updated",
      "info",
      { config: this.config },
      undefined
    );
  }

  /**
   * Get current configuration
   */
  getConfig(): AdaptiveLearningConfig {
    return { ...this.config };
  }
}

// Singleton instance
export const patternLearningEngine = new PatternLearningEngine();