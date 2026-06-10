import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../core/framework-logger.js', () => ({
  frameworkLogger: { log: vi.fn().mockResolvedValue(undefined) },
}));

describe('thinDispatch — scoreComplexity edge cases', () => {
  let scoreComplexity: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import('../../nucleus/thin-dispatch.js');
    scoreComplexity = mod.scoreComplexity;
  });

  it('should handle empty operation string', () => {
    const result = scoreComplexity('', { files: [] });
    expect(result).toBeDefined();
    expect(typeof result.score).toBe('number');
    expect(['simple', 'moderate', 'complex', 'enterprise']).toContain(result.level);
  });

  it('should handle very long operation string', () => {
    const longOp = 'x'.repeat(10000);
    const result = scoreComplexity(longOp, {});
    expect(result).toBeDefined();
    expect(typeof result.score).toBe('number');
  });

  it('should handle empty context object', () => {
    const result = scoreComplexity('fix bug', {});
    expect(result.score).toBeGreaterThanOrEqual(0);
  });

  it('should handle null context', () => {
    const result = scoreComplexity('fix bug', null);
    expect(result.score).toBeGreaterThanOrEqual(0);
  });

  it('should return consistent levels for simple vs complex tasks', () => {
    const simple = scoreComplexity('rename variable', { files: ['a.ts'] });
    const complex = scoreComplexity('redesign auth system with OAuth2, JWT, RBAC, SSO, MFA', {
      files: Array.from({ length: 50 }, (_, i) => `file${i}.ts`),
      changes: { added: 500, deleted: 200, modified: 300 },
    });
    expect(simple.score).toBeLessThanOrEqual(complex.score);
  });
});

describe('thinDispatch — routeToAgent edge cases', () => {
  let routeToAgent: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import('../../nucleus/thin-dispatch.js');
    routeToAgent = mod.routeToAgent;
  });

  it('should return a non-empty string for every complexity level', () => {
    const levels = ['simple', 'moderate', 'complex', 'enterprise'] as const;
    for (const level of levels) {
      const agent = routeToAgent(0, level);
      expect(typeof agent).toBe('string');
      expect(agent.length).toBeGreaterThan(0);
    }
  });

  it('should handle score of 0', () => {
    const agent = routeToAgent(0);
    expect(typeof agent).toBe('string');
    expect(agent.length).toBeGreaterThan(0);
  });

  it('should handle very large score', () => {
    const agent = routeToAgent(999999);
    expect(typeof agent).toBe('string');
    expect(agent.length).toBeGreaterThan(0);
  });

  it('should handle undefined context gracefully via scoreAndRoute', async () => {
    const { scoreAndRoute } = await import('../../nucleus/thin-dispatch.js');
    const result = scoreAndRoute('handle undefined', undefined);
    expect(result).toHaveProperty('score');
    expect(result).toHaveProperty('agent');
    expect(typeof result.agent).toBe('string');
  });
});

describe('thinDispatch — NUCLEUS_THIN_DISPATCH_VERSION', () => {
  it('should be a valid semver string', async () => {
    const mod = await import('../../nucleus/thin-dispatch.js');
    expect(mod.NUCLEUS_THIN_DISPATCH_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });
});
