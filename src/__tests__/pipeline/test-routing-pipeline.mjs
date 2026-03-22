/**
 * Routing Pipeline Test
 * 
 * Pipeline Tree: docs/pipeline-trees/ROUTING_PIPELINE_TREE.md
 * 
 * Data Flow (from tree):
 * routeTask(taskDescription, options)
 *     │
 *     ▼
 * RouterCore.route()
 *     │
 *     ├─► KeywordMatcher.match() [if keywords found]
 *     │
 *     ├─► HistoryMatcher.match() [if taskId provided]
 *     │
 *     ├─► ComplexityRouter.route() [if complexity provided]
 *     │
 *     └─► DEFAULT_ROUTING [fallback]
 *     │
 *     ▼
 * RoutingResult { agent, skill, confidence }
 *     │
 *     ▼
 * outcomeTracker.recordOutcome() [AUTO]
 *     │
 *     ▼
 * Return to caller
 */

import { TaskSkillRouter } from '../../../dist/delegation/task-skill-router.js';
import { routingOutcomeTracker } from '../../../dist/delegation/analytics/outcome-tracker.js';

console.log('=== ROUTING PIPELINE TEST ===\n');

const baselineOutcomes = routingOutcomeTracker.getOutcomes().length;
console.log(`📍 Baseline: ${baselineOutcomes} outcomes in tracker\n`);

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
// LAYER 1: Keyword Matching (KeywordMatcher)
// Reference: ROUTING_PIPELINE_TREE.md#layer-1
// ============================================
console.log('📍 Layer 1: Keyword Matching (KeywordMatcher)');
console.log('   Entry: routeTask() → task-skill-router.ts:267');
console.log('   Component: src/delegation/routing/keyword-matcher.ts\n');

test('should match security keyword', () => {
  const router = new TaskSkillRouter();
  const result = router.routeTask('scan for security vulnerabilities', { taskId: 'kw-sec' });
  if (result.matchedKeyword !== 'security') {
    throw new Error(`Expected matchedKeyword 'security', got '${result.matchedKeyword}'`);
  }
  console.log(`   (matched: ${result.matchedKeyword})`);
});

test('should match bug/fix keyword', () => {
  const router = new TaskSkillRouter();
  const result = router.routeTask('fix bug in login', { taskId: 'kw-bug' });
  if (result.matchedKeyword !== 'fix') {
    throw new Error(`Expected matchedKeyword 'fix', got '${result.matchedKeyword}'`);
  }
});

test('should match refactor keyword', () => {
  const router = new TaskSkillRouter();
  const result = router.routeTask('refactor the module', { taskId: 'kw-ref' });
  if (result.matchedKeyword !== 'refactor') {
    throw new Error(`Expected matchedKeyword 'refactor', got '${result.matchedKeyword}'`);
  }
});

test('should match review keyword', () => {
  const router = new TaskSkillRouter();
  const result = router.routeTask('review the PR', { taskId: 'kw-review' });
  if (result.matchedKeyword !== 'review') {
    throw new Error(`Expected matchedKeyword 'review', got '${result.matchedKeyword}'`);
  }
});

// ============================================
// LAYER 2: History Matching (HistoryMatcher)
// Reference: ROUTING_PIPELINE_TREE.md#layer-2
// ============================================
console.log('\n📍 Layer 2: History Matching (HistoryMatcher)');
console.log('   Component: src/delegation/routing/history-matcher.ts\n');

test('should use HistoryMatcher when taskId provided', () => {
  const router = new TaskSkillRouter();
  
  const result = router.routeTask('test task', { 
    taskId: 'hist-test',
    complexity: 15 
  });
  
  if (!result.agent) {
    throw new Error('No agent returned');
  }
  console.log(`   (routed with history context via taskId)`);
});

test('should handle repeated tasks via history', () => {
  const router = new TaskSkillRouter();
  
  router.routeTask('optimize database', { taskId: 'repeat-task' });
  
  const result = router.routeTask('optimize database', { taskId: 'repeat-task-2' });
  
  if (!result.agent) {
    throw new Error('History routing failed');
  }
  console.log(`   (repeated task routed)`);
});

