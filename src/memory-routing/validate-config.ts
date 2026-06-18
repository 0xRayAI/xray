import type { MemoryRoutingConfig } from './types.js';

const VALID_PROVIDERS = new Set(['null', 'repertoire', 'custom']);

export interface MemoryRoutingValidation {
  valid: boolean;
  errors: string[];
  normalized: MemoryRoutingConfig;
}

export function validateMemoryRoutingConfig(
  raw: unknown,
): MemoryRoutingValidation {
  const errors: string[] = [];
  const input = (raw ?? {}) as Partial<MemoryRoutingConfig>;

  const enabled = input.enabled === true;
  const provider = typeof input.provider === 'string' ? input.provider : 'null';

  if (!VALID_PROVIDERS.has(provider)) {
    errors.push(
      `Invalid memory_routing.provider "${provider}". Must be one of: null, repertoire, custom.`,
    );
  }

  if (enabled && provider !== 'null' && !input.module_path) {
    errors.push(
      `memory_routing.provider "${provider}" requires module_path when enabled.`,
    );
  }

  if (input.module_path !== undefined && typeof input.module_path !== 'string') {
    errors.push('memory_routing.module_path must be a string.');
  }

  if (input.config !== undefined && (typeof input.config !== 'object' || input.config === null)) {
    errors.push('memory_routing.config must be an object.');
  }

  const normalized: MemoryRoutingConfig = {
    enabled,
    provider: VALID_PROVIDERS.has(provider)
      ? (provider as MemoryRoutingConfig['provider'])
      : 'null',
  };

  if (typeof input.module_path === 'string') {
    normalized.module_path = input.module_path;
  }
  if (input.config && typeof input.config === 'object') {
    normalized.config = input.config as NonNullable<MemoryRoutingConfig['config']>;
  }

  return { valid: errors.length === 0, errors, normalized };
}