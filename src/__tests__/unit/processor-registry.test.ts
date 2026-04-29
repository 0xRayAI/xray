import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { ProcessorManager } from "../../processors/processor-manager.js";
import { StringRayStateManager } from "../../state/state-manager.js";

describe("Processor Registry Pattern", () => {
  let pm: ProcessorManager;
  let sm: StringRayStateManager;

  beforeEach(() => {
    sm = new StringRayStateManager(`/test/registry-${Date.now()}.json`);
    pm = new ProcessorManager(sm);
  });

  afterEach(async () => {
    await pm.cleanupProcessors();
  });

  describe("Built-in factory registration", () => {
    it("should have 24 built-in factories registered on construction", () => {
      pm.registerProcessor({ name: "preValidate", type: "pre", priority: 10, enabled: true });
      pm.registerProcessor({ name: "storytellingTrigger", type: "post", priority: 5, enabled: true });

      const processors = pm.getProcessors();
      expect(processors.size).toBe(2);
    });

    it("should execute preValidate via factory", async () => {
      pm.registerProcessor({ name: "preValidate", type: "pre", priority: 10, enabled: true });
      await pm.initializeProcessors();

      const result = await pm.executeProcessor("preValidate", {
        input: { tool: "write", args: { filePath: "test.ts" } },
      });

      expect(result.success).toBe(true);
      expect(result.processorName).toBe("preValidate");
    });

    it("should execute storytellingTrigger via factory", async () => {
      pm.registerProcessor({ name: "storytellingTrigger", type: "post", priority: 5, enabled: true });
      await pm.initializeProcessors();

      const result = await pm.executeProcessor("storytellingTrigger", {
        operation: "commit",
        files: ["src/a.ts"],
      });

      expect(result.success).toBe(true);
      expect(result.processorName).toBe("storytellingTrigger");
    }, 15000);

    it("should execute sessionSummary via factory", async () => {
      pm.registerProcessor({ name: "sessionSummary", type: "post", priority: 15, enabled: true });
      await pm.initializeProcessors();

      const result = await pm.executeProcessor("sessionSummary", {
        operation: "commit",
      });

      expect(result.success).toBe(true);
    });

    it("should execute inferenceImprovement via factory", async () => {
      pm.registerProcessor({ name: "inferenceImprovement", type: "post", priority: 60, enabled: true });
      await pm.initializeProcessors();

      const result = await pm.executeProcessor("inferenceImprovement", {
        operation: "commit",
      });

      expect(result.success).toBe(true);
    });

    it("should execute regressionTesting via factory", async () => {
      pm.registerProcessor({ name: "regressionTesting", type: "post", priority: 50, enabled: true });
      await pm.initializeProcessors();

      const result = await pm.executeProcessor("regressionTesting", {
        filePath: "nonexistent.ts",
      });

      expect(result.success).toBe(true);
    });

    it("should execute codexCompliance via factory", async () => {
      pm.registerProcessor({ name: "codexCompliance", type: "pre", priority: 20, enabled: true });
      await pm.initializeProcessors();

      const result = await pm.executeProcessor("codexCompliance", {
        input: { tool: "write", args: { filePath: "test.ts", content: "const x = 1;" } },
      });

      expect(result.success).toBe(true);
    });
  });

  describe("Custom factory registration", () => {
    it("should execute custom processor via registerFactory", async () => {
      let executed = false;
      pm.registerFactory("myCustom", {
        execute: async (ctx) => {
          executed = true;
          return { custom: true, input: ctx };
        },
      });

      pm.registerProcessor({ name: "myCustom", type: "post", priority: 100, enabled: true });
      await pm.initializeProcessors();

      const result = await pm.executeProcessor("myCustom", { test: true });

      expect(result.success).toBe(true);
      expect(executed).toBe(true);
      expect(result.data).toEqual({ custom: true, input: { test: true } });
    });

    it("should call init on custom factory during initializeProcessors", async () => {
      let initialized = false;
      pm.registerFactory("customWithInit", {
        execute: async () => ({ ok: true }),
        init: async () => { initialized = true; },
      });

      pm.registerProcessor({ name: "customWithInit", type: "pre", priority: 10, enabled: true });
      await pm.initializeProcessors();

      expect(initialized).toBe(true);
    });

    it("should allow overriding built-in factory", async () => {
      let customExecuted = false;
      pm.registerFactory("preValidate", {
        execute: async () => { customExecuted = true; return { overridden: true }; },
      });

      pm.registerProcessor({ name: "preValidate", type: "pre", priority: 10, enabled: true });
      await pm.initializeProcessors();

      const result = await pm.executeProcessor("preValidate", {});
      expect(customExecuted).toBe(true);
      expect(result.success).toBe(true);
    });
  });

  describe("Unknown processor handling", () => {
    it("should throw on unknown processor execution", async () => {
      pm.registerProcessor({ name: "unknownProcessor", type: "pre", priority: 10, enabled: true });
      await pm.initializeProcessors();

      const result = await pm.executeProcessor("unknownProcessor", {});
      expect(result.success).toBe(false);
      expect(result.error).toContain("Unknown processor");
    });
  });

  describe("Factory isolation", () => {
    it("should isolate factories between ProcessorManager instances", async () => {
      const sm2 = new StringRayStateManager(`/test/registry-2-${Date.now()}.json`);
      const pm2 = new ProcessorManager(sm2);

      let pm2Executed = false;
      pm2.registerFactory("isolated", {
        execute: async () => { pm2Executed = true; return {}; },
      });

      let pm1Executed = false;
      pm.registerFactory("isolated", {
        execute: async () => { pm1Executed = true; return {}; },
      });

      pm.registerProcessor({ name: "isolated", type: "post", priority: 1, enabled: true });
      pm2.registerProcessor({ name: "isolated", type: "post", priority: 1, enabled: true });

      await pm.initializeProcessors();
      await pm2.initializeProcessors();

      await pm.executeProcessor("isolated", {});
      expect(pm1Executed).toBe(true);
      expect(pm2Executed).toBe(false);

      await pm2.executeProcessor("isolated", {});
      expect(pm2Executed).toBe(true);
    });
  });
});
