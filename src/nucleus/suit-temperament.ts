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

import * as fs from 'fs';
import * as path from 'path';

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

function isSuitProfile(value: unknown): value is SuitProfile {
  return value === 'frontier' || value === 'guided' || value === 'strict';
}

export function loadSuitTemperamentRaw(
  projectRoot: string,
): SuitTemperamentConfig | undefined {
  const featuresPath = path.join(projectRoot, '.xray', 'features.json');
  if (!fs.existsSync(featuresPath)) return undefined;
  try {
    const data = JSON.parse(fs.readFileSync(featuresPath, 'utf8')) as {
      suit_temperament?: SuitTemperamentConfig;
    };
    return data.suit_temperament;
  } catch {
    return undefined;
  }
}

function readSessionBootProfile(projectRoot: string): SuitProfile | null {
  try {
    const bootPath = path.join(projectRoot, '.xray', 'state', 'session-boot.json');
    if (!fs.existsSync(bootPath)) return null;
    const boot = JSON.parse(fs.readFileSync(bootPath, 'utf8')) as {
      suit_profile?: unknown;
    };
    return isSuitProfile(boot.suit_profile) ? boot.suit_profile : null;
  } catch {
    return null;
  }
}

export function resolveSuitProfile(
  raw: SuitTemperamentConfig | undefined,
  host: SuitHost,
): SuitProfile {
  // No key / empty object without profile → guided (existing consumers).
  if (!raw || !raw.profile) return 'guided';
  if (raw.profile !== 'auto') {
    return raw.profile;
  }
  const defaults: Record<SuitHost, SuitProfile> = {
    ...DEFAULT_HOST_PROFILES,
    ...(raw.host_defaults ?? {}),
  };
  return defaults[host] ?? 'guided';
}

/** Host-aware when known; MCP/kernel (no host) may use Grok session-boot.suit_profile. */
export function resolveRuntimeSuitProfile(
  projectRoot: string,
  host: SuitHost = 'generic',
): SuitProfile {
  const raw = loadSuitTemperamentRaw(projectRoot);
  if (host === 'generic' && raw?.profile === 'auto') {
    const boot = readSessionBootProfile(projectRoot);
    if (boot) return boot;
  }
  return resolveSuitProfile(raw, host);
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
