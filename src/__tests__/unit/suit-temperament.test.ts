import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  DEFAULT_HOST_PROFILES,
  ceremonyForProfile,
  resolveSuitProfile,
  spawnPlanModeForProfile,
} from '../../nucleus/suit-temperament.js';
import {
  evaluatePreToolGate,
  evaluateSpawnPlanGate,
  loadDelegationGateFeatures,
} from '../../nucleus/delegation-gate.js';

describe('suit temperament (v3)', () => {
  it('missing config is guided for every host (existing consumers)', () => {
    expect(resolveSuitProfile(undefined, 'grok')).toBe('guided');
    expect(resolveSuitProfile(undefined, 'hermes')).toBe('guided');
    expect(resolveSuitProfile({}, 'grok')).toBe('frontier');
  });

  it('auto uses host defaults', () => {
    expect(resolveSuitProfile({ profile: 'auto' }, 'grok')).toBe('frontier');
    expect(resolveSuitProfile({ profile: 'auto' }, 'hermes')).toBe('guided');
    expect(DEFAULT_HOST_PROFILES.opencode).toBe('guided');
  });

  it('explicit profile wins over host', () => {
    expect(resolveSuitProfile({ profile: 'strict' }, 'grok')).toBe('strict');
    expect(spawnPlanModeForProfile('frontier')).toBe('warn');
    expect(spawnPlanModeForProfile('guided')).toBe('deny');
    expect(ceremonyForProfile('frontier')).toBe('lite');
    expect(ceremonyForProfile('guided')).toBe('full');
  });
});

describe('delegation-gate temperament', () => {
  let tmp: string;

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'xray-temp-'));
    fs.mkdirSync(path.join(tmp, '.xray', 'state'), { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it('no suit_temperament key → guided spawn deny even on grok host', () => {
    fs.writeFileSync(
      path.join(tmp, '.xray', 'features.json'),
      JSON.stringify({
        multi_agent_orchestration: { enabled: true, lead_dev_mode: true },
      }),
    );
    const features = loadDelegationGateFeatures(tmp, 'grok');
    expect(features.suit_profile).toBe('guided');
    expect(features.spawn_plan_mode).toBe('deny');
    const result = evaluateSpawnPlanGate(
      'spawn_subagent',
      { prompt: 'explore', subagent_type: 'explore' },
      { projectRoot: tmp, sessionId: 's', features },
    );
    expect(result.allow).toBe(false);
    if (!result.allow) expect(result.gate).toBe('spawn-plan-missing');
  });

  it('auto + grok host warns instead of denying spawn without plan', () => {
    fs.writeFileSync(
      path.join(tmp, '.xray', 'features.json'),
      JSON.stringify({
        suit_temperament: { profile: 'auto' },
        multi_agent_orchestration: { enabled: true, lead_dev_mode: true },
      }),
    );
    const features = loadDelegationGateFeatures(tmp, 'grok');
    expect(features.suit_profile).toBe('frontier');
    expect(features.ceremony).toBe('lite');
    const result = evaluateSpawnPlanGate(
      'spawn_subagent',
      { prompt: 'explore', subagent_type: 'explore' },
      { projectRoot: tmp, sessionId: 's', features, host: 'grok' },
    );
    expect(result.allow).toBe(true);
    expect(result.gate).toBe('spawn-plan-missing');
  });

  it('frontier skips pending-write deny (ceremony lite)', () => {
    fs.mkdirSync(path.join(tmp, '.xray', 'state'), { recursive: true });
    fs.writeFileSync(
      path.join(tmp, '.xray', 'features.json'),
      JSON.stringify({
        suit_temperament: { profile: 'frontier' },
        multi_agent_orchestration: {
          enabled: true,
          lead_dev_mode: true,
          auto_chain_delegations: true,
        },
      }),
    );
    fs.writeFileSync(
      path.join(tmp, '.xray', 'state', 'pending-delegations.json'),
      JSON.stringify({
        sessionId: 's',
        createdAt: new Date().toISOString(),
        ttlMs: 4 * 60 * 60 * 1000,
        delegations: [
          {
            id: 'del-1',
            taskId: 'impl-1',
            agent: 'backend-engineer',
            taskDescription: 'implement',
            taskType: 'implement',
            sessionId: 's',
            planTodoId: '2.1',
            status: 'pending',
            createdAt: new Date().toISOString(),
            satisfiedAt: null,
          },
        ],
      }),
    );
    const features = loadDelegationGateFeatures(tmp, 'grok');
    const result = evaluatePreToolGate(
      'search_replace',
      { path: 'src/foo.ts', new_string: 'x' },
      { projectRoot: tmp, sessionId: 's', features, host: 'grok' },
    );
    expect(result.allow).toBe(true);
  });

  it('frontier skips synthesis checkpoint deny', () => {
    fs.writeFileSync(
      path.join(tmp, '.xray', 'features.json'),
      JSON.stringify({
        suit_temperament: { profile: 'frontier' },
        multi_agent_orchestration: { enabled: true, lead_dev_mode: true },
        synthesis: { enabled: true, every_n_gates: 1, every_n_turns: 0, every_n_todos_completed: 0 },
      }),
    );
    const features = loadDelegationGateFeatures(tmp, 'grok');
    const result = evaluatePreToolGate(
      'search_replace',
      { path: 'src/foo.ts', new_string: 'x' },
      { projectRoot: tmp, sessionId: 's', features, host: 'grok' },
    );
    expect(result.allow).toBe(true);
  });

  it('hermes auto stays guided (spawn still denied)', () => {
    fs.writeFileSync(
      path.join(tmp, '.xray', 'features.json'),
      JSON.stringify({
        suit_temperament: { profile: 'auto' },
        multi_agent_orchestration: { enabled: true, lead_dev_mode: true },
      }),
    );
    const features = loadDelegationGateFeatures(tmp, 'hermes');
    expect(features.suit_profile).toBe('guided');
    const result = evaluateSpawnPlanGate(
      'Task',
      { prompt: 'do work', subagent_type: 'general-purpose' },
      { projectRoot: tmp, sessionId: 's', features, host: 'hermes' },
    );
    expect(result.allow).toBe(false);
  });
});
