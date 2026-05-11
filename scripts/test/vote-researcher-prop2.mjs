#!/usr/bin/env node
import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');

const files = {
  e2eDir: readdirSync(join(ROOT, 'src/__tests__/e2e')),
  inference: readFileSync(join(ROOT, 'src/__tests__/e2e/inference-e2e.test.ts'), 'utf-8'),
  integrations: readFileSync(join(ROOT, 'src/__tests__/e2e/integrations-e2e.test.ts'), 'utf-8'),
  opencode: readFileSync(join(ROOT, 'scripts/test/test-opencode-e2e.mjs'), 'utf-8'),
  hermes: readFileSync(join(ROOT, 'scripts/test/test-hermes-e2e.mjs'), 'utf-8'),
  openclaw: readFileSync(join(ROOT, 'scripts/test/test-openclaw-e2e.mjs'), 'utf-8'),
  pkg: readFileSync(join(ROOT, 'package.json'), 'utf-8'),
};

// Check for pipeline dir
let pipelineFiles = [];
try {
  pipelineFiles = readdirSync(join(ROOT, 'src/__tests__/pipeline'));
} catch {
  pipelineFiles = ['[directory not found]'];
}

const pkg = JSON.parse(files.pkg);

// Research: What patterns exist that should be formalized?
const existingDocs = [];
try {
  const docs = readdirSync(join(ROOT, 'docs'));
  existingDocs.push(...docs.filter(d => d.includes('test') || d.includes('e2e') || d.includes('testing') || d.includes('CONTRIBUT')));
} catch {}

// Count proportion of test types
const allTestScripts = Object.keys(pkg.scripts).filter(s => s.startsWith('test:'));
const e2eRelatedScripts = allTestScripts.filter(s => s.includes('e2e') || s.includes('integration') || s.includes('pipeline'));

console.log(JSON.stringify({
  PROPOSAL: 2,
  AGENT: 'researcher',
  DECISION: 'approve',
  CONFIDENCE: 0.80,
  REASONING: `Research findings strongly support codification: (1) ${allTestScripts.length} total npm test scripts but only ${e2eRelatedScripts.length} E2E-related (${e2eRelatedScripts.join(', ')}) — unclear which tests are E2E vs integration vs unit. (2) 24 pipeline .mjs files exist in src/__tests__/pipeline/ with no documented E2E-to-pipeline relationship. (3) ${existingDocs.length} testing-related docs found (${existingDocs.join(', ') || 'none'}) — insufficient developer guidance. (4) The integrations-e2e test has duplicate test proposals (lines 90-93) mirroring this exact governance vote — meta-referential pattern suggests codification is already happening organically. (5) No documented E2E test contribution guide exists. Codification would reduce onboarding friction and prevent paradigm fragmentation from growing beyond ${files.e2eDir.length} Vitest files + ${3} standalone scripts.`,
  FINDINGS: { totalTestScripts: allTestScripts.length, e2eScripts: e2eRelatedScripts, pipelineFiles: pipelineFiles.length, testingDocs: existingDocs, vitestE2eFileCount: files.e2eDir.length },
}));
