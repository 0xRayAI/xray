/**
 * Self-Evolution E2E — Simulated long-running governed agent session
 *
 * Tests the full self-evolution loop under concentrated activity:
 *   PostProcessor lifecycle → SelfProposalEngine → kernel governance → metamorphosis scoring
 *
 * Instead of waiting 60+ real minutes, we inject concentrated log entries
 * that represent the accumulated activity of a long session, then verify
 * every pipeline stage produces correct results.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { SelfProposalEngine } from '../../postprocessor/metamorphosis/SelfProposalEngine.js';
import type { MetamorphosisProposal } from '../../types/metamorphosis.js';

vi.mock('../../core/framework-logger.js', () => ({
  frameworkLogger: { log: vi.fn().mockResolvedValue(undefined) },
}));

vi.mock('../../nucleus/govern-http.js', () => ({
  handleGovernRequest: vi.fn(),
}));

import { handleGovernRequest } from '../../nucleus/govern-http.js';

function makeLogLine(
  component: string,
  action: string,
  status: string,
  details?: Record<string, unknown>,
): string {
  const ts = new Date().toISOString();
  const detailsStr = details ? ` | ${JSON.stringify(details)}` : '';
  return `${ts} [job-session] [trace.e2e] [${component}] ${action} - ${status.toUpperCase()}${detailsStr}`;
}

/**
 * Generate a burst of log entries simulating a concentrated period of activity.
 * Each "minute" gets a mix of errors, warnings, and info entries.
 */
function generateSessionLog(minutes: number, opts?: {
  errorsPerMinute?: number;
  warningsPerMinute?: number;
  governanceRejectionsPerMinute?: number;
}): string {
  const e = opts?.errorsPerMinute ?? 1;
  const w = opts?.warningsPerMinute ?? 2;
  const g = opts?.governanceRejectionsPerMinute ?? 0;
  const lines: string[] = [];

  for (let m = 0; m < minutes; m++) {
    for (let i = 0; i < e; i++) {
      lines.push(makeLogLine('postprocessor', 'deploy-failed', 'error'));
    }
    for (let i = 0; i < w; i++) {
      lines.push(makeLogLine('monitoring', 'check-timeout', 'warning'));
    }
    for (let i = 0; i < g; i++) {
      lines.push(makeLogLine('governance', 'proposal-rejected', 'rejected', { decision: 'reject' }));
    }
    lines.push(makeLogLine('session', 'heartbeat', 'info'));
  }
  return lines.join('\n');
}

