/**
 * Synthesis — periodic reflect & realign checkpoint SSOT.
 * Slice counter + feature flag + `.xray/state/synthesis-checkpoint.json`.
 * PR2 wires pre-tool gate deny via delegation-gate.ts.
 */

import * as fs from 'fs';
import * as path from 'path';

export const SYNTHESIS_PRIMITIVE = 'synthesis';

export type ExecutionSliceKind = 'gate' | 'turn' | 'todo_completed';

export interface SynthesisConfig {
  enabled: boolean;
  every_n_gates: number;
  every_n_turns: number;
  every_n_todos_completed: number;
}

export interface SynthesisSliceCounters {
  gates: number;
  turns: number;
  todosCompleted: number;
}

export interface SynthesisCheckpointState {
  version: 1;
  sessionId: string;
  slicesSinceLastSynthesis: SynthesisSliceCounters;
  lifetimeSlices: SynthesisSliceCounters;
  synthesisDue: boolean;
  dueReason: string | null;
  lastSynthesisAt: string | null;
  lastSliceAt: string;
  synthesisCount: number;
}

export interface RecordSliceResult {
  state: SynthesisCheckpointState;
  becameDue: boolean;
  dueReason: string | null;
}

export interface SynthesisDueEvaluation {
  due: boolean;
  reason: string | null;
}

const STATE_VERSION = 1 as const;

export function synthesisCheckpointPath(projectRoot = process.cwd()): string {
  return path.join(projectRoot, '.xray', 'state', 'synthesis-checkpoint.json');
}

export function defaultSynthesisConfig(): SynthesisConfig {
  return {
    enabled: false,
    every_n_gates: 12,
    every_n_turns: 0,
    every_n_todos_completed: 0,
  };
}

export function loadSynthesisConfig(projectRoot = process.cwd()): SynthesisConfig {
  const featuresPath = path.join(projectRoot, '.xray', 'features.json');
  if (!fs.existsSync(featuresPath)) {
    return defaultSynthesisConfig();
  }
  try {
    const data = JSON.parse(fs.readFileSync(featuresPath, 'utf8')) as {
      synthesis?: Partial<SynthesisConfig>;
      multi_agent_orchestration?: { lead_dev_mode?: boolean };
    };
    const raw = data.synthesis ?? {};
    const defaults = defaultSynthesisConfig();
    return {
      enabled: raw.enabled === true,
      every_n_gates: normalizeThreshold(raw.every_n_gates, defaults.every_n_gates),
      every_n_turns: normalizeThreshold(raw.every_n_turns, defaults.every_n_turns),
      every_n_todos_completed: normalizeThreshold(
        raw.every_n_todos_completed,
        defaults.every_n_todos_completed,
      ),
    };
  } catch {
    return defaultSynthesisConfig();
  }
}

function normalizeThreshold(value: unknown, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    return fallback;
  }
  return Math.floor(value);
}

function emptyCounters(): SynthesisSliceCounters {
  return { gates: 0, turns: 0, todosCompleted: 0 };
}

export function createInitialSynthesisState(sessionId: string): SynthesisCheckpointState {
  const now = new Date().toISOString();
  return {
    version: STATE_VERSION,
    sessionId,
    slicesSinceLastSynthesis: emptyCounters(),
    lifetimeSlices: emptyCounters(),
    synthesisDue: false,
    dueReason: null,
    lastSynthesisAt: null,
    lastSliceAt: now,
    synthesisCount: 0,
  };
}

