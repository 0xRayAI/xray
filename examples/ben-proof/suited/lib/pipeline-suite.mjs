import { scoreAndRoute, NUCLEUS_THIN_DISPATCH_VERSION } from '../node_modules/0xray/dist/nucleus/thin-dispatch.js';
import { plateHintsForTask } from './plates/catalog.mjs';
import { ingestLessonShape } from './lesson-ingest.mjs';
import { runGovernanceGate, governanceGateSummary } from './governance/gate-runner.mjs';
import { rankRecallSignals } from './rankers/recall-ranker.mjs';

export function runPipelineSuite(task, ctx = {}) {
  const routed = scoreAndRoute(task, { operation: ctx.operation ?? 'analyze', fileCount: ctx.fileCount ?? 1 });
  const plates = plateHintsForTask(task);
  const lessonShape = ingestLessonShape(task, ctx);
  const codexGate = runGovernanceGate(task, ctx);
  const codexGateSummary = governanceGateSummary(codexGate);
  const recallRank = rankRecallSignals(task, ctx);

  return {
    thinDispatchVersion: NUCLEUS_THIN_DISPATCH_VERSION,
    route: {
      agent: routed.agent,
      score: routed.score.score,
      level: routed.score.level,
      memoryRouting: routed.memoryRouting ?? null,
    },
    intake: ctx.intake ?? null,
    governance: ctx.governance ?? null,
    recallRank,
    plates,
    lessonShape,
    codexGate: codexGateSummary,
  };
}
