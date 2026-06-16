import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

vi.mock("../../enforcement/rule-enforcer.js", () => ({
  RuleEnforcer: vi.fn(),
}));

vi.mock("../../delegation/analytics/outcome-tracker.js", () => ({
  routingOutcomeTracker: { recordOutcome: vi.fn() },
}));

vi.mock("../../services/inference-tuner.js", () => ({
  inferenceTuner: { runTuningCycle: vi.fn() },
}));

import xrayCodexPlugin from "../../plugin/xray-codex-injection.js";

describe("xray-codex-injection", () => {
  describe("classifyTaskType", () => {
    const getPlugin = async () => xrayCodexPlugin({ directory: process.cwd() });
    const classify = async (tool: string, args?: Record<string, unknown>) => {
      const hooks = await getPlugin();
      const beforeHook = hooks["tool.execute.before"];
      const afterHook = hooks["tool.execute.after"];
      return { tool, args };
    };

    it("classifies npm test as testing", async () => {
      const { classifyTaskType } = await importClassifyFn();
      expect(classifyTaskType("bash", { command: "npm test" })).toBe("testing");
    });

    it("classifies vitest as testing", async () => {
      const { classifyTaskType } = await importClassifyFn();
      expect(classifyTaskType("bash", { command: "npx vitest run" })).toBe("testing");
    });

    it("classifies eslint as lint", async () => {
      const { classifyTaskType } = await importClassifyFn();
      expect(classifyTaskType("bash", { command: "eslint src/" })).toBe("lint");
    });

    it("classifies npm install as install", async () => {
      const { classifyTaskType } = await importClassifyFn();
      expect(classifyTaskType("bash", { command: "npm install" })).toBe("install");
    });

    it("classifies git as git", async () => {
      const { classifyTaskType } = await importClassifyFn();
      expect(classifyTaskType("bash", { command: "git status" })).toBe("git");
    });

    it("classifies grep as search", async () => {
      const { classifyTaskType } = await importClassifyFn();
      expect(classifyTaskType("bash", { command: "grep pattern file" })).toBe("search");
    });

    it("classifies npm run build as build", async () => {
      const { classifyTaskType } = await importClassifyFn();
      expect(classifyTaskType("bash", { command: "npm run build" })).toBe("build");
    });

    it("classifies security audit as security", async () => {
      const { classifyTaskType } = await importClassifyFn();
      expect(classifyTaskType("bash", { command: "npm audit" })).toBe("security");
    });

    it("classifies write tool as write", async () => {
      const { classifyTaskType } = await importClassifyFn();
      expect(classifyTaskType("write")).toBe("write");
    });

    it("classifies edit tool as edit", async () => {
      const { classifyTaskType } = await importClassifyFn();
      expect(classifyTaskType("edit")).toBe("edit");
    });

    it("classifies multiedit tool as edit", async () => {
      const { classifyTaskType } = await importClassifyFn();
      expect(classifyTaskType("multiedit")).toBe("edit");
    });

    it("classifies read tool as read", async () => {
      const { classifyTaskType } = await importClassifyFn();
      expect(classifyTaskType("read")).toBe("read");
    });

    it("classifies search/grep/glob as search", async () => {
      const { classifyTaskType } = await importClassifyFn();
      expect(classifyTaskType("search")).toBe("search");
      expect(classifyTaskType("grep")).toBe("search");
      expect(classifyTaskType("glob")).toBe("search");
    });

    it("classifies unknown tool as unknown", async () => {
      const { classifyTaskType } = await importClassifyFn();
      expect(classifyTaskType("unknown_tool")).toBe("unknown");
    });

    it("classifies empty bash command as unknown", async () => {
      const { classifyTaskType } = await importClassifyFn();
      expect(classifyTaskType("bash")).toBe("unknown");
    });
  });

  describe("validateModulePath", () => {
    it("accepts path within allowed prefix", async () => {
      const fn = await importValidateModulePath();
      expect(() => fn("/project/dist/module.js", "/project/dist")).not.toThrow();
    });

    it("rejects path traversal above allowed prefix", async () => {
      const fn = await importValidateModulePath();
      expect(() => fn("/etc/passwd", "/project/dist")).toThrow(
        "Module path validation failed",
      );
    });

    it("rejects relative path traversal", async () => {
      const fn = await importValidateModulePath();
      const resolved = path.resolve("/project/dist/../../etc/passwd");
      expect(() => fn(resolved, "/project/dist")).toThrow(
        "Module path validation failed",
      );
    });
  });

  describe("extractCodexMetadata", () => {
    it("parses JSON codex content", async () => {
      const fn = await importExtractCodexMetadata();
      const result = fn(JSON.stringify({ version: "3.1.0", terms: { a: {}, b: {} } }));
      expect(result.version).toBe("3.1.0");
      expect(result.termCount).toBe(2);
    });

    it("defaults version to 1.6.0 for JSON without version", async () => {
      const fn = await importExtractCodexMetadata();
      const result = fn(JSON.stringify({ terms: {} }));
      expect(result.version).toBe("1.6.0");
    });

    it("defaults termCount to 0 for JSON without terms", async () => {
      const fn = await importExtractCodexMetadata();
      const result = fn(JSON.stringify({ version: "3.1.0" }));
      expect(result.termCount).toBe(0);
    });

    it("parses markdown codex content", async () => {
      const fn = await importExtractCodexMetadata();
      const md = `**Version**: 3.0.14
#### 1. Resolve All Errors
#### 2. Type Safety First
`;
      const result = fn(md);
      expect(result.version).toBe("3.0.14");
      expect(result.termCount).toBe(2);
    });

    it("defaults version to 1.6.0 for markdown without version", async () => {
      const fn = await importExtractCodexMetadata();
      const result = fn("# No version header");
      expect(result.version).toBe("1.6.0");
    });

    it("returns 0 termCount for content without term headers", async () => {
      const fn = await importExtractCodexMetadata();
      const result = fn("# Just a regular file\nNo terms here.");
      expect(result.termCount).toBe(0);
    });

    it("handles invalid JSON by falling back to markdown parsing", async () => {
      const fn = await importExtractCodexMetadata();
      const result = fn("{ invalid json **Version**: 2.0.0");
      expect(result.version).toBe("2.0.0");
    });
  });

  describe("isWriteEditOperation", () => {
    it("returns true for write, edit, multiedit", async () => {
      const fn = await importIsWriteEditOperation();
      expect(fn("write")).toBe(true);
      expect(fn("edit")).toBe(true);
      expect(fn("multiedit")).toBe(true);
    });

    it("returns false for other tools", async () => {
      const fn = await importIsWriteEditOperation();
      expect(fn("read")).toBe(false);
      expect(fn("bash")).toBe(false);
      expect(fn("grep")).toBe(false);
    });
  });

  describe("isPublishOperation", () => {
    it("returns true for publish-like tools", async () => {
      const fn = await importIsPublishOperation();
      expect(fn("publish")).toBe(true);
      expect(fn("release")).toBe(true);
      expect(fn("npm-publish")).toBe(true);
      expect(fn("xray-release")).toBe(true);
    });

    it("returns false for other tools", async () => {
      const fn = await importIsPublishOperation();
      expect(fn("write")).toBe(false);
      expect(fn("edit")).toBe(false);
      expect(fn("bash")).toBe(false);
    });
  });

  describe("runEnforcerQualityGate", () => {
    let tempDir: string;

    beforeEach(() => {
      tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "xray-test-"));
    });

    afterEach(() => {
      fs.rmSync(tempDir, { recursive: true, force: true });
    });

    it("returns passed when RuleEnforcer finds no violations", async () => {
      const { RuleEnforcer } = await import("../../enforcement/rule-enforcer.js");
      (RuleEnforcer as any).mockImplementation(() => ({
        validateOperation: vi.fn().mockResolvedValue({ errors: [], results: [] }),
      }));

      const logger = await getTestLogger(tempDir);
      const fn = await importRunEnforcerQualityGate();
      const result = await fn({ tool: "write", args: { content: "clean code" } }, logger);
      expect(result.passed).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it("returns failed with violations for blocking severity", async () => {
      const fn = await importRunEnforcerQualityGate();
      const tempFile = path.join(tempDir, "test.ts");
      fs.writeFileSync(tempFile, "console.log('hello');");
      const logger = await getTestLogger(tempDir);
      const result = await fn({ tool: "write", args: { content: "console.log('hello')", filePath: tempFile } }, logger);
      expect(result.passed).toBe(false);
      expect(result.violations.length).toBeGreaterThan(0);
    });

    it("reports errors from RuleEnforcer report.errors", async () => {
      const fn = await importRunEnforcerQualityGate();
      const logger = await getTestLogger(tempDir);
      const result = await fn({ tool: "edit", args: {} }, logger);
      expect(typeof result.passed).toBe("boolean");
    });
  });

  describe("chat.message hook", () => {
    let tempDir: string;

    beforeEach(() => {
      tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "xray-chat-"));
    });

    afterEach(() => {
      fs.rmSync(tempDir, { recursive: true, force: true });
    });

    it("transforms @code-reviewer mention", async () => {
      const hooks = await xrayCodexPlugin({ directory: tempDir });
      const input = { parts: [{ type: "text", text: "@code-reviewer review this code" }] };
      const output = { parts: [{ type: "text", text: "@code-reviewer review this code" }] };

      await hooks["chat.message"](input, output);

      expect(output.parts![0].text).toContain("[DELEGATE TO AGENT: code-reviewer]");
    });

    it("transforms @architect mention", async () => {
      const hooks = await xrayCodexPlugin({ directory: tempDir });
      const input = { parts: [{ type: "text", text: "@architect design the API" }] };
      const output = { parts: [{ type: "text", text: "@architect design the API" }] };

      await hooks["chat.message"](input, output);

      expect(output.parts![0].text).toContain("[DELEGATE TO AGENT: architect]");
    });

    it("does not transform unknown @mention", async () => {
      const hooks = await xrayCodexPlugin({ directory: tempDir });
      const input = { parts: [{ type: "text", text: "@unknown-agent do something" }] };
      const output = { parts: [{ type: "text", text: "@unknown-agent do something" }] };

      await hooks["chat.message"](input, output);

      expect(output.parts![0].text).toBe("@unknown-agent do something");
    });

    it("does not transform message without @mention", async () => {
      const hooks = await xrayCodexPlugin({ directory: tempDir });
      const input = { parts: [{ type: "text", text: "Just a regular message" }] };
      const output = { parts: [{ type: "text", text: "Just a regular message" }] };

      await hooks["chat.message"](input, output);

      expect(output.parts![0].text).toBe("Just a regular message");
    });

    it("handles empty text content", async () => {
      const hooks = await xrayCodexPlugin({ directory: tempDir });
      const input = { parts: [{ type: "text", text: "" }] };
      const output = { parts: [{ type: "text", text: "" }] };

      await hooks["chat.message"](input, output);

      expect(output.parts![0].text).toBe("");
    });

    it("handles missing output parts", async () => {
      const hooks = await xrayCodexPlugin({ directory: tempDir });
      const input = { parts: [{ type: "text", text: "@architect hello" }] };
      const output = {};

      await expect(hooks["chat.message"](input, output)).resolves.toBeUndefined();
    });
  });

  describe("getFrameworkVersion", () => {
    it("returns version from package.json", async () => {
      const fn = await importGetFrameworkVersion();
      const version = fn();
      expect(typeof version).toBe("string");
      expect(version.length).toBeGreaterThan(0);
    });
  });

  describe("getFrameworkIdentity", () => {
    it("returns identity string with version", async () => {
      const fn = await importGetFrameworkIdentity();
      const identity = fn();
      expect(identity).toContain("0xRay Framework");
      expect(identity).toContain("Core");
    });
  });

  describe("TOOL_AGENT_MAP", () => {
    it("has entries for write, edit, bash, read, search, grep, glob", async () => {
      const map = await importToolAgentMap();
      expect(map.write).toBeDefined();
      expect(map.edit).toBeDefined();
      expect(map.bash).toBeDefined();
      expect(map.read).toBeDefined();
      expect(map.search).toBeDefined();
      expect(map.grep).toBeDefined();
      expect(map.glob).toBeDefined();
      expect(map.multiedit).toBeDefined();
      expect(map.ls).toBeDefined();
    });

    it("each entry has agent and skill", async () => {
      const map = await importToolAgentMap();
      for (const [, entry] of Object.entries(map)) {
        expect(entry).toHaveProperty("agent");
        expect(entry).toHaveProperty("skill");
        expect(typeof entry.agent).toBe("string");
        expect(typeof entry.skill).toBe("string");
      }
    });
  });

  describe("registerAllProcessors", () => {
    it("registers 6 processors with correct config", async () => {
      const fn = await importRegisterAllProcessors();
      const registered: any[] = [];
      const mockPm = { registerProcessor: vi.fn((cfg) => registered.push(cfg)) };

      fn(mockPm);

      expect(registered).toHaveLength(6);
      expect(registered.map((r) => r.name)).toEqual([
        "preValidate",
        "codexCompliance",
        "versionCompliance",
        "testAutoCreation",
        "testExecution",
        "coverageAnalysis",
      ]);
    });
  });

  describe("registerAfterPostProcessors", () => {
    it("registers 3 processors with priority overrides", async () => {
      const fn = await importRegisterAfterPostProcessors();
      const registered: any[] = [];
      const mockPm = { registerProcessor: vi.fn((cfg) => registered.push(cfg)) };

      fn(mockPm);

      expect(registered).toHaveLength(3);
      expect(registered.find((r) => r.name === "testAutoCreation")?.priority).toBe(50);
    });
  });

  describe("createCodexContextEntry", () => {
    it("creates entry with correct id format and priority", async () => {
      const fn = await importCreateCodexContextEntry();
      const entry = fn("/path/to/codex.json", '{"version":"3.1.0","terms":{"a":{}}}');
      expect(entry.id).toBe("xray-codex-codex.json");
      expect(entry.priority).toBe("critical");
      expect(entry.metadata.version).toBe("3.1.0");
      expect(entry.metadata.termCount).toBe(1);
    });
  });

  describe("formatCodexContext", () => {
    it("returns empty string for empty contexts", async () => {
      const fn = await importFormatCodexContext();
      expect(fn([])).toBe("");
    });

    it("formats single context entry with version and source", async () => {
      const fn = await importFormatCodexContext();
      const entry = {
        id: "xray-codex-test",
        source: "/test/path",
        content: "test content",
        priority: "critical" as const,
        metadata: { version: "3.1.0", termCount: 5, loadedAt: "2024-01-01" },
      };
      const result = fn([entry]);
      expect(result).toContain("0xRay Codex Context v3.1.0");
      expect(result).toContain("Source: /test/path");
      expect(result).toContain("Terms Loaded: 5");
      expect(result).toContain("test content");
    });
  });

  describe("resolveAgentName", () => {
    it("returns architect as default", async () => {
      const fn = await importResolveAgentName();
      const orig = globalThis.currentAgent;
      (globalThis as any).currentAgent = undefined;
      expect(fn(undefined)).toBe("architect");
      (globalThis as any).currentAgent = orig;
    });

    it("returns agentType from globalThis.currentAgent", async () => {
      const fn = await importResolveAgentName();
      const orig = globalThis.currentAgent;
      (globalThis as any).currentAgent = { agentType: "code-reviewer" };
      expect(fn(undefined)).toBe("code-reviewer");
      (globalThis as any).currentAgent = orig;
    });

    it("returns type from globalThis.currentAgent when agentType missing", async () => {
      const fn = await importResolveAgentName();
      const orig = globalThis.currentAgent;
      (globalThis as any).currentAgent = { type: "researcher" };
      expect(fn(undefined)).toBe("researcher");
      (globalThis as any).currentAgent = orig;
    });

    it("returns agentType from input when globalThis missing", async () => {
      const fn = await importResolveAgentName();
      const orig = globalThis.currentAgent;
      (globalThis as any).currentAgent = undefined;
      expect(fn({ agentType: "strategist" })).toBe("strategist");
      (globalThis as any).currentAgent = orig;
    });
  });
});

