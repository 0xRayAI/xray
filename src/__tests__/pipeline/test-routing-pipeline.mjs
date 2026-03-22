/**
 * Routing Pipeline Test
 * 
 * Tests the complete routing flow following the actual pipeline:
 * 
 * Input → RouterCore → KeywordMatcher → HistoryMatcher → ComplexityRouter
 *         → [AUTO] OutcomeTracker records outcome → Analytics → Output
 * 
 * KEY INSIGHT: The RouterCore automatically records outcomes for every routeTask call.
 * This is the correct behavior - the pipeline IS working, just automatically.
 */

import { TaskSkillRouter } from '../../../dist/delegation/task-skill-router.js';
import { routingOutcomeTracker } from '../../../dist/delegation/analytics/outcome-tracker.js';

console.log('=== ROUTING PIPELINE TEST ===\n');

// Get baseline count (singleton persists between runs)
const baselineCount = routingOutcomeTracker.getOutcomes().length;
console.log(`📍 Baseline: ${baselineCount} outcomes in tracker\n`);

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
// LAYER 1: Input
// ============================================
console.log('📍 Layer 1: Input');

test('should accept task input', () => {
  const router = new TaskSkillRouter();
  const result = router.routeTask('test input', { taskId: 'layer1-test' });
  if (!result) throw new Error('No result from router');
  console.log(`   (auto-recorded outcome)`);
});

// ============================================
// LAYER 2: Keyword Matching
// ============================================
console.log('\n📍 Layer 2: Keyword Matching');

test('should match security keywords', () => {
  const router = new TaskSkillRouter();
  const result = router.routeTask('scan for security vulnerabilities', { taskId: 'keyword-security' });
  if (result.matchedKeyword !== 'security') {
    throw new Error(`Expected matchedKeyword 'security', got '${result.matchedKeyword}'`);
  }
  console.log(`   (auto-recorded: ${result.matchedKeyword})`);
});

test('should match bug keywords', () => {
  const router = new TaskSkillRouter();
  const result = router.routeTask('fix bug in login', { taskId: 'keyword-bug' });
  if (result.matchedKeyword !== 'fix') {
    throw new Error(`Expected matchedKeyword 'fix', got '${result.matchedKeyword}'`);
  }
});

test('should match refactor keywords', () => {
  const router = new TaskSkillRouter();
  const result = router.routeTask('refactor the module', { taskId: 'keyword-refactor' });
  if (result.matchedKeyword !== 'refactor') {
    throw new Error(`Expected matchedKeyword 'refactor', got '${result.matchedKeyword}'`);
  }
});

// ============================================
// LAYER 3: Agent Selection
// ============================================
console.log('\n📍 Layer 3: Agent Selection');

test('should route security tasks to security-auditor', () => {
  const router = new TaskSkillRouter();
  const result = router.routeTask('scan security', { taskId: 'agent-security' });
  if (result.agent !== 'security-auditor') {
    throw new Error(`Expected agent 'security-auditor', got '${result.agent}'`);
  }
});

test('should route bug tasks to bug-triage-specialist', () => {
  const router = new TaskSkillRouter();
  const result = router.routeTask('fix bug', { taskId: 'agent-bug' });
  if (result.agent !== 'bug-triage-specialist') {
    throw new Error(`Expected agent 'bug-triage-specialist', got '${result.agent}'`);
  }
});

test('should route code review to code-reviewer', () => {
  const router = new TaskSkillRouter();
  const result = router.routeTask('review code', { taskId: 'agent-review' });
  if (result.agent !== 'code-reviewer') {
    throw new Error(`Expected agent 'code-reviewer', got '${result.agent}'`);
  }
});

test('should route refactoring to refactorer', () => {
  const router = new TaskSkillRouter();
  const result = router.routeTask('refactor module', { taskId: 'agent-refactor' });
  if (result.agent !== 'refactorer') {
    throw new Error(`Expected agent 'refactorer', got '${result.agent}'`);
  }
});

// ============================================
// LAYER 4: Confidence Scoring
// ============================================
console.log('\n📍 Layer 4: Confidence Scoring');

test('should return confidence score', () => {
  const router = new TaskSkillRouter();
  const result = router.routeTask('test confidence', { taskId: 'confidence-test' });
  if (typeof result.confidence !== 'number') {
    throw new Error('Confidence should be a number');
  }
  if (result.confidence < 0 || result.confidence > 1) {
    throw new Error('Confidence should be between 0 and 1');
  }
  console.log(`   (confidence: ${(result.confidence * 100).toFixed(0)}%)`);
});

test('should return skill assignment', () => {
  const router = new TaskSkillRouter();
  const result = router.routeTask('fix bug', { taskId: 'skill-test' });
  if (!result.skill) {
    throw new Error('Skill should be assigned');
  }
  console.log(`   (skill: ${result.skill})`);
});

// ============================================
// LAYER 5: Outcome Tracking (Automatic)
// ============================================
console.log('\n📍 Layer 5: Outcome Tracking (Automatic)');

