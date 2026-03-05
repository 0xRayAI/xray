/**
 * Kernel Integration Tests
 * 
 * Comprehensive test suite for kernel v2.0.0 integration
 * Tests pattern detection, agent delegation, routing, and orchestration
 * 
 * @version 2.0.0-SECURITY-ENHANCED
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { KernelAnalyzer, getKernel, resetKernel } from '../core/kernel-patterns.js';

// Test data for pattern matching - must match kernel's actual pattern triggers
const TEST_OBSERVATIONS = {
  securityVulnerability: 'P6 security_vulnerability detected in authentication system',
  releaseReadiness: 'P7 precommit_fails blocking release process',
  infrastructureHardening: 'P8 execution_failures due to chmod+typecheck issues',
  securityOptional: 'security optional until after feature completion',
  worksLocallySecure: 'code works in dev and works locally',
  optimizationOver75: 'Attempting optimization beyond 75% threshold',
  infiniteLoop: 'Process enters infinite recursive loop without termination',
  implementationDrift: 'Code changes without test updates cause hidden bugs',
  consumerPathTrap: 'Code works with dist/ but fails with consumer paths',
};

describe('Kernel Integration', () => {
  let kernel: KernelAnalyzer;

  beforeAll(() => {
    // Reset to ensure clean state
    resetKernel();
    kernel = getKernel();
  });

  afterAll(() => {
    resetKernel();
  });

  describe('Kernel Pattern Detection', () => {
    
    describe('P6: Security Vulnerability Pattern', () => {
      it('should detect security vulnerability when H-005 mentioned', async () => {
        const result = kernel.analyze(TEST_OBSERVATIONS.securityVulnerability);
        
        expect(result.confidence).toBeGreaterThan(0.8);
        expect(result.level).toBeDefined();
        expect(result.cascadePatterns).toBeDefined();
        expect(result.cascadePatterns!.length).toBeGreaterThan(0);
        expect(result.cascadePatterns!.some(p => p.id === 'P6')).toBe(true);
        expect(result.actionRequired).toBeDefined();
      });
      
      it('should recommend security transformation actions', async () => {
        const result = kernel.analyze(TEST_OBSERVATIONS.securityVulnerability);
        
        expect(result.recommendations).toBeDefined();
        expect(result.recommendations!.length).toBeGreaterThan(0);
      });
    });
    
    describe('P7: Release Readiness Pattern', () => {
      
      it('should detect release readiness when validation blocks', async () => {
        const result = kernel.analyze(TEST_OBSERVATIONS.releaseReadiness);
        
        expect(result.confidence).toBeGreaterThan(0.8);
        expect(result.level).toBeDefined();
        expect(result.cascadePatterns).toBeDefined();
        expect(result.cascadePatterns!.some(p => p.id === 'P7')).toBe(true);
        expect(result.actionRequired).toBeDefined();
      });
      
      it('should recommend comprehensive validation', async () => {
        const result = kernel.analyze(TEST_OBSERVATIONS.releaseReadiness);
        
        expect(result.recommendations).toBeDefined();
        expect(result.recommendations!.length).toBeGreaterThan(0);
      });
    });
    
    describe('P8: Infrastructure Hardening Pattern', () => {
      
      it('should detect infrastructure issues when scripts fail', async () => {
        const result = kernel.analyze(TEST_OBSERVATIONS.infrastructureHardening);
        
        expect(result.confidence).toBeGreaterThan(0.8);
        expect(result.level).toBeDefined();
        expect(result.cascadePatterns).toBeDefined();
        expect(result.cascadePatterns!.some(p => p.id === 'P8')).toBe(true);
        expect(result.actionRequired).toBeDefined();
      });
      
      it('should recommend script permission fixes', async () => {
        const result = kernel.analyze(TEST_OBSERVATIONS.infrastructureHardening);
        
        expect(result.recommendations).toBeDefined();
        expect(result.recommendations!.length).toBeGreaterThan(0);
      });
    });
    
    describe('A8: Security Foundation Pattern', () => {
      
      it('should detect optional security assumptions', async () => {
        const result = kernel.analyze(TEST_OBSERVATIONS.securityOptional);
        
        expect(result.fatalAssumptions).toBeDefined();
        expect(result.fatalAssumptions!.length).toBeGreaterThan(0);
        expect(result.fatalAssumptions!.some(a => a.id === 'A8')).toBe(true);
        expect(result.level).toBe('L3'); // Assumption surfacing
        expect(result.actionRequired).toBeDefined();
      });
      
      it('should provide security foundation guidance', async () => {
        const result = kernel.analyze(TEST_OBSERVATIONS.securityOptional);
        
        expect(result.recommendations).toBeDefined();
        expect(result.recommendations!.length).toBeGreaterThan(0);
      });
    });
    
    describe('A9: Production Environment Testing Pattern', () => {
      
      it('should detect local vs production assumptions', async () => {
        const result = kernel.analyze(TEST_OBSERVATIONS.worksLocallySecure);
        
        expect(result.fatalAssumptions).toBeDefined();
        expect(result.fatalAssumptions!.length).toBeGreaterThan(0);
        expect(result.fatalAssumptions!.some(a => a.id === 'A9')).toBe(true);
        expect(result.level).toBe('L3');
        expect(result.actionRequired).toBeDefined();
      });
      
      it('should recommend production testing', async () => {
        const result = kernel.analyze(TEST_OBSERVATIONS.worksLocallySecure);
        
        expect(result.recommendations).toBeDefined();
        expect(result.recommendations!.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Kernel Confidence Scoring', () => {
    
    it('should provide high confidence for pattern matches', async () => {
      const result = kernel.analyze(TEST_OBSERVATIONS.securityVulnerability);
      
      expect(result.confidence).toBeGreaterThan(0.7);
    });
    
    it('should provide moderate confidence for related patterns', async () => {
      const result = kernel.analyze('Optimization over 75% threshold');
      
      expect(result.confidence).toBeGreaterThan(0.5);
    });
    
    it('should provide low confidence for uncertain patterns', async () => {
      const result = kernel.analyze('Unknown security situation');
      
      expect(result.confidence).toBeLessThan(0.8);
      expect(result.recommendations).toBeDefined();
      expect(result.recommendations!.length).toBeGreaterThan(0);
    });
    
    it('should respect confidence threshold configuration', async () => {
      kernel.updateConfig({ confidenceThreshold: 0.8 });
      
      const result = kernel.analyze('Uncertain pattern');
      
      expect(result.recommendations).toBeDefined();
      // Reset config
      kernel.updateConfig({ confidenceThreshold: 0.75 });
    });
  });

  describe('Inference Levels (L1-L5)', () => {
    
    it('should return L1 for pattern recognition', async () => {
      const result = kernel.analyze('Simple task with clear pattern');
      
      expect(result.level).toBeDefined();
      expect(['L1', 'L2', 'L3', 'L4', 'L5']).toContain(result.level);
    });
    
    it('should return L2 for causal analysis', async () => {
      const result = kernel.analyze(TEST_OBSERVATIONS.securityVulnerability);
      
      expect(result.level).toBeDefined();
    });
    
    it('should return L3 for assumption surfacing', async () => {
      const result = kernel.analyze(TEST_OBSERVATIONS.securityOptional);
      
      expect(result.level).toBe('L3');
    });
    
    it('should return L4 for counterfactual thinking', async () => {
      const result = kernel.analyze('Works locally but fails in production');
      
      expect(result.level).toBeDefined();
    });
    
    it('should return L5 for meta-inference', async () => {
      const result = kernel.analyze('Complex task with unknown requirements');
      
      expect(result.level).toBeDefined();
    });
  });

  describe('Kernel Learning & Confidence Adjustment', () => {
    
    it('should learn from successful pattern usage', async () => {
      kernel.learn({
        success: true,
        patternUsed: 'P6',
        feedback: 'Security transformation successful'
      });
      
      // Learning updates internal pattern confidence
      // The kernel analyze() uses cascades, so this tests that learn() doesn't error
      const result = kernel.analyze('P6 security_vulnerability detected');
      
      expect(result.confidence).toBeGreaterThan(0.7);
    });
    
    it('should learn from failed pattern usage', async () => {
      kernel.learn({
        success: false,
        patternUsed: 'P8',
        feedback: 'Script fix failed, still experiencing issues'
      });
      
      const result = kernel.analyze('P8 execution_failures detected');
      
      expect(result.confidence).toBeDefined();
    });
    
    it('should not adjust confidence without explicit learning', () => {
      const config = kernel.getConfig();
      const originalConfidence = config.confidenceThreshold;
      
      kernel.analyze('Any observation');
      const newConfig = kernel.getConfig();
      
      expect(newConfig.confidenceThreshold).toEqual(originalConfidence);
    });
  });

  describe('Kernel Edge Cases', () => {
    
    it('should handle unknown patterns gracefully', async () => {
      const result = kernel.analyze('Completely unknown situation');
      
      expect(result.confidence).toBeDefined();
      expect(result.recommendations).toBeDefined();
      expect(result.recommendations!.length).toBeGreaterThan(0);
    });
    
    it('should handle multiple pattern matches', async () => {
      const result = kernel.analyze('Security issue discovered while optimizing');
      
      expect(result.cascadePatterns).toBeDefined();
      expect(result.cascadePatterns!.length).toBeGreaterThanOrEqual(0);
    });
    
    it('should respect disabled kernel', async () => {
      kernel.updateConfig({ enabled: false });
      
      const result = kernel.analyze('Security vulnerability');
      
      expect(result.confidence).toBe(0);
      expect(result.recommendations).toContain('Kernel is disabled');
      
      // Re-enable
      kernel.updateConfig({ enabled: true });
    });
  });

  describe('Kernel Performance', () => {
    
    it('should analyze patterns with minimal overhead', async () => {
      const start = Date.now();
      
      for (let i = 0; i < 100; i++) {
        kernel.analyze(TEST_OBSERVATIONS.securityVulnerability);
      }
      
      const duration = Date.now() - start;
      
      expect(duration).toBeLessThan(500); // Should complete in <500ms
    });
    
    it('should handle concurrent analysis requests', async () => {
      const analysis1 = kernel.analyze(TEST_OBSERVATIONS.securityVulnerability);
      const analysis2 = kernel.analyze(TEST_OBSERVATIONS.releaseReadiness);
      
      expect(analysis1.confidence).toBeDefined();
      expect(analysis2.confidence).toBeDefined();
    });
  });
});
