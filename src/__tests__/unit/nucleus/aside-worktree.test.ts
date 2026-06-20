import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
  extractSpawnCwd,
  isAutoProvisionWorktreeEnabled,
  normalizeWorktreePath,
  provisionGitWorktree,
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
    expect(extractSpawnCwd({ workingDirectory: sub }, tmp)).toBe(sub.replace(/\/$/, ''));
  });

  it('extractSpawnCwd reads isolation:worktree paths', () => {
    const sub = path.join(tmp, 'iso-wt');
    expect(extractSpawnCwd({ isolation: 'worktree', worktree_path: sub }, tmp)).toBe(
      sub.replace(/\/$/, ''),
    );
    expect(extractSpawnCwd({ isolation_mode: 'git_worktree', worktree: sub }, tmp)).toBe(
      sub.replace(/\/$/, ''),
    );
  });

  it('isAutoProvisionWorktreeEnabled requires user_asides.enabled', () => {
    fs.mkdirSync(path.join(tmp, '.xray'), { recursive: true });
    fs.writeFileSync(
      path.join(tmp, '.xray', 'features.json'),
      JSON.stringify({
        multi_agent_orchestration: {
          user_asides: { enabled: false, auto_provision_worktree: true },
        },
      }),
    );
    expect(isAutoProvisionWorktreeEnabled(tmp)).toBe(false);

    fs.writeFileSync(
      path.join(tmp, '.xray', 'features.json'),
      JSON.stringify({
        multi_agent_orchestration: {
          user_asides: { enabled: true, auto_provision_worktree: true },
        },
      }),
    );
    expect(isAutoProvisionWorktreeEnabled(tmp)).toBe(true);
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

  describe('provisionGitWorktree', () => {
    let gitRoot: string;

    beforeEach(() => {
      gitRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'aside-git-'));
      execFileSync('git', ['init'], { cwd: gitRoot, stdio: 'pipe' });
      execFileSync('git', ['config', 'user.email', 'test@example.com'], { cwd: gitRoot, stdio: 'pipe' });
      execFileSync('git', ['config', 'user.name', 'Test'], { cwd: gitRoot, stdio: 'pipe' });
      fs.writeFileSync(path.join(gitRoot, 'README.md'), '# test\n');
      execFileSync('git', ['add', 'README.md'], { cwd: gitRoot, stdio: 'pipe' });
      execFileSync('git', ['commit', '-m', 'init'], { cwd: gitRoot, stdio: 'pipe' });
    });

    afterEach(() => {
      fs.rmSync(gitRoot, { recursive: true, force: true });
    });

    it('rejects empty branch', () => {
      const result = provisionGitWorktree({
        projectRoot: gitRoot,
        worktree: path.join(gitRoot, 'wt'),
        branch: '',
      });
      expect(result.ok).toBe(false);
      expect(result.message).toContain('branch is required');
    });

    it('rejects non-git project root', () => {
      const nogit = fs.mkdtempSync(path.join(os.tmpdir(), 'aside-nogit-'));
      try {
        const result = provisionGitWorktree({
          projectRoot: nogit,
          worktree: path.join(nogit, 'wt'),
          branch: 'feat/test',
        });
        expect(result.ok).toBe(false);
        expect(result.message).toContain('not a git repository');
      } finally {
        fs.rmSync(nogit, { recursive: true, force: true });
      }
    });

    it('provisions a new worktree and branch', () => {
      const wtPath = path.join(gitRoot, 'aside-branch');
      const result = provisionGitWorktree({
        projectRoot: gitRoot,
        worktree: wtPath,
        branch: 'feat/aside-test',
      });
      expect(result.ok).toBe(true);
      expect(result.created).toBe(true);
      expect(fs.existsSync(path.join(wtPath, 'README.md'))).toBe(true);
    });

    it('returns ok when worktree already exists', () => {
      const wtPath = path.join(gitRoot, 'aside-existing');
      const first = provisionGitWorktree({
        projectRoot: gitRoot,
        worktree: wtPath,
        branch: 'feat/existing',
      });
      expect(first.ok).toBe(true);
      const second = provisionGitWorktree({
        projectRoot: gitRoot,
        worktree: wtPath,
        branch: 'feat/existing',
      });
      expect(second.ok).toBe(true);
      expect(second.created).toBe(false);
      expect(second.message).toContain('already exists');
    });
  });
});