test('should automatically record outcomes via RouterCore', () => {
  const before = routingOutcomeTracker.getOutcomes().length;
  const router = new TaskSkillRouter();
  
  // Route a task - RouterCore automatically records outcome
  router.routeTask('scan security', { taskId: 'auto-outcome-test' });
  
  const after = routingOutcomeTracker.getOutcomes().length;
  const added = after - before;
  
  // RouterCore may record 1 or more outcomes per route
  // The key is that outcomes ARE being recorded automatically
  if (added < 1) {
    throw new Error(`Expected at least 1 outcome recorded, got ${added}`);
  }
  console.log(`   (+${added} outcomes auto-recorded, total: ${after})`);
});

test('should track outcomes for multiple routing methods', () => {
  const before = routingOutcomeTracker.getOutcomes().length;
  const router = new TaskSkillRouter();
  
  // Different tasks may trigger different routing methods
  const tasks = ['fix bug', 'review code', 'refactor module'];
  
  for (const task of tasks) {
    router.routeTask(task, { taskId: `multi-${task}` });
  }
  
  const after = routingOutcomeTracker.getOutcomes().length;
  const added = after - before;
  
  // Each routeTask may record 1+ outcomes automatically
  if (added < tasks.length) {
    throw new Error(`Expected at least ${tasks.length} outcomes, got ${added}`);
  }
  console.log(`   (+${added} outcomes, total: ${after})`);
});

test('should have valid outcome structure', () => {
  // Get the latest outcome
  const outcomes = routingOutcomeTracker.getOutcomes();
  if (outcomes.length === 0) {
    throw new Error('No outcomes recorded');
  }
  
  const latest = outcomes[outcomes.length - 1];
  
  // Verify outcome has required fields
  if (!latest.taskId) throw new Error('Outcome missing taskId');
  if (!latest.routedAgent) throw new Error('Outcome missing routedAgent');
  if (typeof latest.confidence !== 'number') throw new Error('Outcome missing confidence');
  
  console.log(`   (latest: ${latest.routedAgent}, confidence: ${(latest.confidence * 100).toFixed(0)}%)`);
});

// ============================================
// END-TO-END PIPELINE FLOW
// ============================================
console.log('\n📍 End-to-End Pipeline Flow');

test('should complete full routing pipeline', async () => {
  const before = routingOutcomeTracker.getOutcomes().length;
  
  const router = new TaskSkillRouter();
  const tasks = [
    { task: 'fix authentication bug', expectedAgent: 'bug-triage-specialist', expectedSkill: 'bug-triage' },
    { task: 'security audit', expectedAgent: 'security-auditor', expectedSkill: 'security-audit' },
    { task: 'optimize performance', expectedAgent: 'performance-engineer', expectedSkill: 'performance-optimization' },
  ];
  
  for (const { task, expectedAgent, expectedSkill } of tasks) {
    const result = router.routeTask(task, { taskId: `e2e-${task}` });
    
    if (result.agent !== expectedAgent) {
      throw new Error(`Expected ${expectedAgent}, got ${result.agent} for task: ${task}`);
    }
    if (result.skill !== expectedSkill) {
      throw new Error(`Expected skill ${expectedSkill}, got ${result.skill} for task: ${task}`);
    }
    
    // Pipeline automatically records outcome via RouterCore
  }
  
  const after = routingOutcomeTracker.getOutcomes().length;
  const added = after - before;
  
  if (added < tasks.length) {
    throw new Error(`Expected at least ${tasks.length} outcomes, got ${added}`);
  }
  
  console.log(`   (${tasks.length} tasks routed, +${added} outcomes)`);
});

test('should handle varied input patterns', () => {
  const router = new TaskSkillRouter();
  
  const patterns = [
    { input: '@architect design API', shouldRoute: true },
    { input: 'I need to fix this bug', shouldRoute: true },
    { input: 'check for security issues', shouldRoute: true },
    { input: 'refactor the auth module', shouldRoute: true },
    { input: 'add tests for this', shouldRoute: true },
  ];
  
  for (const { input, shouldRoute } of patterns) {
    const result = router.routeTask(input, { taskId: `pattern-${input}` });
    if (shouldRoute && !result.agent) {
      throw new Error(`Failed to route: ${input}`);
    }
  }
  console.log(`   (${patterns.length} patterns routed)`);
});

// ============================================
// RESULTS
// ============================================
setTimeout(() => {
  const finalCount = routingOutcomeTracker.getOutcomes().length;
  console.log('\n========================================');
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log(`Outcomes: ${baselineCount} → ${finalCount} (+${finalCount - baselineCount})`);
  console.log('========================================');
  
  if (failed === 0) {
    console.log('✅ Routing Pipeline test PASSED');
    process.exit(0);
  } else {
    console.log('❌ Routing Pipeline test FAILED');
    process.exit(1);
  }
}, 500);