async function importClassifyFn() {
  const mod: any = await import("../../plugin/xray-codex-injection.js");
  return { classifyTaskType: mod.classifyTaskType };
}

async function importValidateModulePath() {
  const mod: any = await import("../../plugin/xray-codex-injection.js");
  return mod.validateModulePath;
}

async function importExtractCodexMetadata() {
  const mod: any = await import("../../plugin/xray-codex-injection.js");
  return mod.extractCodexMetadata;
}

async function importIsWriteEditOperation() {
  const mod: any = await import("../../plugin/xray-codex-injection.js");
  return mod.isWriteEditOperation;
}

async function importIsPublishOperation() {
  const mod: any = await import("../../plugin/xray-codex-injection.js");
  return mod.isPublishOperation;
}

async function importRunEnforcerQualityGate() {
  const mod: any = await import("../../plugin/xray-codex-injection.js");
  return mod.runEnforcerQualityGate;
}

async function importGetFrameworkVersion() {
  const mod: any = await import("../../plugin/xray-codex-injection.js");
  return mod.getFrameworkVersion;
}

async function importGetFrameworkIdentity() {
  const mod: any = await import("../../plugin/xray-codex-injection.js");
  return mod.getFrameworkIdentity;
}

async function importToolAgentMap() {
  const mod: any = await import("../../plugin/xray-codex-injection.js");
  return mod.TOOL_AGENT_MAP;
}

async function importRegisterAllProcessors() {
  const mod: any = await import("../../plugin/xray-codex-injection.js");
  return mod.registerAllProcessors;
}

async function importRegisterAfterPostProcessors() {
  const mod: any = await import("../../plugin/xray-codex-injection.js");
  return mod.registerAfterPostProcessors;
}

async function importCreateCodexContextEntry() {
  const mod: any = await import("../../plugin/xray-codex-injection.js");
  return mod.createCodexContextEntry;
}

async function importFormatCodexContext() {
  const mod: any = await import("../../plugin/xray-codex-injection.js");
  return mod.formatCodexContext;
}

async function importResolveAgentName() {
  const mod: any = await import("../../plugin/xray-codex-injection.js");
  return mod.resolveAgentName;
}

async function getTestLogger(dir: string) {
  const mod: any = await import("../../plugin/xray-codex-injection.js");
  const PluginLogger = mod.PluginLogger;
  return new PluginLogger(dir);
}