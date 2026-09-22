#!/usr/bin/env node
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');

const files = {
  inference: readFileSync(join(ROOT, 'src/__tests__/e2e/inference-e2e.test.ts'), 'utf-8'),
  integrations: readFileSync(join(ROOT, 'src/__tests__/e2e/integrations-e2e.test.ts'), 'utf-8'),
  pipeline: readFileSync(join(ROOT, 'src/__tests__/e2e/post-processor-pipeline-e2e.test.ts'), 'utf-8'),
  opencode: readFileSync(join(ROOT, 'scripts/test/test-opencode-e2e.mjs'), 'utf-8'),
  hermes: readFileSync(join(ROOT, 'scripts/test/test-hermes-e2e.mjs'), 'utf-8'),
  openclaw: readFileSync(join(ROOT, 'scripts/test/test-openclaw-e2e.mjs'), 'utf-8'),
  pkg: readFileSync(join(ROOT, 'package.json'), 'utf-8'),
};

const pkg = JSON.parse(files.pkg);

// Line counts
const sizes = {
  'inference-e2e': files.inference.split('\n').length,
  'integrations-e2e': files.integrations.split('\n').length,
  'pipeline-e2e': files.pipeline.split('\n').length,
  'opencode-e2e.mjs': files.opencode.split('\n').length,
  'hermes-e2e.mjs': files.hermes.split('\n').length,
  'openclaw-e2e.mjs': files.openclaw.split('\n').length,
};

// Count duplication in harness setup
const sharedPatterns = [
  'let passed = 0',
  'let failed = 0',
  'let skipped = 0',
  'function pass(name)',
  'function fail(name, reason)',
  'function skip(name, reason)',
  'function section(title)',
  'function run(cmd, opts',
  'fs.mkdtempSync',
  'fs.mkdirSync(testDir',
  'run(\'git init\'',
  'run(\'npm init -y\'',
];

let dupCount = 0;
let dups = [];
for (const pattern of sharedPatterns) {
  const count = [files.opencode, files.hermes, files.openclaw].filter(f => f.includes(pattern)).length;
  if (count > 1) {
    dupCount++;
    dups.push(`${pattern} (${count}x)`);
  }
}

const totalStandalone = sizes['opencode-e2e.mjs'] + sizes['hermes-e2e.mjs'] + sizes['openclaw-e2e.mjs'];
const totalVitest = sizes['inference-e2e'] + sizes['integrations-e2e'] + sizes['pipeline-e2e'];

const refactoringNeeded = dupCount > 3 || totalStandalone > 2000;

console.log(JSON.stringify({
  PROPOSAL: 1,
  AGENT: 'refactorer',
  DECISION: refactoringNeeded ? 'approve' : 'reject',
  CONFIDENCE: refactoringNeeded ? 0.85 : 0.4,
  REASONING: `Refactoring analysis: ${totalStandalone} lines in 3 standalone scripts vs ${totalVitest} lines in 3 Vitest E2E files. Found ${dupCount} duplicated patterns across standalone scripts (${dups.join('; ')}). Core refactors needed: extract shared test harness (pass/fail/skip/run/assertFileExists) into scripts/test/_shared/harness.mjs; unify E2E runner under a single test:e2e script; consolidate openclaw-e2e.mjs (largest at ${sizes['openclaw-e2e.mjs']} lines) into modular test suites.`,
  ANALYSIS: { sizes, dupCount, totalStandalone, totalVitest, duplicatePatterns: dups },
}));
