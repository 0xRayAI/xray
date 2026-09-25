import { randomUUID } from "node:crypto";
import { runGovernancePrecheck } from "../governance/precheck.js";
import { ProcessorPipeline } from "../processors/pipeline.js";
import { builtinPreProcessors } from "../processors/builtin.js";
import { mintBenchToken } from "./mint-token.js";
import { appendLesson } from "./lesson-store.js";
import { log } from "../lib/logger.js";

/**
 * @param {{ summary: string; title?: string }} input
 */
export async function runIntake(input) {
  const title = input.title ?? "Lesson intake";
  const governance = runGovernancePrecheck({
    title,
    description: input.summary,
    resonance: 0.9,
  });

  const pipeline = new ProcessorPipeline(builtinPreProcessors);
  const { context, trace } = await pipeline.runPre({
    summary: input.summary,
    governance,
  });

  const benchToken = mintBenchToken();
  const record = {
    lessonId: randomUUID(),
    benchToken,
    summary: input.summary,
    governance: {
      proposalId: governance.proposalId,
      finalDecision: governance.finalDecision,
      averageConfidence: governance.averageConfidence,
      votes: governance.votes,
      reasoningSummary: governance.reasoningSummary,
    },
    createdAt: new Date().toISOString(),
    processorTrace: trace,
    contextKeys: Object.keys(context),
  };

  await appendLesson(record);
  log("intake", "lesson-saved", "info", {
    lessonId: record.lessonId,
    benchToken,
    path: "data/lessons.jsonl",
  });
  return record;
}
