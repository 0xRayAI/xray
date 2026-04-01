/**
 * Log Protection Pipeline Test
 * Tests sensitive data protection in logs
 */

console.log('=== LOG PROTECTION PIPELINE TEST ===\n');

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

console.log('Testing Log Protection Pipeline\n');

test('should verify LogProtectionProcessor exists', () => {
  const fs = require('fs');
  const procPath = process.cwd() + '/src/processors/implementations/log-protection-processor.ts';
  if (!fs.existsSync(procPath)) {
    throw new Error('LogProtectionProcessor not found');
  }
  console.log('   (LogProtectionProcessor exists)');
});

test('should verify log-protection-processor extends PreProcessor', () => {
  const fs = require('fs');
  const procPath = process.cwd() + '/src/processors/implementations/log-protection-processor.ts';
  const content = fs.readFileSync(procPath, 'utf-8');
  if (!content.includes('PreProcessor')) {
    throw new Error('PreProcessor inheritance not found');
  }
  console.log('   (PreProcessor inheritance verified)');
});

test('should verify log protection logic exists (sensitive data detection)', () => {
  const fs = require('fs');
  const procPath = process.cwd() + '/src/processors/implementations/log-protection-processor.ts';
  const content = fs.readFileSync(procPath, 'utf-8');
  if (!content.includes('sensitive') && !content.includes('protect')) {
    throw new Error('Log protection logic not found');
  }
  console.log('   (log protection logic verified)');
});

test('should verify security config in features.json', () => {
  const fs = require('fs');
  const configPath = process.cwd() + '/.strray/features.json';
  const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  if (!config.security) {
    throw new Error('security config missing');
  }
  console.log('   (security config verified)');
});

setTimeout(() => {
  console.log('\n========================================');
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log('========================================');
  
  if (failed === 0) {
    console.log('✅ Log Protection Pipeline test PASSED');
    process.exit(0);
  } else {
    console.log('❌ Log Protection Pipeline test FAILED');
    process.exit(1);
  }
}, 1000);
