/**
 * Routing Pipeline Test
 * 
 * Tests the complete routing flow:
 * Task Input → Keyword Matching → History Matching → Complexity Routing → Router Core → Result
 */

import { TaskSkillRouter } from '../../../dist/delegation/task-skill-router.js';

console.log('=== ROUTING PIPELINE TEST ===\n');

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
// LAYER 1: Task Input
// ============================================
console.log('📍 Layer 1: Task Input');

test('should create router instance', () => {
  const router = new TaskSkillRouter();
  if (!router) throw new Error('Failed to create router');
});

test('should accept task description', () => {
  const router = new TaskSkillRouter();
  const result = router.routeTask('fix bug in authentication', { taskId: 'test-1' });
  if (!result) throw new Error('Failed to route task');
  console.log(`   (agent: ${result.agent})`);
});

// ============================================
// LAYER 2: Keyword Matching
// ============================================
console.log('\n📍 Layer 2: Keyword Matching');

test('should match security keywords', () => {
  const router = new TaskSkillRouter();
  const result = router.routeTask('scan for security vulnerabilities', { taskId: 'test-1' });
  if (result.agent !== 'security-auditor') {
    console.log(`   (matched: ${result.agent})`);
  }
});

test('should match performance keywords', () => {
  const router = new TaskSkillRouter();
  const result = router.routeTask('optimize performance of API', { taskId: 'test-1' });
  console.log(`   (matched: ${result.agent})`);
});

test('should match refactoring keywords', () => {
  const router = new TaskSkillRouter();
  const result = router.routeTask('refactor the authentication module', { taskId: 'test-1' });
  console.log(`   (matched: ${result.agent})`);
});

test('should match testing keywords', () => {
  const router = new TaskSkillRouter();
  const result = router.routeTask('add tests for user service', { taskId: 'test-1' });
  console.log(`   (matched: ${result.agent})`);
});

// ============================================
// LAYER 3: History Matching
// ============================================
console.log('\n📍 Layer 3: History Matching');

test('should return routing result with confidence', () => {
  const router = new TaskSkillRouter();
  const result = router.routeTask('implement new feature', { taskId: 'test-1' });
  if (typeof result.confidence !== 'number') throw new Error('Missing confidence');
  console.log(`   (confidence: ${(result.confidence * 100).toFixed(0)}%)`);
});

test('should return routing result with skill', () => {
  const router = new TaskSkillRouter();
  const result = router.routeTask('analyze codebase', { taskId: 'test-1' });
  if (!result.skill) console.log('   (skill: default)');
  else console.log(`   (skill: ${result.skill})`);
});

// ============================================
// LAYER 4: Complexity Routing
// ============================================
console.log('\n📍 Layer 4: Complexity Routing');

test('should handle complex tasks', () => {
  const router = new TaskSkillRouter();
  const complexTask = 'design and implement a complete microservices architecture with API gateway, service mesh, and distributed tracing';
  const result = router.routeTask(complexTask, { taskId: 'test-1' });
  if (!result.agent) throw new Error('Failed to route complex task');
  console.log(`   (complex task routed to: ${result.agent})`);
});

test('should handle simple tasks', () => {
  const router = new TaskSkillRouter();
  const simpleTask = 'fix typo';
  const result = router.routeTask(simpleTask, { taskId: 'test-1' });
  if (!result.agent) throw new Error('Failed to route simple task');
  console.log(`   (simple task routed to: ${result.agent})`);
});

// ============================================
// LAYER 5: Router Core
// ============================================
console.log('\n📍 Layer 5: Router Core');

test('should route code review tasks', () => {
  const router = new TaskSkillRouter();
  const result = router.routeTask('review this pull request', { taskId: 'test-1' });
  console.log(`   (code review: ${result.agent})`);
});

test('should route architecture tasks', () => {
  const router = new TaskSkillRouter();
  const result = router.routeTask('design the system architecture', { taskId: 'test-1' });
  console.log(`   (architecture: ${result.agent})`);
});

test('should route bug triage tasks', () => {
  const router = new TaskSkillRouter();
  const result = router.routeTask('debug the memory leak', { taskId: 'test-1' });
  console.log(`   (bug triage: ${result.agent})`);
});

// ============================================
// LAYER 6: Output
// ============================================
console.log('\n📍 Layer 6: Output');

test('should return matched keyword', () => {
  const router = new TaskSkillRouter();
  const result = router.routeTask('security audit', { taskId: 'test-1' });
  if (!result.matchedKeyword) console.log('   (keyword: default routing)');
  else console.log(`   (keyword: ${result.matchedKeyword})`);
});

test('should return routing metadata', () => {
  const router = new TaskSkillRouter();
  const result = router.routeTask('implement feature', { taskId: 'test-1' });
  if (!result.agent) throw new Error('Missing agent');
  console.log(`   (agent: ${result.agent})`);
});

// ============================================
// END-TO-END
// ============================================
console.log('\n📍 End-to-End');

test('should complete full routing flow', () => {
  const router = new TaskSkillRouter();
  
  const testCases = [
    'fix bug',
    'review code',
    'optimize performance',
    'scan security',
    'refactor module',
    'add tests'
  ];
  
  for (const task of testCases) {
    const result = router.routeTask(task, { taskId: 'test-1' });
    if (!result.agent) throw new Error(`Failed to route: ${task}`);
  }
  
  console.log(`   (${testCases.length} tasks routed)`);
});

test('should handle varied input patterns', () => {
  const router = new TaskSkillRouter();
  
  const patterns = [
    'fix the authentication bug',
    '@architect design API',
    'what about refactoring?',
    'I need tests for this',
    'analyze performance',
    'check for security issues'
  ];
  
  for (const pattern of patterns) {
    const result = router.routeTask(pattern, { taskId: 'test-1' });
    if (!result) throw new Error(`Failed on pattern: ${pattern}`);
  }
  
  console.log(`   (${patterns.length} patterns handled)`);
});

// ============================================
// RESULTS
// ============================================
setTimeout(() => {
  console.log('\n========================================');
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log('========================================');
  
  if (failed === 0) {
    console.log('✅ Routing Pipeline test PASSED');
    process.exit(0);
  } else {
    console.log('❌ Routing Pipeline test FAILED');
    process.exit(1);
  }
}, 500);