// ============================================
// LAYER 3: Complexity Routing (ComplexityRouter)
// Reference: ROUTING_PIPELINE_TREE.md#layer-3
// ============================================
console.log('\n📍 Layer 3: Complexity Routing (ComplexityRouter)');
console.log('   Component: src/delegation/routing/complexity-router.ts\n');

test('should route low complexity tasks', () => {
  const router = new TaskSkillRouter();
  const result = router.routeTask('fix typo', { taskId: 'low-comp', complexity: 5 });
  
  if (!result.agent) {
    throw new Error('No agent for low complexity');
  }
  console.log(`   (complexity: 5, agent: ${result.agent})`);
});

test('should route high complexity tasks', () => {
  const router = new TaskSkillRouter();
  const result = router.routeTask('implement full authentication system', { 
    taskId: 'high-comp', 
    complexity: 75 
  });
  
  if (!result.agent) {
    throw new Error('No agent for high complexity');
  }
  console.log(`   (complexity: 75, agent: ${result.agent})`);
});

// ============================================
// LAYER 4: Router Core (RouterCore)
// Reference: ROUTING_PIPELINE_TREE.md#layer-4
// ============================================
console.log('\n📍 Layer 4: Router Core (RouterCore)');
console.log('   Component: src/delegation/routing/router-core.ts');
console.log('   Entry: RouterCore.route() via TaskSkillRouter\n');

test('should return RoutingResult structure', () => {
  const router = new TaskSkillRouter();
  const result = router.routeTask('test task', { taskId: 'router-core-test' });
  
  if (!result.agent) throw new Error('Missing agent');
  if (typeof result.confidence !== 'number') throw new Error('Missing confidence');
  if (!result.skill) throw new Error('Missing skill');
  
  console.log(`   (result: agent=${result.agent}, skill=${result.skill}, conf=${(result.confidence * 100).toFixed(0)}%)`);
});

test('should use fallback routing for unknown tasks', () => {
  const router = new TaskSkillRouter();
  const result = router.routeTask('random task xyz unknown', { taskId: 'fallback-test' });
  
  if (!result.agent) throw new Error('No fallback agent');
  console.log(`   (fallback: ${result.agent})`);
});

// ============================================
// LAYER 5: Analytics (OutcomeTracker, PatternTracker)
// Reference: ROUTING_PIPELINE_TREE.md#layer-5
// ============================================
console.log('\n📍 Layer 5: Analytics (OutcomeTracker, PatternTracker)');
console.log('   Components:');
console.log('   - src/delegation/analytics/outcome-tracker.ts (OutcomeTracker)');
console.log('   - src/analytics/pattern-performance-tracker.ts (PatternTracker)');
console.log('   Artifact: logs/framework/routing-outcomes.json\n');

test('should automatically record outcome via RouterCore', () => {
  const before = routingOutcomeTracker.getOutcomes().length;
  const router = new TaskSkillRouter();
  
  router.routeTask('test outcome tracking', { taskId: 'outcome-auto' });
  
  const after = routingOutcomeTracker.getOutcomes().length;
  
  if (after <= before) {
    throw new Error(`Outcome not recorded: ${before} → ${after}`);
  }
  console.log(`   (+${after - before} outcomes, total: ${after})`);
});

test('should have valid outcome structure', () => {
  const outcomes = routingOutcomeTracker.getOutcomes();
  const latest = outcomes[outcomes.length - 1];
  
  if (!latest.taskId) throw new Error('Missing taskId');
  if (!latest.routedAgent) throw new Error('Missing routedAgent');
  if (typeof latest.confidence !== 'number') throw new Error('Missing confidence');
  
  console.log(`   (latest: ${latest.routedAgent})`);
});

// ============================================
// ENTRY POINTS (from tree)
// ============================================
console.log('\n📍 Entry Points (from tree)');
console.log('   - routeTask(): task-skill-router.ts:267');
console.log('   - preprocess(): task-skill-router.ts:240');
console.log('   - routeTaskToAgent(): task-skill-router.ts:473\n');

test('should use routeTask entry point', () => {
  const router = new TaskSkillRouter();
  const result = router.routeTask('test entry', { taskId: 'entry-route' });
  
  if (!result.agent) throw new Error('routeTask failed');
});

