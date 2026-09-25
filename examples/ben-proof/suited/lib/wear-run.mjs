import { scoreAndRoute, NUCLEUS_THIN_DISPATCH_VERSION } from '../node_modules/0xray/dist/nucleus/thin-dispatch.js';
import { recordLesson } from '../node_modules/0xray/dist/memory-routing/record-lesson.js';
import { getOrgan } from './organ.mjs';
import { SUBSYSTEMS } from './subsystems.mjs';
import { codexSnapshot } from './codex-snapshot.mjs';
import { memoryRoutingHealth } from './memory-routing-health.mjs';
import { enrichWearTask } from './plan-enrich.mjs';
import { suitTemperamentSnapshot } from './suit-temperament.mjs';
import { spawnPlanSnapshot } from './spawn-plan.mjs';
import { synthesisConfigSnapshot } from './synthesis-config.mjs';
import { delegationGateSnapshot } from './delegation-gate.mjs';
import { leadDevPlanSnapshot } from './lead-dev-plan.mjs';
import { createBenchToken, formatBenchLesson } from './bench-token.mjs';
import { runPipelineSuite } from './pipeline-suite.mjs';
import { assertIngestReady, signalsForTaskLesson } from './lesson-ingest.mjs';
import { runIntakePass } from './intake/intake-pass.mjs';
import { runGovernancePass } from './governance/governance-pass.mjs';

export function runWear(task, options = {}) {
  const sessionId = options.sessionId ?? `bench-wear-${Date.now()}`;
  const routed = scoreAndRoute(task, { operation: 'analyze', fileCount: 1 });
  const organ = getOrgan();

  if (!organ.isAvailable()) {
    const status = organ.getAvailabilityStatus();
    throw new Error(`repertoire unavailable: ${JSON.stringify(status)}`);
  }

  const confidence = organ.getTaskConfidence?.({
    id: `wear:${sessionId}`,
    description: task,
    type: 'implementation',
  });

  const benchToken = createBenchToken();
  const lesson = formatBenchLesson(benchToken);
  const taskId = `wear:${sessionId}`;
  // Thin dispatch can hand back [] when the task names no law. recordLesson
  // treats that as "no match, no write". Coin a name the same task string
  // will match on the next process, then store the lesson string.
  const signals = signalsForTaskLesson(organ, task);

  let taught = recordLesson({
    operation: task,
    success: true,
    taskId,
    assignedAgent: routed.agent,
    sessionId,
    signals,
    lesson,
  });

  if (taught.length === 0 && signals.length > 0) {
    organ.ingestFeedback({
      timestamp: new Date().toISOString(),
      sessionId,
      taskId,
      assignedAgent: routed.agent,
      memorySignals: signals,
      complexity: 0,
      success: true,
      durationMs: 0,
      lesson,
    });
    taught = signals;
  }

  const execution = enrichWearTask(organ, task, sessionId);
  const intake = runIntakePass(task, { sessionId });
  const governance = runGovernancePass(task, { sessionId, intake });
  const pipeline = runPipelineSuite(task, { sessionId, operation: 'analyze', fileCount: 1, intake, governance });
  const ingestReady = assertIngestReady({ ...pipeline.lessonShape, hasSession: true });

  return {
    subsystem: 'wear',
    subsystems: SUBSYSTEMS,
    governance: codexSnapshot(),
    memoryRoutingHealth: memoryRoutingHealth(),
    suit: suitTemperamentSnapshot('cursor'),
    spawnPlan: spawnPlanSnapshot(sessionId),
    synthesis: synthesisConfigSnapshot(),
    delegationGate: delegationGateSnapshot(sessionId),
    leadDevPlan: leadDevPlanSnapshot(task),
    execution,
    intake,
    governancePass: governance,
    pipeline,
    ingestReady,
    thinDispatchVersion: NUCLEUS_THIN_DISPATCH_VERSION,
    agent: routed.agent,
    score: routed.score.score,
    level: routed.score.level,
    memoryRouting: routed.memoryRouting ?? null,
    confidence: confidence ?? null,
    signals: taught,
    sessionId,
    benchToken,
  };
}
