/**
 * Due rule for automatic reflections.
 * Due when commits since the last reflection's recorded head are at least the threshold.
 * The file lives in the seat suit: .xray/state/repertoire/feedback.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export const SEAT_REFLECTION_DIR = join('.xray', 'state', 'repertoire', 'feedback');
export const DEFAULT_COMMIT_THRESHOLD = 25;

export function seatReflectionDir(projectRoot) {
  return join(projectRoot, SEAT_REFLECTION_DIR);
}

function git(projectRoot, args) {
  try {
    return execFileSync('git', args, {
      cwd: projectRoot,
      encoding: 'utf8',
      timeout: 8000,
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return '';
  }
}

export function currentHead(projectRoot) {
  return git(projectRoot, ['rev-parse', 'HEAD']);
}

export function readReflectionHead(filePath) {
  try {
    const text = readFileSync(filePath, 'utf8').slice(0, 4000);
    const match = text.match(/^head:\s*([0-9a-f]{7,40})\s*$/m);
    return match ? match[1] : '';
  } catch {
    return '';
  }
}

function isCommit(projectRoot, sha) {
  if (!sha) return false;
  return git(projectRoot, ['cat-file', '-t', sha]) === 'commit';
}

function commitUnixTime(projectRoot, sha) {
  const raw = git(projectRoot, ['log', '-1', '--format=%ct', sha]);
  const n = parseInt(raw, 10);
  return Number.isFinite(n) ? n : -1;
}

function anchorForFile(projectRoot, filePath) {
  const stamped = readReflectionHead(filePath);
  if (isCommit(projectRoot, stamped)) return stamped;
  const tracked = git(projectRoot, ['log', '-1', '--format=%H', '--', filePath]);
  if (isCommit(projectRoot, tracked)) return tracked;
  return '';
}

function reflectionFiles(dir) {
  if (!existsSync(dir)) return [];
  try {
    return readdirSync(dir)
      .filter((name) => name.endsWith('.md'))
      .map((name) => join(dir, name));
  } catch {
    return [];
  }
}

function commitCount(projectRoot, rev) {
  const raw = git(projectRoot, ['rev-list', '--count', rev]);
  const n = parseInt(raw, 10);
  return Number.isFinite(n) ? n : 0;
}

export function commitsSinceLastReflection(projectRoot, reflectionsDir) {
  const files = reflectionFiles(reflectionsDir);
  if (files.length === 0) return commitCount(projectRoot, 'HEAD');

  let newestSha = '';
  let newestTime = -1;
  for (const file of files) {
    const sha = anchorForFile(projectRoot, file);
    if (!sha) continue;
    const time = commitUnixTime(projectRoot, sha);
    if (time >= newestTime) {
      newestTime = time;
      newestSha = sha;
    }
  }
  if (!newestSha) return 0;
  return commitCount(projectRoot, `${newestSha}..HEAD`);
}

export function reflectionIsDue(projectRoot, reflectionsDir, threshold = DEFAULT_COMMIT_THRESHOLD) {
  const limit = Number.isFinite(threshold) && threshold > 0 ? threshold : DEFAULT_COMMIT_THRESHOLD;
  return commitsSinceLastReflection(projectRoot, reflectionsDir) >= limit;
}
