import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mockExecFileSync = vi.fn();

vi.mock('node:child_process', () => ({
  execFileSync: (...args: unknown[]) => mockExecFileSync(...args),
}));

vi.mock('../../core/framework-logger.js', () => ({
  frameworkLogger: { log: vi.fn() },
}));

import {
  checkHermesOAuthStatus,
  tryLLMGovernance,
  hermesCliAvailable,
} from '../../governance/llm-governance-provider.js';

describe('llm-governance-provider — Hermes CLI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.XRAY_GOVERNANCE_LLM_ENABLED;
    delete process.env.XRAY_LLM_ENABLED;
    delete process.env.XRAY_GOVERNANCE_LLM_ENDPOINT;
    delete process.env.XRAY_GOVERNANCE_LLM_API_KEY;
    delete process.env.XRAY_LLM_ENDPOINT;
    delete process.env.XRAY_LLM_API_KEY;
    delete process.env.HERMES_PROVIDER;
    delete process.env.HERMES_MODEL;
    mockExecFileSync.mockImplementation((cmd: string, args?: string[]) => {
      if (cmd === 'hermes' && args?.[0] === '--version') return 'hermes 0.7.0\n';
      if (cmd === 'hermes' && args?.[0] === '-z') {
        return 'DECISION: approve\nCONFIDENCE: 0.91\nREASONING: Looks good.';
      }
      throw new Error(`unexpected exec: ${cmd} ${args?.join(' ')}`);
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('reports configured when hermes CLI is on PATH', () => {
    const status = checkHermesOAuthStatus();

    expect(status.configured).toBe(true);
    expect(status.endpoint).toBe('hermes-cli');
    expect(status.model).toBe('grok-4.3');
    expect(mockExecFileSync).toHaveBeenCalledWith(
      'hermes',
      ['--version'],
      expect.objectContaining({ encoding: 'utf8' }),
    );
  });

  it('reports not configured when hermes CLI is missing', () => {
    mockExecFileSync.mockImplementation(() => {
      throw new Error('not found');
    });

    const status = checkHermesOAuthStatus();

    expect(status.configured).toBe(false);
    expect(status.error).toContain('Hermes CLI not found');
  });

  it('uses hermes -z with default provider and model', async () => {
    const vote = await tryLLMGovernance(
      'code-review',
      'Test proposal',
      'Description',
      ['evidence-a'],
      'strategic',
    );

    expect(vote).toEqual({
      decision: 'approve',
      confidence: 0.91,
      reasoning: 'Looks good.',
    });
    expect(mockExecFileSync).toHaveBeenCalledWith(
      'hermes',
      ['-z', expect.stringContaining('Test proposal'), '--provider', 'xai-oauth', '--model', 'grok-4.3'],
      expect.objectContaining({ encoding: 'utf8' }),
    );
  });

  it('honors HERMES_PROVIDER and HERMES_MODEL env overrides', async () => {
    process.env.HERMES_PROVIDER = 'custom:opencode.ai';
    process.env.HERMES_MODEL = 'grok-4.1';

    await tryLLMGovernance('researcher', 'Title', 'Body', [], 'strategic');

    expect(mockExecFileSync).toHaveBeenCalledWith(
      'hermes',
      expect.arrayContaining(['--provider', 'custom:opencode.ai', '--model', 'grok-4.1']),
      expect.any(Object),
    );
  });

  it('prefers explicit direct LLM config over hermes CLI', () => {
    process.env.XRAY_GOVERNANCE_LLM_ENABLED = 'true';
    process.env.XRAY_GOVERNANCE_LLM_ENDPOINT = 'https://example.com/v1/chat/completions';
    process.env.XRAY_GOVERNANCE_LLM_API_KEY = 'test-key';
    process.env.XRAY_GOVERNANCE_LLM_MODEL = 'gpt-4o';

    const status = checkHermesOAuthStatus();

    expect(status.configured).toBe(true);
    expect(status.endpoint).toBe('https://example.com/v1/chat/completions');
    expect(status.model).toBe('gpt-4o');
  });

  it('hermesCliAvailable returns false when exec fails', () => {
    mockExecFileSync.mockImplementation(() => {
      throw new Error('missing');
    });

    expect(hermesCliAvailable()).toBe(false);
  });
});