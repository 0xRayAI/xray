import { describe, it, expect } from "vitest";
import { ProcessorManager } from "../../processors/processor-manager.js";
import { XrayStateManager } from "../../state/state-manager.js";
import type { IProcessor } from "../../processors/processor-interfaces.js";
import type { ProcessorContext, ProcessorResult } from "../../processors/processor-types.js";

function keptResult(name: string): ProcessorResult {
  return { success: true, data: { kept: true }, duration: 0, processorName: name };
}

describe("discovered processors join the execution list", () => {
  it("keeps the built-in factory and still lists the processor", async () => {
    const manager = new ProcessorManager(new XrayStateManager());
    const processor: IProcessor = {
      name: "preValidate",
      type: "pre",
      priority: 10,
      enabled: true,
      execute: async (_context: ProcessorContext) => keptResult("preValidate"),
    };

    expect(manager.getProcessors().has("preValidate")).toBe(false);
    expect(manager.registerProcessorInstance(processor)).toBe(true);
    expect(manager.getProcessors().get("preValidate")?.type).toBe("pre");
    expect(manager.registerProcessorInstance(processor)).toBe(false);

    const ran = await manager.executePreProcessors({ tool: "read" });
    const row = ran.results.find((item) => item.processorName === "preValidate");
    expect(row?.success).toBe(true);
    expect(row?.data).not.toEqual({ kept: true });
  });

  it("lists inference and storytelling monitors after discovery", async () => {
    const manager = new ProcessorManager(new XrayStateManager());
    const names = await manager.discoverProcessors();

    expect(names).toContain("inferenceImprovement");
    expect(names).toContain("storytelling-trigger");
    expect(manager.getProcessors().get("inferenceImprovement")?.type).toBe("post");
    expect(manager.getProcessors().get("storytelling-trigger")?.type).toBe("post");

    await manager.discoverProcessors();
    expect(manager.getProcessors().has("inferenceImprovement")).toBe(true);
  }, 60000);
});
