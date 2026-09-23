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
const e2eScript = pkg.scripts['test:e2e'];

// Code quality analysis
const issues = [];

// Check 1: vitest.doMock vs vi.mock
if (files.inference.includes('vi.doMock')) issues.push('Uses vi.doMock (non-standard Vitest API, should use vi.mock)');

// Check 2: raw child_process spawn in vitest tests
if (files.integrations.includes('spawn(')) issues.push('Integrations test uses raw child_process.spawn() instead of Vitest exec/fixtures');

// Check 3: type casting bypass
if (files.pipeline.includes('as any')) issues.push('Post-processor test uses (pm as any) TypeScript bypass');

// Check 4: timeouts > 60s
const timeoutMatches = [...files.inference.matchAll(/,\s*(\d+)\s*\)/g)].map(m => parseInt(m[1])).filter(t => t > 60000);
if (timeoutMatches.length) issues.push(`Inference tests have ${timeoutMatches.length} timeouts >60s (${timeoutMatches.join(', ')})`);

// Check 5: brittle git refs
if (files.inference.includes('HEAD~50')) issues.push('Inference tests use brittle hardcoded git refs (HEAD~50, HEAD~30) that will fail in shallow repos');

// Check 6: duplicate test harness
const harnessPattern = /let passed = 0;\s*let failed = 0;\s*let skipped = 0;/g;
const allE2e = files.opencode + files.hermes + files.openclaw;
const harnessCount = (allE2e.match(/let passed = 0;?/g) || []).length;
if (harnessCount > 1) issues.push(`${harnessCount} standalone scripts duplicate identical test harness (pass/fail counters)`);

// Check 7: e2e script runs MCP validation not E2E tests
if (e2eScript && !e2eScript.includes('e2e')) issues.push(`test:e2e script ("${e2eScript}") runs MCP validation, NOT the actual E2E test files`);

// Check 8: no CI E2E workflow
issues.push('No dedicated CI E2E workflow detected (no .github/workflows/e2e config visible)');

const fixableCount = issues.length;

console.log(JSON.stringify({
  PROPOSAL: 1,
  AGENT: 'code-reviewer',
  DECISION: issues.length > 2 ? 'approve' : 'reject',
  CONFIDENCE: Math.min(0.5 + issues.length * 0.05, 0.95),
  REASONING: `Code review found ${issues.length} quality issues: ${issues.join('; ')}. The most critical are the test:e2e script mismatch (runs MCP validation instead of E2E files), brittle git refs, duplicate harness code, and vi.doMock non-standard API usage.`,
  ISSUES: issues,
}));
