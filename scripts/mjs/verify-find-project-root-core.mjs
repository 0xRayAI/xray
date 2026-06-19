#!/usr/bin/env node
/**
 * Fixture: findProjectRoot resolves devDependency consumers via git root.
 */
import { mkdtempSync, rmSync, writeFileSync, mkdirSync, readFileSync, realpathSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const { findProjectRoot, hasXrayDependency, findGitRoot } = await import(
  join(__dirname, '../helpers/find-project-root.mjs'),
);

let failed = 0;
function pass(n) {
  console.log(`✅ ${n}`);
}
function fail(n, d = '') {
  failed++;
  console.error(`❌ ${n}${d ? ` — ${d}` : ''}`);
}

const tmp = mkdtempSync(join(tmpdir(), 'xray-find-root-'));
mkdirSync(join(tmp, '.git'), { recursive: true });
writeFileSync(
  join(tmp, 'package.json'),
  JSON.stringify({
    name: 'consumer-sibling-fixture',
    devDependencies: { '0xray': '^3.5.1' },
  }),
);
execSync('git init', { cwd: tmp, stdio: 'ignore' });
execSync('git config user.email "fixture@test.local"', { cwd: tmp, stdio: 'ignore' });
execSync('git config user.name "fixture"', { cwd: tmp, stdio: 'ignore' });

try {
  const pkg = JSON.parse(readFileSync(join(tmp, 'package.json'), 'utf8'));
  if (hasXrayDependency(pkg)) pass('hasXrayDependency detects devDependencies');
  else fail('hasXrayDependency devDep');

  const normTmp = realpathSync(tmp);
  const gitRoot = findGitRoot(tmp);
  if (gitRoot === normTmp) pass('findGitRoot returns consumer repo');
  else fail('findGitRoot', `${gitRoot} !== ${normTmp}`);

  const prev = process.cwd();
  process.chdir(tmp);
  const root = findProjectRoot();
  process.chdir(prev);
  if (root === normTmp) pass('findProjectRoot resolves devDependency consumer via git');
  else fail('findProjectRoot', `${root} !== ${normTmp}`);
} finally {
  rmSync(tmp, { recursive: true, force: true });
}

console.log(
  '\n' +
    (failed === 0
      ? '🎉 find-project-root verify passed (3/3).'
      : `⚠️  ${failed} find-project-root check(s) failed.`),
);
process.exit(failed === 0 ? 0 : 1);