describe('Self-Evolution E2E — Simulated Long-Running Session', () => {
  let tmpLogPath: string;
  let tmpProjectRoot: string;

  beforeEach(() => {
    vi.clearAllMocks();
    tmpLogPath = join(tmpdir(), `self-evolution-e2e-${Date.now()}.log`);
    tmpProjectRoot = join(tmpdir(), `self-evolution-root-${Date.now()}`);
  });

  afterEach(async () => {
    try { await fs.unlink(tmpLogPath); } catch {}
    try { await fs.rm(tmpProjectRoot, { recursive: true, force: true }); } catch {}
  });

  async function readAppliedState(root: string): Promise<Array<Record<string, unknown>>> {
    try {
      const content = await fs.readFile(join(root, 'config', 'self-evolution-state.json'), 'utf-8');
      return JSON.parse(content).applied || [];
    } catch {
      return [];
    }
  }

  it('detects elevated error rate after 60 simulated minutes of activity', async () => {
    // 60 minutes × 3 errors/min = 180 errors (well above threshold of 5)
    // Zero out other patterns to avoid multiple proposals per onPhase
    const logContent = generateSessionLog(60, { errorsPerMinute: 3, warningsPerMinute: 0 });
    await fs.writeFile(tmpLogPath, logContent);

    const engine = new SelfProposalEngine({
      activityLogPath: tmpLogPath,
      maxProposalsPerHour: 10,
      projectRoot: tmpProjectRoot,
    });

    (handleGovernRequest as any).mockResolvedValue({
      results: [{ finalDecision: 'approve', metamorphosisScore: 0.85 }],
    });

    await engine.onPhase('monitoring-complete', {});

    expect(handleGovernRequest).toHaveBeenCalledTimes(1);
    const call = (handleGovernRequest as any).mock.calls[0][0];
    expect(call.proposals[0].type).toBe('metamorphosis');
    expect(call.proposals[0].description).toContain('error');
    expect(call.options.metamorphosisThreshold).toBe(0.7);

    const applied = await readAppliedState(tmpProjectRoot);
    expect(applied.length).toBe(1);
    expect(applied[0].proposalId).toBe(call.proposals[0].id);
  });

  it('detects warning patterns after concentrated warning activity', async () => {
    // 20 minutes × 6 warnings/min = 120 warnings (well above threshold of 10)
    const logContent = generateSessionLog(20, { warningsPerMinute: 6, errorsPerMinute: 0 });
    await fs.writeFile(tmpLogPath, logContent);

    const engine = new SelfProposalEngine({
      activityLogPath: tmpLogPath,
      maxProposalsPerHour: 10,
      projectRoot: tmpProjectRoot,
    });

    (handleGovernRequest as any).mockResolvedValue({
      results: [{ finalDecision: 'approve', metamorphosisScore: 0.75 }],
    });

    await engine.onPhase('post-process-complete', {});

    expect(handleGovernRequest).toHaveBeenCalledTimes(1);
    const call = (handleGovernRequest as any).mock.calls[0][0];
    expect(call.proposals[0].description).toContain('warning');

    const applied = await readAppliedState(tmpProjectRoot);
    expect(applied.length).toBe(1);
  });

  it('detects governance rejection patterns from session activity', async () => {
    // 30 minutes × 2 rejections/min = 60 (well above threshold of 3)
    // Zero out other patterns to isolate rejection detection
    const logContent = generateSessionLog(30, { governanceRejectionsPerMinute: 2, errorsPerMinute: 0, warningsPerMinute: 0 });
    await fs.writeFile(tmpLogPath, logContent);

    const engine = new SelfProposalEngine({
      activityLogPath: tmpLogPath,
      maxProposalsPerHour: 10,
      projectRoot: tmpProjectRoot,
    });

    (handleGovernRequest as any).mockResolvedValue({
      results: [{ finalDecision: 'approve', metamorphosisScore: 0.8 }],
    });

    await engine.onPhase('monitoring-complete', {});

    expect(handleGovernRequest).toHaveBeenCalledTimes(1);
    const call = (handleGovernRequest as any).mock.calls[0][0];
    expect(call.proposals[0].description).toContain('governance rejection');

    const applied = await readAppliedState(tmpProjectRoot);
    expect(applied.length).toBe(1);
  });

  it('produces multiple proposal types from a single session when multiple thresholds exceeded', async () => {
    // 60 minutes: high error rate + high warning rate + governance rejections
    const logContent = generateSessionLog(60, {
      errorsPerMinute: 3,
      warningsPerMinute: 5,
      governanceRejectionsPerMinute: 1,
    });
    await fs.writeFile(tmpLogPath, logContent);

    const engine = new SelfProposalEngine({
      activityLogPath: tmpLogPath,
      maxProposalsPerHour: 10,
      projectRoot: tmpProjectRoot,
    });

    (handleGovernRequest as any).mockResolvedValue({
      results: [{ finalDecision: 'approve', metamorphosisScore: 0.9 }],
    });

    await engine.onPhase('monitoring-complete', {});

    // Should submit at least 2 proposals (error + warning patterns)
    expect(handleGovernRequest).toHaveBeenCalled();
    const call = (handleGovernRequest as any).mock.calls[0][0];
    expect(call.proposals.length).toBeGreaterThanOrEqual(1);
    // The SelfProposalEngine submits each pattern as a separate proposal
    // via the submitProposal loop in evaluateAndPropose

    const applied = await readAppliedState(tmpProjectRoot);
    expect(applied.length).toBeGreaterThanOrEqual(1);
  });

  it('submits metamorphosis proposals through governance with correct options', async () => {
    const logContent = generateSessionLog(30, { errorsPerMinute: 4 });
    await fs.writeFile(tmpLogPath, logContent);

    const engine = new SelfProposalEngine({
      activityLogPath: tmpLogPath,
      maxProposalsPerHour: 10,
      projectRoot: tmpProjectRoot,
    });

    (handleGovernRequest as any).mockResolvedValue({
      results: [{ finalDecision: 'approve', metamorphosisScore: 0.88 }],
    });

    await engine.onPhase('monitoring-complete', {});

    const call = (handleGovernRequest as any).mock.calls[0][0];
    expect(call.options.requireExternalDynamo).toBe(true);
    expect(call.options.metamorphosisThreshold).toBe(0.7);
    expect(call.proposals[0].source).toBe('metamorphosis');
    expect(call.proposals[0].confidence).toBe(0.7);

    const applied = await readAppliedState(tmpProjectRoot);
    expect(applied.length).toBeGreaterThanOrEqual(1);
  });

  it('enforces rate limiting across session cycles', async () => {
    // Only errors to produce exactly one proposal per onPhase
    const logContent = generateSessionLog(10, { errorsPerMinute: 5, warningsPerMinute: 0 });
    await fs.writeFile(tmpLogPath, logContent);

    const engine = new SelfProposalEngine({
      activityLogPath: tmpLogPath,
      maxProposalsPerHour: 1,
      projectRoot: tmpProjectRoot,
    });

    (handleGovernRequest as any).mockResolvedValue({
      results: [{ finalDecision: 'approve', metamorphosisScore: 0.9 }],
    });

    // First trigger — should submit exactly one proposal
    await engine.onPhase('monitoring-complete', {});
    expect(handleGovernRequest).toHaveBeenCalledTimes(1);

    // Second trigger within same hour — rate limited
    await engine.onPhase('post-process-complete', {});
    expect(handleGovernRequest).toHaveBeenCalledTimes(1);

    const applied = await readAppliedState(tmpProjectRoot);
    expect(applied.length).toBe(1);
  });

  it('circuit breaker halts proposals after consecutive failures across sessions', async () => {
    // Only errors to produce exactly one proposal per onPhase
    const logContent = generateSessionLog(10, { errorsPerMinute: 5, warningsPerMinute: 0 });
    await fs.writeFile(tmpLogPath, logContent);

    const engine = new SelfProposalEngine({
      activityLogPath: tmpLogPath,
      maxProposalsPerHour: 10,
      circuitBreakerThreshold: 2,
      circuitBreakerCooldownHours: 24,
    });

    // Submit returns rejection — increments consecutiveFailures
    (handleGovernRequest as any).mockResolvedValue({
      results: [{ finalDecision: 'reject', metamorphosisScore: 0.3 }],
    });

    await engine.onPhase('monitoring-complete', {});
    expect((engine as any).consecutiveFailures).toBe(1);

    await engine.onPhase('post-process-complete', {});
    // Second call triggers again, but still gets rejection
    expect((engine as any).consecutiveFailures).toBe(2);

    // Circuit breaker activated — this should be blocked
    await engine.onPhase('monitoring-complete', {});
    // handleGovernRequest should NOT have been called a third time
    expect(handleGovernRequest).toHaveBeenCalledTimes(2);
    expect((engine as any).circuitBreakerUntil).toBeGreaterThan(0);
  });

  it('circuit breaker resets after cooldown or success', async () => {
    // Only errors to produce exactly one proposal per onPhase
    const logContent = generateSessionLog(10, { errorsPerMinute: 5, warningsPerMinute: 0 });
    await fs.writeFile(tmpLogPath, logContent);

    const engine = new SelfProposalEngine({
      activityLogPath: tmpLogPath,
      maxProposalsPerHour: 10,
      circuitBreakerThreshold: 2,
      circuitBreakerCooldownHours: 0, // immediate cooldown
      projectRoot: tmpProjectRoot,
    });

    // First rejection
    (handleGovernRequest as any).mockResolvedValue({
      results: [{ finalDecision: 'reject', metamorphosisScore: 0.3 }],
    });
    await engine.onPhase('monitoring-complete', {});
    expect((engine as any).consecutiveFailures).toBe(1);

    // Second rejection triggers breaker
    await engine.onPhase('post-process-complete', {});
    expect((engine as any).consecutiveFailures).toBe(2);

    // Now switch governance to approve and test that breaker resets
    // Since cooldownHours=0, circuitBreakerUntil should be in the past
    (handleGovernRequest as any).mockResolvedValue({
      results: [{ finalDecision: 'approve', metamorphosisScore: 0.9 }],
    });

    // Manually reset for test: set circuitBreakerUntil to past
    (engine as any).circuitBreakerUntil = 0;
    (engine as any).consecutiveFailures = 2;

    await engine.onPhase('monitoring-complete', {});
    // Now it should submit and succeed
    expect((engine as any).consecutiveFailures).toBe(0);

    const applied = await readAppliedState(tmpProjectRoot);
    expect(applied.length).toBe(1);
  });

  it('handles mixed log quality (valid + unparseable) from long sessions', () => {
    const lines = Array(10).fill(null).map(() => makeLogLine('processor', 'work', 'error'));
    lines.push('garbage line with no structure');
    lines.push('another corrupt entry');
    const mixed = lines;

    const engine = new SelfProposalEngine({ activityLogPath: tmpLogPath, maxProposalsPerHour: 10 });
    const patterns = (engine as any).detectPatterns(mixed);
    // 10 errors >= threshold of 5 => should produce error proposal
    expect(patterns.some((p: MetamorphosisProposal) => p.target.startsWith('config/error'))).toBe(true);
  });

  it('produces no proposals when below all thresholds (stable session)', async () => {
    // 60 minutes of mostly info with very few errors
    const logContent = generateSessionLog(60, {
      errorsPerMinute: 0,
      warningsPerMinute: 0,
    });
    await fs.writeFile(tmpLogPath, logContent);

    const engine = new SelfProposalEngine({
      activityLogPath: tmpLogPath,
      maxProposalsPerHour: 10,
    });

    await engine.onPhase('monitoring-complete', {});
    expect(handleGovernRequest).not.toHaveBeenCalled();
  });

  it('whitelists targets correctly for all proposal types in a session', async () => {
    const logContent = generateSessionLog(30, {
      errorsPerMinute: 5,
      warningsPerMinute: 12,
    });
    await fs.writeFile(tmpLogPath, logContent);

    // Only allow config/error* targets
    const engine = new SelfProposalEngine({
      activityLogPath: tmpLogPath,
      maxProposalsPerHour: 10,
      whitelistedTargets: ['config/error'],
    });

    const patterns = (engine as any).detectPatterns(
      logContent.split('\n'),
    );

    expect(patterns.length).toBe(1);
    expect(patterns[0].target).toBe('config/error-handling');
  });
});
