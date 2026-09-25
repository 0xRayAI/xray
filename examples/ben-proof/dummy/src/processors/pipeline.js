import { log } from "../lib/logger.js";

/**
 * Minimal processor pipeline (pre hooks only), modeled on ProcessorManager ordering.
 */

/** @typedef {{ name: string; priority: number; run: (ctx: Record<string, unknown>) => Promise<Record<string, unknown>> }} Processor */

export class ProcessorPipeline {
  /** @param {Processor[]} processors */
  constructor(processors) {
    this.processors = [...processors].sort((a, b) => a.priority - b.priority);
  }

  /**
   * @param {Record<string, unknown>} context
   */
  async runPre(context) {
    const trace = [];
    let ctx = { ...context };
    for (const processor of this.processors) {
      const started = Date.now();
      try {
        const patch = await processor.run(ctx);
        ctx = { ...ctx, ...patch };
        trace.push({
          name: processor.name,
          ok: true,
          durationMs: Date.now() - started,
        });
      } catch (error) {
        trace.push({
          name: processor.name,
          ok: false,
          durationMs: Date.now() - started,
          error: error instanceof Error ? error.message : String(error),
        });
        log("processors", "pre-failed", "error", {
          processor: processor.name,
          error: error instanceof Error ? error.message : String(error),
        });
        throw error;
      }
    }
    return { context: ctx, trace };
  }
}
