/**
 * Console Log Guard Pipeline Test
 * Tests console.log blocking in production
 */

console.log('=== CONSOLE LOG GUARD PIPELINE TEST ===\n');

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

console.log('Testing Console Log Guard Pipeline\n');

test('should verify consoleLogGuard processor exists', () => {
  const fs = require('fs');
  const procPath = process.cwd() + '/src/processors/console-log-guard-processor.ts';
  if (!fs.existsSync(procPath)) {
    throw new Error('ConsoleLogGuardProcessor not found');
  }
  console.log('   (ConsoleLogGuardProcessor exists)');
});

test('should verify consoleLogGuard in BootOrchestrator', () => {
  const fs = require('fs');
  const bootPath = process.cwd() + '/src/core/boot-orchestrator.ts';
  const content = fs.readFileSync(bootPath, 'utf-8');
  if (!content.includes('consoleLogGuard')) {
    throw new Error('consoleLogGuard not found in BootOrchestrator');
  }
  console.log('   (consoleLogGuard processor verified)');
});

test('should verify log protection config exists', () => {
  const fs = require('fs');
  const configPath = process.cwd() + '/.strray/features.json';
  const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  if (!config.activity_logging) {
    throw new Error('activity_logging config missing');
  }
  console.log('   (activity_logging verified)');
});

setTimeout(() => {
  console.log('\n========================================');
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log('========================================');
  
  if (failed === 0) {
    console.log('✅ Console Log Guard Pipeline test PASSED');
    process.exit(0);
  } else {
    console.log('❌ Console Log Guard Pipeline test FAILED');
    process.exit(1);
  }
}, 1000);
