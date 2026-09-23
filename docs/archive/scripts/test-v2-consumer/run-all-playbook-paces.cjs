'use strict';
/**
 * V2 Full Facet Test Playbook — Master Runner
 * Executes all playbook .cjs (for consumer tarball verification of 7 flows + hard-throw + YML).
 */
const { execSync } = require('child_process');
const path = require('path');

const dir = __dirname;
const scripts = [
  '01-deletion-protection.cjs',
  '02-thin-dispatch-funnel.cjs',
  '03-processor-pipeline.cjs',
];

console.log('=== V2 Full Facet Test Playbook — All Paces Runner ===\n');

let failed = 0;

for (const s of scripts) {
  const full = path.join(dir, s);
  try {
    execSync(`node "${full}"`, { stdio: 'inherit' });
  } catch (e) {
    failed++;
  }
}

console.log(`\nPlaybook paces result: ${failed === 0 ? '✅ ALL CURRENT SECTIONS PASSED' : failed + ' failures'}`);
process.exit(failed === 0 ? 0 : 1);
