/**
 * Complexity Router Tests
 *
 * Tests for complexity-based routing logic
 * Phase 3 refactoring - Matching Logic Extraction
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ComplexityRouter } from '../complexity-router.js';

describe('ComplexityRouter', () => {
  let router: ComplexityRouter;

  beforeEach(() => {
    router = new ComplexityRouter();
  });

  describe('route', () => {
    it('should route low complexity to code-reviewer', () => {
      const result = router.route(10);
      
      expect(result.agent).toBe('code-reviewer');
      expect(result.skill).toBe('code-review');
      expect(result.confidence).toBe(0.6);
      expect(result.reason).toContain('Low complexity');
    });

    it('should route complexity of 25 to code-reviewer', () => {
      const result = router.route(25);
      
      expect(result.agent).toBe('code-reviewer');
      expect(result.skill).toBe('code-review');
    });

    it('should route medium complexity to architect', () => {
      const result = router.route(30);
      
      expect(result.agent).toBe('architect');
      expect(result.skill).toBe('architecture-patterns');
      expect(result.confidence).toBe(0.6);
      expect(result.reason).toContain('Medium complexity');
    });

    it('should route complexity of 50 to architect', () => {
      const result = router.route(50);
      
      expect(result.agent).toBe('architect');
      expect(result.skill).toBe('architecture-patterns');
    });

    it('should route high complexity to orchestrator', () => {
      const result = router.route(60);
      
      expect(result.agent).toBe('orchestrator');
      expect(result.skill).toBe('orchestrator');
      expect(result.confidence).toBe(0.7);
      expect(result.reason).toContain('High complexity');
    });

    it('should route complexity of 75 to orchestrator', () => {
      const result = router.route(75);
      
      expect(result.agent).toBe('orchestrator');
      expect(result.skill).toBe('orchestrator');
    });

    it('should route enterprise complexity to orchestrator with high confidence', () => {
      const result = router.route(80);
      
      expect(result.agent).toBe('orchestrator');
      expect(result.skill).toBe('enterprise-coordination');
      expect(result.confidence).toBe(0.9);
      expect(result.reason).toContain('Enterprise');
    });

    it('should route complexity of 100 to enterprise', () => {
      const result = router.route(100);
      
      expect(result.skill).toBe('enterprise-coordination');
    });
  });

  describe('getTier', () => {
    it('should return low tier for complexity <= 25', () => {
      expect(router.getTier(0)).toBe('low');
      expect(router.getTier(25)).toBe('low');
    });

    it('should return medium tier for complexity 26-50', () => {
      expect(router.getTier(26)).toBe('medium');
      expect(router.getTier(50)).toBe('medium');
    });

    it('should return high tier for complexity 51-75', () => {
      expect(router.getTier(51)).toBe('high');
      expect(router.getTier(75)).toBe('high');
    });

    it('should return enterprise tier for complexity > 75', () => {
      expect(router.getTier(76)).toBe('enterprise');
      expect(router.getTier(100)).toBe('enterprise');
    });
  });

  describe('getConfidence', () => {
    it('should return correct confidence for each tier', () => {
      expect(router.getConfidence(10)).toBe(0.6);  // low
      expect(router.getConfidence(30)).toBe(0.6);  // medium
      expect(router.getConfidence(60)).toBe(0.7);  // high
      expect(router.getConfidence(80)).toBe(0.9);  // enterprise
    });
  });

  describe('getAgentForTier', () => {
    it('should return correct agent for each tier', () => {
      expect(router.getAgentForTier('low')).toBe('code-reviewer');
      expect(router.getAgentForTier('medium')).toBe('architect');
      expect(router.getAgentForTier('high')).toBe('orchestrator');
      expect(router.getAgentForTier('enterprise')).toBe('orchestrator');
    });
  });

  describe('getSkillForTier', () => {
    it('should return correct skill for each tier', () => {
      expect(router.getSkillForTier('low')).toBe('code-review');
      expect(router.getSkillForTier('medium')).toBe('architecture-patterns');
      expect(router.getSkillForTier('high')).toBe('orchestrator');
      expect(router.getSkillForTier('enterprise')).toBe('enterprise-coordination');
    });
  });

  describe('isInTier', () => {
    it('should correctly identify complexity in tier', () => {
      expect(router.isInTier(10, 'low')).toBe(true);
      expect(router.isInTier(10, 'medium')).toBe(false);
      
      expect(router.isInTier(30, 'medium')).toBe(true);
      expect(router.isInTier(30, 'low')).toBe(false);
      
      expect(router.isInTier(80, 'enterprise')).toBe(true);
      expect(router.isInTier(80, 'high')).toBe(false);
    });
  });

  describe('setThresholds', () => {
    it('should update thresholds', () => {
      router.setThresholds({ LOW: 20, MEDIUM: 40 });
      
      expect(router.getTier(15)).toBe('low');
      expect(router.getTier(25)).toBe('medium');
      expect(router.getTier(45)).toBe('high');
    });

    it('should keep default values for unspecified thresholds', () => {
      router.setThresholds({ LOW: 15 });
      
      expect(router.getThresholds().MEDIUM).toBe(50);
      expect(router.getThresholds().HIGH).toBe(75);
    });
  });

  describe('getThresholds', () => {
    it('should return copy of thresholds', () => {
      const thresholds = router.getThresholds();
      thresholds.LOW = 10; // Modify copy
      
      // Original should be unchanged
      expect(router.getThresholds().LOW).toBe(25);
    });
  });

  describe('with custom thresholds', () => {
    it('should use custom thresholds', () => {
      const customRouter = new ComplexityRouter({ LOW: 15, MEDIUM: 35, HIGH: 60 });
      
      expect(customRouter.getTier(10)).toBe('low');
      expect(customRouter.getTier(20)).toBe('medium');
      expect(customRouter.getTier(50)).toBe('high');
      expect(customRouter.getTier(70)).toBe('enterprise');
    });
  });
});
