import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  checkPendingDelegationGate,
  checkSubagentGate,
  getActivePendingDelegations,
  isOrchestrateToolEvent,
  savePersistedLeadDevPlan,
  satisfyDelegationsFromToolInput,
} from '../../nucleus/delegation-gate.js';

describe('grok pending delegation gate', () => {
  let tmp: string;
  const sessionId = 'gate-test-session';
  const features = {
    lead_dev_mode: true,
    auto_chain_delegations: true,
    no_new_surface: true,
    per_suite_test_triage: true,
  };

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'xray-gate-'));
    fs.mkdirSync(path.join(tmp, '.xray', 'state'), { recursive: true });
    fs.writeFileSync(
      path.join(tmp, '.xray', 'state', 'pending-delegations.json'),
      JSON.stringify({
        sessionId,
        createdAt: new Date().toISOString(),
        ttlMs: 4 * 60 * 60 * 1000,
        delegations: [
          {
            id: 'del-gate-1',
            taskId: 'impl-1',
            agent: 'backend-engineer',
            taskDescription: 'implement feature',
            taskType: 'implement',
            sessionId,
            planTodoId: '2.1',
            planTodoTask: 'swap deps',
            matchMethod: 'agent-only',
            matchConfidence: 0.5,
            status: 'pending',
            createdAt: new Date().toISOString(),
            satisfiedAt: null,
            spawnHint: {
              tool: 'Task',
              subagent_type: 'backend-engineer',
              description: 'Lead-dev implementation delegation. [plan todo 2.1] swap deps',
              planTodoId: '2.1',
              delegationId: 'del-gate-1',
            },
          },
        ],
      }),
    );
  });

  afterEach(() => {
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it('denies write tools while pending', () => {
    const block = checkPendingDelegationGate(
      'search_replace',
      { path: 'src/foo.ts', new_string: 'x' },
      features,
      tmp,
      sessionId,
    );
    expect(block?.gate).toBe('auto-chain-pending');
    expect(block?.hint?.delegationId).toBe('del-gate-1');
  });

  it('allows read_file while pending', () => {
    const block = checkPendingDelegationGate('read_file', { path: 'src/foo.ts' }, features, tmp, sessionId);
    expect(block).toBeNull();
  });

  it('allows focused test shell while pending', () => {
    const block = checkPendingDelegationGate(
      'run_terminal_command',
      { command: 'npm test -- src/foo.test.ts' },
      features,
      tmp,
      sessionId,
    );
    expect(block).toBeNull();
  });

  it('allows Task spawn while pending', () => {
    const block = checkPendingDelegationGate(
      'Task',
      { prompt: 'implement', subagent_type: 'backend-engineer' },
      features,
      tmp,
      sessionId,
    );
    expect(block).toBeNull();
  });

  it('ignores pending from different session', () => {
    const block = checkPendingDelegationGate('search_replace', {}, features, tmp, 'other-session');
    expect(block).toBeNull();
    expect(getActivePendingDelegations('other-session', tmp)).toHaveLength(0);
  });

  it('clears delegation on matched Task spawn', () => {
    const result = satisfyDelegationsFromToolInput(
      { prompt: 'complete plan todo 2.1', subagent_type: 'backend-engineer' },
      tmp,
    );
    expect(result.satisfied).toHaveLength(1);
    expect(result.clearedAll).toBe(true);
    expect(getActivePendingDelegations(sessionId, tmp)).toHaveLength(0);
  });

  it('detects orchestrate MCP tool events', () => {
    expect(
      isOrchestrateToolEvent('CallMcpTool', {
        toolName: 'orchestrate-task',
        arguments: { description: 'x' },
      }),
    ).toBe(true);
  });

  it('checkSubagentGate denies spawn that skips required todo', () => {
    savePersistedLeadDevPlan(
      {
        active: true,
        phases: [
          {
            id: 'phase-2',
            name: 'Implementation',
            todos: [
              {
                id: '2.1',
                task: 'swap deps',
                subagent: 'backend-engineer',
                status: 'pending',
              },
            ],
          },
        ],
        persistedAt: new Date().toISOString(),
      },
      tmp,
    );
    const block = checkSubagentGate(
      'Task',
      features,
      tmp,
      sessionId,
      { prompt: 'random exploration', subagent_type: 'explore' },
    );
    expect(block?.gate).toBe('spawn-todo-persistence');
  });

  it('checkSubagentGate allows spawn matching plan todo', () => {
    savePersistedLeadDevPlan(
      {
        active: true,
        phases: [
          {
            id: 'phase-2',
            name: 'Implementation',
            todos: [
              {
                id: '2.1',
                task: 'swap deps',
                subagent: 'backend-engineer',
                status: 'pending',
              },
            ],
          },
        ],
        persistedAt: new Date().toISOString(),
      },
      tmp,
    );
    const block = checkSubagentGate(
      'Task',
      features,
      tmp,
      sessionId,
      { prompt: 'plan todo 2.1 swap deps in package.json', subagent_type: 'backend-engineer' },
    );
    expect(block).toBeNull();
  });
});