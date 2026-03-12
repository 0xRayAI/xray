/**
 * Router Core Tests
 *
 * Tests for the core routing orchestrator
 * Phase 3 refactoring - Matching Logic Extraction
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RouterCore } from '../router-core.js';
import { KeywordMatcher } from '../keyword-matcher.js';
import { HistoryMatcher } from '../history-matcher.js';
import { ComplexityRouter } from '../complexity-router.js';
import { RoutingMapping } from '../../config/types.js';

// Mock dependencies
vi.mock('../../../core/framework-logger.js', () => ({
  frameworkLogger: {
    log: vi.fn(),
  },
}));

vi.mock('../../../core/kernel-patterns.js', () => ({
  getKernel: vi.fn(() => ({
    analyze: vi.fn(() => ({
      confidence: 0.8,
      cascadePatterns: [],
    })),
  })),
}));

const TEST_MAPPINGS: RoutingMapping[] = [
  {
    keywords: ['security'],
    skill: 'security-audit',
    agent: 'security-auditor',
    confidence: 0.9,
  },
  {
    keywords: ['test'],
    skill: 'testing-strategy',
    agent: 'testing-lead',
    confidence: 0.85,
  },
];

describe('RouterCore', () => {
  let routerCore: RouterCore;
  let keywordMatcher: KeywordMatcher;
  let historyMatcher: HistoryMatcher;
  let complexityRouter: ComplexityRouter;

  beforeEach(() => {
    keywordMatcher = new KeywordMatcher(TEST_MAPPINGS);
    historyMatcher = new HistoryMatcher(0.7, 3);
    complexityRouter = new ComplexityRouter();
    routerCore = new RouterCore(keywordMatcher, historyMatcher, complexityRouter);
  });

  describe('route', () => {
    it('should route by keyword match', () => {
      const result = routerCore.route('Fix security issue');
      
      expect(result.agent).toBe('security-auditor');
      expect(result.skill).toBe('security-audit');
    });

    it('should handle invalid task description', () => {
      const result = routerCore.route('');
      
      expect(result.agent).toBe('enforcer');
      expect(result.reason).toContain('Invalid');
    });

    it('should detect and route release workflow', () => {
      const result = routerCore.route('Create npm release');
      
      expect(result.isRelease).toBe(true);
      expect(result.agent).toBe('orchestrator');
      expect(result.skill).toBe('release-workflow');
      expect(result.context).toBeDefined();
      expect(result.context?.bumpType).toBeDefined();
    });

    it('should route by history when keyword fails', () => {
      // Set up history
      historyMatcher.track('task-1', 'history-agent', 'history-skill', true);
      historyMatcher.track('task-1', 'history-agent', 'history-skill', true);
      historyMatcher.track('task-1', 'history-agent', 'history-skill', true);
      
      const result = routerCore.route('Unknown task description', { 
        taskId: 'task-1',
        useHistoricalData: true 
      });
      
      expect(result.agent).toBe('history-agent');
      expect(result.fromHistory).toBe(true);
    });

    it('should route by complexity when keyword and history fail', () => {
      const result = routerCore.route('Some task', { complexity: 60 });
      
      expect(result.agent).toBe('orchestrator');
      expect(result.reason).toContain('High complexity');
    });

    it('should return default when nothing matches', () => {
      const result = routerCore.route('Unknown task');
      
      expect(result.agent).toBe('enforcer');
      expect(result.escalateToLlm).toBe(true);
    });

    it('should escalate on low confidence when configured', () => {
      // Create router with low threshold so 0.85 < threshold
      routerCore = new RouterCore(
        keywordMatcher,
        historyMatcher,
        complexityRouter,
        { minConfidenceThreshold: 0.9, escalateOnLowConfidence: true }
      );
      
      const result = routerCore.route('test something');
      
      expect(result.escalateToLlm).toBe(true);
    });

    it('should not escalate when escalateOnLowConfidence is false', () => {
      routerCore = new RouterCore(
        keywordMatcher,
        historyMatcher,
        complexityRouter,
        { minConfidenceThreshold: 0.5, escalateOnLowConfidence: false }
      );
      
      // Test confidence is 0.85, which is > 0.5, so no escalation
      const result = routerCore.route('test something');
      
      // When confidence is above threshold, no escalation flag (can be undefined or false)
      expect(result.escalateToLlm).toBeFalsy();
    });

    it('should skip history when useHistoricalData is false', () => {
      historyMatcher.track('task-1', 'history-agent', 'history-skill', true);
      historyMatcher.track('task-1', 'history-agent', 'history-skill', true);
      historyMatcher.track('task-1', 'history-agent', 'history-skill', true);
      
      const result = routerCore.route('Unknown', { 
        taskId: 'task-1',
        useHistoricalData: false 
      });
      
      // Should go to default since keyword doesn't match and history is skipped
      expect(result.agent).toBe('enforcer');
    });
  });

  describe('trackResult', () => {
    it('should track routing results', () => {
      routerCore.trackResult('task-1', 'agent-a', 'skill-a', true);
      
      const stats = historyMatcher.getTaskStats('task-1');
      expect(stats).not.toBeNull();
      expect(stats?.count).toBe(1);
    });
  });

  describe('getAllKeywordMatches', () => {
    it('should return all keyword matches', () => {
      const result = routerCore.getAllKeywordMatches('security test');
      
      expect(result).toHaveLength(2);
    });
  });

  describe('getHistoryStats', () => {
    it('should return history statistics', () => {
      routerCore.trackResult('task-1', 'agent-a', 'skill-a', true);
      
      const stats = routerCore.getHistoryStats();
      
      expect(stats).toHaveLength(1);
    });
  });

  describe('getComplexityTier', () => {
    it('should return correct tier', () => {
      expect(routerCore.getComplexityTier(10)).toBe('low');
      expect(routerCore.getComplexityTier(30)).toBe('medium');
      expect(routerCore.getComplexityTier(60)).toBe('high');
      expect(routerCore.getComplexityTier(80)).toBe('enterprise');
    });
  });

  describe('updateConfig', () => {
    it('should update configuration', () => {
      routerCore.updateConfig({ minConfidenceThreshold: 0.5 });
      
      expect(routerCore.getConfig().minConfidenceThreshold).toBe(0.5);
    });

    it('should merge partial config', () => {
      routerCore.updateConfig({ minConfidenceThreshold: 0.5 });
      
      // Other values should remain unchanged
      expect(routerCore.getConfig().escalateOnLowConfidence).toBe(true);
    });
  });

  describe('getters for matchers', () => {
    it('should return keyword matcher', () => {
      expect(routerCore.getKeywordMatcher()).toBe(keywordMatcher);
    });

    it('should return history matcher', () => {
      expect(routerCore.getHistoryMatcher()).toBe(historyMatcher);
    });

    it('should return complexity router', () => {
      expect(routerCore.getComplexityRouter()).toBe(complexityRouter);
    });
  });
});
