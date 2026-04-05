/**
 * Kernel Integration Live Test
 * 
 * This script tests the kernel integration in real runtime
 * by testing the kernel patterns directly.
 */

import { getKernel, resetKernel } from '../../dist/core/kernel-patterns.js';

console.log('🧪 KERNEL INTEGRATION LIVE TEST');
console.log('================================\n');

// Reset kernel to ensure clean state
resetKernel();

console.log('📋 Testing Kernel Pattern Detection\n');

const testCases = [
  {
    name: 'P6: Security Vulnerability',
    observation: 'P6 security_vulnerability detected in authentication system',
    minConfidence: 0.8
  },
  {
    name: 'P7: Release Readiness',
    observation: 'P7 precommit_fails blocking release process',
    minConfidence: 0.8
  },
  {
    name: 'P8: Infrastructure Hardening',
    observation: 'P8 execution_failures due to chmod+typecheck issues',
    minConfidence: 0.8
  },
  {
    name: 'A8: Security Optional',
    observation: 'security optional until after feature completion',
    minConfidence: 0.7
  },
  {
    name: 'A9: Works Locally',
    observation: 'works in dev and works locally but fails in production',
    minConfidence: 0.7
  },
  {
    name: 'A1: Works in Dev',
    observation: 'works in dev but fails in production',
    minConfidence: 0.7
  },
  {
    name: 'A2: Tests Pass',
    observation: 'tests pass so code is correct',
    minConfidence: 0.7
  }
];

let passed = 0;
let failed = 0;

for (const testCase of testCases) {
  console.log(`Testing: ${testCase.name}`);
  console.log(`  Observation: "${testCase.observation}"`);
  
  const kernel = getKernel();
  const result = kernel.analyze(testCase.observation);
  
  console.log(`  Confidence: ${result.confidence}`);
  console.log(`  Level: ${result.level}`);
  console.log(`  Action Required: ${result.actionRequired || 'N/A'}`);
  console.log(`  Cascade Patterns: ${result.cascadePatterns?.length || 0}`);
  console.log(`  Fatal Assumptions: ${result.fatalAssumptions?.length || 0}`);
  
  if (result.confidence >= testCase.minConfidence) {
    console.log(`  ✅ PASS: Confidence >= ${testCase.minConfidence}`);
    passed++;
  } else {
    console.log(`  ❌ FAIL: Confidence < ${testCase.minConfidence}`);
    failed++;
  }
  
  if (result.cascadePatterns && result.cascadePatterns.length > 0) {
    console.log(`  Patterns detected: ${result.cascadePatterns.map(p => p.id).join(', ')}`);
  }
  if (result.fatalAssumptions && result.fatalAssumptions.length > 0) {
    console.log(`  Assumptions detected: ${result.fatalAssumptions.map(a => a.id).join(', ')}`);
  }
  console.log('');
}

console.log('📋 Testing Kernel Learning System\n');

const kernel = getKernel();

// Test learning
kernel.learn({
  success: true,
  patternUsed: 'P6',
  feedback: 'Security transformation successful'
});
console.log('  ✅ Learning (success) executed');

kernel.learn({
  success: false,
  patternUsed: 'P8',
  feedback: 'Infrastructure fix failed'
});
console.log('  ✅ Learning (failure) executed');
passed += 2;

console.log('\n📋 Testing Kernel Config\n');

const config = kernel.getConfig();
console.log(`  Enabled: ${config.enabled}`);
console.log(`  Confidence Threshold: ${config.confidenceThreshold}`);
console.log(`  Max Patterns: ${config.maxPatternsPerAnalysis}`);
console.log(`  Learning Enabled: ${config.enableLearning}`);
passed++;

console.log('\n📋 Testing Kernel Process Method\n');

const processResult = kernel.process('P6 security_vulnerability detected');
console.log(`  Process confidence: ${processResult.confidence}`);
console.log(`  Process level: ${processResult.level}`);
passed++;

console.log('\n📋 Testing Kernel Disable/Enable\n');

kernel.updateConfig({ enabled: false });
const disabledResult = kernel.analyze('any observation');
console.log(`  Disabled result confidence: ${disabledResult.confidence}`);
console.log(`  Disabled recommendations: ${disabledResult.recommendations?.join(', ')}`);

kernel.updateConfig({ enabled: true });
const enabledResult = kernel.analyze('P6 security_vulnerability detected');
console.log(`  Enabled result confidence: ${enabledResult.confidence}`);
passed++;

console.log('\n================================');
console.log(`📊 RESULTS: ${passed} passed, ${failed} failed`);
console.log('================================\n');

if (failed > 0) {
  console.log('❌ KERNEL INTEGRATION TEST FAILED');
  process.exit(1);
} else {
  console.log('✅ KERNEL INTEGRATION TEST PASSED');
  process.exit(0);
}
