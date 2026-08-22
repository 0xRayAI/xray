/**
 * 0xRay v3 suit temperament — how loudly the Autonomous Engine insists.
 *
 * v2 three-subsystem OS stays: Inference · External Governance · Autonomous Engine.
 * This module does not replace thinDispatch or Codex. It only scales *ceremony*
 * (spawn-plan deny, synthesis, confer) by host strength.
 *
 * Frontier (Grok 4.6 / Grok Build): engine available, spawn warns if no plan.
 * Guided (OpenCode / Hermes / OpenClaw, including free models): full v2 ceremony.
 * Missing config → guided (existing consumers unchanged).
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
