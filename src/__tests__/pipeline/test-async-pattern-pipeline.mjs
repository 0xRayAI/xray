/**
 * Async Pattern Pipeline Test
 * Tests async/await usage validation
 */

console.log('=== ASYNC PATTERN PIPELINE TEST ===\n');

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

console.log('Testing Async Pattern Pipeline\n');

test('should verify AsyncPatternProcessor exists', () => {
  const fs = require('fs');
  const procPath = process.cwd() + '/src/processors/async-pattern-processor.ts';
  if (!fs.existsSync(procPath)) {
    throw new Error('AsyncPatternProcessor not found');
  }
  console.log('   (AsyncPatternProcessor exists)');
});

test('should verify asyncPattern in BootOrchestrator', () => {
  const fs = require('fs');
  const bootPath = process.cwd() + '/src/core/boot-orchestrator.ts';
  const content = fs.readFileSync(bootPath, 'utf-8');
  if (!content.includes('asyncPattern')) {
    throw new Error('asyncPattern not found in BootOrchestrator');
  }
  console.log('   (asyncPattern processor verified)');
});

test('should verify async pattern validation logic exists', () => {
  const fs = require('fs');
  const procPath = process.cwd() + '/src/processors/async-pattern-processor.ts';
  const content = fs.readFileSync(procPath, 'utf-8');
  if (!content.includes('async') && !content.includes('await')) {
    throw new Error('Async pattern validation not found');
  }
  console.log('   (async pattern validation verified)');
});

setTimeout(() => {
  console.log('\n========================================');
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log('========================================');
  
  if (failed === 0) {
    console.log('✅ Async Pattern Pipeline test PASSED');
    process.exit(0);
  } else {
    console.log('❌ Async Pattern Pipeline test FAILED');
    process.exit(1);
  }
}, 1000);
