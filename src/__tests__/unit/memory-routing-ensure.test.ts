import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NullMemoryRoutingProvider } from '../../memory-routing/null-provider.js';
import type { MemoryRoutingProvider } from '../../memory-routing/types.js';

const { loadSync, loadAsync } = vi.hoisted(() => ({
  loadSync: vi.fn(),
  loadAsync: vi.fn(),
}));

vi.mock('../../core/framework-logger.js', () => ({
  frameworkLogger: { log: vi.fn().mockResolvedValue(undefined) },
}));

vi.mock('../../core/features-config.js', () => ({
  featuresConfigLoader: {
    loadConfig: () => ({
      memory_routing: {
        enabled: true,
        provider: 'repertoire',
        module_path: 'vendor/@0xray/repertoire/dist/provider/memory-routing-provider.js',
      },
    }),
  },
}));

vi.mock('../../memory-routing/provider-loader.js', () => ({
  loadMemoryRoutingProviderSync: (...args: unknown[]) => loadSync(...args),
  loadMemoryRoutingProvider: (...args: unknown[]) => loadAsync(...args),
  resolveLeftoverEnabledConfig: (config: unknown) => config,
}));

import {
  ensureMemoryRoutingProviderSync,
  getMemoryRoutingProvider,
  resetMemoryRoutingProvider,
} from '../../memory-routing/provider-registry.js';

const repertoire = {
  id: 'repertoire',
  name: 'repertoire',
  isAvailable: () => true,
} as MemoryRoutingProvider;

describe('ensureMemoryRoutingProviderSync', () => {
  beforeEach(() => {
    resetMemoryRoutingProvider();
    loadSync.mockReset();
    loadAsync.mockReset();
  });

  it('replaces a cached null provider with a synchronous organ', async () => {
    loadAsync.mockResolvedValue(new NullMemoryRoutingProvider());
    await getMemoryRoutingProvider();
    loadSync.mockReturnValue(repertoire);

    expect(ensureMemoryRoutingProviderSync().id).toBe('repertoire');
    expect(loadSync).toHaveBeenCalledTimes(1);
  });

  it('keeps a synchronous organ when the in-flight load later returns null', async () => {
    let finish: (provider: MemoryRoutingProvider) => void = () => {};
    loadAsync.mockReturnValue(new Promise<MemoryRoutingProvider>((resolve) => {
      finish = resolve;
    }));
    const pending = getMemoryRoutingProvider();
    loadSync.mockReturnValue(repertoire);

    expect(ensureMemoryRoutingProviderSync().id).toBe('repertoire');
    finish(new NullMemoryRoutingProvider());
    await pending;

    expect(ensureMemoryRoutingProviderSync().id).toBe('repertoire');
    expect(loadSync).toHaveBeenCalledTimes(1);
  });
});