export function loadSynthesisCheckpointState(
  projectRoot = process.cwd(),
): SynthesisCheckpointState | null {
  const statePath = synthesisCheckpointPath(projectRoot);
  if (!fs.existsSync(statePath)) return null;
  try {
    const parsed = JSON.parse(fs.readFileSync(statePath, 'utf8')) as SynthesisCheckpointState;
    if (parsed.version !== STATE_VERSION) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveSynthesisCheckpointState(
  state: SynthesisCheckpointState,
  projectRoot = process.cwd(),
): string {
  const statePath = synthesisCheckpointPath(projectRoot);
  fs.mkdirSync(path.dirname(statePath), { recursive: true });
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
  return statePath;
}

export function evaluateSynthesisDue(
  counters: SynthesisSliceCounters,
  config: SynthesisConfig,
): SynthesisDueEvaluation {
  if (!config.enabled) {
    return { due: false, reason: null };
  }
  if (config.every_n_gates > 0 && counters.gates >= config.every_n_gates) {
    return {
      due: true,
      reason: `gate threshold (${counters.gates}/${config.every_n_gates})`,
    };
  }
  if (config.every_n_turns > 0 && counters.turns >= config.every_n_turns) {
    return {
      due: true,
      reason: `turn threshold (${counters.turns}/${config.every_n_turns})`,
    };
  }
  if (
    config.every_n_todos_completed > 0 &&
    counters.todosCompleted >= config.every_n_todos_completed
  ) {
    return {
      due: true,
      reason: `todo threshold (${counters.todosCompleted}/${config.every_n_todos_completed})`,
    };
  }
  return { due: false, reason: null };
}

function incrementCounter(
  counters: SynthesisSliceCounters,
  kind: ExecutionSliceKind,
): SynthesisSliceCounters {
  const next = { ...counters };
  if (kind === 'gate') next.gates += 1;
  else if (kind === 'turn') next.turns += 1;
  else next.todosCompleted += 1;
  return next;
}

export function recordExecutionSlice(
  kind: ExecutionSliceKind,
  ctx: { projectRoot?: string; sessionId: string | null },
): RecordSliceResult | null {
  if (!ctx.sessionId) return null;

  const projectRoot = ctx.projectRoot ?? process.cwd();
  const config = loadSynthesisConfig(projectRoot);
  if (!config.enabled) return null;

  const existing = loadSynthesisCheckpointState(projectRoot);
  const base =
    existing && existing.sessionId === ctx.sessionId
      ? existing
      : createInitialSynthesisState(ctx.sessionId);

  if (base.synthesisDue) return null;

  const now = new Date().toISOString();
  const slicesSinceLastSynthesis = incrementCounter(base.slicesSinceLastSynthesis, kind);
  const lifetimeSlices = incrementCounter(base.lifetimeSlices, kind);

  let synthesisDue: boolean = base.synthesisDue;
  let dueReason: string | null = base.dueReason;
  let becameDue = false;

  if (!synthesisDue) {
    const evaluation = evaluateSynthesisDue(slicesSinceLastSynthesis, config);
    if (evaluation.due) {
      synthesisDue = true;
      dueReason = evaluation.reason;
      becameDue = true;
    }
  }

  const state: SynthesisCheckpointState = {
    ...base,
    slicesSinceLastSynthesis,
    lifetimeSlices,
    synthesisDue,
    dueReason,
    lastSliceAt: now,
  };

  saveSynthesisCheckpointState(state, projectRoot);
  return { state, becameDue, dueReason };
}

export function completeSynthesisCheckpoint(
  projectRoot = process.cwd(),
  sessionId?: string | null,
): SynthesisCheckpointState | null {
  const state = loadSynthesisCheckpointState(projectRoot);
  if (!state) return null;
  if (sessionId && state.sessionId !== sessionId) return null;

  const completed: SynthesisCheckpointState = {
    ...state,
    slicesSinceLastSynthesis: emptyCounters(),
    synthesisDue: false,
    dueReason: null,
    lastSynthesisAt: new Date().toISOString(),
    synthesisCount: state.synthesisCount + 1,
  };
  saveSynthesisCheckpointState(completed, projectRoot);
  return completed;
}

export function isSynthesisCheckpointDue(
  projectRoot = process.cwd(),
  sessionId?: string | null,
): boolean {
  const state = loadSynthesisCheckpointState(projectRoot);
  if (!state?.synthesisDue) return false;
  if (sessionId && state.sessionId !== sessionId) return false;
  return loadSynthesisConfig(projectRoot).enabled;
}

export function getSynthesisDueReason(
  projectRoot = process.cwd(),
  sessionId?: string | null,
): string | null {
  const state = loadSynthesisCheckpointState(projectRoot);
  if (!state?.synthesisDue) return null;
  if (sessionId && state.sessionId !== sessionId) return null;
  return state.dueReason;
}