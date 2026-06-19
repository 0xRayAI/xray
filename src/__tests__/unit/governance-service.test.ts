import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../../mcps/mcp-client.js', () => ({
  mcpClientManager: { callServerTool: vi.fn() },
}));

vi.mock('../../mcps/in-process-skill-registry.js', () => ({
  callInProcessSkill: vi.fn(),
}));

vi.mock('../../integrations/governance/index.js', () => ({
  getGovernanceIntegration: vi.fn(),
}));

vi.mock('../../governance/governance-core.js', () => ({
  mergeVotes: vi.fn(),
}));

vi.mock('../../core/framework-logger.js', () => ({
  frameworkLogger: { log: vi.fn() },
}));

import { GovernanceService, getGovernanceService } from '../../governance/governance-service.js';
import { mcpClientManager } from '../../mcps/mcp-client.js';
import { getGovernanceIntegration } from '../../integrations/governance/index.js';
import { mergeVotes } from '../../governance/governance-core.js';

function makeTextResponse(decision: string, confidence: string, reasoning: string) {
  return { content: [{ text: `DECISION: ${decision}\nCONFIDENCE: ${confidence}\nREASONING: ${reasoning}` }] };
}

const mockProposals = [
  { id: 'p1', type: 'refactor' as const, title: 'Refactor X', description: 'Refactor X description', evidence: ['ev1'] },
  { id: 'p2', type: 'fix' as const, title: 'Fix Y', description: 'Fix Y description' },
];

