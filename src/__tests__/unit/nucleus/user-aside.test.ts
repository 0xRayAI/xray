import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
  buildUserAsidePlan,
  clearActiveAside,
  getActiveAsideId,
  isUserAsideTodoId,
  loadUserAside,
  resolveSpawnPlan,
  saveUserAside,
  setActiveAsideId,
  updateUserAsideTodoStatus,
} from '../../../nucleus/user-aside.js';
import { validateSpawnMatchesTodo } from '../../../nucleus/lead-dev-plan-persistence.js';

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

  it('builds aside plan with a.* todo ids', () => {
    const aside = buildUserAsidePlan(
      'suit-nft',
      'Suit NFT mint',
      'Mint NFT on Base for suit-certified agents',
      [{ description: 'Groover registration proof', type: 'research' }],
      30,
    );
    expect(aside).not.toBeNull();
    expect(aside!.plan.phases[0]?.todos[0]?.id).toMatch(/^a\.\d+\.\d+$/);
    expect(isUserAsideTodoId('a.1.1')).toBe(true);
    expect(isUserAsideTodoId('1.1')).toBe(false);
  });

  it('active aside routes spawn validation to a.* todos', () => {
    const aside = buildUserAsidePlan(
      'suit-nft',
      'Suit NFT',
      'Parallel aside work',
      [{ description: 'Define attestation', type: 'architecture' }],
      30,
    );
    saveUserAside(aside!, tmp);
    setActiveAsideId('suit-nft', tmp);

    const resolved = resolveSpawnPlan({ planTodoId: 'a.1.1' }, tmp);
    expect(resolved.source).toBe('aside');
    expect(resolved.asideId).toBe('suit-nft');

    const nextTodo = aside!.plan.phases[0]?.todos[0];
    const validation = validateSpawnMatchesTodo(
      {
        planTodoId: nextTodo!.id,
        subagent_type: nextTodo!.subagent,
        prompt: `Aside todo ${nextTodo!.id}: ${nextTodo!.task}`,
      },
      tmp,
    );
    expect(validation.valid).toBe(true);
  });

  it('clearActiveAside resumes main routing', () => {
    setActiveAsideId('suit-nft', tmp);
    expect(getActiveAsideId(tmp)).toBe('suit-nft');
    clearActiveAside(tmp);
    expect(getActiveAsideId(tmp)).toBeNull();
  });

  it('updates aside todo status on a.* ids', () => {
    const aside = buildUserAsidePlan(
      'nft',
      'NFT',
      'Mint flow',
      [{ description: 'Contract on Base', type: 'implement' }],
      20,
    );
    saveUserAside(aside!, tmp);
    setActiveAsideId('nft', tmp);
    const todoId = aside!.plan.phases[0]?.todos[0]?.id;
    expect(todoId).toBeDefined();
    const ok = updateUserAsideTodoStatus(todoId!, 'in_progress', tmp);
    expect(ok).toBe(true);
    const reloaded = loadUserAside('nft', tmp);
    const todo = reloaded!.plan.phases.flatMap((p) => p.todos).find((t) => t.id === todoId);
    expect(todo?.status).toBe('in_progress');
  });
});