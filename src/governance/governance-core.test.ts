import { describe, it, expect } from 'vitest';
import { applyDecisionMatrix, mergeVotes } from './governance-core.js';
import type { GovernanceVote } from './governance-types.js';

describe('governance-core', () => {
  describe('applyDecisionMatrix', () => {
    it('returns PASS for high resonance and isotopic ratio', () => {
      const result = applyDecisionMatrix({
        resonance: 0.95,
        isotopicRatio: 0.97,
      });
      expect(result.recommendation).toBe('PASS');
      expect(result.confidence).toBeGreaterThan(0.9);
    });

    it('returns REJECT for low resonance', () => {
      const result = applyDecisionMatrix({
        resonance: 0.6,
        isotopicRatio: 0.9,
      });
      expect(result.recommendation).toBe('REJECT');
    });

    it('applies solar activity caution', () => {
      const normal = applyDecisionMatrix({ resonance: 0.88, isotopicRatio: 0.90, solarActivity: 'quiet' });
      const storm = applyDecisionMatrix({ resonance: 0.88, isotopicRatio: 0.90, solarActivity: 'storm' });
      expect(storm.voteWeight).toBeLessThan(normal.voteWeight);
    });
  });

  describe('mergeVotes', () => {
    it('approves when majority approve with good weight', () => {
      const votes: GovernanceVote[] = [
        { server: 'code-review', decision: 'approve', confidence: 0.9, reasoning: 'good' },
        { server: 'security-audit', decision: 'approve', confidence: 0.85, reasoning: 'good' },
        { server: 'researcher', decision: 'needs_revision', confidence: 0.7, reasoning: 'ok' },
        { server: 'external-dynamo', decision: 'approve', confidence: 0.88, reasoning: 'solar ok', weight: 1.2 },
      ];
      const merged = mergeVotes(votes);
      expect(merged.finalDecision).toBe('approve');
      expect(merged.averageConfidence).toBeGreaterThan(0.8);
    });

    it('returns abstain when no votes', () => {
      const merged = mergeVotes([]);
      expect(merged.finalDecision).toBe('abstain');
      expect(merged.averageConfidence).toBe(0.5);
    });

    it('uses the weighted mean of confidence, clamped to 0..1', () => {
      const equal = mergeVotes([
        { server: 'code-review', decision: 'approve', confidence: 0.4, reasoning: 'low', weight: 1 },
        { server: 'security-audit', decision: 'approve', confidence: 0.8, reasoning: 'high', weight: 1 },
      ]);
      expect(equal.averageConfidence).toBe(0.6);

      const weighted = mergeVotes([
        { server: 'code-review', decision: 'approve', confidence: 0.2, reasoning: 'low', weight: 1 },
        { server: 'security-audit', decision: 'approve', confidence: 0.8, reasoning: 'high', weight: 3 },
      ]);
      expect(weighted.averageConfidence).toBe(0.65);
      expect(weighted.averageConfidence).toBeLessThanOrEqual(1);

      const heavy = mergeVotes([
        { server: 'code-review', decision: 'approve', confidence: 1, reasoning: 'a', weight: 4 },
        { server: 'security-audit', decision: 'approve', confidence: 1, reasoning: 'b', weight: 1 },
      ]);
      expect(heavy.averageConfidence).toBe(1);
      expect(heavy.averageConfidence).toBeLessThanOrEqual(1);
    });
  });

  describe('isotopic ratio only when provided', () => {
    it('does not reject Aligned or Mild tension when fusion is absent', () => {
      for (const moralTension of ['Aligned', 'Mild'] as const) {
        const result = applyDecisionMatrix({ resonance: 0.9, moralTension });
        expect(result.recommendation).not.toBe('REJECT');
      }
    });

    it('still rejects a provided isotopic ratio below 0.80', () => {
      const result = applyDecisionMatrix({ resonance: 0.9, isotopicRatio: 0.5 });
      expect(result.recommendation).toBe('REJECT');
      expect(result.reasons.join(' ')).not.toMatch(/TAU/);
    });

    it('rejects critical moral tension before isotopic checks', () => {
      const result = applyDecisionMatrix({
        resonance: 0.99,
        moralTension: 'Critical',
        moralScore: 0.1,
        moralFusion: 0.2,
      });
      expect(result.recommendation).toBe('REJECT');
      expect(result.moralOverride).toBe('rejected_critical');
    });
  });
});
