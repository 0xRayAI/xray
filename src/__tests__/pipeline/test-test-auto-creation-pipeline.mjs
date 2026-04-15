/**
 * Test Auto-Creation Pipeline Test
 * Tests auto test generation
 */

import { readFileSync, existsSync } from 'fs';

console.log('=== TEST AUTO-CREATION PIPELINE TEST ===\n');

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

console.log('Testing Test Auto-Creation Pipeline\n');

test('should verify TestAutoCreationProcessor exists', () => {
  const procPath = process.cwd() + '/src/processors/test-auto-creation-processor.ts';
  if (!existsSync(procPath)) {
    throw new Error('TestAutoCreationProcessor not found');
  }
  console.log('   (TestAutoCreationProcessor exists)');
});

test('should verify testAutoCreation in BootOrchestrator', () => {
  const bootPath = process.cwd() + '/src/core/boot-orchestrator.ts';
  const content = readFileSync(bootPath, 'utf-8');
  if (!content.includes('testAutoCreation')) {
    throw new Error('testAutoCreation not found in BootOrchestrator');
  }
  console.log('   (testAutoCreation processor verified)');
});

test('should verify test-auto-creation-processor is properly exported', () => {
  const procPath = process.cwd() + '/src/processors/test-auto-creation-processor.ts';
  const content = readFileSync(procPath, 'utf-8');
  if (!content.includes('export const testAutoCreationProcessor')) {
    throw new Error('testAutoCreationProcessor export not found');
  }
  console.log('   (testAutoCreationProcessor export verified)');
});

setTimeout(() => {
  console.log('\n========================================');
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log('========================================');
  
  if (failed === 0) {
    console.log('✅ Test Auto-Creation Pipeline test PASSED');
    process.exit(0);
  } else {
    console.log('❌ Test Auto-Creation Pipeline test FAILED');
    process.exit(1);
  }
}, 1000);
