import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SelfProposalEngine } from '../../postprocessor/metamorphosis/SelfProposalEngine.js';
import { promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

vi.mock('../../core/framework-logger.js', () => ({
  frameworkLogger: { log: vi.fn().mockResolvedValue(undefined) },
}));

vi.mock('../../nucleus/govern-http.js', () => ({
  handleGovernRequest: vi.fn(),
}));

import { handleGovernRequest } from '../../nucleus/govern-http.js';

async function readAppliedState(root: string): Promise<Array<Record<string, unknown>>> {
  try {
    const content = await fs.readFile(join(root, 'config', 'self-evolution-state.json'), 'utf-8');
    return JSON.parse(content).applied || [];
  } catch {
    return [];
  }
}

function makeLogLine(component: string, action: string, status: string, details?: Record<string, unknown>): string {
  const ts = new Date().toISOString();
  const detailsStr = details ? ` | ${JSON.stringify(details)}` : '';
  return `${ts} [job-test] [trace.1] [${component}] ${action} - ${status.toUpperCase()}${detailsStr}`;
}

describe('SelfProposalEngine', () => {
  let engine: SelfProposalEngine;
  let tmpLogPath: string;
  let tmpProjectRoot: string;

  beforeEach(async () => {
    vi.clearAllMocks();
    tmpLogPath = join(tmpdir(), `self-proposal-test-${Date.now()}.log`);
    tmpProjectRoot = join(tmpdir(), `self-proposal-root-${Date.now()}`);
    engine = new SelfProposalEngine({
      maxProposalsPerHour: 10,
      circuitBreakerThreshold: 3,
      activityLogPath: tmpLogPath,
      projectRoot: tmpProjectRoot,
    });
  });

  afterEach(async () => {
    try { await fs.unlink(tmpLogPath); } catch {}
    try { await fs.rm(tmpProjectRoot, { recursive: true, force: true }); } catch {}
  });

  it('has name "self-proposal"', () => {
    expect(engine.name).toBe('self-proposal');
  });

  it('ignores phases other than monitoring-complete and post-process-complete', async () => {
    await engine.onPhase('some-other-phase', {});
    expect(handleGovernRequest).not.toHaveBeenCalled();
  });

  it('skips when log file does not exist', async () => {
    await engine.onPhase('monitoring-complete', {});
    expect(handleGovernRequest).not.toHaveBeenCalled();
  });

  it('detects error patterns from structured log entries and submits proposal', async () => {
    const lines = Array(6).fill(null).map(() => makeLogLine('postprocessor', 'deploy-failed', 'error')).join('\n');
    await fs.writeFile(tmpLogPath, lines);

    (handleGovernRequest as any).mockResolvedValue({
      results: [{ finalDecision: 'approve', metamorphosisScore: 0.9 }],
    });

    await engine.onPhase('monitoring-complete', {});

    expect(handleGovernRequest).toHaveBeenCalledTimes(1);
    const call = (handleGovernRequest as any).mock.calls[0][0];
    expect(call.proposals[0].type).toBe('metamorphosis');
    expect(call.proposals[0].source).toBe('metamorphosis');
    expect(call.options.metamorphosisThreshold).toBe(0.7);

    const applied = await readAppliedState(tmpProjectRoot);
    expect(applied.length).toBe(1);
    expect(applied[0].proposalId).toBe(call.proposals[0].id);
  });

  it('detects warning patterns from structured log entries', async () => {
    const lines = Array(11).fill(null).map(() => makeLogLine('monitoring', 'check-timeout', 'warning')).join('\n');
    await fs.writeFile(tmpLogPath, lines);

    (handleGovernRequest as any).mockResolvedValue({
      results: [{ finalDecision: 'approve', metamorphosisScore: 0.85 }],
    });

    await engine.onPhase('monitoring-complete', {});
    expect(handleGovernRequest).toHaveBeenCalledTimes(1);
    const call = (handleGovernRequest as any).mock.calls[0][0];
    expect(call.proposals[0].description).toContain('warning');
  });

  it('detects governance rejection patterns', async () => {
    const lines = Array(4).fill(null).map(() =>
      makeLogLine('governance', 'proposal-rejected', 'rejected', { decision: 'reject' })
    ).join('\n');
    await fs.writeFile(tmpLogPath, lines);

    (handleGovernRequest as any).mockResolvedValue({
      results: [{ finalDecision: 'approve', metamorphosisScore: 0.75 }],
    });

    await engine.onPhase('post-process-complete', {});
    expect(handleGovernRequest).toHaveBeenCalledTimes(1);
    const call = (handleGovernRequest as any).mock.calls[0][0];
    expect(call.proposals[0].description).toContain('governance rejections');
  });

  it('no proposal when below thresholds', async () => {
    const lines = Array(2).fill(null).map(() => makeLogLine('postprocessor', 'deploy', 'info')).join('\n');
    await fs.writeFile(tmpLogPath, lines);

    await engine.onPhase('monitoring-complete', {});
    expect(handleGovernRequest).not.toHaveBeenCalled();
  });

  it('resets consecutive failures on approval', async () => {
    const lines = Array(6).fill(null).map(() => makeLogLine('postprocessor', 'error', 'error')).join('\n');
    await fs.writeFile(tmpLogPath, lines);

    (handleGovernRequest as any).mockResolvedValue({
      results: [{ finalDecision: 'approve', metamorphosisScore: 0.9 }],
    });

    await engine.onPhase('monitoring-complete', {});
    expect((engine as any).consecutiveFailures).toBe(0);

    const applied = await readAppliedState(tmpProjectRoot);
    expect(applied.length).toBeGreaterThanOrEqual(1);
  });

  it('writes exact JSON shape with score and decision to state file', async () => {
    const lines = Array(6).fill(null).map(() => makeLogLine('postprocessor', 'error', 'error')).join('\n');
    await fs.writeFile(tmpLogPath, lines);

    (handleGovernRequest as any).mockResolvedValue({
      results: [{ finalDecision: 'approve', metamorphosisScore: 0.85 }],
    });

    await engine.onPhase('monitoring-complete', {});

    const statePath = join(tmpProjectRoot, 'config', 'self-evolution-state.json');
    const content = await fs.readFile(statePath, 'utf-8');
    const parsed = JSON.parse(content);
    expect(Array.isArray(parsed.applied)).toBe(true);
    expect(parsed.applied.length).toBe(1);

    const entry = parsed.applied[0];
    expect(entry.proposalId).toEqual(expect.any(String));
    expect(entry.target).toEqual(expect.any(String));
    expect(entry.type).toEqual(expect.any(String));
    expect(entry.description).toEqual(expect.any(String));
    expect(entry.rationale).toEqual(expect.any(String));
    expect(entry.impact).toEqual(expect.any(String));
    expect(entry.metamorphosisScore).toBe(0.85);
    expect(entry.decision).toBe('approve');
    expect(entry.appliedAt).toEqual(expect.any(String));
  });

  it('increments consecutive failures on rejection', async () => {
    const lines = Array(6).fill(null).map(() => makeLogLine('postprocessor', 'error', 'error')).join('\n');
    await fs.writeFile(tmpLogPath, lines);

    (handleGovernRequest as any).mockResolvedValue({
      results: [{ finalDecision: 'reject', metamorphosisScore: 0.3 }],
    });

    await engine.onPhase('monitoring-complete', {});
    expect((engine as any).consecutiveFailures).toBe(1);
  });

  it('filters proposals to whitelisted targets', () => {
    const filtered = new SelfProposalEngine({ whitelistedTargets: ['config/'] });
    const patterns = (filtered as any).detectPatterns(
      Array(6).fill(makeLogLine('postprocessor', 'error', 'error')),
    );
    expect(patterns.every((p: any) => p.target.startsWith('config/'))).toBe(true);
  });

  it('respects rate limiting', async () => {
    const lines = Array(6).fill(null).map(() => makeLogLine('postprocessor', 'error', 'error')).join('\n');
    await fs.writeFile(tmpLogPath, lines);

    (handleGovernRequest as any).mockResolvedValue({
      results: [{ finalDecision: 'approve', metamorphosisScore: 0.9 }],
    });

    const limited = new SelfProposalEngine({
      maxProposalsPerHour: 1,
      activityLogPath: tmpLogPath,
      projectRoot: tmpProjectRoot,
    });
    await limited.onPhase('monitoring-complete', {});
    await limited.onPhase('monitoring-complete', {});

    expect(handleGovernRequest).toHaveBeenCalledTimes(1);
  });

  it('uses configurable thresholds from config', async () => {
    const lines = Array(3).fill(null).map(() => makeLogLine('postprocessor', 'error', 'error')).join('\n');
    await fs.writeFile(tmpLogPath, lines);

    const customEngine = new SelfProposalEngine({
      errorThreshold: 2,
      activityLogPath: tmpLogPath,
      maxProposalsPerHour: 10,
      projectRoot: tmpProjectRoot,
    });

    (handleGovernRequest as any).mockResolvedValue({
      results: [{ finalDecision: 'approve', metamorphosisScore: 0.8 }],
    });

    await customEngine.onPhase('monitoring-complete', {});
    expect(handleGovernRequest).toHaveBeenCalledTimes(1);
  });

  it('handles mixed structured and unparseable log lines', () => {
    const mixed = [
      makeLogLine('postprocessor', 'error', 'error'),
      'this is not a valid log line',
      makeLogLine('monitoring', 'warn', 'warning'),
      '',
      makeLogLine('postprocessor', 'error2', 'error'),
    ];
    const patterns = (engine as any).detectPatterns(mixed);
    // With only 2 errors (below threshold of 5), no error proposal
    // With only 1 warning (below threshold of 10), no warning proposal
    expect(patterns.length).toBe(0);
  });
});