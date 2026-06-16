import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../governance/governance-service.js", () => ({
  getGovernanceService: vi.fn(),
}));

vi.mock("../../governance/codex-policy.service.js", () => ({
  getCodexPolicyService: vi.fn(),
}));

vi.mock("../../integrations/governance/index.js", () => ({
  initializeGovernanceIntegration: vi.fn(),
  shutdownGovernanceIntegration: vi.fn(),
}));

vi.mock("../../core/features-config.js", () => ({
  featuresConfigLoader: {
    loadConfig: vi.fn(() => ({})),
  },
}));

vi.mock("../../core/framework-logger.js", () => ({
  frameworkLogger: { log: vi.fn() },
}));

vi.mock("../mcp-client.js", () => ({
  mcpClientManager: { callServerTool: vi.fn() },
}));

import { GovernanceServer } from "../../mcps/governance.server.js";
import { getGovernanceService } from "../../governance/governance-service.js";
import { getCodexPolicyService } from "../../governance/codex-policy.service.js";
import { initializeGovernanceIntegration } from "../../integrations/governance/index.js";
import { featuresConfigLoader } from "../../core/features-config.js";
import { frameworkLogger } from "../../core/framework-logger.js";

describe("GovernanceServer", () => {
  let server: InstanceType<typeof GovernanceServer>;

  beforeEach(() => {
    vi.clearAllMocks();
    server = new GovernanceServer();
  });

  describe("constructor", () => {
    it("registers 3 tools", () => {
      expect(server.tools).toHaveLength(3);
      const names = server.tools.map((t: any) => t.name);
      expect(names).toContain("govern_proposals");
      expect(names).toContain("govern_reflection");
      expect(names).toContain("get_active_codex");
    });

    it("registers 3 handlers matching tool names", () => {
      expect(Object.keys(server.handlers)).toHaveLength(3);
      expect(server.handlers).toHaveProperty("govern_proposals");
      expect(server.handlers).toHaveProperty("govern_reflection");
      expect(server.handlers).toHaveProperty("get_active_codex");
    });
  });

  describe("validateGovernProposalsArgs", () => {
    it("rejects null input", () => {
      expect(() => (server as any).validateGovernProposalsArgs(null)).toThrow(
        "govern_proposals requires an object argument",
      );
    });

    it("rejects non-object input", () => {
      expect(() => (server as any).validateGovernProposalsArgs("string")).toThrow(
        "govern_proposals requires an object argument",
      );
    });

    it("rejects missing proposals array", () => {
      expect(() => (server as any).validateGovernProposalsArgs({})).toThrow(
        'govern_proposals requires a "proposals" array',
      );
    });

    it("rejects non-array proposals", () => {
      expect(() => (server as any).validateGovernProposalsArgs({ proposals: "bad" })).toThrow(
        'govern_proposals requires a "proposals" array',
      );
    });

    it("rejects proposal with invalid type enum", () => {
      expect(() =>
        (server as any).validateGovernProposalsArgs({
          proposals: [{ type: "invalid", title: "Test", description: "Desc" }],
        }),
      ).toThrow("must be one of: fix, refactor, guard, automate, codify, strategic, compliance");
    });

    it("rejects proposal with missing title", () => {
      expect(() =>
        (server as any).validateGovernProposalsArgs({
          proposals: [{ type: "fix", description: "Desc" }],
        }),
      ).toThrow("title must be a string");
    });

    it("rejects proposal with missing description", () => {
      expect(() =>
        (server as any).validateGovernProposalsArgs({
          proposals: [{ type: "fix", title: "Test" }],
        }),
      ).toThrow("description must be a string");
    });

    it("accepts valid proposals array", () => {
      const result = (server as any).validateGovernProposalsArgs({
        proposals: [{ type: "fix", title: "Fix bug", description: "Fix the bug" }],
      });
      expect(result.proposals).toHaveLength(1);
      expect(result.proposals[0].type).toBe("fix");
    });

    it("accepts compliance type", () => {
      const result = (server as any).validateGovernProposalsArgs({
        proposals: [{ type: "compliance", title: "AML check", description: "Add AML" }],
      });
      expect(result.proposals[0].type).toBe("compliance");
    });

    it("accepts all valid type values", () => {
      const validTypes = ["fix", "refactor", "guard", "automate", "codify", "strategic", "compliance"];
      const result = (server as any).validateGovernProposalsArgs({
        proposals: validTypes.map((t) => ({ type: t, title: `${t} item`, description: `Desc for ${t}` })),
      });
      expect(result.proposals).toHaveLength(7);
    });
  });

  describe("validateGovernReflectionArgs", () => {
    it("rejects null input", () => {
      expect(() => (server as any).validateGovernReflectionArgs(null)).toThrow(
        "govern_reflection requires an object argument",
      );
    });

    it("accepts object with reflectionPath", () => {
      const result = (server as any).validateGovernReflectionArgs({ reflectionPath: "/tmp/test.md" });
      expect(result.reflectionPath).toBe("/tmp/test.md");
    });

    it("accepts object with reflectionContent", () => {
      const result = (server as any).validateGovernReflectionArgs({ reflectionContent: "## Test" });
      expect(result.reflectionContent).toBe("## Test");
    });
  });

  describe("parseCodexTermsFromReflection", () => {
    it("returns empty array when no Codex Term Proposals section", () => {
      const result = (server as any).parseCodexTermsFromReflection("# No relevant section\nJust text");
      expect(result).toEqual([]);
    });

    it("parses a single codex term", () => {
      const content = `## Codex Term Proposals

### No Console Statements
**Category**: anti-pattern
**Severity**: blocking
**Detection Rule**: "console\\.log|console\\.warn"
**Implementation Target**: All production code

## Implementation Priority Matrix
| Priority | Term |
|----------|------|
| P0 | No Console Statements |`;

      const result = (server as any).parseCodexTermsFromReflection(content);
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe("No Console Statements");
      expect(result[0].type).toBe("guard");
      expect(result[0].confidence).toBe(0.95);
      expect(result[0].description).toBe('console\\.log|console\\.warn');
    });

    it("parses multiple codex terms", () => {
      const content = `## Codex Term Proposals

### Resolve All Errors
**Category**: aspirational
**Severity**: high
**Detection Rule**: "TODO|FIXME|XXX"
**Implementation Target**: All code paths

### Type Safety First
**Category**: anti-pattern
**Severity**: blocking
**Detection Rule**: ": any|as any"
**Implementation Target**: Type system

### Automated Testing
**Category**: process
**Severity**: medium
**Detection Rule**: "describe\\(|test\\("
**Implementation Target**: Test files

## Implementation Priority Matrix
| Priority | Term |
|----------|------|
| P0 | Resolve All Errors |`;

      const result = (server as any).parseCodexTermsFromReflection(content);
      expect(result).toHaveLength(3);
      expect(result[0].type).toBe("codify");
      expect(result[0].confidence).toBe(0.85);
      expect(result[1].type).toBe("guard");
      expect(result[1].confidence).toBe(0.95);
      expect(result[2].type).toBe("automate");
      expect(result[2].confidence).toBe(0.7);
    });

    it("maps design category to refactor type", () => {
      const content = `## Codex Term Proposals

### Clean Architecture
**Category**: design
**Severity**: low
**Detection Rule**: "circular dependency"
**Implementation Target**: Module structure

## Implementation Priority Matrix`;

      const result = (server as any).parseCodexTermsFromReflection(content);
      expect(result[0].type).toBe("refactor");
      expect(result[0].confidence).toBe(0.5);
    });

    it("defaults to codify when category is unknown", () => {
      const content = `## Codex Term Proposals

### Some Term
**Category**: unknown
**Severity**: medium

## Implementation Priority Matrix`;

      const result = (server as any).parseCodexTermsFromReflection(content);
      expect(result[0].type).toBe("codify");
    });

    it("defaults severity to medium when missing", () => {
      const content = `## Codex Term Proposals

### Test Term
**Category**: aspirational

## Implementation Priority Matrix`;

      const result = (server as any).parseCodexTermsFromReflection(content);
      expect(result[0].confidence).toBe(0.7);
    });

    it("uses default description when no Detection Rule match", () => {
      const content = `## Codex Term Proposals

### My Term
**Category**: aspirational
**Severity**: high

## Implementation Priority Matrix`;

      const result = (server as any).parseCodexTermsFromReflection(content);
      expect(result[0].description).toBe("Implement My Term");
    });

    it("uses default Target when no Implementation Target match", () => {
      const content = `## Codex Term Proposals

### Term
**Category**: process
**Severity**: medium

## Implementation Priority Matrix`;

      const result = (server as any).parseCodexTermsFromReflection(content);
      expect(result[0].evidence).toContain("Target: TBD");
    });

    it("handles content without Implementation Priority Matrix section", () => {
      const content = `## Codex Term Proposals

### End Term
**Category**: anti-pattern
**Severity**: blocking
**Detection Rule**: "end-of-file"`;

      const result = (server as any).parseCodexTermsFromReflection(content);
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe("End Term");
    });
  });

  describe("handleGovernProposals", () => {
    it("delegates to GovernanceService and returns JSON result", async () => {
      const mockGovern = vi.fn().mockResolvedValue({
        summary: "Governed 2 proposals",
        results: [{ id: "prop-1", decision: "approve" }],
      });
      (getGovernanceService as any).mockReturnValue({ govern: mockGovern });

      const result = await (server as any).handleGovernProposals({
        proposals: [{ type: "fix", title: "Fix bug", description: "Fix the bug" }],
      });

      expect(mockGovern).toHaveBeenCalledTimes(1);
      expect(mockGovern.mock.calls[0][0].proposals).toHaveLength(1);
      expect(mockGovern.mock.calls[0][0].proposals[0].type).toBe("fix");
      expect(mockGovern.mock.calls[0][0].proposals[0].source).toBe("manual");
      expect(mockGovern.mock.calls[0][0].options.requireExternalDynamo).toBe(true);

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.summary).toBe("Governed 2 proposals");
    });

    it("generates proposal IDs when missing", async () => {
      const mockGovern = vi.fn().mockResolvedValue({ summary: "ok", results: [] });
      (getGovernanceService as any).mockReturnValue({ govern: mockGovern });

      await (server as any).handleGovernProposals({
        proposals: [{ type: "fix", title: "Fix", description: "Fix" }],
      });

      const request = mockGovern.mock.calls[0][0];
      expect(request.proposals[0].id).toMatch(/^prop-\d+-0$/);
    });

    it("defaults requireExternalDynamo to true", async () => {
      const mockGovern = vi.fn().mockResolvedValue({ summary: "ok", results: [] });
      (getGovernanceService as any).mockReturnValue({ govern: mockGovern });

      await (server as any).handleGovernProposals({
        proposals: [{ type: "fix", title: "Test", description: "Desc" }],
      });

      expect(mockGovern.mock.calls[0][0].options.requireExternalDynamo).toBe(true);
    });

    it("sets requireExternalDynamo to false when explicitly set", async () => {
      const mockGovern = vi.fn().mockResolvedValue({ summary: "ok", results: [] });
      (getGovernanceService as any).mockReturnValue({ govern: mockGovern });

      await (server as any).handleGovernProposals({
        proposals: [{ type: "fix", title: "Test", description: "Desc" }],
        options: { require_external: false },
      });

      expect(mockGovern.mock.calls[0][0].options.requireExternalDynamo).toBe(false);
    });

    it("preserves existing proposal IDs", async () => {
      const mockGovern = vi.fn().mockResolvedValue({ summary: "ok", results: [] });
      (getGovernanceService as any).mockReturnValue({ govern: mockGovern });

      await (server as any).handleGovernProposals({
        proposals: [{ id: "custom-id", type: "fix", title: "Test", description: "Desc" }],
      });

      expect(mockGovern.mock.calls[0][0].proposals[0].id).toBe("custom-id");
    });

    it("defaults evidence to empty array and confidence to 0.8", async () => {
      const mockGovern = vi.fn().mockResolvedValue({ summary: "ok", results: [] });
      (getGovernanceService as any).mockReturnValue({ govern: mockGovern });

      await (server as any).handleGovernProposals({
        proposals: [{ type: "fix", title: "Test", description: "Desc" }],
      });

      const p = mockGovern.mock.calls[0][0].proposals[0];
      expect(p.evidence).toEqual([]);
      expect(p.confidence).toBe(0.8);
    });
  });

  describe("handleGovernReflection", () => {
    it("throws when neither reflectionPath nor reflectionContent provided", async () => {
      await expect(
        (server as any).handleGovernReflection({}),
      ).rejects.toThrow("Either reflectionPath or reflectionContent must be provided");
    });

    it("throws when reflectionPath points to non-existent file", async () => {
      await expect(
        (server as any).handleGovernReflection({ reflectionPath: "/nonexistent/file.md" }),
      ).rejects.toThrow("Reflection file not found: /nonexistent/file.md");
    });

    it("returns message when no codex terms found in content", async () => {
      const result = await (server as any).handleGovernReflection({
        reflectionContent: "# Just a regular doc\nNo proposals here.",
      });

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.message).toBe("No codex term proposals found in reflection.");
      expect(parsed.proposals).toEqual([]);
    });

    it("delegates extracted proposals to handleGovernProposals", async () => {
      const mockGovern = vi.fn().mockResolvedValue({
        summary: "Governed 1 proposal",
        results: [{ id: "ref-1", decision: "approve" }],
      });
      (getGovernanceService as any).mockReturnValue({ govern: mockGovern });

      const content = `## Codex Term Proposals

### No Console
**Category**: anti-pattern
**Severity**: blocking
**Detection Rule**: "console\\.log"
**Implementation Target**: All code

## Implementation Priority Matrix`;

      const result = await (server as any).handleGovernReflection({
        reflectionContent: content,
      });

      expect(mockGovern).toHaveBeenCalledTimes(1);
      const request = mockGovern.mock.calls[0][0];
      expect(request.proposals).toHaveLength(1);
      expect(request.proposals[0].type).toBe("guard");
      expect(request.context.source).toBe("reflection");

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.summary).toBe("Governed 1 proposal");
    });
  });

  describe("handleGetActiveCodex", () => {
    it("delegates to getCodexPolicyService and returns snapshot", async () => {
      const mockGetCurrentCodex = vi.fn().mockResolvedValue({
        version: "3.1.0",
        totalTerms: 60,
        source: ".xray/codex.json",
      });
      (getCodexPolicyService as any).mockReturnValue({ getCurrentCodex: mockGetCurrentCodex });

      const result = await (server as any).handleGetActiveCodex({ includeRaw: false });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.version).toBe("3.1.0");
      expect(parsed.totalTerms).toBe(60);
    });

    it("passes includeRaw=true when specified", async () => {
      const mockGetCurrentCodex = vi.fn().mockResolvedValue({
        version: "3.1.0",
        totalTerms: 60,
        raw: { terms: [] },
      });
      (getCodexPolicyService as any).mockReturnValue({ getCurrentCodex: mockGetCurrentCodex });

      await (server as any).handleGetActiveCodex({ includeRaw: true });
      expect(mockGetCurrentCodex).toHaveBeenCalledWith(true);
    });

    it("defaults includeRaw to false", async () => {
      const mockGetCurrentCodex = vi.fn().mockResolvedValue({ version: "3.1.0" });
      (getCodexPolicyService as any).mockReturnValue({ getCurrentCodex: mockGetCurrentCodex });

      await (server as any).handleGetActiveCodex({});
      expect(mockGetCurrentCodex).toHaveBeenCalledWith(false);
    });
  });

  describe("setupToolHandlers error handling", () => {
    it("handlers map has all tool names", () => {
      expect(Object.keys(server.handlers)).toHaveLength(3);
      expect(typeof server.handlers["govern_proposals"]).toBe("function");
      expect(typeof server.handlers["govern_reflection"]).toBe("function");
      expect(typeof server.handlers["get_active_codex"]).toBe("function");
    });
  });

  describe("initializeGovernance", () => {
    it("initializes governance when enabled in config", async () => {
      (featuresConfigLoader.loadConfig as any).mockReturnValue({
        inference_governance: { enabled: true },
      });

      await (server as any).initializeGovernance();

      expect(initializeGovernanceIntegration).toHaveBeenCalledTimes(1);
    });

    it("skips initialization when governance disabled in config", async () => {
      (featuresConfigLoader.loadConfig as any).mockReturnValue({
        inference_governance: { enabled: false },
      });

      await (server as any).initializeGovernance();

      expect(initializeGovernanceIntegration).toHaveBeenCalledTimes(0);
    });

    it("catches and logs errors during initialization", async () => {
      (featuresConfigLoader.loadConfig as any).mockImplementation(() => {
        throw new Error("config load failed");
      });

      await expect((server as any).initializeGovernance()).resolves.toBeUndefined();
      expect(frameworkLogger.log).toHaveBeenCalledWith(
        "governance-server",
        expect.stringContaining("error"),
        "error",
        expect.any(Object),
      );
    });
  });
});