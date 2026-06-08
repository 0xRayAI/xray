/**
 * Performance Pipeline Test
 * Tests PerformanceBudgetProcessor
 */

import { readFileSync, existsSync } from 'fs';
import { XrayStateManager } from '../../../dist/state/state-manager.js';

console.log('=== PERFORMANCE PIPELINE TEST ===\n');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    const result = fn();
    if (result instanceof Promise) {
      result.then(() => {
        console.log(`✅ ${name}`);
        passed++;
      }).catch((e) => {
        console.log(`❌ ${name}: ${e.message}`);
        failed++;
      });
    } else {
      console.log(`✅ ${name}`);
      passed++;
    }
  } catch (e) {
    console.log(`❌ ${name}: ${e instanceof Error ? e.message : String(e)}`);
    failed++;
  }
}

console.log('Testing Performance Pipeline\n');

test('should verify PerformanceBudgetProcessor is defined', () => {
  const procPath = process.cwd() + '/src/processors/performance-budget-processor.ts';
  if (!existsSync(procPath)) {
    throw new Error('PerformanceBudgetProcessor not found');
  }
  console.log('   (PerformanceBudgetProcessor exists)');
});

test('should verify performance_monitoring config in features.json', () => {
  const configPath = process.cwd() + '/.strray/features.json';
  const configData = readFileSync(configPath, 'utf-8');
  const config = JSON.parse(configData);
  if (!config.performance_monitoring) {
    throw new Error('performance_monitoring config missing');
  }
  console.log('   (performance_monitoring verified)');
});

test('should verify performanceBudget pre-processor in BootOrchestrator', () => {
  const bootPath = process.cwd() + '/src/core/boot-orchestrator.ts';
  const content = readFileSync(bootPath, 'utf-8');
  if (!content.includes('performanceBudget')) {
    throw new Error('performanceBudget not found in BootOrchestrator');
  }
  console.log('   (performanceBudget processor verified)');
});

test('should verify alerting config exists', () => {
  const configPath = process.cwd() + '/.strray/features.json';
  const configData = readFileSync(configPath, 'utf-8');
  const config = JSON.parse(configData);
  if (!config.performance_monitoring?.alerting) {
    throw new Error('alerting config missing');
  }
  console.log('   (alerting config verified)');
});

setTimeout(() => {
  console.log('\n========================================');
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log('========================================');
  
  if (failed === 0) {
    console.log('✅ Performance Pipeline test PASSED');
    process.exit(0);
  } else {
    console.log('❌ Performance Pipeline test FAILED');
    process.exit(1);
  }
}, 1000);
