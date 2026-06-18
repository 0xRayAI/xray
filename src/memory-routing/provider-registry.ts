import { featuresConfigLoader } from '../core/features-config.js';
import type { MemoryRoutingConfig, MemoryRoutingProvider } from './types.js';
import { NullMemoryRoutingProvider } from './null-provider.js';
import { loadMemoryRoutingProvider } from './provider-loader.js';
import { validateMemoryRoutingConfig } from './validate-config.js';

let cachedProvider: MemoryRoutingProvider | null = null;
let loadPromise: Promise<MemoryRoutingProvider> | null = null;
const nullProviderSingleton = new NullMemoryRoutingProvider();

export function getMemoryRoutingConfig(): MemoryRoutingConfig {
  const raw = featuresConfigLoader.loadConfig().memory_routing;
  const validation = validateMemoryRoutingConfig(
    raw ?? { enabled: false, provider: 'null' },
  );
  return validation.normalized;
}

export async function getMemoryRoutingProvider(
  forceReload = false,
): Promise<MemoryRoutingProvider> {
  if (!forceReload && cachedProvider) return cachedProvider;
  if (!forceReload && loadPromise) return loadPromise;

  const config = getMemoryRoutingConfig();

  loadPromise = loadMemoryRoutingProvider(config).then((provider) => {
    cachedProvider = provider;
    loadPromise = null;
    return provider;
  });

  return loadPromise;
}

/** Synchronous accessor — returns shared null singleton until async load completes. */
export function getMemoryRoutingProviderSync(): MemoryRoutingProvider {
  return cachedProvider ?? nullProviderSingleton;
}

export function resetMemoryRoutingProvider(): void {
  cachedProvider = null;
  loadPromise = null;
}

/** Kick off background load at module init. */
export function initializeMemoryRouting(): void {
  const config = getMemoryRoutingConfig();
  if (config.enabled) {
    void getMemoryRoutingProvider();
  }
}