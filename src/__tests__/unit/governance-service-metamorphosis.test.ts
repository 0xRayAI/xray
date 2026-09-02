import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../mcps/mcp-client.js', () => ({
  mcpClientManager: { callServerTool: vi.fn() },
}));

vi.mock('../../integrations/governance/index.js', () => ({
  getGovernanceIntegration: vi.fn(),
}));

import { GovernanceService } from '../../governance/governance-service.js';
import { mcpClientManager } from '../../mcps/mcp-client.js';
import { getGovernanceIntegration } from '../../integrations/governance/index.js';

function makeTextResponse(decision: string, confidence: string, reasoning: string) {
  return { content: [{ text: `DECISION: ${decision}\nCONFIDENCE: ${confidence}\nREASONING: ${reasoning}` }] };
}

describe('GovernanceService metamorphosis + PHI/TAU wiring', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.XRAY_LOCAL_MODE = 'true';
    (mcpClientManager.callServerTool as ReturnType<typeof vi.fn>).mockResolvedValue(
      makeTextResponse('approve', '0.85', 'ok'),
    );
    (getGovernanceIntegration as ReturnType<typeof vi.fn>).mockReturnValue({
      isAvailable: () => false,
      checkProposal: vi.fn(),
    });
  });

  it('sets metamorphosisScore on metamorphosis proposals', async () => {
    const service = new GovernanceService();
    const response = await service.govern({
      proposals: [
        {
          id: 'meta-1',
          type: 'metamorphosis',
          title: 'Self-evo tweak',
          description: 'Adjust processor threshold',
          source: 'metamorphosis',
          confidence: 0.8,
        },
      ],
      options: { requireExternalDynamo: false, metamorphosisThreshold: 0.5 },
    });

    expect(response.results[0]?.metamorphosisScore).toBeGreaterThan(0);
  });

  it('applies PHI/TAU moral override from external dynamo vote fields', async () => {
    (getGovernanceIntegration as ReturnType<typeof vi.fn>).mockReturnValue({
      isAvailable: () => true,
      checkProposal: vi.fn().mockResolvedValue({
        vote: 'NO',
        reason: 'Critical moral tension',
        passed: false,
        governanceResponse: { confidence: 0.2 },
        moralTension: 'Critical',
        moralScore: 0.1,
        moralFusion: 0.2,
      }),
    });

    const service = new GovernanceService();
    const response = await service.govern({
      proposals: [
        {
          id: 'p-moral',
          type: 'fix',
          title: 'Risky change',
          description: 'Test moral matrix',
        },
      ],
      options: { requireExternalDynamo: false },
    });

    expect(response.results[0]?.finalDecision).toBe('reject');
    expect(response.results[0]?.moralOverride).toBe('rejected_critical');
  });

  it('downgrades metamorphosis proposals below threshold to needs_revision', async () => {
    (mcpClientManager.callServerTool as ReturnType<typeof vi.fn>).mockResolvedValue(
      makeTextResponse('abstain', '0.2', 'low confidence'),
    );

    const service = new GovernanceService();
    const response = await service.govern({
      proposals: [
        {
          id: 'meta-low',
          type: 'metamorphosis',
          title: 'Low score tweak',
          description: 'Should need revision',
          source: 'metamorphosis',
          confidence: 0.2,
        },
      ],
      options: { requireExternalDynamo: false, metamorphosisThreshold: 0.9 },
    });

    expect(response.results[0]?.finalDecision).toBe('needs_revision');
    expect(response.results[0]?.metamorphosisScore).toBeLessThan(0.9);
  });
});