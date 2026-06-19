/**
 * Consumer project root SSOT for bridge hooks and installers.
 * Prefers git root when 0xray is a dependency or devDependency.
 */
import { existsSync, readFileSync, realpathSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { execSync } from 'node:child_process';
import { homedir } from 'node:os';

export function hasXrayDependency(pkg) {
  if (!pkg || typeof pkg !== 'object') return false;
  return (
    pkg.name === '0xray' ||
    Boolean(pkg.dependencies?.['0xray']) ||
    Boolean(pkg.devDependencies?.['0xray'])
  );
}

export function isConsumerWorkspace(dir) {
  return (
    existsSync(join(dir, '.xray', 'features.json')) ||
    existsSync(join(dir, 'node_modules', '0xray', 'package.json'))
  );
}

function normalizePath(dir) {
  try {
    return realpathSync(dir);
  } catch {
    return dir;
  }
}

function readPkg(dir) {
  try {
    const pkgPath = join(dir, 'package.json');
    if (!existsSync(pkgPath)) return null;
    return JSON.parse(readFileSync(pkgPath, 'utf8'));
  } catch {
    return null;
  }
}

export function findGitRoot(cwd = process.cwd()) {
  try {
    const gitRoot = execSync('git rev-parse --show-toplevel 2>/dev/null', {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    return gitRoot ? normalizePath(gitRoot) : null;
  } catch {
    return null;
  }
}

export function findProjectRoot(extraCandidates = []) {
  const envHome = process.env.XRAY_HOME || process.env.XRAY_ROOT;
  if (envHome) {
    const resolved = normalizePath(resolve(envHome));
    const pkg = readPkg(resolved);
    if (pkg && (isConsumerWorkspace(resolved) || hasXrayDependency(pkg))) {
      return resolved;
    }
  }

  const gitRoot = findGitRoot();
  if (gitRoot) {
    const pkg = readPkg(gitRoot);
    if (pkg && hasXrayDependency(pkg) && pkg.name !== '0xray') {
      return gitRoot;
    }
  }

  let dir = process.cwd();
  for (let i = 0; i < 12; i++) {
    if (isConsumerWorkspace(dir)) return dir;
    const pkg = readPkg(dir);
    if (pkg && hasXrayDependency(pkg) && pkg.name !== '0xray') return dir;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }

  const candidates = [process.cwd(), join(homedir(), 'dev', 'xray'), ...extraCandidates];
  for (const candidate of candidates) {
    const pkg = readPkg(candidate);
    if (pkg && pkg.name === '0xray') return candidate;
  }

  return normalizePath(gitRoot || process.cwd());
}