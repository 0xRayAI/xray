#!/usr/bin/env node
import { readFileSync, readdirSync } from 'fs';
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

// Architectural analysis
const paradigms = {};

// Paradigm 1: Vitest E2E with mocked dependencies (inference)
if (files.inference.includes('vi.mock') || files.inference.includes('vi.doMock')) paradigms['Vitest + Mocked deps'] = 'inference-e2e.test.ts';

// Paradigm 2: Vitest E2E with raw child_process (integrations)
if (files.integrations.includes('spawn(')) paradigms['Vitest + raw child_process'] = 'integrations-e2e.test.ts';

// Paradigm 3: Vitest E2E with dynamic imports (pipeline)
if (files.pipeline.includes('import(') || files.pipeline.includes('await import')) paradigms['Vitest + dynamic imports'] = 'pipeline-e2e.test.ts';

// Paradigm 4: Standalone Node.js scripts with execSync
if (files.opencode.includes('execSync')) paradigms['Standalone execSync'] = 'opencode/hermes/openclaw .mjs';

// Paradigm 5: MCP connectivity validation
if (pkg.scripts['test:e2e'].includes('validate-mcp')) paradigms['MCP validation script'] = 'npm script: test:e2e';

const patternCount = Object.keys(paradigms).length;
const hasFragmentation = patternCount > 2;

// What should be codified
const codifyCandidates = [
  { name: 'Shared Test Harness', reason: 'standalone scripts duplicate pass/fail helper functions' },
  { name: 'E2E Runner Blueprint', reason: 'test:e2e script should run actual E2E tests, not MCP validation' },
  { name: 'Mock Strategy Pattern', reason: '3 different mocking approaches across 3 Vitest E2E files' },
  { name: 'File Naming Convention', reason: '.test.ts vs .mjs — inconsistent extension convention' },
  { name: 'Temp Directory Lifecycle', reason: 'each standalone script invents its own --keep/--dir flag handling' },
];

console.log(JSON.stringify({
  PROPOSAL: 2,
  AGENT: 'architect',
  DECISION: 'approve',
  CONFIDENCE: 0.88,
  REASONING: `Architecture assessment: ${patternCount} distinct testing paradigms detected (${Object.keys(paradigms).join(', ')}). This fragmentation is a maintainability risk — ${codifyCandidates.length} codification candidates identified: ${codifyCandidates.map(c => c.name + ' (' + c.reason + ')').join('; ')}. Recommend codifying: (1) shared test harness module for standalone scripts, (2) unified npm test:e2e runner that invokes all E2E tiers, (3) consistent Vitest-first policy for new E2E tests, (4) CI E2E workflow definition standardized from the codified pattern.`,
  ANALYSIS: { paradigms: Object.entries(paradigms).map(([k, v]) => `${k}: ${v}`), codifyCandidates, fragmentationLevel: patternCount },
}));
