import { existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { pathToFileURL } from 'node:url';
import { frameworkLogger } from '../core/framework-logger.js';
import type {
  MemoryRoutingConfig,
  MemoryRoutingProvider,
  MemoryRoutingProviderConfig,
} from './types.js';
import { createMemoryRoutingProvider as createNullProvider } from './null-provider.js';
import { validateMemoryRoutingConfig } from './validate-config.js';

const REPERTOIRE_CANDIDATE_PATHS = [
  '../repertoire/dist/provider/memory-routing-provider.js',
  '../../repertoire/dist/provider/memory-routing-provider.js',
  '../../../repertoire/dist/provider/memory-routing-provider.js',
];

/**
 * SECURITY: features.json is a trusted configuration boundary.
 * module_path is resolved from disk and dynamically imported without signature
 * verification. Only grant write access to features.json to trusted operators.
 */

function resolveModulePath(
  configuredPath: string | undefined,
  cwd: string,
): string | null {
  if (!configuredPath) return null;

  const candidates = [
    resolve(cwd, configuredPath),
    configuredPath,
  ];

  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate;
  }
  return null;
}

function defaultPathForProvider(
  provider: MemoryRoutingConfig['provider'],
  cwd: string,
): string | null {
  if (provider !== 'repertoire') return null;

  for (const rel of REPERTOIRE_CANDIDATE_PATHS) {
    const abs = resolve(cwd, rel);
    if (existsSync(abs)) return abs;
  }
  return null;
}

export async function loadMemoryRoutingProvider(
  config: MemoryRoutingConfig,
  cwd = process.cwd(),
): Promise<MemoryRoutingProvider> {
  const validation = validateMemoryRoutingConfig(config);

  if (!validation.valid) {
    await frameworkLogger.log(
      'memory-routing',
      'config-invalid',
      'error',
      { errors: validation.errors, provider: config.provider },
    );
    return createNullProvider();
  }

  const effective = validation.normalized;

  if (!effective.enabled || effective.provider === 'null') {
    return createNullProvider();
  }

  const modulePath =
    resolveModulePath(effective.module_path, cwd) ??
    defaultPathForProvider(effective.provider, cwd);

  if (!modulePath) {
    await frameworkLogger.log(
      'memory-routing',
      'provider-not-found',
      'error',
      {
        provider: effective.provider,
        module_path: effective.module_path,
        message: `Provider "${effective.provider}" is configured but module_path could not be resolved. Falling back to null provider.`,
      },
    );
    return createNullProvider();
  }

  try {
    const mod = await import(pathToFileURL(modulePath).href);
    const factory =
      mod.createMemoryRoutingProvider ??
      mod.default?.createMemoryRoutingProvider;

    if (typeof factory !== 'function') {
      throw new Error(
        `Module ${modulePath} must export createMemoryRoutingProvider()`,
      );
    }

    const provider: MemoryRoutingProvider = factory(
      (effective.config ?? {}) as MemoryRoutingProviderConfig,
    );

    if (!provider?.id || typeof provider.isAvailable !== 'function') {
      throw new Error(`Invalid memory routing provider from ${modulePath}`);
    }

    if (!provider.isAvailable()) {
      await frameworkLogger.log(
        'memory-routing',
        'provider-unavailable',
        'error',
        {
          providerId: provider.id,
          modulePath,
          message: `Provider "${provider.id}" loaded but isAvailable() returned false. Falling back to null provider.`,
        },
      );
      return createNullProvider();
    }

    await frameworkLogger.log(
      'memory-routing',
      'provider-loaded',
      'info',
      { providerId: provider.id, name: provider.name, modulePath },
    );

    return provider;
  } catch (err) {
    await frameworkLogger.log(
      'memory-routing',
      'provider-load-failed',
      'error',
      {
        modulePath,
        error: err instanceof Error ? err.message : String(err),
        cwd,
        configDir: dirname(modulePath),
      },
    );
    return createNullProvider();
  }
}