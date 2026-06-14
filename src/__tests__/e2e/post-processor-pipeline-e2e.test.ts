import { describe, it, expect, vi } from "vitest";

vi.mock("../../core/framework-logger.js", () => ({
  frameworkLogger: { log: vi.fn() },
}));

describe("Post-Processor Pipeline E2E", () => {
  it("should execute nudge and commitBatcher post-processors on tool operation", async () => {
    const { StringRayStateManager } = await import("../../state/state-manager.js");
    const { ProcessorManager } = await import("../../processors/processor-manager.js");

    const stateManager = new StringRayStateManager();
    const pm = new ProcessorManager(stateManager);

    pm.registerProcessor({ name: "nudge", type: "post", priority: 78, enabled: true });
    pm.registerProcessor({ name: "commitBatcher", type: "post", priority: 85, enabled: true });

    const results = await pm.executePostProcessors("edit", { tool: "edit", filePath: "src/test.ts" }, []);

    expect(results.length).toBeGreaterThanOrEqual(2);

    const nudgeResult = results.find((r) => r.processorName === "nudge");
    expect(nudgeResult).toBeDefined();
    expect(nudgeResult!.success).toBe(true);

    const commitResult = results.find((r) => r.processorName === "commitBatcher");
    expect(commitResult).toBeDefined();
    expect(commitResult!.success).toBe(true);
  });

  it("should execute all registered post-processors in priority order", async () => {
    const { StringRayStateManager } = await import("../../state/state-manager.js");
    const { ProcessorManager } = await import("../../processors/processor-manager.js");

    const stateManager = new StringRayStateManager();
    const pm = new ProcessorManager(stateManager);

    pm.registerProcessor({ name: "storytellingTrigger", type: "post", priority: 5, enabled: true });
    pm.registerProcessor({ name: "nudge", type: "post", priority: 78, enabled: true });
    pm.registerProcessor({ name: "commitBatcher", type: "post", priority: 85, enabled: true });
    pm.registerProcessor({ name: "inferenceImprovement", type: "post", priority: 75, enabled: true });

    const results = await pm.executePostProcessors("edit", { tool: "edit", filePath: "src/test.ts" }, []);

    const priorities = results
      .filter((r) => ["storytellingTrigger", "nudge", "commitBatcher", "inferenceImprovement"].includes(r.processorName))
      .map((r) => {
        const config = (pm as any).processors.get(r.processorName);
        return { name: r.processorName, priority: config?.priority };
      });

    expect(priorities.length).toBe(4);
    for (let i = 1; i < priorities.length; i++) {
      expect(priorities[i].priority).toBeGreaterThanOrEqual(priorities[i - 1].priority);
    }
  });

  it("should handle commitBatcher tracking multiple operations", async () => {
    const { StringRayStateManager } = await import("../../state/state-manager.js");
    const { ProcessorManager } = await import("../../processors/processor-manager.js");

    const stateManager = new StringRayStateManager();
    const pm = new ProcessorManager(stateManager);

    pm.registerProcessor({ name: "nudge", type: "post", priority: 78, enabled: true });
    pm.registerProcessor({ name: "commitBatcher", type: "post", priority: 85, enabled: true });

    const r1 = await pm.executePostProcessors("edit", { tool: "edit", filePath: "src/a.ts" }, []);
    const r2 = await pm.executePostProcessors("edit", { tool: "edit", filePath: "src/b.ts" }, []);

    const c1 = r1.find((r) => r.processorName === "commitBatcher")!.data as any;
    const c2 = r2.find((r) => r.processorName === "commitBatcher")!.data as any;

    expect(c1.success).toBe(true);
    expect(c2.success).toBe(true);
  });
});
