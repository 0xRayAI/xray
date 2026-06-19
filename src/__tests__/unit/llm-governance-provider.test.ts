import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mockHomedir = vi.fn(() => '/mock-home');
const mockExistsSync = vi.fn();
const mockReadFileSync = vi.fn();

vi.mock('node:os', () => ({
  homedir: () => mockHomedir(),
}));

vi.mock('node:fs', () => ({
  existsSync: (...args: unknown[]) => mockExistsSync(...args),
  readFileSync: (...args: unknown[]) => mockReadFileSync(...args),
}));

vi.mock('../../core/framework-logger.js', () => ({
  frameworkLogger: { log: vi.fn() },
}));

import { checkHermesOAuthStatus } from '../../governance/llm-governance-provider.js';

describe('llm-governance-provider — Hermes auth', () => {
  const authPath = '/mock-home/.hermes/auth.json';

  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.XRAY_GOVERNANCE_LLM_ENABLED;
    delete process.env.XRAY_LLM_ENABLED;
    delete process.env.XRAY_GOVERNANCE_LLM_ENDPOINT;
    delete process.env.XRAY_GOVERNANCE_LLM_API_KEY;
    delete process.env.XRAY_LLM_ENDPOINT;
    delete process.env.XRAY_LLM_API_KEY;
    mockHomedir.mockReturnValue('/mock-home');
    mockExistsSync.mockImplementation((path: string) => path === authPath);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('reads Hermes v2 providers.xai-oauth.tokens.access_token', () => {
    const lastRefresh = new Date().toISOString();
    mockReadFileSync.mockReturnValue(
      JSON.stringify({
        providers: {
          'xai-oauth': {
            last_refresh: lastRefresh,
            expires_in: 86_400,
            tokens: {
              access_token: 'v2-test-token',
              token_type: 'Bearer',
            },
          },
        },
      }),
    );

    const status = checkHermesOAuthStatus();

    expect(status.configured).toBe(true);
    expect(status.endpoint).toBe('https://api.x.ai/v1/chat/completions');
    expect(status.model).toBe('grok-4.3');
  });

  it('rejects expired Hermes v2 tokens', () => {
    mockReadFileSync.mockReturnValue(
      JSON.stringify({
        providers: {
          'xai-oauth': {
            last_refresh: '2020-01-01T00:00:00.000Z',
            expires_in: 60,
            tokens: {
              access_token: 'expired-token',
            },
          },
        },
      }),
    );

    const status = checkHermesOAuthStatus();

    expect(status.configured).toBe(false);
    expect(status.error).toContain('no valid xai-oauth token');
  });

  it('reads Hermes credential_pool.xai-oauth oauth array (gateway format)', () => {
    mockReadFileSync.mockReturnValue(
      JSON.stringify({
        version: 1,
        credential_pool: {
          'xai-oauth': [
            {
              id: 'cc475e',
              auth_type: 'oauth',
              access_token: 'pool-array-token',
              refresh_token: 'refresh',
              expires_at: Math.floor(Date.now() / 1000) + 3600,
            },
          ],
        },
      }),
    );

    const status = checkHermesOAuthStatus();

    expect(status.configured).toBe(true);
  });

  it('still reads legacy top-level xai-oauth format', () => {
    mockReadFileSync.mockReturnValue(
      JSON.stringify({
        'xai-oauth': {
          access_token: 'legacy-token',
          expires_at: Math.floor(Date.now() / 1000) + 3600,
        },
      }),
    );

    const status = checkHermesOAuthStatus();

    expect(status.configured).toBe(true);
  });
});