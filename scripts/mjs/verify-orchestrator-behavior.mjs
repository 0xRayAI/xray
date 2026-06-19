#!/usr/bin/env node
/**
 * Consumer behavior verify — orchestrator honesty (ships in 0xray tarball).
 * Run: node node_modules/0xray/scripts/mjs/verify-orchestrator-behavior.mjs
 */
import { dirname, join } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const packageRoot = join(__dirname, '../..');
const dist = (rel) => pathToFileURL(join(packageRoot, 'dist', rel)).href;

let failed = 0;

function pass(name) {
  console.log(`✅ ${name}`);
}

function fail(name, detail = '') {
  failed++;
  console.error(`❌ ${name}${detail ? ` — ${detail}` : ''}`);
}

const { dependencyCount, getExecutionPlanner } = await import(
  dist('mcps/orchestrator/execution/execution-planner.js')
);
const { buildLeadDevPlan } = await import(dist('nucleus/autonomy-kernel.js'));
const { TaskHandler } = await import(
  dist('mcps/orchestrator/handlers/task-handler.js')
);

const planner = getExecutionPlanner();

// 1. numeric deps ≠ NaN
const analysis = await planner.analyzeTaskComplexity([
  {
    id: 't1',
    description: 'Jelly migration',
    type: 'implement',
    dependencies: 8,
  },
]);
if (Number.isFinite(analysis.overallComplexity) && analysis.overallComplexity > 0) {
  pass('numeric dependencyCount produces finite MCP complexity');
} else {
  fail('NaN guard', `overallComplexity=${analysis.overallComplexity}`);
}

// 2. multi-task → ≥3 todos
const multiPlan = buildLeadDevPlan(
  'G0 J1 J2',
  ['implement'],
  [
    { description: 'Publish 0xray', type: 'release' },
    { description: 'Jelly swap', type: 'migration' },
    { description: 'Wire tests', type: 'test' },
  ],
  70,
);
const todoCount =
  multiPlan?.phases.reduce((n, p) => n + p.todos.length, 0) ?? 0;
if (multiPlan?.requiresPhasedPlan && todoCount >= 3) {
  pass(`multi-task phased plan (${todoCount} todos)`);
} else {
  fail('multi-task plan', `requiresPhasedPlan=${multiPlan?.requiresPhasedPlan} todos=${todoCount}`);
}

// 3. implement → backend-engineer
const implAnalysis = await planner.analyzeTaskComplexity([
  { id: 'impl-1', description: 'swap deps', type: 'implement' },
]);
const implAgent = implAnalysis.agentAssignments[0]?.agent;
if (implAgent === 'backend-engineer') {
  pass('implement routes to backend-engineer');
} else {
  fail('implement routing', `got ${implAgent}`);
}

// 4. MCP complexity drives phased plan (single task, high MCP score)
const singleHigh = buildLeadDevPlan(
  'single complex migration',
  ['implement'],
  [{ description: 'single complex migration', type: 'implement' }],
  70,
);
if (singleHigh?.requiresPhasedPlan && (singleHigh.phases.length ?? 0) > 1) {
  pass('MCP overallComplexity 70 forces phased plan');
} else {
  fail('MCP phased plan', `requiresPhasedPlan=${singleHigh?.requiresPhasedPlan}`);
}

// 5. orchestrate-task defers implement (not fake-complete)
const handler = new TaskHandler();
const orch = await handler.handleOrchestrateTask(
  {
    description: 'implement feature',
    sessionId: 'verify-behavior',
    tasks: [
      {
        id: 'be-1',
        description: 'implementation work',
        type: 'implement',
        estimatedComplexity: 40,
      },
    ],
  },
  { taskHistory: [], activeTasks: new Map() },
);
const text = orch.content[0]?.text ?? '';
if (text.includes('Deferred') && text.includes('❌ FAILED')) {
  pass('orchestrate-task defers implement (success: false)');
} else {
  fail('defer honesty', text.slice(0, 200));
}

console.log(
  '\n' +
    (failed === 0
      ? '🎉 Orchestrator behavior verify passed (5/5).'
      : `⚠️  ${failed} behavior check(s) failed.`),
);
process.exit(failed === 0 ? 0 : 1);