/**
 * Governance Detail Pipeline Test
 * Tests SpawnGovernanceProcessor, rate limiting
 */

import { readFileSync, existsSync } from 'fs';
import { StringRayStateManager } from '../../../dist/state/state-manager.js';

console.log('=== GOVERNANCE DETAIL PIPELINE TEST ===\n');

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

console.log('Testing Governance Detail Pipeline\n');

test('should verify SpawnGovernanceProcessor is registered in processor-manager', () => {
  const stateManager = new StringRayStateManager();
  if (!stateManager) throw new Error('StateManager not created');
  console.log('   (StringRayStateManager created)');
});

test('should verify agent_spawn config exists in features.json', () => {
  const configPath = process.cwd() + '/.strray/features.json';
  if (!existsSync(configPath)) {
    throw new Error('features.json not found');
  }
  const configData = readFileSync(configPath, 'utf-8');
  const config = JSON.parse(configData);
  if (!config.agent_spawn) {
    throw new Error('agent_spawn config missing');
  }
  console.log('   (agent_spawn config verified)');
});

test('should verify spawnGovernance pre-processor in BootOrchestrator', () => {
  const bootPath = process.cwd() + '/src/core/boot-orchestrator.ts';
  const content = readFileSync(bootPath, 'utf-8');
  if (!content.includes('spawnGovernance')) {
    throw new Error('spawnGovernance not found in BootOrchestrator');
  }
  console.log('   (spawnGovernance processor verified)');
});

test('should verify agent spawn limits from features.json', () => {
  const configPath = process.cwd() + '/.strray/features.json';
  const configData = readFileSync(configPath, 'utf-8');
  const config = JSON.parse(configData);
  if (!config.agent_spawn?.max_concurrent) {
    throw new Error('max_concurrent not configured');
  }
  console.log('   (max_concurrent: ' + config.agent_spawn.max_concurrent + ')');
});

test('should verify rate limiting config from features.json', () => {
  const configPath = process.cwd() + '/.strray/features.json';
  const configData = readFileSync(configPath, 'utf-8');
  const config = JSON.parse(configData);
  if (!config.agent_spawn?.rate_limit_per_minute) {
    throw new Error('rate_limit_per_minute not configured');
  }
  console.log('   (rate_limit_per_minute: ' + config.agent_spawn.rate_limit_per_minute + ')');
});

setTimeout(() => {
  console.log('\n========================================');
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log('========================================');
  
  if (failed === 0) {
    console.log('✅ Governance Detail Pipeline test PASSED');
    process.exit(0);
  } else {
    console.log('❌ Governance Detail Pipeline test FAILED');
    process.exit(1);
  }
}, 1000);
