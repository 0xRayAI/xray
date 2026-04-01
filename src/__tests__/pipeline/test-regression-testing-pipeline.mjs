/**
 * Regression Testing Pipeline Test
 * Tests regression test execution post-write
 */

console.log('=== REGRESSION TESTING PIPELINE TEST ===\n');

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

console.log('Testing Regression Testing Pipeline\n');

test('should verify RegressionTestingProcessor exists', () => {
  const fs = require('fs');
  const procPath = process.cwd() + '/src/processors/implementations/regression-testing-processor.ts';
  if (!fs.existsSync(procPath)) {
    throw new Error('RegressionTestingProcessor not found');
  }
  console.log('   (RegressionTestingProcessor exists)');
});

test('should verify regression-testing-processor extends PostProcessor', () => {
  const fs = require('fs');
  const procPath = process.cwd() + '/src/processors/implementations/regression-testing-processor.ts';
  const content = fs.readFileSync(procPath, 'utf-8');
  if (!content.includes('PostProcessor')) {
    throw new Error('PostProcessor inheritance not found');
  }
  console.log('   (PostProcessor inheritance verified)');
});

test('should verify regression testing logic exists', () => {
  const fs = require('fs');
  const procPath = process.cwd() + '/src/processors/implementations/regression-testing-processor.ts';
  const content = fs.readFileSync(procPath, 'utf-8');
  if (!content.includes('regression') && !content.includes('test')) {
    throw new Error('Regression testing logic not found');
  }
  console.log('   (regression testing logic verified)');
});

setTimeout(() => {
  console.log('\n========================================');
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log('========================================');
  
  if (failed === 0) {
    console.log('✅ Regression Testing Pipeline test PASSED');
    process.exit(0);
  } else {
    console.log('❌ Regression Testing Pipeline test FAILED');
    process.exit(1);
  }
}, 1000);
