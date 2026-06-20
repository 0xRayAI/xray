import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
  assertSafeAsideId,
  buildUserAsidePlan,
  clearActiveAside,
  getActiveAsideId,
  getUserAsideBootHints,
  isUserAsideTodoId,
  loadUserAside,
  parseAsideIdFromTodoId,
  saveUserAside,
  setActiveAsideId,
  updateUserAsideTodoStatus,
  UserAsideValidationError,
} from '../../../nucleus/user-aside.js';
import { resolveSpawnPlan as resolveSpawnPlanSsot } from '../../../nucleus/spawn-plan-resolution.js';
import { validateSpawnMatchesTodo, savePersistedLeadDevPlan } from '../../../nucleus/lead-dev-plan-persistence.js';

function writeFeatures(root: string) {
  const dir = path.join(root, '.xray');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    path.join(dir, 'features.json'),
    JSON.stringify({
      multi_agent_orchestration: {
        enabled: true,
        lead_dev_mode: true,
        user_asides: { enabled: true },
      },
    }),
  );
}

describe('user-aside SSOT', () => {
  let tmp: string;

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'xray-user-aside-'));
    writeFeatures(tmp);
  });

  afterEach(() => {
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it('builds namespaced aside todo ids', () => {
    const aside = buildUserAsidePlan(
      'suit-nft',
      'Suit NFT mint',
      'Mint NFT on Base',
      [{ description: 'Groover proof', type: 'research' }],
      30,
      tmp,
    );
    expect(aside).not.toBeNull();
    const todoId = aside!.plan.phases[0]?.todos[0]?.id;
    expect(todoId).toBe('suit-nft.a.1.1');
    expect(isUserAsideTodoId(todoId!)).toBe(true);
    expect(parseAsideIdFromTodoId(todoId!)).toBe('suit-nft');
  });

  it('rejects unsafe aside ids', () => {
    expect(() => assertSafeAsideId('../escape')).toThrow(UserAsideValidationError);
    expect(() => assertSafeAsideId('foo/bar')).toThrow(UserAsideValidationError);
  });

  it('active aside routes spawn validation', () => {
    const aside = buildUserAsidePlan(
      'suit-nft',
      'Suit NFT',
      'Parallel aside',
      [{ description: 'Define attestation', type: 'architecture' }],
      30,
      tmp,
    );
    saveUserAside(aside!, tmp);
    setActiveAsideId('suit-nft', tmp, 'sess-1');

    const todo = aside!.plan.phases[0]!.todos[0]!;
    const validation = validateSpawnMatchesTodo(
      {
        planTodoId: todo.id,
        subagent_type: todo.subagent,
        prompt: `${todo.id}: ${todo.task}`,
      },
      tmp,
      undefined,
      'sess-1',
    );
    expect(validation.valid).toBe(true);

    const resolved = resolveSpawnPlanSsot({ planTodoId: todo.id }, tmp, 'sess-1');
    expect(resolved.source).toBe('aside');
    expect(resolved.asideId).toBe('suit-nft');
  });

  it('clears active pointer when aside completes', () => {
    const aside = buildUserAsidePlan(
      'nft',
      'NFT',
      'Mint',
      [{ description: 'Contract', type: 'implement' }],
      20,
      tmp,
    );
    saveUserAside(aside!, tmp);
    setActiveAsideId('nft', tmp);
    const todoId = aside!.plan.phases[0]!.todos[0]!.id;
    for (const todo of aside!.plan.phases.flatMap((p) => p.todos)) {
      updateUserAsideTodoStatus(todo.id, 'completed', tmp);
    }
    expect(getActiveAsideId(tmp)).toBeNull();
    expect(getUserAsideBootHints(tmp)).toBeNull();
  });

  it('clearActiveAside resumes main routing', () => {
    saveUserAside(
      buildUserAsidePlan('suit-nft', 't', 'd', [{ description: 'x', type: 'implement' }], 20, tmp)!,
      tmp,
    );
    setActiveAsideId('suit-nft', tmp);
    clearActiveAside(tmp);
    expect(getActiveAsideId(tmp)).toBeNull();

    savePersistedLeadDevPlan(
      {
        active: true,
        rules: [],
        codexTerms: [59, 67, 68, 69],
        description: 'main',
        complexity: 10,
        requiresPhasedPlan: false,
        recommendedStrategy: 'sequential',
        mandatoryConsults: [],
        phases: [
          {
            id: 'p1',
            name: 'n',
            goal: 'g',
            definitionOfDone: 'd',
            todos: [
              {
                id: '1.1',
                task: 'main task',
                subagent: 'backend-engineer',
                status: 'pending',
              },
            ],
          },
        ],
        testProtocol: { perSuiteFirst: true, fullSuiteGate: false, hint: '' },
      },
      tmp,
    );
    const resolved = resolveSpawnPlanSsot({}, tmp);
    expect(resolved.source).toBe('main');
  });

  it('session mismatch ignores active aside pointer', () => {
    const aside = buildUserAsidePlan(
      'nft',
      'NFT',
      'Mint',
      [{ description: 'x', type: 'implement' }],
      20,
      tmp,
    );
    saveUserAside(aside!, tmp);
    setActiveAsideId('nft', tmp, 'session-a');
    expect(getActiveAsideId(tmp, 'session-b')).toBeNull();
  });
});