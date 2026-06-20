#!/usr/bin/env node
/**
 * Pipeline facet liveness probe — extends suit wear matrix (Codex 69: script only).
 * Run: npm run verify:pipeline-facets
 */
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const packageRoot = resolve(import.meta.dirname, '../..');
const consumerRoot = process.cwd();
const packageOnly = process.argv.includes('--package-only');
let failed = 0;
let passed = 0;

function pass(name, detail = '') {
  passed++;
  console.log(`✅ ${name}${detail ? ` — ${detail}` : ''}`);
}

function fail(name, detail = '') {
  failed++;
  console.error(`❌ ${name}${detail ? ` — ${detail}` : ''}`);
}

function readFeatures() {
  const consumerPath = join(consumerRoot, '.xray', 'features.json');
  if (existsSync(consumerPath)) {
    return JSON.parse(readFileSync(consumerPath, 'utf8'));
  }
  const shippedPath = join(packageRoot, 'xray', 'features.json');
  if (existsSync(shippedPath)) {
    return JSON.parse(readFileSync(shippedPath, 'utf8'));
  }
  return null;
}

function xrayPath(...segments) {
  const distSeg = segments[0] === 'src'
    ? ['dist', ...segments.slice(1).map((s) => s.replace(/^src\//, ''))]
    : segments;
  const candidates = [
    join(packageRoot, ...distSeg),
    join(packageRoot, ...segments),
    join(consumerRoot, 'node_modules', '0xray', ...distSeg),
    join(consumerRoot, 'node_modules', '0xray', ...segments),
    join(consumerRoot, '../xray', ...distSeg),
    join(consumerRoot, '../xray', ...segments),
  ];
  return candidates.find((p) => existsSync(p)) ?? null;
}

console.log(`═══ 0xRay Pipeline Facet Verify${packageOnly ? ' (package-only)' : ''} ═══\n`);

const features = readFeatures();
if (!features) {
  fail('.xray/features.json');
} else {
  pass('.xray/features.json');
}

function skipConsumerFacet(name, detail = 'skipped in package-only mode') {
  passed++;
  console.log(`⏭️  ${name} — ${detail}`);
}

// P0 — governance config
const ig = features?.inference_governance;
if (ig?.enabled && (ig.local_mode === true || ig.require_external_dynamo === false)) {
  pass('inference_governance local mode', 'Dynamo optional for dev');
} else if (ig?.endpoint_url) {
  pass('inference_governance endpoint', ig.endpoint_url);
} else if (ig?.enabled) {
  pass('inference_governance.enabled', 'set local_mode or endpoint_url for full wire');
} else if (packageOnly) {
  skipConsumerFacet('inference_governance wiring');
} else {
  fail('inference_governance wiring', 'enable inference_governance in features.json');
}

// P0 — pipeline hook runtime shipped
const pipelineRuntime =
  xrayPath('dist/integrations/hooks/pipeline-hook-runtime.mjs')
  ?? xrayPath('src/integrations/hooks/pipeline-hook-runtime.mjs');
if (pipelineRuntime) {
  pass('pipeline-hook-runtime.mjs', pipelineRuntime);
} else {
  fail('pipeline-hook-runtime.mjs', 'missing in 0xray package');
}

// P1 — synthesis + reflection config
if (packageOnly) {
  skipConsumerFacet('synthesis.enabled');
  skipConsumerFacet('synthesis.reflection');
  skipConsumerFacet('autonomous_reporting.enabled');
  skipConsumerFacet('memory_routing.repertoire');
  skipConsumerFacet('lead_dev_mode');
  skipConsumerFacet('user_asides.enabled');
} else {
  if (features?.synthesis?.enabled === true) {
    pass('synthesis.enabled');
  } else {
    fail('synthesis.enabled');
  }
  if (features?.synthesis?.reflection?.mode) {
    pass('synthesis.reflection.mode', features.synthesis.reflection.mode);
  } else {
    fail('synthesis.reflection');
  }

  // P1 — autonomous reporting
  if (features?.autonomous_reporting?.enabled === true) {
    pass('autonomous_reporting.enabled');
  } else {
    fail('autonomous_reporting.enabled');
  }

  // P1 — memory routing (live)
  if (features?.memory_routing?.enabled === true && features.memory_routing.provider === 'repertoire') {
    pass('memory_routing.repertoire');
  } else {
    fail('memory_routing.repertoire');
  }

  // P1 — lead dev OS
  if (features?.multi_agent_orchestration?.lead_dev_mode === true) {
    pass('lead_dev_mode');
  } else {
    fail('lead_dev_mode');
  }

  // P2 — user asides
  if (features?.multi_agent_orchestration?.user_asides?.enabled === true) {
    pass('user_asides.enabled');
  } else {
    fail('user_asides.enabled');
  }
}

// Runtime artifacts (optional — created after hook fire)
const reportsMarker = join(consumerRoot, 'reports', '.autonomous-reporting-scheduled.json');
if (existsSync(reportsMarker)) {
  pass('autonomous-report marker', reportsMarker);
} else {
  pass('autonomous-report marker', 'pending first session-start (non-blocking)');
}

const routingOutcomes = join(consumerRoot, 'logs', 'framework', 'routing-outcomes.json');
if (existsSync(routingOutcomes)) {
  try {
    const arr = JSON.parse(readFileSync(routingOutcomes, 'utf8'));
    if (Array.isArray(arr) && arr.length > 0) {
      pass('routing-outcomes.json', `${arr.length} entries`);
    } else {
      pass('routing-outcomes.json', 'empty — pending orchestrate/Task (non-blocking)');
    }
  } catch {
    fail('routing-outcomes.json', 'invalid JSON');
  }
} else {
  pass('routing-outcomes.json', 'pending first post-tool (non-blocking)');
}

const activityLog = join(consumerRoot, 'logs', 'framework', 'activity.log');
if (existsSync(activityLog)) {
  const tail = readFileSync(activityLog, 'utf8').slice(-8000);
  const pipelineActions = ['pipeline-hook', 'reflection-stub', 'routing-outcome', 'autonomous-report', 'inference-improvement'];
  const found = pipelineActions.filter((a) => tail.includes(a));
  if (found.length > 0) {
    pass('activity.log pipeline actions', found.join(', '));
  } else {
    pass('activity.log', 'no pipeline-hook actions yet (run session-start)');
  }
} else {
  pass('activity.log', 'pending first hook run');
}

// SSOT contract — confer emoji export
try {
  const conferPath = xrayPath('dist/nucleus/confer.js');
  if (conferPath) {
    const require = createRequire(import.meta.url);
    const confer = require(conferPath);
    const report = confer.formatConferQuorumReport({
      status: 'completed',
      message: 'probe',
      agents: [{ todoId: 's.1', subagent: 'researcher', verdict: 'PASS', receiptRecorded: true, todoCompleted: true }],
    });
    if (report.includes('🔍')) pass('confer emoji panel');
    else fail('confer emoji panel');
  } else {
    fail('confer.js dist', 'build 0xray first');
  }
} catch (e) {
  fail('confer emoji panel', e.message);
}

// Snapshot
try {
  const runtimeUrl = pipelineRuntime
    ? pathToFileURL(pipelineRuntime).href
    : null;
  if (runtimeUrl) {
    const { writePipelineFacetSnapshot } = await import(runtimeUrl);
    const snapshotPath = writePipelineFacetSnapshot(consumerRoot, { passed, failed, probe: 'verify-pipeline-facets' });
    pass('PIPELINE-FACET-SNAPSHOT.json', snapshotPath);
  }
} catch {
  /* snapshot best-effort */
}

console.log(`\nPipeline facets: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
console.log('✅ Pipeline facet verify PASS');