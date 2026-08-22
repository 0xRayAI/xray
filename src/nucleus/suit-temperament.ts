/**
 * 0xRay v3 suit temperament — constitution always on; ceremony scales by host.
 *
 * Frontier hosts (Grok 4.6 / Grok Build class) already have subagents, plan mode, hooks.
 * Guided hosts (OpenCode / Hermes / OpenClaw, including free models) still need full
 * lead-dev intake so weaker agents stay in check.
 *
 * Missing config → guided (no surprise for existing consumers).
 */

export type SuitHost = 'grok' | 'hermes' | 'opencode' | 'openclaw' | 'generic';
export type SuitProfile = 'frontier' | 'guided' | 'strict';
export type SuitProfileOrAuto = 'auto' | SuitProfile;
export type CeremonyLevel = 'full' | 'lite';
export type SpawnPlanMode = 'deny' | 'warn' | 'off';

export interface SuitTemperamentConfig {
  /** auto = pick from host_defaults */
  profile?: SuitProfileOrAuto;
  host_defaults?: Partial<Record<SuitHost, SuitProfile>>;
}

export const DEFAULT_HOST_PROFILES: Record<SuitHost, SuitProfile> = {
  grok: 'frontier',
  hermes: 'guided',
  opencode: 'guided',
  openclaw: 'guided',
  generic: 'guided',
};

export function resolveSuitProfile(
  raw: SuitTemperamentConfig | undefined,
  host: SuitHost,
): SuitProfile {
  // No key → guided. Existing consumers must not change ceremony on upgrade.
  if (!raw) return 'guided';
  if (raw.profile && raw.profile !== 'auto') {
    return raw.profile;
  }
  const defaults: Record<SuitHost, SuitProfile> = {
    ...DEFAULT_HOST_PROFILES,
    ...(raw?.host_defaults ?? {}),
  };
  return defaults[host] ?? 'guided';
}

export function ceremonyForProfile(profile: SuitProfile): CeremonyLevel {
  return profile === 'frontier' ? 'lite' : 'full';
}

export function spawnPlanModeForProfile(profile: SuitProfile): SpawnPlanMode {
  if (profile === 'frontier') return 'warn';
  return 'deny';
}

export function conferDefaultForProfile(profile: SuitProfile): boolean {
  return profile !== 'frontier';
}
