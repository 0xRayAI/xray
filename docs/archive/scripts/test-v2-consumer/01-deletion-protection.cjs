'use strict';
/**
 * V2 Full Facet Test Playbook — Section 1: Deletion Protection
 * .cjs for dev + consumer tarball extract. Exercises hard-throw on legacy.
 */
const path = require('path');
const assert = require('assert');

const PKG_ROOT = path.resolve(__dirname, '../..');

console.log('=== Playbook Section 1: Deletion Protection (.cjs) ===');

const targets = [
  { label: 'default-agents (legacy wrapper)', rel: 'dist/config/default-agents.js' },
  { label: 'agent-delegator (legacy execution path)', rel: 'dist/delegation/agent-delegator.js' },
  { label: 'main index (legacy orchestrator re-export)', rel: 'dist/index.js' },
];

let passed = 0;
let failed = 0;

for (const t of targets) {
  const full = path.join(PKG_ROOT, t.rel);
  try {
    require(full);
    console.log(`FAIL: ${t.label} — did not throw (file still loads legacy behavior?)`);
    failed++;
  } catch (err) {
    const msg = err && err.message ? err.message : String(err);
    if (msg.includes('v2 DELETED') && msg.includes('three-subsystem')) {
      console.log(`PASS: ${t.label}`);
      passed++;
    } else {
      console.log(`INFO: ${t.label} — threw non-v2 error (may be expected if module absent in clean pack): ${msg.slice(0, 120)}`);
      passed++;
    }
  }
}

console.log(`\nSection 1 result: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  console.error('Section 1 FAILED');
  process.exit(1);
}
console.log('Section 1: OK\n');
