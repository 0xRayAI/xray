#!/usr/bin/env node
/**
 * Verify pre-commit codex validation scopes to staged diff hunks only.
 */
import { execSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const packageRoot = join(__dirname, '../..');

const { getStagedAddedLinesByFile, scanAddedLinesForCodex } = await import(
  join(packageRoot, 'scripts/hooks/run-hook.js')
);

let failed = 0;
function pass(n) {
  console.log(`✅ ${n}`);
}
function fail(n, d = '') {
  failed++;
  console.error(`❌ ${n}${d ? ` — ${d}` : ''}`);
}

function initGitRepo(dir) {
  execSync('git init -q', { cwd: dir });
  execSync('git config user.email "verify@0xray.test"', { cwd: dir });
  execSync('git config user.name "verify"', { cwd: dir });
}

const tmp = mkdtempSync(join(tmpdir(), 'xray-precommit-diff-'));
mkdirSync(join(tmp, 'src'), { recursive: true });
initGitRepo(tmp);

const file = 'src/example-flow.ts';
const filePath = join(tmp, file);
writeFileSync(
  filePath,
  `export function flow() {\n  console.log('legacy noise');\n  return 1;\n}\n`,
);
execSync('git add .', { cwd: tmp });
execSync('git commit -q -m "baseline"', { cwd: tmp });

writeFileSync(
  filePath,
  `export function flow() {\n  console.log('legacy noise');\n  return 2;\n}\n`,
);
execSync(`git add ${file}`, { cwd: tmp });

const added = getStagedAddedLinesByFile([file], tmp);
const scanClean = scanAddedLinesForCodex(file, added.get(file) ?? []);
if (scanClean.errors.length === 0) {
  pass('ignores pre-existing console.log when hunk only changes return value');
} else {
  fail('pre-existing console.log leaked into diff scan', scanClean.errors.join('; '));
}

writeFileSync(
  filePath,
  `export function flow() {\n  console.log('legacy noise');\n  console.log('new bad');\n  return 2;\n}\n`,
);
execSync(`git add ${file}`, { cwd: tmp });

const addedBad = getStagedAddedLinesByFile([file], tmp);
const scanBad = scanAddedLinesForCodex(file, addedBad.get(file) ?? []);
if (scanBad.errors.length > 0) {
  pass('flags console.log introduced in staged diff');
} else {
  fail('new console.log in diff was not flagged');
}

mkdirSync(join(tmp, 'src/nested path'), { recursive: true });
const spacedFile = 'src/nested path/spaced flow.ts';
const spacedPath = join(tmp, spacedFile);
writeFileSync(
  spacedPath,
  `export function flow() {\n  console.log('legacy');\n  return 1;\n}\n`,
);
execSync('git add .', { cwd: tmp });
execSync('git commit -q -m "spaced baseline"', { cwd: tmp });
writeFileSync(
  spacedPath,
  `export function flow() {\n  console.log('legacy');\n  return 9;\n}\n`,
);
execSync(`git add "${spacedFile}"`, { cwd: tmp });
const spacedAdded = getStagedAddedLinesByFile([spacedFile], tmp);
const spacedScan = scanAddedLinesForCodex(spacedFile, spacedAdded.get(spacedFile) ?? []);
if (spacedScan.errors.length === 0) {
  pass('handles staged paths with spaces');
} else {
  fail('spaced path diff scope', spacedScan.errors.join('; '));
}

console.log(
  '\n' +
    (failed === 0
      ? '🎉 Pre-commit diff-scope verify passed (3/3).'
      : `⚠️  ${failed} diff-scope check(s) failed.`),
);
process.exit(failed === 0 ? 0 : 1);