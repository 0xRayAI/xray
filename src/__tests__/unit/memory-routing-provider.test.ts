import { describe, it, expect, beforeEach, vi } from 'vitest';
import { resolve, join } from 'node:path';
import { writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import {
  NullMemoryRoutingProvider,
  resetMemoryRoutingProvider,
  loadMemoryRoutingProvider,
  validateMemoryRoutingConfig,
  getMemoryRoutingProviderSync,
  resolveLeftoverEnabledConfig,
  isLeftoverMemoryRoutingOff,
} from '../../memory-routing/index.js';

vi.mock('../../core/framework-logger.js', () => ({
  frameworkLogger: { log: vi.fn().mockResolvedValue(undefined) },
}));

describe('validateMemoryRoutingConfig', () => {
  it('rejects unknown provider names', () => {
    const result = validateMemoryRoutingConfig({
      enabled: true,
      provider: 'foo',
      module_path: '/tmp/provider.js',
    });
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('foo');
    expect(result.normalized.provider).toBe('null');
  });

  it('requires module_path when enabled with custom provider', () => {
    const result = validateMemoryRoutingConfig({
      enabled: true,
      provider: 'custom',
    });
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('module_path');
  });

  it('accepts valid repertoire config', () => {
    const result = validateMemoryRoutingConfig({
      enabled: true,
      provider: 'repertoire',
      module_path: '../repertoire/dist/provider/memory-routing-provider.js',
    });
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});

describe('MemoryRoutingProvider', () => {
  beforeEach(() => {
    resetMemoryRoutingProvider();
  });

  it('null provider returns unchanged tasks and base agent', () => {
    const provider = new NullMemoryRoutingProvider();
    const tasks = provider.enrichTasks([
      { id: 't1', description: 'fix auth', type: 'design' },
    ]);
    expect(tasks).toHaveLength(1);
    expect(tasks[0].id).toBe('t1');

    const resolved = provider.resolveThinDispatch('code-reviewer', 'fix typo', 10);
    expect(resolved.agent).toBe('code-reviewer');
    expect(resolved.adjustedScore).toBe(10);
  });

  it('getMemoryRoutingProviderSync reuses singleton null instance', () => {
    const a = getMemoryRoutingProviderSync();
    const b = getMemoryRoutingProviderSync();
    expect(a).toBe(b);
    expect(a.id).toBe('null');
  });

  it('leftover default-off enables repertoire when the module resolves', async () => {
    const leftover = { enabled: false, provider: 'null' as const };
    expect(isLeftoverMemoryRoutingOff(leftover)).toBe(true);
    expect(resolveLeftoverEnabledConfig(leftover, join(process.cwd(), 'no-such-consumer'))).toBeNull();

    const parent = join(process.cwd(), '.tmp-memory-routing-leftover');
    const consumer = join(parent, 'app');
    const repertoire = join(parent, 'repertoire');
    mkdirSync(join(repertoire, 'dist', 'provider'), { recursive: true });
    mkdirSync(consumer, { recursive: true });
    writeFileSync(join(repertoire, 'package.json'), JSON.stringify({ name: '@0xray/repertoire' }));
    const fakeModule = join(repertoire, 'dist', 'provider', 'memory-routing-provider.js');
    writeFileSync(
      fakeModule,
      `export function createMemoryRoutingProvider() {
        return {
          id: 'repertoire',
          name: 'fake',
          isAvailable: () => true,
          buildRoutingContext: () => ({ providerId: 'repertoire', matchedSignals: [], matchedTags: [], flags: {}, synthesisAvailable: false }),
          enhanceAgentCapabilities: (m) => m,
          enrichTasks: (t) => t,
          buildInheritedContext: () => ({ providerId: 'repertoire', matchedSignals: [], flags: {} }),
          selectAgent: () => null,
          resolveThinDispatch: (agent, _op, score) => ({ agent, adjustedScore: score, context: { providerId: 'repertoire', matchedSignals: [], matchedTags: [], flags: {}, synthesisAvailable: false } }),
        };
      }\n`,
    );
    try {
      const resolved = resolveLeftoverEnabledConfig(leftover, consumer);
      expect(resolved?.enabled).toBe(true);
      expect(resolved?.provider).toBe('repertoire');
      const provider = await loadMemoryRoutingProvider(leftover, consumer);
      expect(provider.id).toBe('repertoire');
      const optOut = await loadMemoryRoutingProvider(
        { enabled: false, provider: 'repertoire' },
        consumer,
      );
      expect(optOut.id).toBe('null');
    } finally {
      rmSync(parent, { recursive: true, force: true });
    }
  });

  it('returns null provider when config is invalid', async () => {
    const provider = await loadMemoryRoutingProvider({
      enabled: true,
      provider: 'custom',
    });
    expect(provider.id).toBe('null');
  });

  it('returns null provider when module_path does not exist', async () => {
    const provider = await loadMemoryRoutingProvider({
      enabled: true,
      provider: 'custom',
      module_path: '/nonexistent/provider-module.js',
    });
    expect(provider.id).toBe('null');
  });

  it('returns null provider when module lacks factory export', async () => {
    const tmpDir = join(process.cwd(), '.tmp-memory-routing-test');
    mkdirSync(tmpDir, { recursive: true });
    const badModule = join(tmpDir, 'bad-provider.js');
    writeFileSync(badModule, 'export const notAFactory = 1;\n');

    const provider = await loadMemoryRoutingProvider({
      enabled: true,
      provider: 'custom',
      module_path: badModule,
    });
    expect(provider.id).toBe('null');
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('returns null provider when isAvailable() is false', async () => {
    const tmpDir = join(process.cwd(), '.tmp-memory-routing-test');
    mkdirSync(tmpDir, { recursive: true });
    const unavailableModule = join(tmpDir, 'unavailable-provider.js');
    writeFileSync(
      unavailableModule,
      `export function createMemoryRoutingProvider() {
        return {
          id: 'unavailable-test',
          name: 'Unavailable',
          isAvailable: () => false,
          buildRoutingContext: () => ({ providerId: 'unavailable-test', matchedSignals: [], matchedTags: [], flags: {}, synthesisAvailable: false }),
          enhanceAgentCapabilities: (m) => m,
          enrichTasks: (t) => t,
          buildInheritedContext: () => ({ providerId: 'unavailable-test', matchedSignals: [], flags: {} }),
          selectAgent: () => null,
          resolveThinDispatch: (agent, _op, score) => ({ agent, adjustedScore: score, context: { providerId: 'unavailable-test', matchedSignals: [], matchedTags: [], flags: {}, synthesisAvailable: false } }),
        };
      }\n`,
    );

    const provider = await loadMemoryRoutingProvider({
      enabled: true,
      provider: 'custom',
      module_path: unavailableModule,
    });
    expect(provider.id).toBe('null');
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it.skipIf(
    !existsSync(resolve(process.cwd(), '../repertoire/dist/provider/memory-routing-provider.js')),
    'repertoire sibling not built — set up ../repertoire or skip',
  )('loads repertoire provider when module exists', async () => {
    const repertoireProviderPath = resolve(
      process.cwd(),
      '../repertoire/dist/provider/memory-routing-provider.js',
    );

    const provider = await loadMemoryRoutingProvider(
      {
        enabled: true,
        provider: 'custom',
        module_path: repertoireProviderPath,
        config: {
          signalsPath: resolve(process.cwd(), '../repertoire/data/curated_signals.json'),
        },
      },
      resolve(process.cwd(), '..'),
    );

    if (provider.id === 'repertoire') {
      const ctx = provider.buildRoutingContext('ontological-trap attestation boundary');
      expect(ctx.matchedSignals.length).toBeGreaterThan(0);
      expect(ctx.flags.ontologicalTrapDetected).toBe(true);

      const operation = 'ontological-trap attestation boundary';
      const thin = provider.resolveThinDispatch('code-reviewer', operation, 30);
      expect(thin.adjustedScore).toBeGreaterThanOrEqual(30);
      expect(thin.context.flags.ontologicalTrapDetected).toBe(true);
    } else {
      expect(provider.id).toBe('null');
    }
  });

  it.skipIf(
    !existsSync(resolve(process.cwd(), '../repertoire/dist/provider/memory-routing-provider.js')),
    'repertoire sibling not built',
  )('loads repertoire provider via framework features default', async () => {
    const provider = await loadMemoryRoutingProvider(
      {
        enabled: true,
        provider: 'repertoire',
        module_path: '../repertoire/dist/provider/memory-routing-provider.js',
        config: {
          dataDir: '../repertoire/data',
          signalsPath: '../repertoire/data/curated_signals.json',
        },
      },
      process.cwd(),
    );
    expect(provider.id).toBe('repertoire');
    expect(provider.isAvailable()).toBe(true);
  });
});