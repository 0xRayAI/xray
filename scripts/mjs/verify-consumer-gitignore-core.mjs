#!/usr/bin/env node
/**
 * Fixture: consumer gitignore merge appends suit block without clobbering existing rules.
 */
import { mkdtempSync, rmSync, writeFileSync, readFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __dirname = dirname(fileURLToPath(import.meta.url));
const packageRoot = join(__dirname, '../..');
const require = createRequire(import.meta.url);
const {
  applyConsumerGitignore,
  MARKER_START,
  SUIT_IGNORE_LINES,
} = require(join(packageRoot, 'scripts/node/consumer-gitignore.cjs'));

let failed = 0;
function pass(n) {
  console.log(`✅ ${n}`);
}
function fail(n, d = '') {
  failed++;
  console.error(`❌ ${n}${d ? ` — ${d}` : ''}`);
}

const tmp = mkdtempSync(join(tmpdir(), 'xray-gitignore-'));
writeFileSync(join(tmp, '.gitignore'), '# product repo\nbuild/\n');

try {
  const created = applyConsumerGitignore(tmp, packageRoot);
  if (created !== 'merged') fail('first merge', created);
  else pass('merges into existing .gitignore');

  const content = readFileSync(join(tmp, '.gitignore'), 'utf8');
  if (content.includes('build/') && content.includes('# product repo')) {
    pass('preserves existing entries');
  } else fail('preserve existing');

  if (content.includes(MARKER_START)) pass('adds 0xray suit marker block');
  else fail('marker block');

  for (const line of ['.grok/', '.mcp.json', 'opencode.json', 'AGENTS.md', '.xray/']) {
    if (!content.includes(line)) fail(`missing ${line}`);
  }
  pass('includes suit artifact patterns');

  const again = applyConsumerGitignore(tmp, packageRoot);
  if (again === 'unchanged' || again === 'merged') pass('idempotent re-run');
  else fail('idempotent', again);

  const fresh = mkdtempSync(join(tmpdir(), 'xray-gitignore-fresh-'));
  try {
    const freshResult = applyConsumerGitignore(fresh, packageRoot);
    if (freshResult === 'created') pass('creates .gitignore when absent');
    else fail('create when absent', freshResult);
    const freshContent = readFileSync(join(fresh, '.gitignore'), 'utf8');
    if (SUIT_IGNORE_LINES.every((l) => freshContent.includes(l))) {
      pass('template includes all suit lines');
    } else fail('template suit lines');
  } finally {
    rmSync(fresh, { recursive: true, force: true });
  }
} finally {
  rmSync(tmp, { recursive: true, force: true });
}

console.log(
  '\n' +
    (failed === 0
      ? '🎉 consumer-gitignore verify passed.'
      : `⚠️  ${failed} consumer-gitignore check(s) failed.`),
);
process.exit(failed === 0 ? 0 : 1);