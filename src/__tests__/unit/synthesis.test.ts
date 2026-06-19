import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  completeSynthesisCheckpoint,
  createInitialSynthesisState,
  evaluateSynthesisDue,
  getSynthesisCheckpointSessionId,
  isSynthesisCheckpointDue,
  loadSynthesisConfig,
  loadSynthesisCheckpointState,
  recordExecutionSlice,
} from '../../nucleus/synthesis.js';

describe('synthesis PR1', () => {
  let tmp: string;
  const sessionId = 'synthesis-test-session';

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'xray-synth-'));
    fs.mkdirSync(path.join(tmp, '.xray', 'state'), { recursive: true });
    fs.writeFileSync(
      path.join(tmp, '.xray', 'features.json'),
      JSON.stringify({
        multi_agent_orchestration: { lead_dev_mode: true },
        synthesis: {
          enabled: true,
          every_n_gates: 3,
          every_n_turns: 0,
          every_n_todos_completed: 0,
        },
      }),
    );
  });

  afterEach(() => {
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it('loads synthesis config from features.json', () => {
    const config = loadSynthesisConfig(tmp);
    expect(config.enabled).toBe(true);
    expect(config.every_n_gates).toBe(3);
  });

  it('evaluateSynthesisDue triggers at gate threshold', () => {
    const config = loadSynthesisConfig(tmp);
    expect(evaluateSynthesisDue({ gates: 2, turns: 0, todosCompleted: 0 }, config).due).toBe(
      false,
    );
    const at = evaluateSynthesisDue({ gates: 3, turns: 0, todosCompleted: 0 }, config);
    expect(at.due).toBe(true);
    expect(at.reason).toContain('gate threshold');
  });

  it('recordExecutionSlice increments until synthesisDue', () => {
    recordExecutionSlice('gate', { projectRoot: tmp, sessionId });
    recordExecutionSlice('gate', { projectRoot: tmp, sessionId });
    const third = recordExecutionSlice('gate', { projectRoot: tmp, sessionId });
    expect(third?.becameDue).toBe(true);
    expect(third?.state.synthesisDue).toBe(true);

    const persisted = loadSynthesisCheckpointState(tmp);
    expect(persisted?.slicesSinceLastSynthesis.gates).toBe(3);
    expect(isSynthesisCheckpointDue(tmp, sessionId)).toBe(true);
  });

  it('completeSynthesisCheckpoint resets counters and clears due', () => {
    for (let i = 0; i < 3; i++) {
      recordExecutionSlice('gate', { projectRoot: tmp, sessionId });
    }
    const completed = completeSynthesisCheckpoint(tmp, sessionId);
    expect(completed?.synthesisDue).toBe(false);
    expect(completed?.slicesSinceLastSynthesis.gates).toBe(0);
    expect(completed?.synthesisCount).toBe(1);
    expect(completed?.lastSynthesisAt).toBeTruthy();
    expect(isSynthesisCheckpointDue(tmp, sessionId)).toBe(false);
  });

  it('resets session state when sessionId changes', () => {
    recordExecutionSlice('gate', { projectRoot: tmp, sessionId });
    recordExecutionSlice('gate', { projectRoot: tmp, sessionId });
    const other = recordExecutionSlice('gate', { projectRoot: tmp, sessionId: 'other-session' });
    expect(other?.state.sessionId).toBe('other-session');
    expect(other?.state.slicesSinceLastSynthesis.gates).toBe(1);
    expect(other?.becameDue).toBe(false);
  });

  it('returns null when disabled', () => {
    fs.writeFileSync(
      path.join(tmp, '.xray', 'features.json'),
      JSON.stringify({ synthesis: { enabled: false, every_n_gates: 1 } }),
    );
    expect(recordExecutionSlice('gate', { projectRoot: tmp, sessionId })).toBeNull();
  });

  it('allows todo_completed slice while synthesisDue', () => {
    for (let i = 0; i < 3; i++) {
      recordExecutionSlice('gate', { projectRoot: tmp, sessionId });
    }
    const todoSlice = recordExecutionSlice('todo_completed', { projectRoot: tmp, sessionId });
    expect(todoSlice?.state.slicesSinceLastSynthesis.todosCompleted).toBe(1);
    expect(isSynthesisCheckpointDue(tmp, sessionId)).toBe(true);
  });

  it('skips gate slice increment while synthesisDue', () => {
    for (let i = 0; i < 3; i++) {
      recordExecutionSlice('gate', { projectRoot: tmp, sessionId });
    }
    expect(recordExecutionSlice('gate', { projectRoot: tmp, sessionId })).toBeNull();
    const persisted = loadSynthesisCheckpointState(tmp);
    expect(persisted?.slicesSinceLastSynthesis.gates).toBe(3);
  });

  it('getSynthesisCheckpointSessionId returns bound session when due', () => {
    for (let i = 0; i < 3; i++) {
      recordExecutionSlice('gate', { projectRoot: tmp, sessionId });
    }
    expect(getSynthesisCheckpointSessionId(tmp)).toBe(sessionId);
    completeSynthesisCheckpoint(tmp, sessionId);
    expect(getSynthesisCheckpointSessionId(tmp)).toBeNull();
  });

  it('createInitialSynthesisState has stable shape', () => {
    const state = createInitialSynthesisState(sessionId);
    expect(state.version).toBe(1);
    expect(state.synthesisDue).toBe(false);
    expect(state.lifetimeSlices.gates).toBe(0);
  });
});