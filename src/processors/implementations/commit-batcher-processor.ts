import { PostProcessor } from "../processor-interfaces.js";
import type { ProcessorContext, ProcessorResult } from "../processor-types.js";
import { frameworkLogger } from "../../core/framework-logger.js";
import {
  IntelligentCommitBatcher,
  type PendingChange,
} from "../../orchestrator/intelligent-commit-batcher.js";

let batcherSingleton: IntelligentCommitBatcher | null = null;

function getBatcher(): IntelligentCommitBatcher {
  if (!batcherSingleton) {
    batcherSingleton = new IntelligentCommitBatcher();
  }
  return batcherSingleton;
}

export class CommitBatcherProcessor extends PostProcessor {
  readonly name = "commitBatcher";
  readonly priority = 85;

  private trackedCount = 0;
  private batcher: IntelligentCommitBatcher;

  constructor(batcher?: IntelligentCommitBatcher) {
    super();
    this.batcher = batcher ?? getBatcher();
  }

  protected async run(context: ProcessorContext): Promise<Record<string, unknown>> {
    try {
      const tool = context.tool as string | undefined;
      const filePath = context.filePath as string | undefined;
      const operation = context.operation as string | undefined;

      if (!tool || !["edit", "write", "apply", "create", "delete", "rename"].includes(tool)) {
        return { success: true, batched: false, reason: "Not a file-modifying tool" };
      }

      if (!filePath) {
        return { success: true, batched: false, reason: "No file path" };
      }

      const change: PendingChange = {
        filePath,
        operation: tool,
        changeType: this.inferChangeType(tool, filePath),
        riskLevel: "low",
        linesChanged: 0,
        timestamp: Date.now(),
      };

      const shouldCommit = this.batcher.addChange(change);
      this.trackedCount += 1;

      if (shouldCommit) {
        const committed = await this.batcher.commitBatch();
        this.trackedCount = 0;
        frameworkLogger.log(
          "commit-batcher-processor",
          "commit-triggered",
          "info",
          { committed, filePath, tool }
        );
        return { success: true, batched: true, committed };
      }

      return { success: true, batched: false, pendingCount: this.trackedCount };
    } catch (error) {
      frameworkLogger.log(
        "commit-batcher-processor",
        "error",
        "error",
        { error: error instanceof Error ? error.message : String(error) }
      );
      return { success: false, batched: false, error: String(error) };
    }
  }

  private inferChangeType(tool: string, filePath: string): PendingChange["changeType"] {
    if (filePath.includes("test")) return "test";
    if (filePath.includes("config")) return "config";
    if (["edit", "write", "apply"].includes(tool)) return "refactor";
    if (tool === "create") return "feature";
    if (tool === "delete") return "refactor";
    return "refactor";
  }
}

export async function executeCommitBatcherProcessor(
  context: ProcessorContext,
): Promise<ProcessorResult> {
  const processor = new CommitBatcherProcessor();
  return processor.execute(context);
}
