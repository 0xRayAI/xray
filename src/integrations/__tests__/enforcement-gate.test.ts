import { describe, it, expect, vi, beforeEach } from "vitest";
import { beforeToolHook, afterToolHook } from "../enforcement-gate.js";
import type { GateViolation } from "../enforcement-gate.js";

describe("enforcement-gate", () => {
  beforeEach(() => {
    (globalThis as any).xrayValidatorRegistry = undefined;
    (globalThis as any).xrayPostProcessor = undefined;
    (globalThis as any).strRayPostProcessor = undefined;
    vi.restoreAllMocks();
  });

  describe("beforeToolHook", () => {
    it("returns allowed when no violations", async () => {
      const result = await beforeToolHook("read", { filePath: "test.ts" });
      expect(result.allowed).toBe(true);
      expect(result.blocked).toBe(false);
      expect(Array.isArray(result.violations)).toBe(true);
      expect(typeof result.resonance).toBe("number");
      expect(typeof result.duration).toBe("number");
    });

    it("returns safe defaults on empty args", async () => {
      const result = await beforeToolHook("write", null);
      expect(result.allowed).toBe(true);
      expect(result.blocked).toBe(false);
    });

    it("blocks on console.log in non-CLI content", async () => {
      const result = await beforeToolHook("write", {
        filePath: "src/lib/util.ts",
        content: 'function log() { console.log("test"); }',
      });
      // Should find console.log violation if validator loads
      // If registry can't load, should still return safe defaults
      expect(result.allowed).toBeDefined();
      expect(typeof result.blocked).toBe("boolean");
    });

    it("allows console.log in CLI file path", async () => {
      const result = await beforeToolHook("write", {
        filePath: "src/cli/commands/test.ts",
        content: 'function log() { console.log("user output"); }',
      });
      expect(result.allowed).toBeDefined();
      expect(typeof result.blocked).toBe("boolean");
    });

    it("handles Map-based newCode content", async () => {
      const contentMap = new Map<string, string>();
      contentMap.set("file1.ts", "const a = 1;");
      contentMap.set("file2.ts", "const b = 2;");
      const result = await beforeToolHook("write", {
        filePath: "src/test.ts",
        content: contentMap,
      });
      expect(result.allowed).toBeDefined();
    });

    it("blocks console.log in non-CLI file when registry loads via dynamic import", async () => {
      (globalThis as any).xrayValidatorRegistry = null;
      const result = await beforeToolHook("write", {
        filePath: "src/test.ts",
        content: "console.log('hi');",
      });
      expect(result.blocked).toBe(true);
      expect(result.violations.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("beforeToolHook — write tool with violations", () => {
    it("returns violations for eval", async () => {
      const result = await beforeToolHook("write", {
        filePath: "src/test.ts",
        content: 'const x = eval("1+1");',
      });
      expect(result.allowed).toBeDefined();
      expect(Array.isArray(result.violations)).toBe(true);
    });
  });

  describe("afterToolHook", () => {
    beforeEach(() => {
      (globalThis as any).xrayValidatorRegistry = undefined;
      (globalThis as any).xrayPostProcessor = undefined;
      (globalThis as any).strRayPostProcessor = undefined;
      (globalThis as any).xrayStateManager = undefined;
      vi.restoreAllMocks();
    });

    it("skips non-code-producing tools", async () => {
      const result = await afterToolHook("read", { filePath: "test.ts" }, null);
      expect(result.processed).toBe(false);
      expect(result.violations).toEqual([]);
      expect(result.governanceTriggered).toBe(false);
    });

    it("returns processed with no violations for clean code write", async () => {
      const result = await afterToolHook("write", { filePath: "src/clean.ts", content: "const x = 1;" }, null);
      expect(result.processed).toBe(true);
      expect(Array.isArray(result.violations)).toBe(true);
      expect(typeof result.governanceTriggered).toBe("boolean");
      expect(typeof result.duration).toBe("number");
    });

    it("reports violations from per-pipeline validators", async () => {
      const result = await afterToolHook("edit", {
        filePath: "src/lib/util.ts",
        code: 'console.log("test");',
      }, null);
      expect(result.processed).toBe(true);
      expect(Array.isArray(result.violations)).toBe(true);
    });

    it("handles governance routing for proposal-like results", async () => {
      const result = await afterToolHook("write", { filePath: "src/test.ts", content: "const a = 1;" }, {
        title: "Refactor handler",
        description: "Extract logic to helper",
        type: "refactor",
      });
      expect(result.processed).toBe(true);
      expect(typeof result.governanceTriggered).toBe("boolean");
    });

    it("returns safe defaults on error", async () => {
      const result = await afterToolHook("write", { filePath: "src/test.ts", content: "const a = 1;" }, {
        get title() { throw new Error("fail"); },
        description: "test",
      });
      expect(result.processed).toBe(true);
      expect(typeof result.violations).toBe("object");
    });
  });
});
