/**
 * Unit tests for handleGovernRequest (Phase 0.2)
 * Pure handler only — no Express, no HTTP, no adapter class.
 * Per v3-nucleus.md build plan.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { handleGovernRequest } from '../govern-http.js';
import { frameworkLogger } from '../../core/framework-logger.js';
import { getGovernanceService } from '../../governance/governance-service.js';
import type { GovernanceResponse } from '../../governance/governance-types.js';

vi.mock('../../core/framework-logger.js', () => ({
  frameworkLogger: {
    log: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('../../governance/governance-service.js', () => ({
  getGovernanceService: vi.fn(),
}));

describe('handleGovernRequest (pure kernel handler)', () => {
  let mockGovern: ReturnType<typeof vi.fn>;

  const validResponse: GovernanceResponse = {
    results: [],
    overallDecision: 'approve',
    summary: { total: 1, approved: 1, needsRevision: 0, rejected: 0 },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockGovern = vi.fn().mockResolvedValue(validResponse);
    vi.mocked(getGovernanceService).mockReturnValue({ govern: mockGovern } as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('rejects missing/null/empty body with "proposals" array is required', async () => {
    await expect(handleGovernRequest(null as any)).rejects.toThrow(
      'Invalid governance request: "proposals" array is required'
    );
    await expect(handleGovernRequest(undefined as any)).rejects.toThrow(
      'Invalid governance request: "proposals" array is required'
    );
    await expect(handleGovernRequest({} as any)).rejects.toThrow(
      'Invalid governance request: "proposals" array is required'
    );
    await expect(handleGovernRequest({ proposals: null } as any)).rejects.toThrow(
      'Invalid governance request: "proposals" array is required'
    );
    await expect(handleGovernRequest({ proposals: undefined } as any)).rejects.toThrow(
      'Invalid governance request: "proposals" array is required'
    );
  });

  it('rejects body with non-array proposals', async () => {
    await expect(handleGovernRequest({ proposals: 'not-an-array' } as any)).rejects.toThrow(
      'Invalid governance request: "proposals" array is required'
    );
    await expect(handleGovernRequest({ proposals: {} } as any)).rejects.toThrow(
      'Invalid governance request: "proposals" array is required'
    );
    await expect(handleGovernRequest({ proposals: 123 } as any)).rejects.toThrow(
      'Invalid governance request: "proposals" array is required'
    );
  });

  it('calls getGovernanceService().govern() with correctly merged options (request-level)', async () => {
    const body = {
      proposals: [{ id: 'p1', type: 'fix', title: 't', description: 'd' }],
      options: { requireExternalDynamo: true },
      context: { project: 'test' },
    };

    await handleGovernRequest(body);

    expect(mockGovern).toHaveBeenCalledTimes(1);
    const calledWith = mockGovern.mock.calls[0][0];
    expect(calledWith.proposals).toHaveLength(1);
    expect(calledWith.options).toEqual({ requireExternalDynamo: true });
    expect(calledWith.context).toEqual({ project: 'test' });
  });

  it('caller-supplied requireExternalDynamo overrides request-level option', async () => {
    const body = {
      proposals: [{ id: 'p1', type: 'fix', title: 't', description: 'd' }],
      options: { requireExternalDynamo: false },
    };

    await handleGovernRequest(body, { requireExternalDynamo: true });

    const calledWith = mockGovern.mock.calls[0][0];
    expect(calledWith.options).toEqual({ requireExternalDynamo: true });
  });

  it('logs govern-request-received and govern-response via frameworkLogger', async () => {
    const body = {
      proposals: [
        { id: 'p1', type: 'fix', title: 't1', description: 'd1' },
        { id: 'p2', type: 'refactor', title: 't2', description: 'd2' },
      ],
    };

    await handleGovernRequest(body);

    expect(frameworkLogger.log).toHaveBeenCalledWith(
      'nucleus-http',
      'govern-request-received',
      'info',
      expect.objectContaining({
        proposalCount: 2,
        hasContext: false,
        path: '/govern',
      })
    );

    expect(frameworkLogger.log).toHaveBeenCalledWith(
      'nucleus-http',
      'govern-response',
      'success',
      expect.objectContaining({
        overallDecision: 'approve',
        total: 1,
        approved: 1,
        rejected: 0,
      })
    );
  });

  it('propagates response from governance service', async () => {
    const customResponse: GovernanceResponse = {
      results: [{ proposalId: 'p1', finalDecision: 'approve', averageConfidence: 0.9, votes: [], reasoningSummary: 'ok' }],
      overallDecision: 'approve',
      summary: { total: 1, approved: 1, needsRevision: 0, rejected: 0 },
    };
    mockGovern.mockResolvedValue(customResponse);

    const result = await handleGovernRequest({
      proposals: [{ id: 'p1', type: 'fix', title: 't', description: 'd' }],
    });

    expect(result).toEqual(customResponse);
  });
});
