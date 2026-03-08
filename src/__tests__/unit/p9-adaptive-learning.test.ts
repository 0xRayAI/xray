/**
 * P9 Adaptive Pattern Learning - Comprehensive Tests
 * 
 * Tests for Pattern Performance Tracker, Emerging Pattern Detector,
 * Pattern Learning Engine, and Adaptive Kernel
 * 
 * @version 1.0.0
 * @since 2026-03-05
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PatternPerformanceTracker, type PatternMetrics } from '../../../src/analytics/pattern-performance-tracker.js';
import { EmergingPatternDetector, type PatternDiscoveryResult } from '../../../src/analytics/emerging-pattern-detector.js';
import { PatternLearningEngine } from '../../../src/analytics/pattern-learning-engine.js';
import type { RoutingOutcome } from '../../../src/delegation/task-skill-router.js';

describe('PatternPerformanceTracker', () => {
  let tracker: PatternPerformanceTracker;

  beforeEach(() => {
    tracker = new PatternPerformanceTracker();
  });

  describe('trackPatternPerformance', () => {
    it('should initialize metrics for new pattern', () => {
      tracker.trackPatternPerformance('test:pattern', {
        success: true,
        confidence: 0.9
      });

      const metrics = tracker.getPatternMetrics('test:pattern');
      expect(metrics).not.toBeNull();
      expect(metrics?.totalUsages).toBe(1);
      expect(metrics?.successfulUsages).toBe(1);
      expect(metrics?.successRate).toBe(1);
      expect(metrics?.avgConfidence).toBe(0.9);
    });

    it('should update existing metrics correctly', () => {
      tracker.trackPatternPerformance('test:pattern', { success: true, confidence: 0.8 });
      tracker.trackPatternPerformance('test:pattern', { success: false, confidence: 0.6 });
      tracker.trackPatternPerformance('test:pattern', { success: true, confidence: 0.95 });

      const metrics = tracker.getPatternMetrics('test:pattern');
      expect(metrics?.totalUsages).toBe(3);
      expect(metrics?.successfulUsages).toBe(2);
      expect(metrics?.successRate).toBeCloseTo(0.667, 2);
    });

    it('should track response time', () => {
      tracker.trackPatternPerformance('test:pattern', {
        success: true,
        confidence: 0.9,
        responseTime: 150
      });

      const metrics = tracker.getPatternMetrics('test:pattern');
      expect(metrics?.avgResponseTime).toBe(150);
    });
  });

  describe('detectPatternDrift', () => {
    it('should return null for patterns with insufficient data', () => {
      tracker.trackPatternPerformance('test:pattern', { success: true, confidence: 0.9 });
      
      const drift = tracker.detectPatternDrift('test:pattern');
      expect(drift).toBeNull();
    });

    it('should detect decreasing drift', () => {
      // Add historical data (high success rate)
      for (let i = 0; i < 20; i++) {
        tracker.trackPatternPerformance('test:pattern', { success: true, confidence: 0.95 });
      }
      // Add recent data (low success rate)
      for (let i = 0; i < 20; i++) {
        tracker.trackPatternPerformance('test:pattern', { success: false, confidence: 0.3 });
      }

      const drift = tracker.detectPatternDrift('test:pattern');
      expect(drift).not.toBeNull();
      expect(drift?.drifted).toBe(true);
      expect(drift?.driftDirection).toBe('decreasing');
    });

    it('should detect increasing drift', () => {
      // Add historical data (low success rate)
      for (let i = 0; i < 20; i++) {
        tracker.trackPatternPerformance('test:pattern', { success: false, confidence: 0.3 });
      }
      // Add recent data (high success rate)
      for (let i = 0; i < 20; i++) {
        tracker.trackPatternPerformance('test:pattern', { success: true, confidence: 0.95 });
      }

      const drift = tracker.detectPatternDrift('test:pattern');
      expect(drift).not.toBeNull();
      expect(drift?.drifted).toBe(true);
      expect(drift?.driftDirection).toBe('increasing');
    });
  });

  describe('calculateAdaptiveThresholds', () => {
    it('should calculate thresholds based on performance', () => {
      tracker.trackPatternPerformance('agent1:skill1', { success: true, confidence: 0.9 });
      tracker.trackPatternPerformance('agent2:skill2', { success: false, confidence: 0.5 });

      const thresholds = tracker.calculateAdaptiveThresholds();
      
      expect(thresholds.overall).toBeGreaterThan(0);
      expect(thresholds.perAgent.size).toBeGreaterThan(0);
      expect(thresholds.calibrationDate).toBeInstanceOf(Date);
    });
  });

  describe('getSystemPerformanceSummary', () => {
    it('should return empty summary when no data', () => {
      const summary = tracker.getSystemPerformanceSummary();
      
      expect(summary.totalPatternsTracked).toBe(0);
      expect(summary.overallSuccessRate).toBe(0);
      expect(summary.recommendations).toContain('No patterns tracked yet');
    });

    it('should return meaningful summary with data', () => {
      tracker.trackPatternPerformance('agent1:skill1', { success: true, confidence: 0.9 });
      tracker.trackPatternPerformance('agent2:skill2', { success: false, confidence: 0.3 });

      const summary = tracker.getSystemPerformanceSummary();
      
      expect(summary.totalPatternsTracked).toBe(2);
      expect(summary.patternsNeedingAttention.length).toBeGreaterThan(0);
    });
  });

  describe('clear', () => {
    it('should clear all tracked metrics', () => {
      tracker.trackPatternPerformance('test:pattern', { success: true, confidence: 0.9 });
      tracker.clear();

      const metrics = tracker.getPatternMetrics('test:pattern');
      expect(metrics).toBeNull();
    });
  });
});

describe('EmergingPatternDetector', () => {
  let detector: EmergingPatternDetector;

  beforeEach(() => {
    detector = new EmergingPatternDetector();
  });

  describe('detectEmergingPatterns', () => {
    it('should return empty when insufficient data', () => {
      const outcomes: Partial<RoutingOutcome>[] = [
        { taskId: '1', taskDescription: 'test task', routedAgent: 'agent1', routedSkill: 'skill1', confidence: 0.9, success: true }
      ];

      const result = detector.detectEmergingPatterns(outcomes as RoutingOutcome[]);
      expect(result.emergentPatterns.length).toBe(0);
    });

    it('should detect emerging patterns from similar tasks', () => {
      const outcomes: Partial<RoutingOutcome>[] = [];
      
      // Create similar tasks
      for (let i = 0; i < 10; i++) {
        outcomes.push({
          taskId: String(i),
          taskDescription: 'implement user authentication system',
          routedAgent: 'security-auditor',
          routedSkill: 'security-audit',
          confidence: 0.9,
          success: true
        });
      }

      const result = detector.detectEmergingPatterns(outcomes as RoutingOutcome[]);
      expect(result.clusters.length).toBeGreaterThan(0);
    });

    it('should generate recommendations for high-performing patterns', () => {
      const outcomes: Partial<RoutingOutcome>[] = [];
      
      // Create high-performing pattern
      for (let i = 0; i < 10; i++) {
        outcomes.push({
          taskId: String(i),
          taskDescription: 'write unit tests for component',
          routedAgent: 'testing-lead',
          routedSkill: 'testing-strategy',
          confidence: 0.95,
          success: true
        });
      }

      const result = detector.detectEmergingPatterns(outcomes as RoutingOutcome[]);
      expect(result.recommendations.some(r => r.includes('High-performing'))).toBe(true);
    });
  });

  describe('isPatternEmerging', () => {
    it('should detect increasing pattern usage', () => {
      const recentOutcomes: Partial<RoutingOutcome>[] = [];
      
      // Many recent occurrences
      for (let i = 0; i < 20; i++) {
        recentOutcomes.push({
          taskId: String(i),
          taskDescription: 'fix authentication bug',
          routedAgent: 'bug-triage-specialist',
          routedSkill: 'code-review',
          confidence: 0.8,
          success: true
        });
      }

      const result = detector.isPatternEmerging('authentication fix login', recentOutcomes as RoutingOutcome[], 0.1);
      expect(result.trend).toBe('increasing');
    });
  });
});

describe('PatternLearningEngine', () => {
  let engine: PatternLearningEngine;

  beforeEach(() => {
    engine = new PatternLearningEngine({
      enableAutoAddition: true,
      enableAutoRemoval: true,
      enableThresholdCalibration: true,
      minConfidenceForAddition: 0.7,
      minSuccessRateForAddition: 0.8
    });
  });

  describe('learnFromData', () => {
    it('should generate pattern modifications for low confidence', () => {
      const outcomes: Array<{
        taskId: string;
        taskDescription: string;
        routedAgent: string;
        routedSkill: string;
        confidence: number;
        success: boolean;
      }> = [];
      
      // Low confidence outcomes
      for (let i = 0; i < 20; i++) {
        outcomes.push({
          taskId: String(i),
          taskDescription: 'test task',
          routedAgent: 'test-agent',
          routedSkill: 'test-skill',
          confidence: 0.3,
          success: i < 15 // High success rate
        });
      }

      const existingMappings = [
        { keywords: ['test'], skill: 'test-skill', agent: 'test-agent', confidence: 0.9 }
      ];

      const result = engine.learnFromData(outcomes, existingMappings);
      expect(result.modifiedPatterns.length).toBeGreaterThan(0);
    });

    it('should generate recommendations', () => {
      const outcomes: Array<{
        taskId: string;
        taskDescription: string;
        routedAgent: string;
        routedSkill: string;
        confidence: number;
        success: boolean;
      }> = [
        { taskId: '1', taskDescription: 'task1', routedAgent: 'agent1', routedSkill: 'skill1', confidence: 0.9, success: true }
      ];

      const result = engine.learnFromData(outcomes, []);
      expect(result.recommendations.length).toBeGreaterThan(0);
    });

    it('should track learning history', () => {
      const outcomes: Array<{
        taskId: string;
        taskDescription: string;
        routedAgent: string;
        routedSkill: string;
        confidence: number;
        success: boolean;
      }> = [
        { taskId: '1', taskDescription: 'task1', routedAgent: 'agent1', routedSkill: 'skill1', confidence: 0.9, success: true }
      ];

      engine.learnFromData(outcomes, []);
      engine.learnFromData(outcomes, []);

      const history = engine.getLearningHistory();
      expect(history.length).toBe(2);
    });
  });

  describe('config management', () => {
    it('should update configuration', () => {
      engine.updateConfig({ minConfidenceForAddition: 0.9 });
      
      const config = engine.getConfig();
      expect(config.minConfidenceForAddition).toBe(0.9);
    });
  });
});

describe('Integration Tests', () => {
  let tracker: PatternPerformanceTracker;
  let detector: EmergingPatternDetector;
  let engine: PatternLearningEngine;

  beforeEach(() => {
    tracker = new PatternPerformanceTracker();
    detector = new EmergingPatternDetector();
    engine = new PatternLearningEngine();
  });

  it('should track performance and detect patterns', () => {
    // Track some outcomes
    for (let i = 0; i < 15; i++) {
      tracker.trackPatternPerformance('security:audit', {
        success: i > 10,
        confidence: 0.7 + (i * 0.02)
      });
    }

    // Get metrics
    const metrics = tracker.getPatternMetrics('security:audit');
    expect(metrics?.totalUsages).toBe(15);

    // Detect drift
    const drift = tracker.detectPatternDrift('security:audit');
    expect(drift).not.toBeNull();

    // Calculate thresholds
    const thresholds = tracker.calculateAdaptiveThresholds();
    expect(thresholds.overall).toBeGreaterThan(0);
  });

  it('should provide system performance summary', () => {
    tracker.trackPatternPerformance('agent1:skill1', { success: true, confidence: 0.9 });
    tracker.trackPatternPerformance('agent2:skill2', { success: false, confidence: 0.3 });

    const summary = tracker.getSystemPerformanceSummary();
    
    expect(summary.totalPatternsTracked).toBe(2);
    expect(summary.patternsNeedingAttention.length).toBeGreaterThan(0);
  });
});
