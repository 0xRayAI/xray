/**
 * User-aside worktree path resolution, spawn cwd validation, optional git provision.
 */

import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { isUserAsidesEnabled } from './user-aside.js';
/** Minimal spawn tool input for cwd extraction (avoids circular import with delegation-gate). */
export interface SpawnCwdToolInput {
  cwd?: string;
  working_directory?: string;
  workingDirectory?: string;
  isolation?: string;
  isolation_mode?: string;
  worktree_path?: string;
  worktreePath?: string;
  worktree?: string;
  [key: string]: unknown;
}

export interface AsideWorktreeCwdResult {
  valid: boolean;
  gate?: 'aside-worktree-cwd-missing' | 'aside-worktree-cwd-mismatch';
  reason?: string;
  hint?: Record<string, unknown>;
}

export interface WorktreeProvisionResult {
  ok: boolean;
  path: string;
  created: boolean;
  message: string;
}

export function normalizeWorktreePath(worktree: string, projectRoot: string): string {
  const trimmed = worktree.trim().replace(/\/$/, '');
  const resolved = path.isAbsolute(trimmed) ? trimmed : path.resolve(projectRoot, trimmed);
  return resolved.replace(/\/$/, '');
}

export function isAutoProvisionWorktreeEnabled(projectRoot = process.cwd()): boolean {
  if (!isUserAsidesEnabled(projectRoot)) return false;
  const featuresPath = path.join(projectRoot, '.xray', 'features.json');
  if (!fs.existsSync(featuresPath)) return false;
  try {
    const data = JSON.parse(fs.readFileSync(featuresPath, 'utf8')) as {
      multi_agent_orchestration?: {
        user_asides?: { enabled?: boolean; auto_provision_worktree?: boolean };
      };
    };
    const raw = data.multi_agent_orchestration?.user_asides;
    if (raw?.enabled === false) return false;
    return raw?.auto_provision_worktree === true;
  } catch {
    return false;
  }
}

/** Extract spawn cwd from host Task / spawn_subagent tool input. */
export function extractSpawnCwd(toolInput: SpawnCwdToolInput, projectRoot: string): string | null {
  const isolation = toolInput.isolation ?? toolInput.isolation_mode;
  if (isolation === 'worktree' || isolation === 'git_worktree') {
    const wt =
      toolInput.worktree_path ??
      toolInput.worktreePath ??
      toolInput.worktree ??
      toolInput.cwd ??
      toolInput.working_directory ??
      toolInput.workingDirectory;
    if (wt != null && String(wt).trim() !== '') {
      return normalizeWorktreePath(String(wt), projectRoot);
    }
  }

  const raw =
    toolInput.cwd ??
    toolInput.working_directory ??
    toolInput.workingDirectory;
  if (raw == null || String(raw).trim() === '') return null;
  return normalizeWorktreePath(String(raw), projectRoot);
}

export function validateAsideWorktreeCwd(
  worktree: string | undefined,
  toolInput: SpawnCwdToolInput,
  projectRoot: string,
): AsideWorktreeCwdResult {
  if (!worktree?.trim()) return { valid: true };

  const expected = normalizeWorktreePath(worktree, projectRoot);
  const projectNorm = path.resolve(projectRoot).replace(/\/$/, '');

  if (projectNorm === expected || projectNorm.startsWith(`${expected}/`)) {
    return { valid: true };
  }

  const spawnCwd = extractSpawnCwd(toolInput, projectRoot);
  if (!spawnCwd) {
    return {
      valid: false,
      gate: 'aside-worktree-cwd-missing',
      reason:
        `Aside worktree is ${expected} but project root is ${projectNorm} — ` +
        'spawn must set cwd / working_directory / isolation:worktree to the aside worktree',
      hint: {
        worktree: expected,
        projectRoot: projectNorm,
        required: ['cwd', 'working_directory', 'isolation:worktree'],
      },
    };
  }

  if (spawnCwd !== expected && !spawnCwd.startsWith(`${expected}/`)) {
    return {
      valid: false,
      gate: 'aside-worktree-cwd-mismatch',
      reason:
        `Spawn cwd ${spawnCwd} does not match aside worktree ${expected}`,
      hint: { worktree: expected, spawnCwd, projectRoot: projectNorm },
    };
  }

  return { valid: true };
}

function gitBranchExists(projectRoot: string, branch: string): boolean {
  try {
    execFileSync('git', ['rev-parse', '--verify', branch], {
      cwd: projectRoot,
      stdio: 'pipe',
    });
    return true;
  } catch {
    return false;
  }
}

function resolvePathForCompare(p: string): string {
  try {
    return fs.realpathSync.native(p).replace(/\/$/, '');
  } catch {
    return path.resolve(p).replace(/\/$/, '');
  }
}

function isGitWorktreePath(wtPath: string, projectRoot: string): boolean {
  try {
    const out = execFileSync('git', ['worktree', 'list', '--porcelain'], {
      cwd: projectRoot,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    const normalized = resolvePathForCompare(wtPath);
    return out.split('\n').some((line) => {
      if (!line.startsWith('worktree ')) return false;
      const listed = line.slice('worktree '.length).trim();
      return resolvePathForCompare(listed) === normalized;
    });
  } catch {
    return false;
  }
}

/**
 * Guarded `git worktree add` when auto_provision_worktree is enabled.
 * Creates branch with -b when it does not exist locally.
 */
export function provisionGitWorktree(opts: {
  projectRoot: string;
  worktree: string;
  branch: string;
}): WorktreeProvisionResult {
  const wtPath = normalizeWorktreePath(opts.worktree, opts.projectRoot);
  const branch = opts.branch.trim();

  if (!branch) {
    return { ok: false, path: wtPath, created: false, message: 'branch is required' };
  }

  if (fs.existsSync(wtPath)) {
    if (isGitWorktreePath(wtPath, opts.projectRoot)) {
      return { ok: true, path: wtPath, created: false, message: 'worktree already exists' };
    }
    return {
      ok: false,
      path: wtPath,
      created: false,
      message: `path exists but is not a git worktree: ${wtPath}`,
    };
  }

  const gitDir = path.join(opts.projectRoot, '.git');
  if (!fs.existsSync(gitDir)) {
    return {
      ok: false,
      path: wtPath,
      created: false,
      message: `not a git repository: ${opts.projectRoot}`,
    };
  }

  const branchExists = gitBranchExists(opts.projectRoot, branch);
  const args = branchExists
    ? ['worktree', 'add', wtPath, branch]
    : ['worktree', 'add', '-b', branch, wtPath];

  try {
    execFileSync('git', args, { cwd: opts.projectRoot, stdio: 'pipe' });
    return { ok: true, path: wtPath, created: true, message: 'worktree provisioned' };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, path: wtPath, created: false, message };
  }
}