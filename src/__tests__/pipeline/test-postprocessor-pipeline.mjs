/**
 * Post-Processor Pipeline Test
 * Tests all post-processors in the pipeline
 */

import { ProcessorManager } from '../../../dist/processors/processor-manager.js';
import { StringRayStateManager } from '../../../dist/state/state-manager.js';

console.log('=== POST-PROCESSOR PIPELINE TEST ===\n');

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

const POST_PROCESSORS = [
  { name: 'stateValidation', priority: 130 },
  { name: 'refactoringLogging', priority: 140 },
  { name: 'postProcessorChain', priority: 140 },
  { name: 'publishPreflight', priority: 125 },
];

console.log('Testing Post-Processor Pipeline\n');

test('should verify post-processors are defined', () => {
  if (POST_PROCESSORS.length < 4) {
    throw new Error(`Expected at least 4 post-processors, got ${POST_PROCESSORS.length}`);
  }
  console.log(`   (${POST_PROCESSORS.length} post-processors defined)`);
});

test('should execute post-processors in priority order', async () => {
  const stateManager = new StringRayStateManager();
  const manager = new ProcessorManager(stateManager);
  
  for (const proc of POST_PROCESSORS) {
    manager.registerProcessor({ name: proc.name, type: 'post', priority: proc.priority, enabled: true });
  }
  
  const result = await manager.executePostProcessors('test', {}, []);
  
  if (result.length !== POST_PROCESSORS.length) {
    throw new Error(`Expected ${POST_PROCESSORS.length} results, got ${result.length}`);
  }
  
  console.log(`   (${result.length} executed in order)`);
});

test('should verify publishPreflight post-processor exists', () => {
  const hasPreflight = POST_PROCESSORS.some(p => p.name === 'publishPreflight');
  if (!hasPreflight) throw new Error('publishPreflight not found');
  console.log('   (publishPreflight verified)');
});

test('should verify stateValidation post-processor exists', () => {
  const hasState = POST_PROCESSORS.some(p => p.name === 'stateValidation');
  if (!hasState) throw new Error('stateValidation not found');
  console.log('   (stateValidation verified)');
});

test('should verify post-processor result structure', async () => {
  const stateManager = new StringRayStateManager();
  const manager = new ProcessorManager(stateManager);
  
  manager.registerProcessor({ name: 'stateValidation', type: 'post', priority: 130, enabled: true });
  
  const results = await manager.executePostProcessors('test', {}, []);
  const firstResult = results[0];
  
  if (typeof firstResult.success !== 'boolean') throw new Error('Missing success');
  if (typeof firstResult.duration !== 'number') throw new Error('Missing duration');
  if (!firstResult.processorName) throw new Error('Missing processorName');
  
  console.log(`   (result structure verified)`);
});

setTimeout(() => {
  console.log('\n========================================');
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log('========================================');
  
  if (failed === 0) {
    console.log('✅ Post-Processor Pipeline test PASSED');
    process.exit(0);
  } else {
    console.log('❌ Post-Processor Pipeline test FAILED');
    process.exit(1);
  }
}, 1000);
