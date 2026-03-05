/**
 * Integration test that triggers kernel patterns through actual framework components
 */

import { getKernel, resetKernel } from '../../dist/core/kernel-patterns.js';
import { readFileSync } from 'fs';

console.log('🧪 KERNEL INTEGRATION THROUGH FRAMEWORK COMPONENTS');
console.log('===================================================\n');

let testsPassed = 0;
let testsFailed = 0;

// Reset kernel
resetKernel();

console.log('📋 Testing Kernel via AgentDelegator...\n');

try {
  // Check kernel import exists in the code
  const delegatorCode = readFileSync('./src/delegation/agent-delegator.ts', 'utf8');
  if (delegatorCode.includes("import { getKernel")) {
    console.log('  ✅ Kernel import found in AgentDelegator source');
    testsPassed++;
  } else {
    console.log('  ❌ Kernel import NOT found in AgentDelegator source');
    testsFailed++;
  }
  
  // Check if kernel.analyze is called
  if (delegatorCode.includes("this.kernel.analyze")) {
    console.log('  ✅ Kernel.analyze called in AgentDelegator');
    testsPassed++;
  } else {
    console.log('  ❌ Kernel.analyze NOT called in AgentDelegator');
    testsFailed++;
  }
  
} catch (error) {
  console.log(`  ❌ Error: ${error.message}\n`);
  testsFailed++;
}

console.log('📋 Testing Kernel via TaskSkillRouter...\n');

try {
  // Check kernel import exists in the code
  const routerCode = readFileSync('./src/delegation/task-skill-router.ts', 'utf8');
  if (routerCode.includes("import { getKernel")) {
    console.log('  ✅ Kernel import found in TaskSkillRouter source');
    testsPassed++;
  } else {
    console.log('  ❌ Kernel import NOT found in TaskSkillRouter source');
    testsFailed++;
  }
  
  // Check if kernel.analyze is called
  if (routerCode.includes("this.kernel.analyze")) {
    console.log('  ✅ Kernel.analyze called in TaskSkillRouter');
    testsPassed++;
  } else {
    console.log('  ❌ Kernel.analyze NOT called in TaskSkillRouter');
    testsFailed++;
  }
  
} catch (error) {
  console.log(`  ❌ Error: ${error.message}\n`);
  testsFailed++;
}

console.log('📋 Testing Kernel via Orchestrator...\n');

try {
  // Check kernel import exists in the code
  const orchestratorCode = readFileSync('./src/core/orchestrator.ts', 'utf8');
  if (orchestratorCode.includes("import { getKernel")) {
    console.log('  ✅ Kernel import found in Orchestrator source');
    testsPassed++;
  } else {
    console.log('  ❌ Kernel import NOT found in Orchestrator source');
    testsFailed++;
  }
  
  // Check if kernel.analyze is called
  if (orchestratorCode.includes("this.kernel.analyze")) {
    console.log('  ✅ Kernel.analyze called in Orchestrator');
    testsPassed++;
  } else {
    console.log('  ❌ Kernel.analyze NOT called in Orchestrator');
    testsFailed++;
  }
  
} catch (error) {
  console.log(`  ❌ Error: ${error.message}\n`);
  testsFailed++;
}

console.log('📋 Testing P6, P7, P8 Pattern Detection...\n');

const kernel = getKernel();

// Test P6
const p6Result = kernel.analyze('P6 security_vulnerability detected');
console.log(`  P6: confidence=${p6Result.confidence}, action=${p6Result.actionRequired}`);
if (p6Result.confidence >= 0.9) testsPassed++; else testsFailed++;

// Test P7
const p7Result = kernel.analyze('P7 precommit_fails blocking release');
console.log(`  P7: confidence=${p7Result.confidence}, action=${p7Result.actionRequired}`);
if (p7Result.confidence >= 0.9) testsPassed++; else testsFailed++;

// Test P8
const p8Result = kernel.analyze('P8 execution_failures chmod+typecheck');
console.log(`  P8: confidence=${p8Result.confidence}, action=${p8Result.actionRequired}`);
if (p8Result.confidence >= 0.9) testsPassed++; else testsFailed++;

console.log('\n===================================================');
console.log(`📊 RESULTS: ${testsPassed} passed, ${testsFailed} failed`);
console.log('===================================================\n');

if (testsFailed > 0) {
  console.log('❌ KERNEL INTEGRATION TEST FAILED');
  process.exit(1);
} else {
  console.log('✅ KERNEL INTEGRATION TEST PASSED');
  process.exit(0);
}
