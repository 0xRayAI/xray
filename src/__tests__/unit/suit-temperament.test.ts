import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  DEFAULT_HOST_PROFILES,
  ceremonyForProfile,
  resolveRuntimeSuitProfile,
  resolveSuitProfile,
  spawnPlanModeForProfile,
  writeSuitSessionBoot,
} from '../../nucleus/suit-temperament.js';
import { isConferEnabled, loadConferConfig } from '../../nucleus/confer.js';
import {
  evaluatePreToolGate,
  evaluateSpawnPlanGate,
  loadDelegationGateFeatures,
} from '../../nucleus/delegation-gate.js';
import { savePersistedLeadDevPlan } from '../../nucleus/lead-dev-plan-persistence.js';

describe('suit temperament (v3)', () => {
  it('missing config is guided for every host (existing consumers)', () => {
    expect(resolveSuitProfile(undefined, 'grok')).toBe('guided');
    expect(resolveSuitProfile(undefined, 'hermes')).toBe('guided');
    expect(resolveSuitProfile({}, 'grok')).toBe('guided');
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

  it('frontier leftover plan does not deny spawn-todo mismatch', () => {
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
    savePersistedLeadDevPlan(
      {
        active: true,
        rules: [],
        codexTerms: [59, 67, 68, 69],
        description: 'leftover',
        complexity: 10,
        requiresPhasedPlan: true,
        recommendedStrategy: 'sequential',
        mandatoryConsults: [],
        persistedAt: new Date().toISOString(),
        sessionId: 's',
        phases: [
          {
            id: 'phase-1',
            name: 'One',
            goal: 'g',
            definitionOfDone: 'd',
            todos: [
              {
                id: '1.1',
                task: 'consult researcher',
                subagent: 'researcher',
                status: 'pending',
              },
            ],
          },
        ],
        testProtocol: { perSuiteFirst: true, fullSuiteGate: false, hint: '' },
      },
      tmp,
    );
    const features = loadDelegationGateFeatures(tmp, 'grok');
    const result = evaluateSpawnPlanGate(
      'spawn_subagent',
      { prompt: 'explore the repo', subagent_type: 'explore' },
      { projectRoot: tmp, sessionId: 's', features, host: 'grok' },
    );
    expect(result.allow).toBe(true);
    expect(result.gate).toBe('spawn-todo-persistence');
  });

  it('frontier confer is off unless explicitly opted in', () => {
    fs.writeFileSync(
      path.join(tmp, '.xray', 'features.json'),
      JSON.stringify({
        suit_temperament: { profile: 'frontier' },
        multi_agent_orchestration: { lead_dev_mode: true },
      }),
    );
    expect(isConferEnabled(tmp)).toBe(false);
    fs.writeFileSync(
      path.join(tmp, '.xray', 'features.json'),
      JSON.stringify({
        suit_temperament: { profile: 'frontier' },
        multi_agent_orchestration: { lead_dev_mode: true, confer: { enabled: true } },
      }),
    );
    expect(loadConferConfig(tmp).enabled).toBe(true);
  });

  it('codex 69 denies new skill file but allows rewrite of existing SKILL.md', () => {
    fs.writeFileSync(
      path.join(tmp, '.xray', 'features.json'),
      JSON.stringify({
        suit_temperament: { profile: 'frontier' },
        multi_agent_orchestration: { lead_dev_mode: true, no_new_surface: true },
      }),
    );
    const existing = path.join(tmp, 'src', 'skills', 'orchestrator', 'SKILL.md');
    fs.mkdirSync(path.dirname(existing), { recursive: true });
    fs.writeFileSync(existing, '# orchestrator\n');
    const features = loadDelegationGateFeatures(tmp, 'grok');
    const rewrite = evaluatePreToolGate(
      'search_replace',
      { path: 'src/skills/orchestrator/SKILL.md', new_string: '# rewire\n' },
      { projectRoot: tmp, sessionId: 's', features, host: 'grok' },
    );
    expect(rewrite.allow).toBe(true);
    const create = evaluatePreToolGate(
      'search_replace',
      { path: 'src/skills/brand-new/SKILL.md', new_string: '# new\n' },
      { projectRoot: tmp, sessionId: 's', features, host: 'grok' },
    );
    expect(create.allow).toBe(false);
    if (!create.allow) expect(create.gate).toBe('no-new-surface');
  });

  it('constitution denies any on hermes write even on frontier', () => {
    fs.writeFileSync(
      path.join(tmp, '.xray', 'features.json'),
      JSON.stringify({
        suit_temperament: { profile: 'frontier' },
        multi_agent_orchestration: { lead_dev_mode: true },
      }),
    );
    const features = loadDelegationGateFeatures(tmp, 'hermes');
    const result = evaluatePreToolGate(
      'write_file',
      { path: 'src/foo.ts', content: 'const x: any = 1' },
      { projectRoot: tmp, sessionId: 's', features, host: 'hermes' },
    );
    expect(result.allow).toBe(false);
    if (!result.allow) expect(result.gate).toBe('codex-11');
  });

  it('strict locks no_new_surface even when config opts out', () => {
    fs.writeFileSync(
      path.join(tmp, '.xray', 'features.json'),
      JSON.stringify({
        suit_temperament: { profile: 'strict' },
        multi_agent_orchestration: { lead_dev_mode: true, no_new_surface: false },
      }),
    );
    const features = loadDelegationGateFeatures(tmp, 'grok');
    expect(features.no_new_surface).toBe(true);
    const create = evaluatePreToolGate(
      'write',
      { path: 'src/skills/brand-new/SKILL.md', contents: '# new\n' },
      { projectRoot: tmp, sessionId: 's', features, host: 'grok' },
    );
    expect(create.allow).toBe(false);
    if (!create.allow) expect(create.gate).toBe('no-new-surface');
  });

  it('constitution 69 sees paths[] not only path', () => {
    fs.writeFileSync(
      path.join(tmp, '.xray', 'features.json'),
      JSON.stringify({
        suit_temperament: { profile: 'frontier' },
        multi_agent_orchestration: { lead_dev_mode: true, no_new_surface: true },
      }),
    );
    const features = loadDelegationGateFeatures(tmp, 'grok');
    const create = evaluatePreToolGate(
      'write',
      { paths: ['src/mcps/brand-new.server.ts'], contents: 'export {}\n' },
      { projectRoot: tmp, sessionId: 's', features, host: 'grok' },
    );
    expect(create.allow).toBe(false);
    if (!create.allow) expect(create.gate).toBe('no-new-surface');
  });

  it('hermes ignores leftover grok session-boot on auto', () => {
    fs.writeFileSync(
      path.join(tmp, '.xray', 'features.json'),
      JSON.stringify({
        suit_temperament: { profile: 'auto' },
        multi_agent_orchestration: { lead_dev_mode: true },
      }),
    );
    writeSuitSessionBoot(tmp, 'grok', { source: 'test' });
    expect(resolveRuntimeSuitProfile(tmp, 'generic')).toBe('frontier');
    expect(resolveRuntimeSuitProfile(tmp, 'hermes')).toBe('guided');
    writeSuitSessionBoot(tmp, 'hermes', { source: 'test' });
    expect(resolveRuntimeSuitProfile(tmp, 'generic')).toBe('guided');
    expect(resolveRuntimeSuitProfile(tmp, 'grok')).toBe('frontier');
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
