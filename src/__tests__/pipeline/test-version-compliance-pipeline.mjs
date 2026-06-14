/**
 * Version Compliance Pipeline Test
 * Tests version sync enforcement
 */

import { readFileSync, existsSync } from 'fs';

console.log('=== VERSION COMPLIANCE PIPELINE TEST ===\n');

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

console.log('Testing Version Compliance Pipeline\n');

test('should verify VersionComplianceProcessor exists', () => {
  const procPath = process.cwd() + '/src/processors/version-compliance-processor.ts';
  if (!existsSync(procPath)) {
    throw new Error('VersionComplianceProcessor not found');
  }
  console.log('   (VersionComplianceProcessor exists)');
});

test('should verify versionCompliance in BootOrchestrator', () => {
  const bootPath = process.cwd() + '/src/core/boot-orchestrator.ts';
  const content = readFileSync(bootPath, 'utf-8');
  if (!content.includes('versionCompliance')) {
    throw new Error('versionCompliance not found in BootOrchestrator');
  }
  console.log('   (versionCompliance processor verified)');
});

test('should verify publish config has require_documentation', () => {
  const configPath = process.cwd() + '/.strray/features.json';
  const configData = readFileSync(configPath, 'utf-8');
  const config = JSON.parse(configData);
  if (!config.publish?.require_documentation?.readme_version_sync) {
    throw new Error('readme_version_sync not configured');
  }
  console.log('   (readme_version_sync verified)');
});

test('should verify package.json version is valid', () => {
  const pkgPath = process.cwd() + '/package.json';
  const pkgData = readFileSync(pkgPath, 'utf-8');
  const pkg = JSON.parse(pkgData);
  if (!pkg.version || !pkg.version.match(/^\d+\.\d+\.\d+$/)) {
    throw new Error('Invalid package.json version');
  }
  console.log('   (package.json version: ' + pkg.version + ')');
});

setTimeout(() => {
  console.log('\n========================================');
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log('========================================');
  
  if (failed === 0) {
    console.log('✅ Version Compliance Pipeline test PASSED');
    process.exit(0);
  } else {
    console.log('❌ Version Compliance Pipeline test FAILED');
    process.exit(1);
  }
}, 1000);
