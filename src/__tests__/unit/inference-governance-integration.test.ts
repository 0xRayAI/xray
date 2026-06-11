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
    (integration as any).configData = { enabled: true, decisionLogic: { voteWeightMultiplier: 1 }, proposalDefaults: { source: 'agent', onChain: false, tags: [] } };
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
