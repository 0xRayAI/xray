import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { LeadDevPlan } from '../../nucleus/autonomy-kernel.js';
import {
  buildSpawnHint,
  clearPendingDelegationsForSessionChange,
  matchPlanTodo,
  recordDeferredDelegations,
  satisfyDelegation,
} from '../../nucleus/pending-delegations.js';

describe('pending-delegations', () => {
  let tmp: string;

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'xray-pending-'));
    fs.mkdirSync(path.join(tmp, '.xray', 'state'), { recursive: true });
    fs.writeFileSync(
      path.join(tmp, '.xray', 'features.json'),
      JSON.stringify({
        multi_agent_orchestration: {
          enabled: true,
          lead_dev_mode: true,
          auto_chain_delegations: true,
        },
      }),
    );
    process.chdir(tmp);
  });

  afterEach(() => {
    process.chdir(os.homedir());
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  const samplePlan: LeadDevPlan = {
    active: true,
    rules: [],
    codexTerms: [59, 67, 68, 69],
    description: 'test',
    complexity: 70,
    requiresPhasedPlan: true,
    recommendedStrategy: 'phased',
    mandatoryConsults: [],
    phases: [
      {
        id: 'phase-2',
        name: 'Implementation',
        goal: 'ship',
        definitionOfDone: 'done',
        todos: [
          {
            id: '2.1',
            task: 'swap deps in package.json',
            subagent: 'backend-engineer',
            status: 'pending',
          },
        ],
      },
    ],
    testProtocol: { perSuiteFirst: true, fullSuiteGate: true, hint: '' },
  };

  it('matchPlanTodo prefers description overlap', () => {
    const m = matchPlanTodo('backend-engineer', 'swap deps', 'impl-1', samplePlan);
    expect(m.todo?.id).toBe('2.1');
    expect(m.method).toBe('description');
    expect(m.confidence).toBeGreaterThan(0.5);
  });

  it('recordDeferredDelegations writes session-bound state', () => {
    fs.writeFileSync(
      path.join(tmp, '.xray', 'state', 'lead-dev-plan.json'),
      JSON.stringify(samplePlan),
    );
    const created = recordDeferredDelegations('sess-a', [
      { taskId: 'impl-1', agent: 'backend-engineer', description: 'swap deps', type: 'implement' },
    ]);
    expect(created).toHaveLength(1);
    expect(created[0]?.planTodoId).toBe('2.1');
    const raw = JSON.parse(
      fs.readFileSync(path.join(tmp, '.xray', 'state', 'pending-delegations.json'), 'utf8'),
    );
    expect(raw.sessionId).toBe('sess-a');
    expect(raw.delegations[0].spawnHint.tool).toBe('Task');
  });

  it('satisfyDelegation clears by planTodoId in prompt', () => {
    fs.writeFileSync(
      path.join(tmp, '.xray', 'state', 'lead-dev-plan.json'),
      JSON.stringify(samplePlan),
    );
    recordDeferredDelegations('sess-b', [
      { taskId: 'impl-1', agent: 'backend-engineer', description: 'swap deps', type: 'implement' },
    ]);
    const result = satisfyDelegation({ toolPrompt: 'complete plan todo 2.1 now' });
    expect(result.satisfied.length).toBeGreaterThan(0);
    expect(result.clearedAll).toBe(true);
  });

  it('clearPendingDelegationsForSessionChange removes stale session file', () => {
    recordDeferredDelegations('old-session', [
      { taskId: 'x', agent: 'backend-engineer', description: 'd', type: 'implement' },
    ]);
    expect(clearPendingDelegationsForSessionChange('new-session')).toBe(true);
    expect(fs.existsSync(path.join(tmp, '.xray', 'state', 'pending-delegations.json'))).toBe(
      false,
    );
  });

  it('buildSpawnHint includes plan todo context', () => {
    const hint = buildSpawnHint({
      id: 'del-1',
      agent: 'backend-engineer',
      taskDescription: 'implement',
      planTodoId: '2.1',
      planTodoTask: 'swap deps',
    });
    expect(hint.description).toContain('2.1');
    expect(hint.subagent_type).toBe('backend-engineer');
  });
});