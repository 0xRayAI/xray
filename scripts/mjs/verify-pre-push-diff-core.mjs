#!/usr/bin/env node
/**
 * Verify pre-push codex validation scopes to commit-range diff hunks.
 */
import { execSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const packageRoot = join(__dirname, '../..');

const { getRangeAddedLinesByFile, scanAddedLinesForCodex } = await import(
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

const tmp = mkdtempSync(join(tmpdir(), 'xray-prepush-diff-'));
mkdirSync(join(tmp, 'src'), { recursive: true });
initGitRepo(tmp);

const file = 'src/push-flow.ts';
const filePath = join(tmp, file);
writeFileSync(
  filePath,
  `export function flow() {\n  console.log('legacy noise');\n  return 1;\n}\n`,
);
execSync('git add .', { cwd: tmp });
execSync('git commit -q -m "baseline"', { cwd: tmp });
const baseSha = execSync('git rev-parse HEAD', { cwd: tmp, encoding: 'utf8' }).trim();

writeFileSync(
  filePath,
  `export function flow() {\n  console.log('legacy noise');\n  return 2;\n}\n`,
);
execSync('git add .', { cwd: tmp });
execSync('git commit -q -m "return tweak"', { cwd: tmp });
const headSha = execSync('git rev-parse HEAD', { cwd: tmp, encoding: 'utf8' }).trim();
const range = `${baseSha}..${headSha}`;

const added = getRangeAddedLinesByFile([file], range, tmp);
const scanClean = scanAddedLinesForCodex(file, added.get(file) ?? []);
if (scanClean.errors.length === 0) {
  pass('ignores pre-existing console.log in commit-range diff');
} else {
  fail('pre-existing console.log leaked into range scan', scanClean.errors.join('; '));
}

writeFileSync(
  filePath,
  `export function flow() {\n  console.log('legacy noise');\n  console.log('push bad');\n  return 3;\n}\n`,
);
execSync('git add .', { cwd: tmp });
execSync('git commit -q -m "bad push"', { cwd: tmp });
const badHead = execSync('git rev-parse HEAD', { cwd: tmp, encoding: 'utf8' }).trim();
const badRange = `${headSha}..${badHead}`;

const addedBad = getRangeAddedLinesByFile([file], badRange, tmp);
const scanBad = scanAddedLinesForCodex(file, addedBad.get(file) ?? []);
if (scanBad.errors.length > 0) {
  pass('flags console.log introduced in commit-range diff');
} else {
  fail('new console.log in push range was not flagged');
}

console.log(
  '\n' +
    (failed === 0
      ? '🎉 Pre-push diff-scope verify passed (2/2).'
      : `⚠️  ${failed} pre-push diff check(s) failed.`),
);
process.exit(failed === 0 ? 0 : 1);