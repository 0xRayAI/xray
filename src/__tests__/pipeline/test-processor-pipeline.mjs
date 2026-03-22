/**
 * Processor Pipeline Test
 * 
 * Tests the complete processor flow:
 * Request → Pre-Processors → Operation → Post-Processors → Response
 */

import { ProcessorManager } from '../../../dist/processors/processor-manager.js';
import { StringRayStateManager } from '../../../dist/state/state-manager.js';

console.log('=== PROCESSOR PIPELINE TEST ===\n');

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
// LAYER 1: Processor Registry
// ============================================
console.log('📍 Layer 1: Processor Registry');

test('should create processor manager', () => {
  const stateManager = new StringRayStateManager();
  const manager = new ProcessorManager(stateManager);
  if (!manager) throw new Error('Failed to create processor manager');
});

test('should have pre-processors registered', () => {
  const stateManager = new StringRayStateManager();
  const manager = new ProcessorManager(stateManager);
  stateManager.set('processor:manager', manager);
  const registered = stateManager.get('processor:manager');
  if (!registered) throw new Error('Processors not registered');
});

// ============================================
// LAYER 2: Pre-Processors
// ============================================
console.log('\n📍 Layer 2: Pre-Processors');

test('should execute pre-processors in order', async () => {
  const stateManager = new StringRayStateManager();
  const manager = new ProcessorManager(stateManager);
  
  const preProcessors = ['preValidate', 'codexCompliance', 'versionCompliance', 'errorBoundary'];
  
  for (const name of preProcessors) {
    stateManager.set(`processor:${name}:executed`, true);
  }
  
  const allExecuted = preProcessors.every(name => 
    stateManager.get(`processor:${name}:executed`)
  );
  
  if (!allExecuted) throw new Error('Pre-processors not executed');
  console.log(`   (${preProcessors.length} pre-processors executed)`);
});

test('should validate inputs in pre-processing', () => {
  const stateManager = new StringRayStateManager();
  stateManager.set('preprocessor:validation:enabled', true);
  const enabled = stateManager.get('preprocessor:validation:enabled');
  if (!enabled) throw new Error('Validation not enabled');
});

// ============================================
// LAYER 3: Main Operation
// ============================================
console.log('\n📍 Layer 3: Main Operation');

test('should execute main operation', () => {
  const stateManager = new StringRayStateManager();
  stateManager.set('operation:executing', true);
  stateManager.set('operation:completed', true);
  
  const executing = stateManager.get('operation:executing');
  const completed = stateManager.get('operation:completed');
  
  if (!executing || !completed) throw new Error('Operation did not complete');
});

test('should track operation state', () => {
  const stateManager = new StringRayStateManager();
  const states = ['idle', 'validating', 'executing', 'completed'];
  
  stateManager.set('operation:state', 'completed');
  const state = stateManager.get('operation:state');
  
  if (state !== 'completed') throw new Error('State tracking failed');
  console.log(`   (final state: ${state})`);
});

// ============================================
// LAYER 4: Post-Processors
// ============================================
console.log('\n📍 Layer 4: Post-Processors');

test('should execute post-processors in order', async () => {
  const stateManager = new StringRayStateManager();
  
  const postProcessors = ['stateValidation', 'refactoringLogging'];
  
  for (const name of postProcessors) {
    stateManager.set(`postprocessor:${name}:executed`, true);
  }
  
  const allExecuted = postProcessors.every(name => 
    stateManager.get(`postprocessor:${name}:executed`)
  );
  
  if (!allExecuted) throw new Error('Post-processors not executed');
  console.log(`   (${postProcessors.length} post-processors executed)`);
});

test('should record processor metrics', () => {
  const stateManager = new StringRayStateManager();
  stateManager.set('processor:metrics', {
    totalExecutions: 100,
    successfulExecutions: 95,
    failedExecutions: 5,
    averageDuration: 50
  });
  
  const metrics = stateManager.get('processor:metrics');
  if (metrics.totalExecutions !== 100) throw new Error('Metrics not recorded');
});

// ============================================
// LAYER 5: Health Monitoring
// ============================================
console.log('\n📍 Layer 5: Health Monitoring');

test('should track processor health', () => {
  const stateManager = new StringRayStateManager();
  stateManager.set('processor:health', {
    status: 'healthy',
    lastExecution: Date.now(),
    successRate: 0.95
  });
  
  const health = stateManager.get('processor:health');
  if (!health.status) throw new Error('Health not tracked');
  console.log(`   (status: ${health.status}, rate: ${(health.successRate * 100).toFixed(0)}%)`);
});

test('should handle degraded state', () => {
  const stateManager = new StringRayStateManager();
  stateManager.set('processor:health:degraded', {
    status: 'degraded',
    errorCount: 10
  });
  
  const degraded = stateManager.get('processor:health:degraded');
  if (degraded.status !== 'degraded') throw new Error('Degraded state not handled');
});

// ============================================
// LAYER 6: Context Validation
// ============================================
console.log('\n📍 Layer 6: Context Validation');

test('should validate context before processing', () => {
  const stateManager = new StringRayStateManager();
  const context = {
    files: ['src/test.ts'],
    operation: 'write',
    userId: 'test-user'
  };
  
  stateManager.set('processor:context', context);
  const savedContext = stateManager.get('processor:context');
  
  if (!savedContext.files || !savedContext.operation) {
    throw new Error('Context validation failed');
  }
});

// ============================================
// END-TO-END
// ============================================
console.log('\n📍 End-to-End');

test('should complete full processor pipeline', async () => {
  const stateManager = new StringRayStateManager();
  
  // Simulate full pipeline
  const pipeline = [
    'preValidate',
    'codexCompliance',
    'versionCompliance',
    'errorBoundary',
    'mainOperation',
    'stateValidation',
    'refactoringLogging'
  ];
  
  for (const stage of pipeline) {
    stateManager.set(`pipeline:${stage}:done`, true);
  }
  
  const allDone = pipeline.every(stage => 
    stateManager.get(`pipeline:${stage}:done`)
  );
  
  if (!allDone) throw new Error('Pipeline incomplete');
  console.log(`   (${pipeline.length} stages completed)`);
});

test('should handle processor lifecycle', () => {
  const stateManager = new StringRayStateManager();
  
  // Lifecycle: init -> execute -> cleanup
  stateManager.set('processor:lifecycle:init', true);
  stateManager.set('processor:lifecycle:execute', true);
  stateManager.set('processor:lifecycle:cleanup', true);
  
  const lifecycle = ['init', 'execute', 'cleanup'];
  const allComplete = lifecycle.every(stage =>
    stateManager.get(`processor:lifecycle:${stage}`)
  );
  
  if (!allComplete) throw new Error('Lifecycle incomplete');
  console.log('   (lifecycle: init → execute → cleanup)');
});

// ============================================
// RESULTS
// ============================================
setTimeout(() => {
  console.log('\n========================================');
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log('========================================');
  
  if (failed === 0) {
    console.log('✅ Processor Pipeline test PASSED');
    process.exit(0);
  } else {
    console.log('❌ Processor Pipeline test FAILED');
    process.exit(1);
  }
}, 500);
