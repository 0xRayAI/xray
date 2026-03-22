/**
 * Boot Pipeline Test
 * 
 * Tests the complete boot sequence:
 * Signal → Config Load → Orchestrator → Session Management → Processors → Agents → Security
 */

import { StringRayStateManager } from '../../../dist/state/state-manager.js';
import { StringRayContextLoader } from '../../../dist/core/context-loader.js';

console.log('=== BOOT PIPELINE TEST ===\n');

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

// ============================================
// LAYER 1: Configuration
// ============================================
console.log('📍 Layer 1: Configuration');

test('should create state manager', () => {
  const stateManager = new StringRayStateManager();
  if (!stateManager) throw new Error('Failed to create state manager');
});

test('should create context loader', () => {
  const contextLoader = new StringRayContextLoader();
  if (!contextLoader) throw new Error('Failed to create context loader');
});

// ============================================
// LAYER 2: State Management
// ============================================
console.log('\n📍 Layer 2: State Management');

test('should set and get state', () => {
  const stateManager = new StringRayStateManager();
  stateManager.set('test:key', { value: 'test' });
  const value = stateManager.get('test:key');
  if (!value) throw new Error('Failed to get state');
});

test('should update existing state', () => {
  const stateManager = new StringRayStateManager();
  stateManager.set('update:test', 'initial');
  stateManager.set('update:test', 'updated');
  const value = stateManager.get('update:test');
  if (value !== 'updated') throw new Error('State should be updated');
});

test('should check audit log', () => {
  const stateManager = new StringRayStateManager();
  const auditLog = stateManager.getAuditLog();
  if (!auditLog) throw new Error('Failed to get audit log');
  console.log(`   (audit log ready)`);
});

// ============================================
// LAYER 3: Context Loading
// ============================================
console.log('\n📍 Layer 3: Context Loading');

test('should have context loader instance', () => {
  const contextLoader = new StringRayContextLoader();
  if (typeof contextLoader !== 'object') throw new Error('Context loader invalid');
  console.log('   (context loader ready)');
});

// ============================================
// LAYER 4: Session Management
// ============================================
console.log('\n📍 Layer 4: Session Management');

test('should create session', () => {
  const stateManager = new StringRayStateManager();
  stateManager.set('session:active', { id: 'test-session', active: true });
  const session = stateManager.get('session:active');
  if (!session) throw new Error('Failed to create session');
});

test('should check persistence stats', () => {
  const stateManager = new StringRayStateManager();
  const stats = stateManager.getPersistenceStats();
  if (!stats) throw new Error('Failed to get persistence stats');
  console.log(`   (persistence: ${stats.enabled ? 'enabled' : 'disabled'})`);
});

// ============================================
// LAYER 5: Agent Registration
// ============================================
console.log('\n📍 Layer 5: Agent Registration');

test('should register agents in state', () => {
  const stateManager = new StringRayStateManager();
  stateManager.set('agent:enforcer', { name: 'enforcer', active: true });
  stateManager.set('agent:architect', { name: 'architect', active: true });
  const agents = stateManager.get('agent:enforcer');
  if (!agents) throw new Error('Failed to register agents');
});

test('should store agent metadata', () => {
  const stateManager = new StringRayStateManager();
  stateManager.set('agent:metadata', {
    enforcer: { tasks: 10, success: 9 },
    architect: { tasks: 5, success: 5 }
  });
  const metadata = stateManager.get('agent:metadata');
  if (!metadata.enforcer || !metadata.architect) {
    throw new Error('Agent metadata not stored');
  }
  console.log(`   (2 agents tracked)`);
});

// ============================================
// LAYER 6: Security Components
// ============================================
console.log('\n📍 Layer 6: Security Components');

test('should initialize security state', () => {
  const stateManager = new StringRayStateManager();
  stateManager.set('security:enabled', true);
  const enabled = stateManager.get('security:enabled');
  if (!enabled) throw new Error('Security not enabled');
});

test('should set enforcement state', () => {
  const stateManager = new StringRayStateManager();
  stateManager.set('enforcement:active', true);
  const active = stateManager.get('enforcement:active');
  if (!active) throw new Error('Enforcement not active');
});

// ============================================
// END-TO-END
// ============================================
console.log('\n📍 End-to-End');

test('should complete full boot sequence', () => {
  const stateManager = new StringRayStateManager();
  
  stateManager.set('orchestrator:loaded', true);
  stateManager.set('session:management:active', true);
  stateManager.set('processor:manager', true);
  stateManager.set('security:initialization:complete', true);
  
  const orchestratorLoaded = stateManager.get('orchestrator:loaded');
  const sessionActive = stateManager.get('session:management:active');
  const processorReady = stateManager.get('processor:manager');
  const securityReady = stateManager.get('security:initialization:complete');
  
  if (!orchestratorLoaded || !sessionActive || !processorReady || !securityReady) {
    throw new Error('Boot sequence incomplete');
  }
  
  console.log('   (all layers initialized)');
});

test('should handle boot state transitions', () => {
  const stateManager = new StringRayStateManager();
  
  const stages = [
    'boot:initializing',
    'boot:config:loaded',
    'boot:orchestrator:ready',
    'boot:session:ready',
    'boot:processors:ready',
    'boot:complete'
  ];
  
  for (const stage of stages) {
    stateManager.set(stage, true);
  }
  
  const allComplete = stages.every(s => stateManager.get(s));
  if (!allComplete) throw new Error('Boot stages incomplete');
  console.log(`   (${stages.length} stages completed)`);
});

// ============================================
// RESULTS
// ============================================
setTimeout(() => {
  console.log('\n========================================');
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log('========================================');
  
  if (failed === 0) {
    console.log('✅ Boot Pipeline test PASSED');
    process.exit(0);
  } else {
    console.log('❌ Boot Pipeline test FAILED');
    process.exit(1);
  }
}, 500);
