/**
 * Integration-style Tests for InferenceGovernanceIntegration (Dynamo v2) - V2-HEAVY-02
 * Focused high-coverage for post-fix behaviors. Mocks complete for BaseIntegration.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { InferenceGovernanceIntegration, initializeGovernanceIntegration, getGovernanceIntegration, shutdownGovernanceIntegration } from '../../integrations/governance/index.js';
import { frameworkLogger } from '../../core/framework-logger.js';
import type { InferenceProposal } from '../../inference/inference-cycle.js';

vi.mock('../../core/framework-logger.js', async (importOriginal) => {
  const actual = await importOriginal() as any;
  return {
    ...actual,
    frameworkLogger: { log: vi.fn() },
    generateJobId: vi.fn((prefix: string) => `${prefix}-test-job`),
  };
});

describe('InferenceGovernanceIntegration (Dynamo v2)', () => {
  let integration: InferenceGovernanceIntegration | null = null;
  let mockClient: any;

  const makeProposal = (id: string, type: any, title = 'Test', confidence = 0.81): InferenceProposal => ({ id, type, title, description: 'v2 test', evidence: [], confidence, source: 't', status: 'pending' });

  beforeEach(() => {
    vi.clearAllMocks();
    integration = new InferenceGovernanceIntegration();
    mockClient = { evaluateGovernance: vi.fn(), governWithSolar: vi.fn().mockResolvedValue({ solarContext: { solarIsotopicResonance: 0.8 }, recommendation: 'PASS', adjustedVoteWeight: 1.0, confidenceAdjustment: 0 }), getStats: vi.fn().mockReturnValue({ requestsSucceeded: 5 }) };
    (integration as any).client = mockClient;
    (integration as any).configData = { enabled: true, decisionLogic: { voteWeightMultiplier: 1 } };
    (integration as any)._status = 'initialized';
  });

  afterEach(async () => {
    if (integration) {
      await integration.shutdown().catch(() => {});
    }
    await shutdownGovernanceIntegration().catch(() => {});
    vi.restoreAllMocks();
  });

  it('routes and applies decision logic (both paths + v2 solar fields)', async () => {
    mockClient.evaluateGovernance.mockResolvedValue({ recommendation: 'PASS', voteWeight: 1.1, confidence: 0.9, reasons: [] });
    const v1 = await integration!.checkProposal(makeProposal('1', 'fix'));
    expect(v1.vote).toBe('YES');

    const v2 = await integration!.checkProposal(makeProposal('2', 'refactor'));
    expect((v2 as any).solarContext?.solarIsotopicResonance).toBe(0.8);
  });

  it('batch + fallback + createFallback branches', async () => {
    mockClient.evaluateGovernance.mockRejectedValueOnce(new Error('boom'));
    const b = await integration!.checkProposals([makeProposal('f', 'fix'), makeProposal('s', 'refactor', 't', 0.8)]);
    expect(b.results.length).toBe(2);
    expect(b.results[0].reason).toMatch(/Fallback/);
    expect(b.results[0].vote).toBe('ABSTAIN');
    expect(b.results[0].passed).toBe(false);
  });

  it('honors a Dynamo REJECT even when the sun is quiet', async () => {
    mockClient.governWithSolar.mockResolvedValue({
      solarContext: {
        solarIsotopicResonance: 0.4,
        solarActivityLevel: 'quiet',
        solarActivityModifier: 0.05,
        recommendation: 'Calm solar conditions',
      },
      recommendation: 'REJECT',
      adjustedVoteWeight: 1.2,
      confidenceAdjustment: 0.05,
      confidence: 0.81,
      resonanceScore: 0.4,
    });
    const vote = await integration!.checkProposal(makeProposal('reject-quiet', 'refactor', 'Quiet reject', 0.95));
    expect(vote.vote).toBe('NO');
    expect(vote.passed).toBe(false);
    expect(vote.weight).toBeCloseTo(1.2);
    expect(vote.governanceResponse.recommendation).toBe('REJECT');
    expect(vote.governanceResponse.resonanceScore).toBe(0.4);
  });

  it('fails closed when Dynamo omits a verdict', async () => {
    mockClient.governWithSolar.mockResolvedValue({
      solarContext: {
        solarIsotopicResonance: 0.9,
        solarActivityLevel: 'quiet',
        solarActivityModifier: 0.05,
        recommendation: 'Calm solar conditions',
      },
      adjustedVoteWeight: 1,
      confidenceAdjustment: 0,
    });
    const vote = await integration!.checkProposal(makeProposal('missing', 'automate'));
    expect(vote.vote).toBe('ABSTAIN');
    expect(vote.passed).toBe(false);
    expect(vote.governanceResponse.recommendation).toBe('NEEDS_REVISION');
  });

  it('config/stats/health/availability', () => {
    expect(integration!.getClientStats().requestsSucceeded).toBe(5);
    expect(integration!.isAvailable()).toBe(true);
  });

  it('global helpers + loadConfig default path (via direct)', async () => {
    const g = await initializeGovernanceIntegration();
    expect(getGovernanceIntegration()).toBe(g);
    await shutdownGovernanceIntegration();
    // direct loadConfig error simulation
    (integration as any).loadConfig = async () => { (integration as any).configData = { enabled: false }; };
    await (integration as any).loadConfig();
    expect(integration!.getGovernanceConfig().enabled).toBe(false);
  });
});
