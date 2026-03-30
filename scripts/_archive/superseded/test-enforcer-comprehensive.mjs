#!/usr/bin/env node

/**
 * Comprehensive Enforcer Test Suite
 * Tests all rules, pre-processors, post-processors, and test auto-creation
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '../..');

console.log("🧪 COMPREHENSIVE ENFORCER TEST SUITE");
console.log("=====================================\n");

let passed = 0;
let failed = 0;
const results = [];

// Helper to run tests
function runTest(name, testFn) {
  try {
    testFn();
    passed++;
    results.push({ name, status: '✅ PASS' });
    console.log(`✅ ${name}`);
  } catch (error) {
    failed++;
    results.push({ name, status: '❌ FAIL', error: error.message });
    console.log(`❌ ${name}: ${error.message}`);
  }
}

// Test 1: Rules Engine
console.log("\n📋 SECTION 1: RULES ENGINE");
console.log("-------------------------");

runTest("RuleEnforcer can be imported", async () => {
  const { ruleEnforcer } = await import(PROJECT_ROOT + '/dist/enforcement/rule-enforcer.js');
  if (!ruleEnforcer) throw new Error("ruleEnforcer is null");
});

runTest("Rules are registered", async () => {
  const { ruleEnforcer } = await import(PROJECT_ROOT + '/dist/enforcement/rule-enforcer.js');
  await new Promise(r => setTimeout(r, 100));
  if (ruleEnforcer.rules.size < 20) throw new Error("Expected 20+ rules, got " + ruleEnforcer.rules.size);
});

runTest("src-dist-integrity rule exists", async () => {
  const { ruleEnforcer } = await import(PROJECT_ROOT + '/dist/enforcement/rule-enforcer.js');
  await new Promise(r => setTimeout(r, 100));
  const rule = ruleEnforcer.rules.get('src-dist-integrity');
  if (!rule) throw new Error("src-dist-integrity rule not found");
});

runTest("src-dist-integrity catches dist edits", async () => {
  const { ruleEnforcer } = await import(PROJECT_ROOT + '/dist/enforcement/rule-enforcer.js');
  await new Promise(r => setTimeout(r, 100));
  const result = await ruleEnforcer.validateOperation('write', { files: ['dist/test.js'] });
  if (result.passed) throw new Error("Should have caught dist edit");
});

runTest("src-dist-integrity allows src edits", async () => {
  const { ruleEnforcer } = await import(PROJECT_ROOT + '/dist/enforcement/rule-enforcer.js');
  await new Promise(r => setTimeout(r, 100));
  const result = await ruleEnforcer.validateOperation('write', { files: ['src/utils/test.ts'] });
  if (!result.passed) throw new Error("Should allow src edit");
});

runTest("no-duplicate-code rule exists", async () => {
  const { ruleEnforcer } = await import(PROJECT_ROOT + '/dist/enforcement/rule-enforcer.js');
  const rule = ruleEnforcer.rules.get('no-duplicate-code');
  if (!rule) throw new Error("no-duplicate-code rule not found");
});

runTest("dependency-management rule exists", async () => {
  const { ruleEnforcer } = await import(PROJECT_ROOT + '/dist/enforcement/rule-enforcer.js');
  const rule = ruleEnforcer.rules.get('dependency-management');
  if (!rule) throw new Error("dependency-management rule not found");
});

// Test 2: Pre-Processors
console.log("\n📋 SECTION 2: PRE-PROCESSORS");
console.log("----------------------------");

runTest("ProcessorManager can be imported", async () => {
  const { processorManager } = await import(PROJECT_ROOT + '/dist/processors/processor-manager.js');
  if (!processorManager) throw new Error("processorManager is null");
});

runTest("Pre-processors are registered", async () => {
  const { processorManager } = await import(PROJECT_ROOT + '/dist/processors/processor-manager.js');
  const preProcessors = processorManager.preProcessors;
  if (preProcessors.size < 1) throw new Error("Expected pre-processors");
});

runTest("preValidate processor exists", async () => {
  const { processorManager } = await import(PROJECT_ROOT + '/dist/processors/processor-manager.js');
  const processor = processorManager.preProcessors.get('preValidate');
  if (!processor) throw new Error("preValidate processor not found");
});

runTest("codexCompliance processor exists", async () => {
  const { processorManager } = await import(PROJECT_ROOT + '/dist/processors/processor-manager.js');
  const processor = processorManager.preProcessors.get('codexCompliance');
  if (!processor) throw new Error("codexCompliance processor not found");
});

runTest("testAutoCreation processor exists", async () => {
  const { processorManager } = await import(PROJECT_ROOT + '/dist/processors/processor-manager.js');
  const processor = processorManager.preProcessors.get('testAutoCreation');
  if (!processor) throw new Error("testAutoCreation processor not found");
});

// Test 3: Post-Processors  
console.log("\n📋 SECTION 3: POST-PROCESSORS");
console.log("------------------------------");

runTest("Post-processors are registered", async () => {
  const { processorManager } = await import(PROJECT_ROOT + '/dist/processors/processor-manager.js');
  const postProcessors = processorManager.postProcessors;
  if (postProcessors.size < 1) throw new Error("Expected post-processors");
});

// Test 4: Memory Monitor
console.log("\n📋 SECTION 4: MEMORY MONITOR");
console.log("------------------------------");

runTest("MemoryMonitor can be imported", async () => {
  const { memoryMonitor } = await import(PROJECT_ROOT + '/dist/monitoring/memory-monitor.js');
  if (!memoryMonitor) throw new Error("memoryMonitor is null");
});

runTest("MemoryMonitor has start/stop", async () => {
  const { memoryMonitor } = await import(PROJECT_ROOT + '/dist/monitoring/memory-monitor.js');
  if (typeof memoryMonitor.start !== 'function') throw new Error("start() missing");
  if (typeof memoryMonitor.stop !== 'function') throw new Error("stop() missing");
});

runTest("MemoryMonitor listener count is stable", async () => {
  const { memoryMonitor } = await import(PROJECT_ROOT + '/dist/monitoring/memory-monitor.js');
  memoryMonitor.start();
  const count1 = memoryMonitor.listenerCount('alert');
  
  // Trigger setup again (simulating multiple boots)
  const { BootOrchestrator } = await import(PROJECT_ROOT + '/dist/core/boot-orchestrator.js');
  const boot = new BootOrchestrator({ directory: PROJECT_ROOT });
  
  const count2 = memoryMonitor.listenerCount('alert');
  memoryMonitor.stop();
  
  // Should not grow significantly
  if (count2 > count1 + 1) {
    throw new Error("Memory leak: listeners grew from " + count1 + " to " + count2);
  }
});

// Test 5: State Manager
console.log("\n📋 SECTION 5: STATE MANAGER");
console.log("---------------------------");

runTest("StateManager can be imported", async () => {
  const { StringRayStateManager } = await import(PROJECT_ROOT + '/dist/state/string-ray-state-manager.js');
  if (!StringRayStateManager) throw new Error("StringRayStateManager is null");
});

runTest("StateManager basic operations work", async () => {
  const { StringRayStateManager } = await import(PROJECT_ROOT + '/dist/state/string-ray-state-manager.js');
  const sm = new StringRayStateManager('/tmp/test-enforcer-' + Date.now());
  sm.set('test:key', 'test-value');
  const val = sm.get('test:key');
  if (val !== 'test-value') throw new Error("State manager not working");
  sm.delete('test:key');
});

// Test 6: Framework Boot
console.log("\n📋 SECTION 6: FRAMEWORK BOOT");
console.log("----------------------------");

runTest("BootOrchestrator can be imported", async () => {
  const { bootOrchestrator } = await import(PROJECT_ROOT + '/dist/core/boot-orchestrator.js');
  if (!bootOrchestrator) throw new Error("bootOrchestrator is null");
});

runTest("BootOrchestrator has required properties", async () => {
  const { bootOrchestrator } = await import(PROJECT_ROOT + '/dist/core/boot-orchestrator.js');
  if (!bootOrchestrator.stateManager) throw new Error("stateManager missing");
  if (!bootOrchestrator.processorManager) throw new Error("processorManager missing");
});

// Test 7: Orchestrator
console.log("\n📋 SECTION 7: ORCHESTRATOR");
console.log("---------------------------");

runTest("Orchestrator can be imported", async () => {
  const { strRayOrchestrator } = await import(PROJECT_ROOT + '/dist/orchestrator/orchestrator.js');
  if (!strRayOrchestrator) throw new Error("strRayOrchestrator is null");
});

// Summary
console.log("\n=====================================");
console.log("📊 TEST SUMMARY");
console.log("=====================================");
console.log(`✅ Passed: ${passed}`);
console.log(`❌ Failed: ${failed}`);
console.log(`📈 Total: ${passed + failed}`);

if (failed > 0) {
  console.log("\n❌ FAILURES:");
  results.filter(r => r.status.startsWith('❌')).forEach(r => {
    console.log(`  - ${r.name}: ${r.error}`);
  });
}

process.exit(failed > 0 ? 1 : 0);
