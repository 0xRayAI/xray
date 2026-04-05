/**
 * Test simple name mapping
 */

import { getAgentSimpleName, getAllSimpleNames } from '../../dist/delegation/task-skill-router.js';

console.log('🧪 SIMPLE NAME MAPPING TEST');
console.log('===========================\n');

// Test individual names
console.log('Testing individual simple names:');
console.log(`  strategist → ${getAgentSimpleName('strategist')}`);
console.log(`  bug-triage-specialist → ${getAgentSimpleName('bug-triage-specialist')}`);
console.log(`  security-auditor → ${getAgentSimpleName('security-auditor')}`);
console.log(`  testing-lead → ${getAgentSimpleName('testing-lead')}`);
console.log(`  researcher → ${getAgentSimpleName('researcher')}`);
console.log(`  tech-writer → ${getAgentSimpleName('tech-writer')}`);
console.log(`  enforcer → ${getAgentSimpleName('enforcer')}`);
console.log(`  architect → ${getAgentSimpleName('architect')}`);

// Test unknown agent (should return the original)
console.log('\nTesting unknown agent:');
console.log(`  unknown-agent → ${getAgentSimpleName('unknown-agent')}`);

// Test legacy aliases
console.log('\nTesting legacy aliases:');
console.log(`  librarian → ${getAgentSimpleName('librarian')}`);
console.log(`  seo-specialist → ${getAgentSimpleName('seo-specialist')}`);
console.log(`  marketing-expert → ${getAgentSimpleName('marketing-expert')}`);

// Show all mappings
console.log('\nAll simple name mappings:');
const allNames = getAllSimpleNames();
for (const [key, value] of Object.entries(allNames)) {
  console.log(`  ${key} → ${value}`);
}

console.log('\n===========================');
console.log('✅ SIMPLE NAME MAPPING TEST COMPLETE');
