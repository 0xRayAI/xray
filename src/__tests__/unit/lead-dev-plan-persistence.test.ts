import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { LeadDevPlan } from '../../nucleus/autonomy-kernel.js';
import {
  bindPlanToSession,
  getNextRequiredTodo,
  getOutstandingTodos,
  hasValidLeadDevPlanForSpawn,
  savePersistedLeadDevPlan,
  updatePlanTodoStatus,
  validateSpawnMatchesTodo,
} from '../../nucleus/lead-dev-plan-persistence.js';

const basePlan: LeadDevPlan = {
  active: true,
  rules: [],
  codexTerms: [59, 67, 68, 69],
  description: 'test plan',
  complexity: 70,
  requiresPhasedPlan: true,
  recommendedStrategy: 'phased',
  mandatoryConsults: [],
  phases: [
    {
      id: 'phase-1',
      name: 'Consult',
      goal: 'consult',
      definitionOfDone: 'done',
      todos: [
        {
          id: '1.1',
          task: 'researcher pass',
          subagent: 'researcher',
          status: 'completed',
        },
      ],
    },
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
        {
          id: '2.2',
          task: 'run tests',
          subagent: 'bug-triage',
          status: 'pending',
        },
      ],
    },
  ],
  testProtocol: { perSuiteFirst: true, fullSuiteGate: true, hint: '' },
};

describe('lead-dev-plan-persistence', () => {
  let tmp: string;

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'xray-plan-persist-'));
    fs.mkdirSync(path.join(tmp, '.xray', 'state'), { recursive: true });
    process.chdir(tmp);
  });

  afterEach(() => {
    process.chdir(os.homedir());
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it('hasValidLeadDevPlanForSpawn persists while outstanding todos exist', () => {
    savePersistedLeadDevPlan({
      ...basePlan,
      persistedAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    });
    expect(hasValidLeadDevPlanForSpawn()).toBe(true);
    expect(getOutstandingTodos(basePlan).length).toBe(2);
  });

  it('plan expires by TTL when all todos complete', () => {
    const done = structuredClone(basePlan);
    for (const phase of done.phases) {
      for (const todo of phase.todos) todo.status = 'completed';
    }
    savePersistedLeadDevPlan({
      ...done,
      persistedAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    });
    expect(hasValidLeadDevPlanForSpawn()).toBe(false);
  });

  it('getNextRequiredTodo returns first outstanding in phase order', () => {
    const next = getNextRequiredTodo(basePlan);
    expect(next?.id).toBe('2.1');
  });

  it('validateSpawnMatchesTodo rejects unrelated spawn', () => {
    savePersistedLeadDevPlan({ ...basePlan, persistedAt: new Date().toISOString() });
    const bad = validateSpawnMatchesTodo({
      prompt: 'explore codebase randomly',
      subagent_type: 'explore',
    });
    expect(bad.valid).toBe(false);
    expect(bad.gate).toBe('spawn-todo-persistence');
    expect(bad.expectedTodoId).toBe('2.1');
  });

  it('validateSpawnMatchesTodo accepts todo id in prompt', () => {
    savePersistedLeadDevPlan({ ...basePlan, persistedAt: new Date().toISOString() });
    const ok = validateSpawnMatchesTodo({
      prompt: 'complete plan todo 2.1 swap deps',
      subagent_type: 'backend-engineer',
    });
    expect(ok.valid).toBe(true);
  });

  it('updatePlanTodoStatus syncs plan file', () => {
    savePersistedLeadDevPlan({ ...basePlan, persistedAt: new Date().toISOString() });
    expect(updatePlanTodoStatus('2.1', 'in_progress')).toBe(true);
    const raw = JSON.parse(
      fs.readFileSync(path.join(tmp, '.xray', 'state', 'lead-dev-plan.json'), 'utf8'),
    );
    expect(raw.phases[1].todos[0].status).toBe('in_progress');
  });

  it('bindPlanToSession bumps planGeneration', () => {
    savePersistedLeadDevPlan({ ...basePlan, persistedAt: new Date().toISOString() });
    const bound = bindPlanToSession('sess-abc');
    expect(bound?.sessionId).toBe('sess-abc');
    expect(bound?.planGeneration).toBe(1);
  });
});