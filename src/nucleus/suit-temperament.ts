/**
 * 0xRay 4.0 suit temperament — how loudly the Autonomous Engine insists.
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
import { createRequire } from 'node:module';

const requireCjs = createRequire(import.meta.url);
const stationHeat = requireCjs('../integrations/hooks/station-hook-runtime.cjs') as {
  applyStationHeat: (
    root: string,
    host: string,
    extra?: Record<string, unknown>,
    existing?: Record<string, unknown>,
  ) => Record<string, unknown>;
  writeStationMarkdown: (root: string, fields: Record<string, unknown>) => string | null;
};

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

function isSuitHost(value: unknown): value is SuitHost {
  return (
    value === 'grok' ||
    value === 'hermes' ||
    value === 'opencode' ||
    value === 'openclaw' ||
    value === 'generic'
  );
}

function readSessionBoot(projectRoot: string): {
  host: SuitHost | null;
  suit_profile: SuitProfile | null;
} | null {
  try {
    const bootPath = path.join(projectRoot, '.xray', 'state', 'session-boot.json');
    if (!fs.existsSync(bootPath)) return null;
    const boot = JSON.parse(fs.readFileSync(bootPath, 'utf8')) as {
      host?: unknown;
      suit_profile?: unknown;
    };
    return {
      host: isSuitHost(boot.host) ? boot.host : null,
      suit_profile: isSuitProfile(boot.suit_profile) ? boot.suit_profile : null,
    };
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

/**
 * Host-aware when known. Kernel/MCP (`generic`) uses last session-boot profile.
 * A Hermes/OpenCode host ignores a leftover Grok boot (and vice versa).
 */
export function resolveRuntimeSuitProfile(
  projectRoot: string,
  host: SuitHost = 'generic',
): SuitProfile {
  const raw = loadSuitTemperamentRaw(projectRoot);
  const boot = readSessionBoot(projectRoot);
  if (raw?.profile === 'auto' && boot?.suit_profile) {
    if (host === 'generic' || boot.host == null || boot.host === host) {
      return boot.suit_profile;
    }
  }
  return resolveSuitProfile(raw, host);
}

/**
 * Write station heat when this host/session has no live card yet.
 * OpenClaw has no SessionStart — PreToolUse is the session boundary.
 */
export function maybeHeatHostStation(
  projectRoot: string,
  host: SuitHost,
  extra: Record<string, unknown> = {},
): string | null {
  const bootPath = path.join(projectRoot, '.xray', 'state', 'session-boot.json');
  const cardPath = path.join(projectRoot, '.xray', 'state', 'STATION.md');
  let existing: Record<string, unknown> = {};
  if (fs.existsSync(bootPath)) {
    try {
      existing = JSON.parse(fs.readFileSync(bootPath, 'utf8')) as Record<string, unknown>;
    } catch {
      existing = {};
    }
  }
  const sessionId = typeof extra.sessionId === 'string' ? extra.sessionId : null;
  const sameHost = existing.host === host;
  const sameSession =
    !sessionId || existing.sessionId == null || existing.sessionId === sessionId;
  if (sameHost && sameSession && fs.existsSync(cardPath)) {
    return bootPath;
  }
  return writeSuitSessionBoot(projectRoot, host, extra);
}

/** Merge temperament fields into session-boot.json for the host that just started. */
export function writeSuitSessionBoot(
  projectRoot: string,
  host: SuitHost,
  extra: Record<string, unknown> = {},
): string {
  const profile = resolveSuitProfile(loadSuitTemperamentRaw(projectRoot), host);
  const stateDir = path.join(projectRoot, '.xray', 'state');
  fs.mkdirSync(stateDir, { recursive: true });
  const bootPath = path.join(stateDir, 'session-boot.json');
  let existing: Record<string, unknown> = {};
  if (fs.existsSync(bootPath)) {
    try {
      existing = JSON.parse(fs.readFileSync(bootPath, 'utf8')) as Record<string, unknown>;
    } catch {
      existing = {};
    }
  }
  const heat = stationHeat.applyStationHeat(projectRoot, host, extra, existing);
  const payload: Record<string, unknown> = {
    ...existing,
    ...extra,
    ...heat,
    host,
    suit_profile: profile,
    ceremony: ceremonyForProfile(profile),
    spawn_plan_mode: spawnPlanModeForProfile(profile),
    timestamp: new Date().toISOString(),
  };
  fs.writeFileSync(bootPath, JSON.stringify(payload, null, 2));
  stationHeat.writeStationMarkdown(projectRoot, payload);
  return bootPath;
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