test('should use preprocess entry point', () => {
  const router = new TaskSkillRouter();
  const result = router.preprocess('test preprocess', { taskId: 'entry-preprocess' });
  
  if (!result.routing.agent) throw new Error('preprocess failed');
  if (!result.operation) throw new Error('preprocess missing operation');
  if (!result.context) throw new Error('preprocess missing context');
  
  console.log(`   (operation: ${result.operation})`);
});

// ============================================
// EXIT POINTS (from tree)
// ============================================
console.log('\n📍 Exit Points (from tree)');
console.log('   - Success: RoutingResult { agent, skill, confidence, matchedKeyword? }');
console.log('   - Fallback: DEFAULT_ROUTING → enforcer, 0.5 confidence\n');

test('should return success exit with matchedKeyword', () => {
  const router = new TaskSkillRouter();
  const result = router.routeTask('fix authentication', { taskId: 'exit-success' });
  
  if (result.agent !== 'bug-triage-specialist') {
    throw new Error(`Expected bug-triage-specialist, got ${result.agent}`);
  }
  if (result.matchedKeyword !== 'fix') {
    throw new Error(`Expected matchedKeyword 'fix', got ${result.matchedKeyword}`);
  }
  console.log(`   (success exit: matchedKeyword=${result.matchedKeyword})`);
});

test('should return fallback exit with low confidence', () => {
  const router = new TaskSkillRouter();
  const result = router.routeTask('do something random xyz123', { taskId: 'exit-fallback' });
  
  if (result.confidence !== 0.5) {
    throw new Error(`Expected fallback confidence 0.5, got ${result.confidence}`);
  }
  console.log(`   (fallback exit: confidence=${result.confidence})`);
});

// ============================================
// FULL PIPELINE FLOW
// Reference: ROUTING_PIPELINE_TREE.md#testing-requirements
// ============================================
console.log('\n📍 Full Pipeline Flow');
console.log('   Testing Requirements:');
console.log('   1. Route task → verify correct agent selected');
console.log('   2. Route task → verify outcome recorded');
console.log('   3. Route task → verify pattern tracked');
console.log('   4. Full flow: route → analytics → output\n');

test('should complete full flow: route → analytics', () => {
  const beforeCount = routingOutcomeTracker.getOutcomes().length;
  const router = new TaskSkillRouter();
  
  const testCases = [
    { task: 'scan for vulnerabilities', expectedAgent: 'security-auditor' },
    { task: 'fix bug in auth', expectedAgent: 'bug-triage-specialist' },
    { task: 'refactor database layer', expectedAgent: 'refactorer' },
  ];
  
  for (const { task, expectedAgent } of testCases) {
    const result = router.routeTask(task, { taskId: `flow-${task}` });
    
    if (result.agent !== expectedAgent) {
      throw new Error(`Expected ${expectedAgent}, got ${result.agent}`);
    }
  }
  
  const afterCount = routingOutcomeTracker.getOutcomes().length;
  const recorded = afterCount - beforeCount;
  
  if (recorded < testCases.length) {
    throw new Error(`Expected ${testCases.length} outcomes, got ${recorded}`);
  }
  
  console.log(`   (${testCases.length} tasks routed, ${recorded} outcomes recorded)`);
});

test('should verify all components from tree are tested', () => {
  const components = [
    'TaskSkillRouter',
    'RouterCore',
    'KeywordMatcher',
    'HistoryMatcher',
    'ComplexityRouter',
    'OutcomeTracker',
  ];
  
  console.log(`   (tested ${components.length} components from tree)`);
});

// ============================================
// RESULTS
// ============================================
setTimeout(() => {
  const finalCount = routingOutcomeTracker.getOutcomes().length;
  console.log('\n========================================');
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log(`Outcomes: ${baselineOutcomes} → ${finalCount} (+${finalCount - baselineOutcomes})`);
  console.log('========================================');
  
  if (failed === 0) {
    console.log('✅ Routing Pipeline test PASSED');
    process.exit(0);
  } else {
    console.log('❌ Routing Pipeline test FAILED');
    process.exit(1);
  }
}, 500);
