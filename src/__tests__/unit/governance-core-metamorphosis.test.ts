import { describe, it, expect } from 'vitest';
import { calculateMetamorphosisScore } from '../../governance/governance-core.js';

describe('calculateMetamorphosisScore', () => {
  it('returns base confidence when no modifiers apply', () => {
    expect(calculateMetamorphosisScore({ averageConfidence: 0.8, proposalType: 'fix' })).toBe(0.8);
  });

  it('boosts score for automate proposals (+0.10)', () => {
    expect(calculateMetamorphosisScore({ averageConfidence: 0.7, proposalType: 'automate' })).toBe(0.8);
  });

  it('boosts score for codify proposals (+0.10)', () => {
    expect(calculateMetamorphosisScore({ averageConfidence: 0.7, proposalType: 'codify' })).toBe(0.8);
  });

  it('penalizes compliance-only proposals (-0.15)', () => {
    expect(calculateMetamorphosisScore({ averageConfidence: 0.8, proposalType: 'compliance' })).toBe(0.65);
  });

  it('boosts for high historical coherence (+0.05)', () => {
    expect(calculateMetamorphosisScore({ averageConfidence: 0.75, proposalType: 'fix', historicalCoherence: 0.85 })).toBe(0.8);
  });

  it('does not boost for low historical coherence', () => {
    expect(calculateMetamorphosisScore({ averageConfidence: 0.75, proposalType: 'fix', historicalCoherence: 0.6 })).toBe(0.75);
  });

  it('boosts for high resonance (+0.05)', () => {
    expect(calculateMetamorphosisScore({ averageConfidence: 0.75, proposalType: 'fix', resonanceScore: 0.85 })).toBe(0.8);
  });

  it('does not boost for low resonance', () => {
    expect(calculateMetamorphosisScore({ averageConfidence: 0.75, proposalType: 'fix', resonanceScore: 0.7 })).toBe(0.75);
  });

  it('combines multiple boosts', () => {
    expect(calculateMetamorphosisScore({
      averageConfidence: 0.75, proposalType: 'automate', historicalCoherence: 0.9, resonanceScore: 0.95,
    })).toBe(0.95);
  });

  it('floors at 0.0', () => {
    expect(calculateMetamorphosisScore({ averageConfidence: 0.05, proposalType: 'compliance' })).toBe(0.0);
  });

  it('caps at 1.0', () => {
    expect(calculateMetamorphosisScore({
      averageConfidence: 0.85, proposalType: 'automate', historicalCoherence: 0.95, resonanceScore: 0.95,
    })).toBe(1.0);
  });

  it('rounds to 2 decimal places', () => {
    expect(calculateMetamorphosisScore({ averageConfidence: 0.733, proposalType: 'fix' })).toBe(0.73);
  });
});