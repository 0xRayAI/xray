import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  checkPendingDelegationGate,
  checkSubagentGate,
  evaluatePreToolGate,
  getActivePendingDelegations,
  satisfyDelegationsFromToolInput,
} from '../../nucleus/delegation-gate.js';

describe('delegation-gate SSOT', () => {
  let tmp: string;
  const sessionId = 'gate-test-session';
  const features = {
    lead_dev_mode: true,
    auto_chain_delegations: true,
  };

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'xray-dgate-'));
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
  });

  it('allows read_file while pending', () => {
    const block = checkPendingDelegationGate('read_file', { path: 'src/foo.ts' }, features, tmp, sessionId);
    expect(block).toBeNull();
  });

  it('hermes write_file maps via evaluatePreToolGate host', () => {
    const result = evaluatePreToolGate(
      'write_file',
      { path: 'src/foo.ts', content: 'x' },
      { projectRoot: tmp, sessionId, features, host: 'hermes' },
    );
    expect(result.allow).toBe(false);
    if (!result.allow) expect(result.gate).toBe('auto-chain-pending');
  });

  it('checkSubagentGate denies spawn that skips required plan todo', () => {
    fs.writeFileSync(
      path.join(tmp, '.xray', 'state', 'lead-dev-plan.json'),
      JSON.stringify({
        active: true,
        persistedAt: new Date().toISOString(),
        phases: [
          {
            id: 'phase-2',
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
      }),
    );

    const block = checkSubagentGate(
      'Task',
      features,
      tmp,
      sessionId,
      { prompt: 'explore only', subagent_type: 'explore' },
    );
    expect(block?.gate).toBe('spawn-todo-persistence');
  });

  it('satisfyDelegationsFromToolInput clears matching delegation', () => {
    const result = satisfyDelegationsFromToolInput(
      { prompt: 'plan todo 2.1 swap deps', subagent_type: 'backend-engineer' },
      tmp,
    );
    expect(result.satisfied.length).toBe(1);
    expect(getActivePendingDelegations(sessionId, tmp).length).toBe(0);
  });
});