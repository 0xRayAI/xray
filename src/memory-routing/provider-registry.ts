import { featuresConfigLoader } from '../core/features-config.js';
import type { MemoryRoutingConfig, MemoryRoutingProvider } from './types.js';
import { NullMemoryRoutingProvider } from './null-provider.js';
import {
  loadMemoryRoutingProvider,
  loadMemoryRoutingProviderSync,
  resolveLeftoverEnabledConfig,
} from './provider-loader.js';
import { validateMemoryRoutingConfig } from './validate-config.js';

let cachedProvider: MemoryRoutingProvider | null = null;
let loadPromise: Promise<MemoryRoutingProvider> | null = null;
const nullProviderSingleton = new NullMemoryRoutingProvider();

export function getMemoryRoutingConfig(): MemoryRoutingConfig {
  const raw = featuresConfigLoader.loadConfig().memory_routing;
  const validation = validateMemoryRoutingConfig(
    raw ?? { enabled: false, provider: 'null' },
  );
  return (
    resolveLeftoverEnabledConfig(validation.normalized, process.cwd()) ??
    validation.normalized
  );
}

export async function getMemoryRoutingProvider(
  forceReload = false,
): Promise<MemoryRoutingProvider> {
  if (!forceReload && cachedProvider && cachedProvider.id !== 'null') return cachedProvider;
  if (!forceReload && loadPromise) return loadPromise;

  const config = getMemoryRoutingConfig();

  loadPromise = loadMemoryRoutingProvider(config).then((provider) => {
    if (provider.id === 'null' && cachedProvider && cachedProvider.id !== 'null') {
      loadPromise = null;
      return cachedProvider;
    }
    cachedProvider = provider;
    loadPromise = null;
    return provider;
  });

  return loadPromise;
}

/** Synchronous accessor — returns shared null singleton until a load completes. */
export function getMemoryRoutingProviderSync(): MemoryRoutingProvider {
  return cachedProvider ?? nullProviderSingleton;
}

/**
 * The first scoreAndRoute call loads the organ before it routes.
 * A later sync read sees the same provider. Off or a missing module stays null.
 */
export function ensureMemoryRoutingProviderSync(): MemoryRoutingProvider {
  if (cachedProvider && cachedProvider.id !== 'null') return cachedProvider;
  const config = getMemoryRoutingConfig();
  if (!config.enabled) return cachedProvider ?? nullProviderSingleton;
  const loaded = loadMemoryRoutingProviderSync(config);
  if (!loaded || loaded.id === 'null') return cachedProvider ?? nullProviderSingleton;
  cachedProvider = loaded;
  return loaded;
}

export function resetMemoryRoutingProvider(): void {
  cachedProvider = null;
  loadPromise = null;
}

/** Kick off load at module init. Sync require first so a later route does not require() an ESM module while its dynamic import is still in flight. */
export function initializeMemoryRouting(): void {
  const loaded = ensureMemoryRoutingProviderSync();
  if (loaded.id === 'null' && getMemoryRoutingConfig().enabled) {
    void getMemoryRoutingProvider();
  }
}