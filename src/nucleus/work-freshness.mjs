/**
 * Codex 70. Edits wait until the checkout is not behind origin/main
 * and the worn 0xray package is not older than the published one.
 * A temp directory inside a repo is not the workspace, so unit tests stay quiet.
 */

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

export function compareVersions(left, right) {
  const a = String(left).split('.').map((part) => parseInt(part, 10) || 0);
  const b = String(right).split('.').map((part) => parseInt(part, 10) || 0);
  const length = Math.max(a.length, b.length);
  for (let i = 0; i < length; i += 1) {
    const da = a[i] || 0;
    const db = b[i] || 0;
    if (da !== db) return da < db ? -1 : 1;
  }
  return 0;
}

export function decideFreshness(input) {
  const behind = Number(input.behind) || 0;
  if (behind > 0) {
    const commits = behind === 1 ? '1 commit' : `${behind} commits`;
    return {
      stale: true,
      reason: `Codex 70: checkout is ${commits} behind origin/main. Fetch and fast-forward before editing. Diff a stash against that main before anything is dropped.`,
    };
  }
  const worn = input.wornSuit || null;
  const published = input.publishedSuit || null;
  const repoVersion = input.repoName === '0xray' ? input.repoVersion || null : null;
  const target = published || repoVersion;
  if (target && worn && compareVersions(worn, target) < 0) {
    return {
      stale: true,
      reason: `Codex 70: worn 0xray@${worn} is older than ${target}. Install the latest npm before editing.`,
    };
  }
  if (target && !worn && input.repoName === '0xray') {
    return {
      stale: true,
      reason: `Codex 70: 0xray@${target} is in this tree and no global 0xray is installed.`,
    };
  }
  return { stale: false, reason: '' };
}

export function describeFreshness(input) {
  const behind = Number(input.behind) || 0;
  const parts = [behind > 0 ? `behind ${behind}` : 'git even'];
  if (input.wornSuit) parts.push(`worn 0xray@${input.wornSuit}`);
  if (input.publishedSuit) parts.push(`npm ${input.publishedSuit}`);
  const stashCount = Number(input.stashCount) || 0;
  if (stashCount > 0) parts.push(`stashes ${stashCount} (compare before drop)`);
  return `Fresh: ${parts.join('. ')}.`;
}

function run(cmd, args, cwd, timeout) {
  return execFileSync(cmd, args, {
    cwd,
    encoding: 'utf8',
    timeout,
    stdio: ['ignore', 'pipe', 'ignore'],
  }).trim();
}

function gitTop(cwd) {
  try {
    return run('git', ['rev-parse', '--show-toplevel'], cwd, 3000);
  } catch {
    return null;
  }
}

function readJson(file) {
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

export function wornSuitVersion() {
  const candidates = [
    '/opt/homebrew/lib/node_modules/0xray/package.json',
    '/usr/local/lib/node_modules/0xray/package.json',
  ];
  for (const file of candidates) {
    const pkg = readJson(file);
    if (pkg && pkg.version) return String(pkg.version);
  }
  try {
    const root = run('npm', ['root', '-g'], process.cwd(), 8000);
    const pkg = readJson(join(root, '0xray', 'package.json'));
    return pkg && pkg.version ? String(pkg.version) : null;
  } catch {
    return null;
  }
}

export function readWorkSnapshot(projectRoot) {
  const top = gitTop(projectRoot);
  let behind = 0;
  let stashCount = 0;
  if (top && resolve(top) === resolve(projectRoot)) {
    try {
      behind = Number(run('git', ['rev-list', '--count', 'HEAD..origin/main'], projectRoot, 4000)) || 0;
    } catch {
      behind = 0;
    }
    try {
      const list = run('git', ['stash', 'list'], projectRoot, 4000);
      stashCount = list ? list.split('\n').filter(Boolean).length : 0;
    } catch {
      stashCount = 0;
    }
  }
  const repo = readJson(join(projectRoot, 'package.json'));
  const saved = readJson(join(projectRoot, '.xray', 'state', 'freshness.json'));
  return {
    behind,
    stashCount,
    repoName: repo && repo.name ? String(repo.name) : null,
    repoVersion: repo && repo.version ? String(repo.version) : null,
    wornSuit: wornSuitVersion(),
    publishedSuit: saved && saved.publishedSuit ? String(saved.publishedSuit) : null,
  };
}

export function probeFreshness(projectRoot) {
  return decideFreshness(readWorkSnapshot(projectRoot));
}

export function refreshFreshness(projectRoot) {
  const top = gitTop(projectRoot);
  if (top && resolve(top) === resolve(projectRoot)) {
    try {
      run('git', ['fetch', 'origin', '--prune'], projectRoot, 8000);
    } catch {
      /* offline fetch must not block the boot */
    }
  }
  let publishedSuit = null;
  try {
    publishedSuit = run('npm', ['view', '0xray', 'version'], projectRoot, 8000);
  } catch {
    publishedSuit = null;
  }
  const snapshot = readWorkSnapshot(projectRoot);
  if (publishedSuit) snapshot.publishedSuit = publishedSuit;
  try {
    const dir = join(projectRoot, '.xray', 'state');
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'freshness.json'), `${JSON.stringify({
      publishedSuit: snapshot.publishedSuit,
      wornSuit: snapshot.wornSuit,
      behind: snapshot.behind,
      stashCount: snapshot.stashCount,
      checkedAt: new Date().toISOString(),
    }, null, 2)}\n`);
  } catch {
    /* the gate still reads git and the worn package */
  }
  return {
    ...snapshot,
    freshnessLine: describeFreshness(snapshot),
  };
}