describe('GovernanceService', () => {
  let service: GovernanceService;
  let mockIntegration: { isAvailable: ReturnType<typeof vi.fn>; checkProposal: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    vi.clearAllMocks();

    (mcpClientManager.callServerTool as any).mockResolvedValue(
      makeTextResponse('approve', '0.85', 'All checks passed'),
    );

    mockIntegration = {
      isAvailable: vi.fn().mockReturnValue(true),
      checkProposal: vi.fn().mockResolvedValue({
        vote: 'YES', reason: 'Approved', passed: true, governanceResponse: { confidence: 0.9 },
        moralTension: 'Aligned', moralScore: 0.95, moralFusion: 0.88,
        detectedVirtues: ['clarity'], detectedConcerns: [],
      }),
    };
    (getGovernanceIntegration as any).mockReturnValue(mockIntegration);

    (mergeVotes as any).mockImplementation((votes: any[]) => ({
      finalDecision: votes.some(v => v.decision === 'reject') ? 'reject'
        : votes.some(v => v.decision === 'approve') ? 'approve' : 'needs_revision',
      averageConfidence: 0.8,
      reasoningSummary: votes.map(v => `${v.server}: ${v.reasoning}`).join(' | '),
    }));

    process.env.VERCEL = undefined;
    service = new GovernanceService();
  });

  afterEach(() => { vi.restoreAllMocks(); });

  describe('govern()', () => {
    it('calls all 3 skill MCP servers with correct proposal data', async () => {
      const result = await service.govern({ proposals: mockProposals });

      expect(mcpClientManager.callServerTool).toHaveBeenCalledTimes(6);
      expect(mcpClientManager.callServerTool).toHaveBeenCalledWith(
        'code-review', 'analyze_proposal', expect.objectContaining({
          proposalTitle: 'Refactor X', proposalDescription: 'Refactor X description',
        }),
      );
      expect(mcpClientManager.callServerTool).toHaveBeenCalledWith(
        'security-audit', 'analyze_proposal', expect.objectContaining({ proposalTitle: 'Refactor X' }),
      );
      expect(mcpClientManager.callServerTool).toHaveBeenCalledWith(
        'researcher', 'analyze_proposal', expect.objectContaining({ proposalTitle: 'Refactor X' }),
      );
      expect(result.results).toHaveLength(2);
      expect(result.results[0].proposalId).toBe('p1');
    });

    it('integrates external Dynamo filter results', async () => {
      await service.govern({ proposals: mockProposals });

      expect(mockIntegration.checkProposal).toHaveBeenCalledTimes(2);
      expect(mockIntegration.checkProposal).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'p1', type: 'refactor' }),
      );
      expect(mockIntegration.checkProposal).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'p2', type: 'fix' }),
      );
    });

    it('passes context to MCP calls', async () => {
      const context = { project: 'test', phase: 'phase-1' };
      await service.govern({ proposals: mockProposals, context });

      for (const server of ['code-review', 'security-audit', 'researcher']) {
        expect(mcpClientManager.callServerTool).toHaveBeenCalledWith(
          server, 'analyze_proposal', expect.objectContaining({ context }),
        );
      }
    });

    it('passes evidence and proposalType to MCP calls', async () => {
      await service.govern({ proposals: mockProposals });

      expect(mcpClientManager.callServerTool).toHaveBeenCalledWith(
        'code-review', 'analyze_proposal', expect.objectContaining({
          evidence: ['ev1'], proposalType: 'refactor',
        }),
      );
    });
  });

  describe('overallDecision logic', () => {
    it('returns approve when more than 60% approved', async () => {
      (mergeVotes as any).mockReturnValue({ finalDecision: 'approve', averageConfidence: 0.85, reasoningSummary: 'ok' });

      const result = await service.govern({ proposals: mockProposals });

      expect(result.overallDecision).toBe('approve');
      expect(result.summary.approved).toBe(2);
    });

    it('returns reject when rejected > approved', async () => {
      (mergeVotes as any)
        .mockReturnValueOnce({ finalDecision: 'reject', averageConfidence: 0.3, reasoningSummary: 'bad' })
        .mockReturnValueOnce({ finalDecision: 'reject', averageConfidence: 0.3, reasoningSummary: 'bad' });

      const result = await service.govern({ proposals: mockProposals });

      expect(result.overallDecision).toBe('reject');
      expect(result.summary.rejected).toBe(2);
      expect(result.summary.approved).toBe(0);
    });

    it('returns needs_revision when neither approve nor reject dominates', async () => {
      (mergeVotes as any)
        .mockReturnValueOnce({ finalDecision: 'needs_revision', averageConfidence: 0.5, reasoningSummary: 'needs work' })
        .mockReturnValueOnce({ finalDecision: 'needs_revision', averageConfidence: 0.5, reasoningSummary: 'needs work' });

      const result = await service.govern({ proposals: mockProposals });

      expect(result.overallDecision).toBe('needs_revision');
    });
  });

  describe('requireExternal flag', () => {
    it('throws when requireExternal is true and integration is unavailable', async () => {
      mockIntegration.isAvailable.mockReturnValue(false);

      await expect(service.govern({ proposals: mockProposals }))
        .rejects.toThrow('Dynamo Solar SSOT is required but InferenceGovernanceIntegration is not available');
    });

    it('falls back to abstain when requireExternal is false and integration unavailable', async () => {
      mockIntegration.isAvailable.mockReturnValue(false);

      const result = await service.govern({ proposals: mockProposals, options: { requireExternalDynamo: false } });

      expect(result.results[0].votes).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ server: 'external-dynamo', decision: 'abstain' }),
        ]),
      );
      expect(mcpClientManager.callServerTool).toHaveBeenCalled();
    });

    it('still fails external call when requireExternal is true and integration throws', async () => {
      mockIntegration.checkProposal.mockRejectedValue(new Error('Dynamo unavailable'));

      await expect(service.govern({ proposals: mockProposals }))
        .rejects.toThrow('External Dynamo governance is required but failed: Dynamo unavailable');
    });

    it('falls back to abstain when not required and external fails', async () => {
      mockIntegration.checkProposal.mockRejectedValue(new Error('Dynamo unavailable'));

      const result = await service.govern({
        proposals: mockProposals,
        options: { requireExternalDynamo: false },
      });

      expect(result.results[0].votes).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ server: 'external-dynamo', decision: 'abstain' }),
        ]),
      );
    });
  });

  describe('abstention threshold', () => {
    it('throws when abstention ratio exceeds threshold', async () => {
      (mcpClientManager.callServerTool as any).mockResolvedValue(
        makeTextResponse('abstain', '0.3', 'Cannot evaluate'),
      );

      await expect(service.govern({
        proposals: mockProposals,
        options: { maxAbstentionThreshold: 0.5 },
      })).rejects.toThrow('Abstention ratio');
    });

    it('passes when abstention is below threshold', async () => {
      (mcpClientManager.callServerTool as any).mockResolvedValue(
        makeTextResponse('approve', '0.85', 'Looks good'),
      );

      const result = await service.govern({
        proposals: mockProposals,
        options: { maxAbstentionThreshold: 0.5 },
      });

      expect(result.overallDecision).toBeDefined();
    });

    it('default threshold of 1.0 never throws for abstentions', async () => {
      (mcpClientManager.callServerTool as any).mockResolvedValue(
        makeTextResponse('abstain', '0.3', 'Cannot evaluate'),
      );

      const result = await service.govern({ proposals: mockProposals });

      expect(result.results).toHaveLength(2);
    });
  });

  describe('timeout behavior', () => {
    it('sets up timeout and clears it on completion', async () => {
      const setTimeoutSpy = vi.spyOn(global, 'setTimeout');
      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');

      await service.govern({ proposals: mockProposals });

      expect(setTimeoutSpy).toHaveBeenCalled();
      expect(clearTimeoutSpy).toHaveBeenCalled();
    });

    it('uses custom timeoutMs when provided', async () => {
      const setTimeoutSpy = vi.spyOn(global, 'setTimeout');

      await service.govern({ proposals: mockProposals, options: { timeoutMs: 5000 } });

      const timeoutCall = setTimeoutSpy.mock.calls.find(c => typeof c[0] === 'function' && c[1] === 5000);
      expect(timeoutCall).toBeDefined();
    });
  });

  describe('parseVoteFromText', () => {
    it('parses approve decision correctly', async () => {
      (mcpClientManager.callServerTool as any).mockResolvedValue(
        makeTextResponse('approve', '0.92', 'Strong alignment'),
      );

      const result = await service.govern({ proposals: [mockProposals[0]] });

      const codeReviewVote = result.results[0].votes.find(v => v.server === 'code-review');
      expect(codeReviewVote?.decision).toBe('approve');
      expect(codeReviewVote?.confidence).toBe(0.92);
      expect(codeReviewVote?.reasoning).toBe('Strong alignment');
    });

    it('parses reject decision', async () => {
      (mcpClientManager.callServerTool as any).mockResolvedValue(
        makeTextResponse('reject', '0.4', 'Critical issues found'),
      );

      const result = await service.govern({ proposals: [mockProposals[0]] });

      const codeReviewVote = result.results[0].votes.find(v => v.server === 'code-review');
      expect(codeReviewVote?.decision).toBe('reject');
    });

    it('defaults to abstain on empty response', async () => {
      (mcpClientManager.callServerTool as any).mockResolvedValue({ content: [{ text: '' }] });

      const result = await service.govern({ proposals: [mockProposals[0]] });

      const codeReviewVote = result.results[0].votes.find(v => v.server === 'code-review');
      expect(codeReviewVote?.decision).toBe('abstain');
    });
  });

  describe('skill server error handling', () => {
    it('falls back to abstain when an MCP call fails', async () => {
      (mcpClientManager.callServerTool as any)
        .mockRejectedValueOnce(new Error('Connection refused'))
        .mockResolvedValue(makeTextResponse('approve', '0.85', 'ok'))
        .mockResolvedValue(makeTextResponse('approve', '0.85', 'ok'));

      (mcpClientManager.callServerTool as any).mockResolvedValue(
        makeTextResponse('approve', '0.85', 'ok'),
      );

      const result = await service.govern({ proposals: [mockProposals[0]] });

      const codeReviewVote = result.results[0].votes.find(v => v.server === 'code-review');
      expect(codeReviewVote?.decision).toBe('abstain');
      expect(codeReviewVote?.reasoning).toContain('Connection refused');
    });
  });

  describe('getGovernanceService singleton', () => {
    it('returns the same instance', () => {
      const a = getGovernanceService();
      const b = getGovernanceService();
      expect(a).toBe(b);
    });
  });

  describe('in-process skill path (VERCEL=1)', () => {
    it('uses callInProcessSkill when VERCEL=1', async () => {
      process.env.VERCEL = '1';
      const { callInProcessSkill } = await import('../../mcps/in-process-skill-registry.js');
      (callInProcessSkill as any).mockResolvedValue({
        content: [{ text: 'DECISION: approve\nCONFIDENCE: 0.85\nREASONING: ok' }],
      });

      const result = await service.govern({ proposals: [mockProposals[0]] });

      expect(callInProcessSkill).toHaveBeenCalled();
      expect(result.results[0].finalDecision).toBe('approve');
    });
  });

  describe('in-process skill path (XRAY_GOVERNANCE_IN_PROCESS=1)', () => {
    it('uses callInProcessSkill for headless nucleus consumers', async () => {
      process.env.XRAY_GOVERNANCE_IN_PROCESS = '1';
      const { callInProcessSkill } = await import('../../mcps/in-process-skill-registry.js');
      (callInProcessSkill as any).mockResolvedValue({
        content: [{ text: 'DECISION: reject\nCONFIDENCE: 0.9\nREASONING: headless path' }],
      });

      const result = await service.govern({ proposals: [mockProposals[0]] });

      expect(callInProcessSkill).toHaveBeenCalled();
      expect(result.results[0].finalDecision).toBe('reject');
    });
  });
});
