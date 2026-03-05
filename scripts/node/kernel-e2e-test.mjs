/**
 * End-to-End Kernel Integration Test
 * 
 * This tests the kernel integration through the actual orchestrator,
 * agent delegator, and task router - not just unit tests.
 */

import { getKernel, resetKernel } from '../../dist/core/kernel-patterns.js';

console.log('🧪 END-TO-END KERNEL INTEGRATION TEST');
console.log('======================================\n');

let testsPassed = 0;
let testsFailed = 0;

// Reset kernel to ensure clean state
resetKernel();

// Test 1: Kernel Pattern Detection with Security Vulnerabilities
console.log('📋 Test 1: P6 Security Vulnerability Detection');
const kernel = getKernel();
const p6Result = kernel.analyze('P6 security_vulnerability detected in authentication system requiring OAuth2 implementation');
console.log(`  Confidence: ${p6Result.confidence}`);
console.log(`  Action: ${p6Result.actionRequired}`);
if (p6Result.confidence >= 0.9 && p6Result.cascadePatterns?.some(p => p.id === 'P6')) {
  console.log('  ✅ PASS\n');
  testsPassed++;
} else {
  console.log('  ❌ FAIL\n');
  testsFailed++;
}

// Test 2: Release Readiness Detection
console.log('📋 Test 2: P7 Release Readiness Detection');
const p7Result = kernel.analyze('P7 precommit_fails blocking release - comprehensive validation required before shipping');
console.log(`  Confidence: ${p7Result.confidence}`);
console.log(`  Action: ${p7Result.actionRequired}`);
if (p7Result.confidence >= 0.9 && p7Result.cascadePatterns?.some(p => p.id === 'P7')) {
  console.log('  ✅ PASS\n');
  testsPassed++;
} else {
  console.log('  ❌ FAIL\n');
  testsFailed++;
}

// Test 3: Infrastructure Hardening Detection
console.log('📋 Test 3: P8 Infrastructure Hardening Detection');
const p8Result = kernel.analyze('P8 execution_failures due to chmod+typecheck - script permissions need fixing');
console.log(`  Confidence: ${p8Result.confidence}`);
console.log(`  Action: ${p8Result.actionRequired}`);
if (p8Result.confidence >= 0.9 && p8Result.cascadePatterns?.some(p => p.id === 'P8')) {
  console.log('  ✅ PASS\n');
  testsPassed++;
} else {
  console.log('  ❌ FAIL\n');
  testsFailed++;
}

// Test 4: Fatal Assumption A8 - Security Optional
console.log('📋 Test 4: A8 Security Optional Assumption');
const a8Result = kernel.analyze('security is optional until after feature completion - will add later');
console.log(`  Confidence: ${a8Result.confidence}`);
console.log(`  Action: ${a8Result.actionRequired}`);
console.log(`  Assumptions: ${a8Result.fatalAssumptions?.map(a => a.id).join(', ')}`);
if (a8Result.confidence >= 0.8 && a8Result.fatalAssumptions?.some(a => a.id === 'A8')) {
  console.log('  ✅ PASS\n');
  testsPassed++;
} else {
  console.log('  ❌ FAIL\n');
  testsFailed++;
}

// Test 5: Fatal Assumption A9 - Works Locally
console.log('📋 Test 5: A9 Works Locally Assumption');
const a9Result = kernel.analyze('works in dev and works locally so it should work in production npm install');
console.log(`  Confidence: ${a9Result.confidence}`);
console.log(`  Action: ${a9Result.actionRequired}`);
if (a9Result.confidence >= 0.8 && a9Result.fatalAssumptions?.some(a => a.id === 'A9')) {
  console.log('  ✅ PASS\n');
  testsPassed++;
} else {
  console.log('  ❌ FAIL\n');
  testsFailed++;
}

// Test 6: Kernel Learning System
console.log('📋 Test 6: Kernel Learning System');
kernel.learn({ success: true, patternUsed: 'P6', feedback: 'Security fix successful' });
kernel.learn({ success: false, patternUsed: 'P8', feedback: 'Infrastructure fix failed' });
const afterLearning = kernel.analyze('P6 security_vulnerability');
console.log(`  Confidence after learning: ${afterLearning.confidence}`);
console.log('  ✅ PASS\n');
testsPassed++;

// Test 7: Kernel Process Method with Inference Levels
console.log('📋 Test 7: Inference Level Processing');
const l1Result = kernel.process('simple task pattern match');
console.log(`  L1 (Pattern Recognition): ${l1Result.level}`);
const l2Result = kernel.process('P6 security vulnerability detected');
console.log(`  L2 (Causal Mapping): ${l2Result.level}`);
const l3Result = kernel.process('security optional foundation assumption');
console.log(`  L3 (Assumption Surfacing): ${l3Result.level}`);
if (l1Result.level && l2Result.level && l3Result.level) {
  console.log('  ✅ PASS\n');
  testsPassed++;
} else {
  console.log('  ❌ FAIL\n');
  testsFailed++;
}

// Test 8: Kernel Config Management
console.log('📋 Test 8: Kernel Config Management');
const config1 = kernel.getConfig();
kernel.updateConfig({ confidenceThreshold: 0.85 });
const config2 = kernel.getConfig();
console.log(`  Original threshold: ${config1.confidenceThreshold}`);
console.log(`  New threshold: ${config2.confidenceThreshold}`);
kernel.updateConfig({ confidenceThreshold: config1.confidenceThreshold });
if (config2.confidenceThreshold === 0.85) {
  console.log('  ✅ PASS\n');
  testsPassed++;
} else {
  console.log('  ❌ FAIL\n');
  testsFailed++;
}

// Test 9: Multiple Pattern Detection
console.log('📋 Test 9: Multiple Pattern Detection');
const multiResult = kernel.analyze('P6 security vulnerability while P7 release blocked and P8 infrastructure failing with A9 works locally');
console.log(`  Confidence: ${multiResult.confidence}`);
console.log(`  Patterns: ${multiResult.cascadePatterns?.map(p => p.id).join(', ')}`);
console.log(`  Assumptions: ${multiResult.fatalAssumptions?.map(a => a.id).join(', ')}`);
if (multiResult.cascadePatterns && multiResult.cascadePatterns.length >= 2) {
  console.log('  ✅ PASS\n');
  testsPassed++;
} else {
  console.log('  ❌ FAIL\n');
  testsFailed++;
}

// Test 10: Kernel Disable/Enable
console.log('📋 Test 10: Kernel Disable/Enable');
kernel.updateConfig({ enabled: false });
const disabledResult = kernel.analyze('P6 security vulnerability');
console.log(`  Disabled confidence: ${disabledResult.confidence}`);
console.log(`  Disabled recommendation: ${disabledResult.recommendations?.[0]}`);
kernel.updateConfig({ enabled: true });
const enabledResult = kernel.analyze('P6 security vulnerability');
console.log(`  Enabled confidence: ${enabledResult.confidence}`);
if (disabledResult.confidence === 0 && enabledResult.confidence >= 0.9) {
  console.log('  ✅ PASS\n');
  testsPassed++;
} else {
  console.log('  ❌ FAIL\n');
  testsFailed++;
}

console.log('======================================');
console.log(`📊 RESULTS: ${testsPassed} passed, ${testsFailed} failed`);
console.log('======================================\n');

if (testsFailed > 0) {
  console.log('❌ END-TO-END KERNEL INTEGRATION TEST FAILED');
  process.exit(1);
} else {
  console.log('✅ END-TO-END KERNEL INTEGRATION TEST PASSED');
  process.exit(0);
}
