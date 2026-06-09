import { describe, it, expect, vi, beforeEach } from "vitest";

const frameworkLoggerMock = { log: vi.fn() };
vi.mock("../../core/framework-logger.js", () => ({
  frameworkLogger: frameworkLoggerMock,
}));

describe("Core Processor Pipeline E2E", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should execute pre-processors with frameworkLogger integration", async () => {
    const { XrayStateManager } = await import("../../state/state-manager.js");
    const { ProcessorManager } = await import("../../processors/processor-manager.js");

    const stateManager = new XrayStateManager();
    const pm = new ProcessorManager(stateManager);

    pm.registerProcessor({ name: "codexCompliance", type: "pre", priority: 20, enabled: true });
    pm.registerProcessor({ name: "preValidate", type: "pre", priority: 10, enabled: true });

    const result = await pm.executePreProcessors({
      tool: "write",
      args: { content: "test content" },
    });

    expect(result.success).toBe(true);
    expect(result.results.length).toBeGreaterThanOrEqual(2);

    const preValidate = result.results.find((r) => r.processorName === "preValidate");
    const codex = result.results.find((r) => r.processorName === "codexCompliance");
    expect(preValidate).toBeDefined();
    expect(preValidate!.success).toBe(true);
    expect(codex).toBeDefined();

    const preCalls = frameworkLoggerMock.log.mock.calls.filter(
      (c: unknown[]) => c[0] === "processor-manager" && c[1] === "executePreProcessors called",
    );
    expect(preCalls.length).toBe(1);
    expect(preCalls[0][3]).toMatchObject({
      tool: "write",
    });
  });

  it("should execute post-processors with frameworkLogger integration", async () => {
    const { XrayStateManager } = await import("../../state/state-manager.js");
    const { ProcessorManager } = await import("../../processors/processor-manager.js");

    const stateManager = new XrayStateManager();
    const pm = new ProcessorManager(stateManager);

    pm.registerProcessor({ name: "nudge", type: "post", priority: 78, enabled: true });
    pm.registerProcessor({ name: "commitBatcher", type: "post", priority: 85, enabled: true });
    pm.registerProcessor({ name: "stateValidation", type: "post", priority: 130, enabled: true });

    const results = await pm.executePostProcessors("write", { tool: "write", content: "test" }, []);

    expect(results.length).toBeGreaterThanOrEqual(3);
    results.forEach((r) => {
      expect(r.success).toBe(true);
    });

    const nudgeResult = results.find((r) => r.processorName === "nudge");
    expect(nudgeResult).toBeDefined();
    expect(nudgeResult!.duration).toBeGreaterThanOrEqual(0);

    const postCalls = frameworkLoggerMock.log.mock.calls.filter(
      (c: unknown[]) => c[0] === "processor-manager" && c[1] === "executePostProcessors called",
    );
    expect(postCalls.length).toBe(1);
    expect(postCalls[0][3]).toMatchObject({
      operation: "write",
    });
  });

  it("should run pre-processors then post-processors in a complete pipeline cycle", async () => {
    const { XrayStateManager } = await import("../../state/state-manager.js");
    const { ProcessorManager } = await import("../../processors/processor-manager.js");

    const stateManager = new XrayStateManager();
    const pm = new ProcessorManager(stateManager);

    pm.registerProcessor({ name: "codexCompliance", type: "pre", priority: 20, enabled: true });
    pm.registerProcessor({ name: "preValidate", type: "pre", priority: 10, enabled: true });
    pm.registerProcessor({ name: "nudge", type: "post", priority: 78, enabled: true });
    pm.registerProcessor({ name: "commitBatcher", type: "post", priority: 85, enabled: true });
    pm.registerProcessor({ name: "stateValidation", type: "post", priority: 130, enabled: true });

    const preResult = await pm.executePreProcessors({
      tool: "edit",
      args: { filePath: "src/test.ts" },
    });
    expect(preResult.success).toBe(true);

    const postResults = await pm.executePostProcessors("edit", { tool: "edit", filePath: "src/test.ts" }, []);
    expect(postResults.length).toBeGreaterThanOrEqual(3);
    postResults.forEach((r) => expect(r.success).toBe(true));

    const logCalls = frameworkLoggerMock.log.mock.calls;
    const preLog = logCalls.filter((c: unknown[]) => c[1] === "executePreProcessors called");
    const postLog = logCalls.filter((c: unknown[]) => c[1] === "executePostProcessors called");
    expect(preLog.length).toBe(1);
    expect(postLog.length).toBe(1);
  });
});
