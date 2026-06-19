import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { LeadDevPlan } from '../../nucleus/autonomy-kernel.js';
import {
  archiveStaleLeadDevPlan,
  findRecentStalePlanArchive,
  loadLeadDevPlanArchiveMarkerMs,
  loadLeadDevPlanStaleMs,
  bindPlanToSession,
  getNextRequiredTodo,
  getOutstandingTodos,
  hasValidLeadDevPlanForSpawn,
  isLeadDevPlanStale,
  loadPersistedLeadDevPlan,
  savePersistedLeadDevPlan,
  updatePlanTodoStatus,
  validateSpawnMatchesTodo,
} from '../../nucleus/lead-dev-plan-persistence.js';
import {
  buildSynthesisCheckpointPlan,
  SYNTHESIS_REALIGNMENT_PHASE_ID,
} from '../../nucleus/autonomy-kernel.js';
import {
  isSynthesisCheckpointDue,
  recordExecutionSlice,
} from '../../nucleus/synthesis.js';
import { writeSynthesisConsultReceipt } from '../../nucleus/synthesis-consult-receipt.js';

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

  it('records todo_completed slice on general plan todo completion', () => {
    const sessionId = 'todo-slice-session';
    fs.writeFileSync(
      path.join(tmp, '.xray', 'features.json'),
      JSON.stringify({
        synthesis: {
          enabled: true,
          every_n_gates: 0,
          every_n_turns: 0,
          every_n_todos_completed: 2,
        },
      }),
    );
    savePersistedLeadDevPlan({
      ...basePlan,
      persistedAt: new Date().toISOString(),
      sessionId,
    });
    expect(updatePlanTodoStatus('2.1', 'completed', tmp)).toBe(true);
    expect(isSynthesisCheckpointDue(tmp, sessionId)).toBe(false);
    expect(updatePlanTodoStatus('2.2', 'completed', tmp)).toBe(true);
    expect(isSynthesisCheckpointDue(tmp, sessionId)).toBe(true);
  });

  it('completes synthesis checkpoint when all consult todos finish', () => {
    const sessionId = 'synth-complete-session';
    fs.writeFileSync(
      path.join(tmp, '.xray', 'features.json'),
      JSON.stringify({
        synthesis: { enabled: true, every_n_gates: 1, every_n_turns: 0, every_n_todos_completed: 0 },
      }),
    );
    recordExecutionSlice('gate', { projectRoot: tmp, sessionId });
    expect(isSynthesisCheckpointDue(tmp, sessionId)).toBe(true);

    const synthesisPlan = buildSynthesisCheckpointPlan('gate threshold');
    expect(synthesisPlan).not.toBeNull();
    savePersistedLeadDevPlan({
      ...synthesisPlan!,
      persistedAt: new Date().toISOString(),
      sessionId,
    });

    const consultTodos =
      synthesisPlan!.phases.find((p) => p.id === SYNTHESIS_REALIGNMENT_PHASE_ID)?.todos ?? [];
    for (const todo of consultTodos) {
      writeSynthesisConsultReceipt(
        todo.id,
        {
          sessionId,
          subagent: todo.subagent,
          verdict: 'PASS',
          topRisks: [],
          hardeningNote: 'fixture receipt',
        },
        tmp,
      );
      expect(updatePlanTodoStatus(todo.id, 'completed', tmp)).toBe(true);
    }

    expect(isSynthesisCheckpointDue(tmp, sessionId)).toBe(false);
  });

  it('treats unstarted plan as stale after TTL', () => {
    const staleAt = new Date(Date.now() - 9 * 60 * 60 * 1000).toISOString();
    savePersistedLeadDevPlan(
      {
        ...basePlan,
        persistedAt: staleAt,
        sessionId: 'stale-session',
      },
      tmp,
    );
    const plan = loadPersistedLeadDevPlan(tmp);
    expect(plan).not.toBeNull();
    expect(isLeadDevPlanStale(plan!, tmp)).toBe(true);
    expect(hasValidLeadDevPlanForSpawn(tmp)).toBe(false);
  });

  it('never treats synthesis realignment plan as stale while consult todos pending', () => {
    const staleAt = new Date(Date.now() - 10 * 60 * 60 * 1000).toISOString();
    const synthesisPlan = buildSynthesisCheckpointPlan('gate threshold');
    expect(synthesisPlan).not.toBeNull();
    savePersistedLeadDevPlan(
      {
        ...synthesisPlan!,
        persistedAt: staleAt,
        sessionId: 'synth-stale-session',
      },
      tmp,
    );
    const plan = loadPersistedLeadDevPlan(tmp);
    expect(plan).not.toBeNull();
    expect(isLeadDevPlanStale(plan!, tmp)).toBe(false);
    expect(hasValidLeadDevPlanForSpawn(tmp)).toBe(true);
    const archive = archiveStaleLeadDevPlan(tmp);
    expect(archive.archived).toBe(false);
    expect(loadPersistedLeadDevPlan(tmp)).not.toBeNull();
  });

  it('loads plan_stale_hours from features.json', () => {
    fs.writeFileSync(
      path.join(tmp, '.xray', 'features.json'),
      JSON.stringify({
        multi_agent_orchestration: { plan_stale_hours: 2 },
      }),
    );
    expect(loadLeadDevPlanStaleMs(tmp)).toBe(2 * 60 * 60 * 1000);
  });

  it('loads plan_archive_marker_hours from features.json', () => {
    fs.writeFileSync(
      path.join(tmp, '.xray', 'features.json'),
      JSON.stringify({
        multi_agent_orchestration: { plan_archive_marker_hours: 6 },
      }),
    );
    expect(loadLeadDevPlanArchiveMarkerMs(tmp)).toBe(6 * 60 * 60 * 1000);
  });

  it('findRecentStalePlanArchive ignores archives past marker TTL', () => {
    const stateDir = path.join(tmp, '.xray', 'state');
    const oldArchivedAt = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
    fs.writeFileSync(
      path.join(stateDir, 'lead-dev-plan.archived-old.json'),
      JSON.stringify({
        archiveReason: 'stale-unstarted-todos',
        archivedAt: oldArchivedAt,
      }),
    );
    fs.writeFileSync(
      path.join(tmp, '.xray', 'features.json'),
      JSON.stringify({
        multi_agent_orchestration: { plan_archive_marker_hours: 6 },
      }),
    );
    expect(findRecentStalePlanArchive(tmp)).toBeNull();
  });

  it('archives stale plan on session boot path', () => {
    const staleAt = new Date(Date.now() - 10 * 60 * 60 * 1000).toISOString();
    savePersistedLeadDevPlan(
      {
        ...basePlan,
        persistedAt: staleAt,
        sessionId: 'archive-session',
      },
      tmp,
    );
    const result = archiveStaleLeadDevPlan(tmp);
    expect(result.archived).toBe(true);
    expect(loadPersistedLeadDevPlan(tmp)).toBeNull();
    expect(findRecentStalePlanArchive(tmp)).not.toBeNull();
  });
});