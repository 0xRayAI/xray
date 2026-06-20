import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
  extractSpawnCwd,
  normalizeWorktreePath,
  validateAsideWorktreeCwd,
} from '../../../nucleus/aside-worktree.js';

describe('aside-worktree', () => {
  let tmp: string;

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'aside-wt-'));
  });

  afterEach(() => {
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it('normalizeWorktreePath resolves relative paths from project root', () => {
    const wt = normalizeWorktreePath('../sibling-worktree', tmp);
    expect(wt).toBe(path.resolve(tmp, '../sibling-worktree').replace(/\/$/, ''));
  });

  it('extractSpawnCwd reads cwd and working_directory', () => {
    const sub = path.join(tmp, 'wt');
    expect(extractSpawnCwd({ cwd: sub }, tmp)).toBe(sub.replace(/\/$/, ''));
    expect(extractSpawnCwd({ working_directory: sub }, tmp)).toBe(sub.replace(/\/$/, ''));
  });

  it('validateAsideWorktreeCwd allows when project root is worktree', () => {
    const wt = tmp;
    const result = validateAsideWorktreeCwd(wt, {}, wt);
    expect(result.valid).toBe(true);
  });

  it('validateAsideWorktreeCwd denies when cwd missing', () => {
    const wt = path.join(tmp, 'other-wt');
    const result = validateAsideWorktreeCwd(wt, {}, tmp);
    expect(result.valid).toBe(false);
    expect(result.gate).toBe('aside-worktree-cwd-missing');
  });

  it('validateAsideWorktreeCwd allows matching spawn cwd', () => {
    const wt = path.join(tmp, 'aside-wt');
    const result = validateAsideWorktreeCwd(wt, { cwd: wt }, tmp);
    expect(result.valid).toBe(true);
  });

  it('validateAsideWorktreeCwd denies mismatched spawn cwd', () => {
    const wt = path.join(tmp, 'aside-wt');
    const wrong = path.join(tmp, 'wrong-wt');
    const result = validateAsideWorktreeCwd(wt, { cwd: wrong }, tmp);
    expect(result.valid).toBe(false);
    expect(result.gate).toBe('aside-worktree-cwd-mismatch');
  });
});