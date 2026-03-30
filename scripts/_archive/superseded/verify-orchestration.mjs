/**
 * Orchestration Health Verification Script
 *
 * Verifies that the StringRay orchestration system is properly configured
 * and processors are being executed.
 *
 * @usage node scripts/mjs/verify-orchestration.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.join(__dirname, '..', '..');

console.log('🔍 StringRay Orchestration Health Check');
console.log('=' .repeat(50));

let checks = {
  passed: 0,
  failed: 0,
  warnings: 0,
};

function check(name, condition, message) {
  if (condition) {
    console.log(`✅ ${name}`);
    checks.passed++;
  } else {
    console.log(`❌ ${name}: ${message}`);
    checks.failed++;
  }
}

function warn(name, condition, message) {
  if (condition) {
    console.log(`✅ ${name}`);
    checks.passed++;
  } else {
    console.log(`⚠️  ${name}: ${message}`);
    checks.warnings++;
  }
}

// Check 1: Plugin files exist and are configured
console.log('\n📁 Plugin Configuration:');
const pluginFiles = [
  'src/plugin/strray-codex-injection.ts',
  'src/plugins/strray-codex-injection.ts',
];

pluginFiles.forEach(file => {
  const exists = fs.existsSync(path.join(PROJECT_ROOT, file));
  check(`${file} exists`, exists, 'File not found');

  if (exists) {
    const content = fs.readFileSync(path.join(PROJECT_ROOT, file), 'utf8');
    check(
      `${file} has global state check`,
      content.includes('globalThis as any).strRayStateManager'),
      'Missing global state connection'
    );
    check(
      `${file} has testAutoCreation processor`,
      content.includes('testAutoCreation'),
      'Missing testAutoCreation processor'
    );
    check(
      `${file} has detailed logging`,
      content.includes('logger.log') && content.includes('▶️'),
      'Missing detailed execution logging'
    );
  }
});

// Check 2: Test Auto-Creation Processor exists
console.log('\n⚙️  Test Auto-Creation Processor:');
const autoCreationPath = 'src/processors/test-auto-creation-processor.ts';
check(
  `${autoCreationPath} exists`,
  fs.existsSync(path.join(PROJECT_ROOT, autoCreationPath)),
  'File not found'
);

if (fs.existsSync(path.join(PROJECT_ROOT, autoCreationPath))) {
  const content = fs.readFileSync(path.join(PROJECT_ROOT, autoCreationPath), 'utf8');
  check(
    'Has extractExports function',
    content.includes('extractExports'),
    'Missing export extraction'
  );
  check(
    'Has createBasicTestStub fallback',
    content.includes('createBasicTestStub'),
    'Missing fallback test creation'
  );
  check(
    'Delegates to testing-strategy skill',
    content.includes('testing-strategy'),
    'Missing skill delegation'
  );
}

// Check 3: Boot Orchestrator has new processor
console.log('\n🥾 Boot Orchestrator:');
const bootOrchestratorPath = 'src/core/boot-orchestrator.ts';
if (fs.existsSync(path.join(PROJECT_ROOT, bootOrchestratorPath))) {
  const content = fs.readFileSync(path.join(PROJECT_ROOT, bootOrchestratorPath), 'utf8');
  check(
    'Registers testAutoCreation processor',
    content.includes('testAutoCreation'),
    'Missing testAutoCreation registration'
  );
  check(
    'testAutoCreation has priority 22',
    content.includes('priority: 22'),
    'Wrong priority'
  );
}

// Check 4: Activity log directory exists
console.log('\n📝 Logging:');
const logDir = path.join(PROJECT_ROOT, 'logs', 'framework');
check(
  'Log directory exists',
  fs.existsSync(logDir),
  'Run the framework to generate logs'
);

if (fs.existsSync(logDir)) {
  const logFile = path.join(logDir, 'activity.log');
  warn(
    'Activity log exists',
    fs.existsSync(logFile),
    'No activity logged yet'
  );

  if (fs.existsSync(logFile)) {
    const logContent = fs.readFileSync(logFile, 'utf8');
    const hasProcessorActivity = logContent.includes('processor');
    warn(
      'Has processor activity in logs',
      hasProcessorActivity,
      'No processor activity detected'
    );
  }
}

// Check 5: Test file exists
console.log('\n🧪 Regression Tests:');
const testPath = 'src/__tests__/integration/processor-manager-reuse.test.ts';
check(
  `${testPath} exists`,
  fs.existsSync(path.join(PROJECT_ROOT, testPath)),
  'Critical regression test missing'
);

// Summary
console.log('\n' + '='.repeat(50));
console.log('📊 Summary:');
console.log(`   ✅ Passed: ${checks.passed}`);
console.log(`   ❌ Failed: ${checks.failed}`);
console.log(`   ⚠️  Warnings: ${checks.warnings}`);

if (checks.failed === 0) {
  console.log('\n🎉 All critical checks passed!');
  console.log('\n💡 Next steps:');
  console.log('   1. Build the framework: npm run build');
  console.log('   2. Run tests: npm test');
  console.log('   3. Monitor logs: tail -f logs/framework/activity.log');
  console.log('   4. Create a test file to verify auto-creation works');
  process.exit(0);
} else {
  console.log('\n⚠️  Some checks failed. Please review the errors above.');
  process.exit(1);
}
