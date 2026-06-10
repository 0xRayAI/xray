import { describe, it, expect } from 'vitest';
import { mergeVotes } from './governance-core.js';
import type { GovernanceVote } from './governance-types.js';

describe('governance-core', () => {
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
    });
  });
});
