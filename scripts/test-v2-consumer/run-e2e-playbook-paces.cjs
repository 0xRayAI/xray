'use strict';
/**
 * Master runner for the dedicated V2 E2E Consumer Test Playbook.
 * This is the primary artifact for "implement / exec it".
 */
const { execSync } = require('child_process');
const path = require('path');

const dir = __dirname;
const e2eScripts = [
  '01-deletion-protection.cjs',
  '02-thin-dispatch-funnel.cjs',
  '03-processor-pipeline.cjs',
  // Add more E2E-specific ones here as the playbook grows (e.g. 04-mcp-orchestrator-e2e.cjs, 05-consumer-tarball-full-paces.cjs)
];

console.log('=== V2 E2E Consumer Test Playbook — Master Execution ===\n');

let failed = 0;
for (const s of e2eScripts) {
  try {
    execSync(`node "${path.join(dir, s)}"`, { stdio: 'inherit' });
  } catch (e) {
    failed++;
  }
}

console.log(`\nE2E Playbook result: ${failed === 0 ? '✅ ALL E2E PACES PASSED' : failed + ' failures'}`);
process.exit(failed === 0 ? 0 : 1);
