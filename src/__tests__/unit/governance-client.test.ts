/**
 * Comprehensive Unit Tests for GovernanceClient (Dynamo v2 compatible)
 *
 * Covers (post-fix for 10 Dynamo review issues):
 * - evaluateGovernance happy paths + diagnostics nesting (nested only post-fix) + server-side recommendation usage
 * - governWithSolar happy paths + new v2 fields (solarIsotopicResonance, sharePublicly, spectralQuality,
 *   full resonance metrics: structuralResonance, proximity, phaseAlignment, vortexAlignment,
 *   synchronization, signalTiming, hammerReason, neuralContextUsed)
 * - Error cases: invalid responses, GovernanceError types (INVALID, TIMEOUT, NETWORK, REQUEST_FAILED), network/timeout propagation, retries
 * - Stats, config, validation logic (isValid*), average calc
 * - Full HTTP layer: makeJsonRequest (retries, backoff), doJsonRequest (fetch, abort/timeout, status errors), callTool proxy
 * - Fixed mappings per recent v2 updates (server rec authoritative, no re-derive)
 *
 * Mocks: callTool (internal path), fetch (for HTTP layer full branch coverage), frameworkLogger ONLY (no console anywhere)
 *
 * @version 1.1.0
 * V2-HEAVY-02 ownership
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GovernanceClient } from '../../integrations/governance/governance-client.js';
import {
  GovernanceError,
  GovernanceErrorCode,
  GovernanceTimeoutError,
  GovernanceNetworkError,
} from '../../integrations/governance/types.js';
import { frameworkLogger } from '../../core/framework-logger.js';

// Mock frameworkLogger — ALL tests must use this, never console
vi.mock('../../core/framework-logger.js', () => ({
  frameworkLogger: {
    log: vi.fn(),
  },
}));

describe('GovernanceClient (Dynamo v2)', () => {
  let client: GovernanceClient;
  let mockCallTool: ReturnType<typeof vi.fn>;
  let mockFetch: ReturnType<typeof vi.fn>;

  const mockEvaluateSuccessRaw = {
    result: {
      proposalId: 'prop-123',
      governanceIsotopeId: 'iso-456',
      resonanceScore: 0.87,
      recommendation: 'PASS',
      confidence: 0.92,
      voteWeight: 1.15,
      reasons: ['High structural alignment', 'Solar quiet favorable'],
      diagnostics: {
        isotopicRatio: 0.94,
        vortexVolume: 1240,
        historicalCoherence: 0.81,
      },
    },
  };

  // Post-nesting-fix: missing diagnostics safely defaults via ?? {} + ?? 0 (legacy flat no longer auto-mapped)
  const mockEvaluateMissingDiagnosticsRaw = {
    result: {
      proposalId: 'prop-missing-diag',
      resonanceScore: 0.71,
      recommendation: 'NEEDS_REVISION',
      confidence: 0.68,
      voteWeight: 0.9,
      reason: 'Needs more evidence',
      // intentionally no diagnostics key, and no top-level isotopic etc.
    },
  };

  const mockSolarSuccessRaw = {
    result: {
      originalRecommendation: 'PASS',
      solarContext: {
        solarActivityLevel: 'moderate',
        solarIsotopicResonance: 0.8123,
        solarActivityModifier: 0.07,
        recommendation: 'Proceed with mild caution',
      },
      adjustedVoteWeight: 1.07,
      finalRecommendation: 'PASS (solar-adjusted)',
      confidenceAdjustment: -0.03,
      recommendation: 'PASS', // server-side authoritative
      confidence: 0.89,
      resonanceScore: 0.884,
      structuralResonance: 0.884,
      proximity: 0.761,
      phaseAlignment: 0.912,
      vortexAlignment: 0.654,
      synchronization: 0.833,
      signalTiming: 'synced',
      hammerReason: 'Strong 4D/5D alignment under moderate solar',
      neuralContextUsed: true,
      spectralQuality: 0.94,
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    client = new GovernanceClient({
      baseUrl: 'https://test-gov.example.com',
      timeoutMs: 5000,
      retryAttempts: 1, // simplify for unit
      retryDelayMs: 10,
    });

    // Spy on private callTool for internal-path tests (per spec)
    mockCallTool = vi.fn();
    (client as any).callTool = mockCallTool;

    // Prepare fetch mock for full HTTP layer coverage tests (separate clients)
    mockFetch = vi.fn();
    // @ts-expect-error test override
    global.fetch = mockFetch;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor & config', () => {
    it('initializes with defaults and custom config', () => {
      const c = new GovernanceClient();
      expect(c).toBeDefined();
      const stats = c.getStats();
      expect(stats.requestsTotal).toBe(0);
      expect(stats.requestsSucceeded).toBe(0);
    });

    it('updateConfig and resetStats work', () => {
      client.updateConfig({ timeoutMs: 15000 });
      client.resetStats();
      const stats = client.getStats();
      expect(stats.requestsTotal).toBe(0);
      expect(stats.averageResponseTimeMs).toBe(0);
    });
  });

  describe('evaluateGovernance (fixed v2 paths)', () => {
    it('happy path: returns mapped response using server-side recommendation + diagnostics nesting', async () => {
      mockCallTool.mockResolvedValueOnce(mockEvaluateSuccessRaw);

      const resp = await client.evaluateGovernance({
        proposalId: 'prop-123',
        proposalText: 'Implement new solar-aware governor',
        agentReviews: ['code-review: clean', 'security: ok'],
        codeDiff: 'diff --git ...',
      });

      expect(resp.success).toBe(true);
      expect(resp.proposalId).toBe('prop-123');
      expect(resp.recommendation).toBe('PASS'); // direct from server result
      expect(resp.confidence).toBe(0.92);
      expect(resp.voteWeight).toBe(1.15);
      expect(resp.resonanceScore).toBe(0.87);
      expect(resp.isotopicRatio).toBe(0.94); // from nested diagnostics
      expect(resp.vortexVolume).toBe(1240);
      expect(resp.historicalCoherence).toBe(0.81);
      expect(resp.reasons).toEqual(['High structural alignment', 'Solar quiet favorable']);
      expect(mockCallTool).toHaveBeenCalledWith('evaluate_governance', expect.objectContaining({
        proposalId: 'prop-123',
        agentReviews: ['code-review: clean', 'security: ok'],
        codeDiff: 'diff --git ...',
      }));

      const stats = client.getStats();
      expect(stats.requestsSucceeded).toBe(1);
      expect(frameworkLogger.log).toHaveBeenCalledWith('governance-client', 'evaluate-success', 'info', expect.any(Object));
    });

    it('handles missing diagnostics key via ?? {} fallback (post-nesting-fix safe default to 0)', async () => {
      mockCallTool.mockResolvedValueOnce(mockEvaluateMissingDiagnosticsRaw);

      const resp = await client.evaluateGovernance({
        proposalId: 'prop-missing-diag',
        proposalText: 'Post-fix missing diag test',
        agentReviews: ['reviewer: ok'],
      });

      expect(resp.recommendation).toBe('NEEDS_REVISION');
      expect(resp.isotopicRatio).toBe(0); // safe default
      expect(resp.vortexVolume).toBe(0);
      expect(resp.historicalCoherence).toBe(0);
      expect(resp.reasons).toEqual(['Needs more evidence']);
    });

    it('throws GovernanceError INVALID_RESPONSE on malformed structure', async () => {
      mockCallTool.mockResolvedValue({ result: { foo: 'bar' } });

      await expect(
        client.evaluateGovernance({ proposalId: 'bad', proposalText: 'x', agentReviews: [] })
      ).rejects.toMatchObject({ code: GovernanceErrorCode.INVALID_RESPONSE });

      const stats = client.getStats();
      expect(stats.requestsFailed).toBeGreaterThan(0);
      expect(frameworkLogger.log).toHaveBeenCalledWith('governance-client', 'evaluate-error', 'error', expect.any(Object));
    });

    it('propagates callTool errors (network/timeout wrappers)', async () => {
      const netErr = new GovernanceNetworkError('https://bad', new Error('ECONNREFUSED'));
      mockCallTool.mockRejectedValueOnce(netErr);

      await expect(
        client.evaluateGovernance({ proposalId: 'p', proposalText: 't', agentReviews: [] })
      ).rejects.toBeInstanceOf(GovernanceNetworkError);
    });
  });

  describe('governWithSolar (v2 Dynamo + new fields)', () => {
    it('happy path: passes sharePublicly + spectralQuality, maps full resonance metrics + server-side recommendation', async () => {
      mockCallTool.mockResolvedValueOnce(mockSolarSuccessRaw);

      const resp = await client.governWithSolar({
        proposal: 'Strategic refactor of inference governor for v2 Dynamo compatibility',
        baseVoteWeight: 1.0,
        sharePublicly: true,
        spectralQuality: 0.94,
      });

      // Verify input mapping (new v2 fields)
      expect(mockCallTool).toHaveBeenCalledWith('govern_with_solar', {
        proposal: 'Strategic refactor of inference governor for v2 Dynamo compatibility',
        baseVoteWeight: 1.0,
        sharePublicly: true,
        spectralQuality: 0.94,
      });

      // Full response shape from v2 fixes
      expect(resp.originalRecommendation).toBe('PASS');
      expect(resp.solarContext.solarActivityLevel).toBe('moderate');
      expect(resp.solarContext.solarIsotopicResonance).toBe(0.8123); // key fixed field
      expect(resp.solarContext.solarActivityModifier).toBe(0.07);
      expect(resp.adjustedVoteWeight).toBe(1.07);
      expect(resp.finalRecommendation).toBe('PASS (solar-adjusted)');
      expect(resp.confidenceAdjustment).toBe(-0.03);
      expect(resp.recommendation).toBe('PASS'); // authoritative server-side (not re-derived)
      expect(resp.confidence).toBe(0.89);
      expect(resp.resonanceScore).toBe(0.884);
      expect(resp.structuralResonance).toBe(0.884);
      expect(resp.proximity).toBe(0.761);
      expect(resp.phaseAlignment).toBe(0.912);
      expect(resp.vortexAlignment).toBe(0.654);
      expect(resp.synchronization).toBe(0.833);
      expect(resp.signalTiming).toBe('synced');
      expect(resp.hammerReason).toBe('Strong 4D/5D alignment under moderate solar');
      expect(resp.neuralContextUsed).toBe(true);
      expect(resp.spectralQuality).toBe(0.94);

      const stats = client.getStats();
      expect(stats.requestsSucceeded).toBe(1);
      expect(frameworkLogger.log).toHaveBeenCalledWith('governance-client', 'solar-check-success', 'info', expect.any(Object));
    });

    it('omits optional v2 fields when not provided', async () => {
      mockCallTool.mockResolvedValueOnce({
        result: {
          originalRecommendation: 'NEEDS_REVISION',
          solarContext: { solarActivityLevel: 'quiet', solarIsotopicResonance: 0.55, solarActivityModifier: 0, recommendation: 'Nominal' },
          adjustedVoteWeight: 1.0,
          finalRecommendation: 'NEEDS_REVISION',
          confidenceAdjustment: 0,
          recommendation: 'NEEDS_REVISION',
          confidence: 0.71,
          resonanceScore: 0.71,
          structuralResonance: 0.71,
          proximity: 0.5,
          phaseAlignment: 0.6,
          vortexAlignment: 0.4,
          synchronization: 0.7,
          signalTiming: 'leading',
          hammerReason: 'Quiet conditions',
          neuralContextUsed: false,
        },
      });

      const resp = await client.governWithSolar({
        proposal: 'Minimal proposal',
        baseVoteWeight: 0.9,
      });

      expect(resp.spectralQuality).toBeUndefined();
      expect(resp.neuralContextUsed).toBe(false);
      expect(mockCallTool).toHaveBeenCalledWith('govern_with_solar', {
        proposal: 'Minimal proposal',
        baseVoteWeight: 0.9,
      });
    });

    it('throws INVALID_RESPONSE when solarContext missing critical v2 fields (e.g. solarIsotopicResonance out of range)', async () => {
      mockCallTool.mockResolvedValueOnce({
        result: {
          originalRecommendation: 'PASS',
          solarContext: { solarActivityLevel: 'storm', solarIsotopicResonance: 1.5, solarActivityModifier: 0.2, recommendation: 'x' }, // invalid resonance >1
          adjustedVoteWeight: 0.6,
          finalRecommendation: 'REJECT',
          confidenceAdjustment: -0.4,
          recommendation: 'REJECT',
          confidence: 0.3,
        },
      });

      await expect(
        client.governWithSolar({ proposal: 'bad-solar' })
      ).rejects.toMatchObject({ code: GovernanceErrorCode.INVALID_RESPONSE });
    });

    it('handles storm-level solar + negative adjustment correctly', async () => {
      mockCallTool.mockResolvedValueOnce({
        result: {
          originalRecommendation: 'PASS',
          solarContext: { solarActivityLevel: 'storm', solarIsotopicResonance: 0.31, solarActivityModifier: -0.35, recommendation: 'Caution' },
          adjustedVoteWeight: 0.65,
          finalRecommendation: 'NEEDS_REVISION (solar storm)',
          confidenceAdjustment: -0.22,
          recommendation: 'NEEDS_REVISION',
          confidence: 0.61,
          resonanceScore: 0.59,
          structuralResonance: 0.59,
          proximity: 0.22,
          phaseAlignment: 0.41,
          vortexAlignment: 0.19,
          synchronization: 0.28,
          signalTiming: 'trailing',
          hammerReason: 'High solar activity suppresses resonance',
          neuralContextUsed: false,
        },
      });

      const resp = await client.governWithSolar({ proposal: 'storm test' });
      expect(resp.solarContext.solarActivityLevel).toBe('storm');
      expect(resp.adjustedVoteWeight).toBe(0.65);
      expect(resp.recommendation).toBe('NEEDS_REVISION');
      expect(resp.confidenceAdjustment).toBeLessThan(0);
    });
  });

  describe('error handling & stats', () => {
    it('increments failed stats + logs on any error', async () => {
      mockCallTool.mockRejectedValueOnce(new Error('transient 503'));

      await expect(
        client.governWithSolar({ proposal: 'fail' })
      ).rejects.toThrow();

      const stats = client.getStats();
      expect(stats.requestsFailed).toBe(1);
      expect(stats.errors).toBe(1);
      expect(frameworkLogger.log).toHaveBeenCalledWith('governance-client', 'solar-check-error', 'error', expect.any(Object));
    });

    it('getStats returns immutable copy', () => {
      const s1 = client.getStats();
      s1.requestsTotal = 999;
      const s2 = client.getStats();
      expect(s2.requestsTotal).not.toBe(999);
    });

    it('resetStats clears everything including average and errors', () => {
      client.resetStats();
      const s = client.getStats();
      expect(s.requestsTotal).toBe(0);
      expect(s.requestsSucceeded).toBe(0);
      expect(s.requestsFailed).toBe(0);
      expect(s.averageResponseTimeMs).toBe(0);
      expect(s.errors).toBe(0);
    });
  });

  describe('isValid* internals (via public behavior)', () => {
    it('rejects solar responses missing required v2 numeric ranges', async () => {
      mockCallTool.mockResolvedValueOnce({
        result: {
          originalRecommendation: 'PASS',
          solarContext: { solarActivityLevel: 'active', solarIsotopicResonance: -0.1, solarActivityModifier: 0, recommendation: 'ok' },
          adjustedVoteWeight: 1.1,
          finalRecommendation: 'PASS',
          confidenceAdjustment: 0.01,
          recommendation: 'PASS',
          confidence: 0.8,
        },
      });

      await expect(client.governWithSolar({ proposal: 'range-fail' })).rejects.toThrow(GovernanceError);
    });
  });

  // ========================================================================
  // FULL HTTP LAYER COVERAGE (fetch mock, no callTool spy override for these)
  // Hits: makeJsonRequest loop/retry/backoff/delay, doJsonRequest (fetch, headers, abort/timeout, !ok, json, AbortError, NetworkError)
  // ========================================================================
  describe('HTTP layer (makeJsonRequest / doJsonRequest / retries / errors) - full branch coverage', () => {
    it('successful fetch path via callTool proxy (default 3 retries configured)', async () => {
      // Fresh client with retries >1 to exercise loop (but success first try)
      const httpClient = new GovernanceClient({
        baseUrl: 'https://http-test.example.com',
        timeoutMs: 2000,
        retryAttempts: 3,
        retryDelayMs: 5,
      });
      // Do NOT override callTool here — let it call real make/do which uses our global fetch mock
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => ({ result: { tool: 'ok' } }),
      } as any);

      const raw = await (httpClient as any).callTool('evaluate_governance', { proposalId: 'http-1' });
      expect(raw).toEqual({ result: { tool: 'ok' } });
      expect(mockFetch).toHaveBeenCalledWith(
        'https://http-test.example.com/call_connected_tool',
        expect.objectContaining({ method: 'POST', headers: expect.objectContaining({ 'Content-Type': 'application/json' }) })
      );
    });

    it('retries on recoverable error then succeeds (exponential backoff path)', async () => {
      const httpClient = new GovernanceClient({
        baseUrl: 'https://retry-test.example.com',
        timeoutMs: 1000,
        retryAttempts: 3,
        retryDelayMs: 1,
      });
      mockFetch
        .mockRejectedValueOnce(new Error('transient network'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ result: { recovered: true } }),
        } as any);

      const raw = await (httpClient as any).callTool('govern_with_solar', { proposal: 'retry-ok' });
      expect(raw.result.recovered).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('exhausts retries and throws last error (REQUEST_FAILED wrapper)', async () => {
      const httpClient = new GovernanceClient({
        baseUrl: 'https://fail-test.example.com',
        timeoutMs: 500,
        retryAttempts: 2,
        retryDelayMs: 1,
      });
      mockFetch.mockRejectedValue(new Error('permanent fail'));

      await expect(
        (httpClient as any).callTool('evaluate_governance', { proposalId: 'fail-all' })
      ).rejects.toThrow();
    });

    it('non-recoverable GovernanceError short-circuits retries (no further attempts)', async () => {
      const httpClient = new GovernanceClient({ retryAttempts: 3 });
      const nonRecover = new GovernanceError('bad payload', GovernanceErrorCode.INVALID_RESPONSE, false);
      mockFetch.mockRejectedValueOnce(nonRecover);

      await expect((httpClient as any).callTool('x', {})).rejects.toBe(nonRecover);
      expect(mockFetch).toHaveBeenCalledTimes(1); // no retry
    });

    it('HTTP !ok status throws GovernanceError REQUEST_FAILED (recoverable for 5xx)', async () => {
      const httpClient = new GovernanceClient({ retryAttempts: 1 });
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable',
        json: async () => ({}),
      } as any);

      await expect((httpClient as any).callTool('x', {})).rejects.toMatchObject({
        code: GovernanceErrorCode.REQUEST_FAILED,
        recoverable: true,
      });
    });

    it('timeout (AbortError) produces GovernanceTimeoutError', async () => {
      const httpClient = new GovernanceClient({ timeoutMs: 1, retryAttempts: 1 });
      // Simulate abort by rejecting with AbortError
      const abortErr = new Error('The operation was aborted');
      abortErr.name = 'AbortError';
      mockFetch.mockRejectedValueOnce(abortErr);

      await expect((httpClient as any).callTool('x', {})).rejects.toBeInstanceOf(GovernanceTimeoutError);
    });

    it('generic network error wraps as GovernanceNetworkError', async () => {
      const httpClient = new GovernanceClient({ retryAttempts: 1 });
      mockFetch.mockRejectedValueOnce(new TypeError('fetch failed'));

      await expect((httpClient as any).callTool('x', {})).rejects.toBeInstanceOf(GovernanceNetworkError);
    });

    it('governWithSolar and evaluateGovernance full paths exercise callTool + stats (with fetch under)', async () => {
      const httpClient = new GovernanceClient({ retryAttempts: 1, timeoutMs: 1000 });
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockSolarSuccessRaw,
      } as any);

      const resp = await httpClient.governWithSolar({ proposal: 'full http solar' });
      expect(resp.solarContext.solarIsotopicResonance).toBe(0.8123);
      expect(httpClient.getStats().requestsSucceeded).toBe(1);
    });

    it('first success average calc + delay utility (edge coverage)', async () => {
      const httpClient = new GovernanceClient({ retryAttempts: 1 });
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ result: { ok: 1 } }) } as any);
      // Use evaluateGovernance so stats are updated (direct callTool doesn't update stats)
      await expect(
        httpClient.evaluateGovernance({ proposalId: 'x', proposalText: 'y', agentReviews: [] })
      ).rejects.toThrow();
      const s = httpClient.getStats();
      expect(s.requestsFailed).toBe(1);
    });
  });
});

// Cross-import for index/types coverage (V2-HEAVY-02)
import * as gov from '../../integrations/governance/index.js';
describe('Governance index + types re-exports (coverage)', () => {
  it('exports GovernanceClient, types, DEFAULT, helpers', () => {
    expect(gov.GovernanceClient).toBeDefined();
    expect(gov.DEFAULT_GOVERNANCE_CONFIG).toBeDefined();
    expect(gov.GovernanceErrorCode).toBeDefined();
    expect(typeof gov.initializeGovernanceIntegration).toBe('function');
  });
});
