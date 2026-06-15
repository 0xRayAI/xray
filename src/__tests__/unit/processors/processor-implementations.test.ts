import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("fs", () => ({
  default: {
    existsSync: vi.fn().mockReturnValue(false),
    readFileSync: vi.fn().mockReturnValue("{}"),
    writeFileSync: vi.fn(),
    appendFileSync: vi.fn(),
    mkdirSync: vi.fn(),
    readdirSync: vi.fn().mockReturnValue([]),
    statSync: vi.fn().mockReturnValue({ mtime: new Date(), isFile: () => true }),
    rmSync: vi.fn(),
    mkdtempSync: vi.fn().mockReturnValue("/tmp/test-dir"),
  },
  existsSync: vi.fn().mockReturnValue(false),
  readFileSync: vi.fn().mockReturnValue("{}"),
  writeFileSync: vi.fn(),
  appendFileSync: vi.fn(),
  mkdirSync: vi.fn(),
  readdirSync: vi.fn().mockReturnValue([]),
  statSync: vi.fn().mockReturnValue({ mtime: new Date(), isFile: () => true }),
  rmSync: vi.fn(),
  mkdtempSync: vi.fn().mockReturnValue("/tmp/test-dir"),
}));

vi.mock("path", async (importOriginal) => {
  const actual = await importOriginal<typeof import("path")>();
  return {
    ...actual,
    join: vi.fn((...args: string[]) => args.join("/")),
    dirname: vi.fn((p: string) => p.split("/").slice(0, -1).join("/")),
  };
});

vi.mock("child_process", () => ({
  exec: vi.fn(),
  execSync: vi.fn().mockReturnValue(""),
  spawn: vi.fn(),
}));

vi.mock("util", () => ({
  promisify: vi.fn((fn: Function) => fn),
}));

vi.mock("../../../core/framework-logger.js", () => ({
  frameworkLogger: {
    log: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock("../../../core/features-config.js", () => ({
  featuresConfigLoader: {
    loadConfig: vi.fn().mockReturnValue({}),
  },
}));

vi.mock("../../../core/config-paths.js", () => ({
  getConfigDir: vi.fn().mockReturnValue("/tmp/config"),
  resolveConfigPath: vi.fn().mockReturnValue("/tmp/config/features.json"),
  resolveStateFilePath: vi.fn().mockReturnValue("/tmp/state.json"),
}));

vi.mock("../../../monitoring/nudge-watchdog.js", () => ({
  nudgeWatchdog: {
    getStats: vi.fn().mockReturnValue({
      thinkTags: 0,
      codeChanges: 0,
      explanations: 0,
      activePatterns: 0,
      lastNudgeAgo: 99999,
    }),
    start: vi.fn(),
    stop: vi.fn(),
    reset: vi.fn(),
  },
  recordThinkTag: vi.fn(),
  recordCodeChange: vi.fn(),
  recordToolCall: vi.fn(),
  recordFixAttempt: vi.fn(),
  recordExplanation: vi.fn(),
  getNudgeSuggestion: vi.fn().mockReturnValue("Test suggestion"),
}));

vi.mock("../../../utils/language-detector.js", () => ({
  detectProjectLanguage: vi.fn().mockReturnValue(null),
  getTestFilePath: vi.fn().mockReturnValue(""),
  buildTestCommand: vi.fn().mockReturnValue("echo test"),
}));

vi.mock("../../../enforcement/rule-enforcer.js", () => ({
  RuleEnforcer: vi.fn().mockImplementation(() => ({
    validateOperation: vi.fn().mockResolvedValue({
      passed: true,
      errors: [],
      warnings: [],
      results: [],
    }),
    attemptRuleViolationFixes: vi.fn().mockResolvedValue(undefined),
  })),
}));

vi.mock("../../../state/state-manager.js", () => ({
  XrayStateManager: vi.fn().mockImplementation(() => ({
    get: vi.fn().mockReturnValue(undefined),
    set: vi.fn(),
    clear: vi.fn(),
  })),
}));

vi.mock("../../../processors/implementations/refactoring-logging-processor.js", () => ({
  RefactoringLoggingProcessor: vi.fn().mockImplementation(function() {
    this.execute = vi.fn().mockResolvedValue({
      logged: true,
      success: true,
      message: "Agent completion logged",
    });
  }),
}));

import { PreValidateProcessor } from "../../../processors/implementations/pre-validate-processor.js";
import { CodexComplianceProcessor } from "../../../processors/implementations/codex-compliance-processor.js";
import { ErrorBoundaryProcessor } from "../../../processors/implementations/error-boundary-processor.js";
import { LogProtectionProcessor } from "../../../processors/implementations/log-protection-processor.js";
import { TestExecutionProcessor } from "../../../processors/implementations/test-execution-processor.js";
import { StorytellingTriggerProcessor } from "../../../processors/implementations/storytelling-trigger-processor.js";
import { PublishPreflightProcessor } from "../../../processors/implementations/publish-preflight-processor.js";
import { InferenceImprovementProcessor } from "../../../processors/implementations/inference-improvement-processor.js";
import { CoverageAnalysisProcessor } from "../../../processors/implementations/coverage-analysis-processor.js";
import { StateValidationProcessor } from "../../../processors/implementations/state-validation-processor.js";
import { RegressionTestingProcessor } from "../../../processors/implementations/regression-testing-processor.js";
import { NudgeProcessor } from "../../../processors/implementations/nudge-processor.js";
import { SessionSummaryProcessor } from "../../../processors/implementations/session-summary-processor.js";
import { RefactoringLoggingProcessorWrapper } from "../../../processors/implementations/refactoring-logging-processor-wrapper.js";

describe("PreValidateProcessor", () => {
  let processor: PreValidateProcessor;

  beforeEach(() => {
    processor = new PreValidateProcessor();
  });

  it("should have name='preValidate' and priority=1", () => {
    expect(processor.name).toBe("preValidate");
    expect(processor.priority).toBe(1);
  });

  it("should extend PreProcessor (type='pre')", () => {
    expect(processor.type).toBe("pre");
  });

  it("should return {validated: true, syntaxCheck: 'skipped'} when no data and no filePath", async () => {
    const result = await processor.execute({});
    expect(result.success).toBe(true);
    expect(result.data).toEqual(
      expect.objectContaining({
        validated: true,
        syntaxCheck: "skipped",
      }),
    );
  });

  it("should throw 'Potential undefined usage detected' when data contains 'undefined'", async () => {
    const result = await processor.execute({ data: "some undefined value" });
    expect(result.success).toBe(false);
    expect(result.error).toBe("Potential undefined usage detected");
  });

  it("should return {validated: true, syntaxCheck: 'passed'} for valid data", async () => {
    const result = await processor.execute({ data: "const x = 1;" });
    expect(result.success).toBe(true);
    expect(result.data).toEqual(
      expect.objectContaining({
        validated: true,
        syntaxCheck: "passed",
      }),
    );
  });

  it("should return {validated: true, syntaxCheck: 'skipped'} when only filePath is provided", async () => {
    const result = await processor.execute({ filePath: "/some/file.ts" });
    expect(result.success).toBe(true);
    expect(result.data).toEqual(
      expect.objectContaining({
        validated: true,
        syntaxCheck: "skipped",
      }),
    );
  });
});

describe("CodexComplianceProcessor", () => {
  let processor: CodexComplianceProcessor;

  beforeEach(() => {
    processor = new CodexComplianceProcessor();
  });

  it("should have name='codexCompliance' and priority=2", () => {
    expect(processor.name).toBe("codexCompliance");
    expect(processor.priority).toBe(2);
  });

  it("should extend PreProcessor (type='pre')", () => {
    expect(processor.type).toBe("pre");
  });

  it("should return compliant result with all required fields", async () => {
    const result = await processor.execute({ operation: "write" });
    expect(result.success).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(data).toHaveProperty("compliant");
    expect(data).toHaveProperty("violations");
    expect(data).toHaveProperty("warnings");
    expect(data).toHaveProperty("termsChecked");
    expect(data).toHaveProperty("operation");
    expect(data).toHaveProperty("timestamp");
  });

  it("should return {compliant: true, error: true, ...} on module load failure (graceful degradation)", async () => {
    const { RuleEnforcer } = await import("../../../enforcement/rule-enforcer.js");
    vi.mocked(RuleEnforcer).mockImplementationOnce(
      () =>
        ({
          validateOperation: vi.fn().mockRejectedValue(new Error("load failure")),
          attemptRuleViolationFixes: vi.fn(),
        }) as any,
    );

    const failingProcessor = new CodexComplianceProcessor();
    const result = await failingProcessor.execute({ operation: "write" });
    const data = result.data as Record<string, unknown>;

    expect(data.compliant).toBe(true);
    expect(data.error).toBe(true);
    expect(data.termsChecked).toBe(0);
  });

  it("should set operation from context", async () => {
    const result = await processor.execute({ operation: "commit" });
    const data = result.data as Record<string, unknown>;
    expect(data.operation).toBe("commit");
  });
});

describe("ErrorBoundaryProcessor", () => {
  let processor: ErrorBoundaryProcessor;

  beforeEach(() => {
    processor = new ErrorBoundaryProcessor();
  });

  it("should have name='errorBoundary' and priority=5", () => {
    expect(processor.name).toBe("errorBoundary");
    expect(processor.priority).toBe(5);
  });

  it("should extend PreProcessor (type='pre')", () => {
    expect(processor.type).toBe("pre");
  });

  it("should return ProcessorResult with success, data, duration, processorName", async () => {
    const result = await processor.execute({});
    expect(result).toHaveProperty("success");
    expect(result).toHaveProperty("data");
    expect(result).toHaveProperty("duration");
    expect(result).toHaveProperty("processorName");
    expect(result.processorName).toBe("errorBoundary");
    expect(typeof result.duration).toBe("number");
  });

  it("should have errorsBounded > 0 when prior results have errors", async () => {
    const result = await processor.execute({
      priorResults: [
        { success: false, error: "something went wrong", duration: 0, processorName: "test" },
      ],
    });
    const inner = (result.data as any).data as Record<string, unknown>;
    expect(inner.errorsBounded).toBeGreaterThan(0);
    expect(inner.errorsBounded).toBe(1);
  });

  it("should contain {boundaries: true/false, errorsBounded: number, errors: string[]}", async () => {
    const result = await processor.execute({});
    const inner = (result.data as any).data as Record<string, unknown>;
    expect(inner).toHaveProperty("boundaries");
    expect(inner).toHaveProperty("errorsBounded");
    expect(inner).toHaveProperty("errors");
    expect(typeof inner.boundaries).toBe("boolean");
    expect(typeof inner.errorsBounded).toBe("number");
    expect(Array.isArray(inner.errors)).toBe(true);
  });

  it("should return success=true when no prior errors exist", async () => {
    const result = await processor.execute({});
    expect(result.success).toBe(true);
    const inner = (result.data as any).data as Record<string, unknown>;
    expect(inner.errorsBounded).toBe(0);
  });

  it("should collect multiple errors from priorResults", async () => {
    const result = await processor.execute({
      priorResults: [
        { success: false, error: "error one", duration: 0, processorName: "a" },
        { success: false, error: "error two", duration: 0, processorName: "b" },
      ],
    });
    const inner = (result.data as any).data as Record<string, unknown>;
    expect(inner.errorsBounded).toBe(2);
    expect(inner.errors).toEqual(["error one", "error two"]);
  });
});

describe("LogProtectionProcessor", () => {
  let processor: LogProtectionProcessor;

  beforeEach(() => {
    processor = new LogProtectionProcessor();
  });

  it("should have name='logProtection' and priority=10", () => {
    expect(processor.name).toBe("logProtection");
    expect(processor.priority).toBe(10);
  });

  it("should extend PreProcessor (type='pre')", () => {
    expect(processor.type).toBe("pre");
  });

  it("should block deletion of routing-outcomes.json", async () => {
    const result = await processor.execute({
      operation: "delete",
      toolInput: { args: { filePath: ".opencode/state/routing-outcomes.json" } },
    });
    const data = result.data as Record<string, unknown>;
    expect(data.allowed).toBe(false);
  });

  it("should block deletion of activity.log", async () => {
    const result = await processor.execute({
      operation: "delete",
      toolInput: { args: { filePath: ".opencode/logs/activity.log" } },
    });
    const data = result.data as Record<string, unknown>;
    expect(data.allowed).toBe(false);
  });

  it("should allow deletion of archived files (framework-activity-*.log.gz)", async () => {
    const result = await processor.execute({
      operation: "delete",
      toolInput: { args: { filePath: "logs/framework/framework-activity-2026-01-01.log.gz" } },
    });
    const data = result.data as Record<string, unknown>;
    expect(data.allowed).toBe(true);
    expect(data).toHaveProperty("isArchiveCleanup", true);
  });

  it("should allow deletion of archived plugin logs (xray-plugin-*.log.gz)", async () => {
    const result = await processor.execute({
      operation: "delete",
      toolInput: { args: { filePath: ".opencode/logs/xray-plugin-2026-01-01.log.gz" } },
    });
    const data = result.data as Record<string, unknown>;
    expect(data.allowed).toBe(true);
  });

  it("should allow non-delete operations", async () => {
    const result = await processor.execute({
      operation: "write",
      toolInput: { args: { filePath: ".opencode/state/routing-outcomes.json" } },
    });
    const data = result.data as Record<string, unknown>;
    expect(data.allowed).toBe(true);
  });

  it("should return allowed=true when no file path specified", async () => {
    const result = await processor.execute({ operation: "delete" });
    const data = result.data as Record<string, unknown>;
    expect(data.allowed).toBe(true);
    expect(data).toHaveProperty("reason");
  });
});

describe("TestExecutionProcessor", () => {
  let processor: TestExecutionProcessor;

  beforeEach(() => {
    processor = new TestExecutionProcessor();
  });

  it("should have name='testExecution' and priority=10", () => {
    expect(processor.name).toBe("testExecution");
    expect(processor.priority).toBe(10);
  });

  it("should extend PreProcessor (type='pre')", () => {
    expect(processor.type).toBe("pre");
  });

  it("should return test execution result structure", async () => {
    const result = await processor.execute({ directory: "/nonexistent" });
    expect(result.success).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(data).toHaveProperty("testsExecuted");
    expect(data).toHaveProperty("passed");
    expect(data).toHaveProperty("failed");
  });

  it("should return {testsExecuted, passed, failed, exitCode, success}", async () => {
    const result = await processor.execute({ directory: "/nonexistent" });
    const data = result.data as Record<string, unknown>;
    expect(typeof data.testsExecuted).toBe("number");
    expect(typeof data.passed).toBe("number");
    expect(typeof data.failed).toBe("number");
    expect(data).toHaveProperty("exitCode");
    expect(data).toHaveProperty("success");
  });
});

describe("StorytellingTriggerProcessor", () => {
  let processor: StorytellingTriggerProcessor;

  beforeEach(() => {
    processor = new StorytellingTriggerProcessor();
  });

  it("should have name='storytelling-trigger' and priority=5", () => {
    expect(processor.name).toBe("storytelling-trigger");
    expect(processor.priority).toBe(5);
  });

  it("should extend PostProcessor (type='post')", () => {
    expect(processor.type).toBe("post");
  });

  describe("detectPatterns (via internal behavior)", () => {
    it("should detect patterns about implementations in commit diff", () => {
      const commits = [
        {
          hash: "abc1234",
          message: "add new processor",
          author: "test",
          date: "2026-01-01",
          filesChanged: 1,
          insertions: 10,
          deletions: 0,
          fileNames: ["src/processors/implementations/new-processor.ts"],
        },
      ];
      const diff = {
        totalCommits: 1,
        totalFilesChanged: 1,
        totalInsertions: 10,
        totalDeletions: 0,
        filesAdded: ["src/processors/implementations/new-processor.ts"],
        filesModified: [],
        filesDeleted: [],
        uniqueDirs: ["src/processors"],
        commitSubjects: ["add new processor"],
      };
      const patterns = (processor as any).detectPatterns(commits, diff);
      expect(patterns.length).toBeGreaterThan(0);
      expect(patterns).toEqual(
        expect.arrayContaining([
          expect.stringContaining("New processor implementations added"),
        ]),
      );
    });

    it("should detect test file additions", () => {
      const commits = [
        {
          hash: "abc1234",
          message: "add tests",
          author: "test",
          date: "2026-01-01",
          filesChanged: 1,
          insertions: 10,
          deletions: 0,
          fileNames: ["src/__tests__/unit/test.test.ts"],
        },
      ];
      const diff = {
        totalCommits: 1,
        totalFilesChanged: 1,
        totalInsertions: 10,
        totalDeletions: 0,
        filesAdded: ["src/__tests__/unit/test.test.ts"],
        filesModified: [],
        filesDeleted: [],
        uniqueDirs: ["src/__tests__/unit"],
        commitSubjects: ["add tests"],
      };
      const patterns = (processor as any).detectPatterns(commits, diff);
      expect(patterns).toEqual(
        expect.arrayContaining([
          expect.stringContaining("New test files created"),
        ]),
      );
    });

    it("should detect file deletions", () => {
      const commits = [
        {
          hash: "abc1234",
          message: "cleanup",
          author: "test",
          date: "2026-01-01",
          filesChanged: 1,
          insertions: 0,
          deletions: 5,
          fileNames: ["src/old.ts"],
        },
      ];
      const diff = {
        totalCommits: 1,
        totalFilesChanged: 1,
        totalInsertions: 0,
        totalDeletions: 5,
        filesAdded: [],
        filesModified: [],
        filesDeleted: ["src/old.ts"],
        uniqueDirs: ["src"],
        commitSubjects: ["cleanup"],
      };
      const patterns = (processor as any).detectPatterns(commits, diff);
      expect(patterns).toEqual(
        expect.arrayContaining([
          expect.stringContaining("files deleted"),
        ]),
      );
    });
  });

  describe("extractDecisions", () => {
    it("should categorize extract commits", () => {
      const commits = [
        {
          hash: "abc1234",
          message: "extract utility function",
          author: "test",
          date: "2026-01-01",
          filesChanged: 1,
          insertions: 10,
          deletions: 5,
          fileNames: ["src/utils.ts"],
        },
      ];
      const decisions = (processor as any).extractDecisions(commits);
      expect(decisions.length).toBeGreaterThan(0);
      expect(decisions[0]).toContain("Extraction:");
    });

    it("should categorize refactor commits", () => {
      const commits = [
        {
          hash: "abc1234",
          message: "refactor module structure",
          author: "test",
          date: "2026-01-01",
          filesChanged: 1,
          insertions: 10,
          deletions: 5,
          fileNames: ["src/module.ts"],
        },
      ];
      const decisions = (processor as any).extractDecisions(commits);
      expect(decisions.length).toBeGreaterThan(0);
      expect(decisions[0]).toContain("Structural change:");
    });

    it("should categorize fix commits", () => {
      const commits = [
        {
          hash: "abc1234",
          message: "fix null pointer error",
          author: "test",
          date: "2026-01-01",
          filesChanged: 1,
          insertions: 2,
          deletions: 1,
          fileNames: ["src/main.ts"],
        },
      ];
      const decisions = (processor as any).extractDecisions(commits);
      expect(decisions.length).toBeGreaterThan(0);
      expect(decisions[0]).toContain("Fix:");
    });

    it("should categorize removal commits", () => {
      const commits = [
        {
          hash: "abc1234",
          message: "remove deprecated API",
          author: "test",
          date: "2026-01-01",
          filesChanged: 1,
          insertions: 0,
          deletions: 10,
          fileNames: ["src/api.ts"],
        },
      ];
      const decisions = (processor as any).extractDecisions(commits);
      expect(decisions.length).toBeGreaterThan(0);
      expect(decisions[0]).toContain("Removal:");
    });

    it("should categorize transition commits (containing arrow)", () => {
      const commits = [
        {
          hash: "abc1234",
          message: "migrate config → new format",
          author: "test",
          date: "2026-01-01",
          filesChanged: 1,
          insertions: 5,
          deletions: 5,
          fileNames: ["src/config.ts"],
        },
      ];
      const decisions = (processor as any).extractDecisions(commits);
      expect(decisions.length).toBeGreaterThan(0);
      expect(decisions[0]).toContain("Transition:");
    });

    it("should return empty array for commits without matching keywords", () => {
      const commits = [
        {
          hash: "abc1234",
          message: "update documentation",
          author: "test",
          date: "2026-01-01",
          filesChanged: 1,
          insertions: 5,
          deletions: 2,
          fileNames: ["README.md"],
        },
      ];
      const decisions = (processor as any).extractDecisions(commits);
      expect(decisions).toEqual([]);
    });
  });

  describe("suggestStoryType", () => {
    it("should return 'saga' when isPublishing is true", () => {
      expect(
        StorytellingTriggerProcessor.suggestStoryType({ isPublishing: true }),
      ).toBe("saga");
    });

    it("should return 'journey' when fileCount > 15", () => {
      expect(
        StorytellingTriggerProcessor.suggestStoryType({ fileCount: 20 }),
      ).toBe("journey");
    });

    it("should return 'reflection' when commitCount > 10", () => {
      expect(
        StorytellingTriggerProcessor.suggestStoryType({ commitCount: 15 }),
      ).toBe("reflection");
    });

    it("should return 'reflection' as default", () => {
      expect(
        StorytellingTriggerProcessor.suggestStoryType({}),
      ).toBe("reflection");
    });
  });

  describe("getStoryTypeMeta", () => {
    it("should return meta for 'reflection'", () => {
      const meta = StorytellingTriggerProcessor.getStoryTypeMeta("reflection");
      expect(meta).toHaveProperty("location", "docs/reflections/");
      expect(meta).toHaveProperty("minWords", 2000);
      expect(meta).toHaveProperty("idealWords", 5000);
    });

    it("should return meta for 'saga'", () => {
      const meta = StorytellingTriggerProcessor.getStoryTypeMeta("saga");
      expect(meta).toHaveProperty("location", "docs/reflections/deep/");
      expect(meta).toHaveProperty("minWords", 5000);
      expect(meta).toHaveProperty("idealWords", 15000);
    });

    it("should return meta for 'journey'", () => {
      const meta = StorytellingTriggerProcessor.getStoryTypeMeta("journey");
      expect(meta).toHaveProperty("location", "docs/reflections/deep/");
      expect(meta).toHaveProperty("minWords", 1500);
      expect(meta).toHaveProperty("idealWords", 4000);
    });

    it("should return meta for 'narrative'", () => {
      const meta = StorytellingTriggerProcessor.getStoryTypeMeta("narrative");
      expect(meta).toHaveProperty("location", "docs/reflections/");
      expect(meta).toHaveProperty("minWords", 1000);
      expect(meta).toHaveProperty("idealWords", 3000);
    });

    it("should return reflection meta for unknown types", () => {
      const meta = StorytellingTriggerProcessor.getStoryTypeMeta("unknown");
      expect(meta).toEqual(
        StorytellingTriggerProcessor.getStoryTypeMeta("reflection"),
      );
    });
  });

  it("should return message about disabled triggers when config is null", async () => {
    const result = await processor.execute({ operation: "commit" });
    const data = result.data as Record<string, unknown>;
    expect(data).toHaveProperty("message");
    expect(data).toHaveProperty("triggers");
    expect(Array.isArray(data.triggers)).toBe(true);
  });
});

describe("PublishPreflightProcessor", () => {
  let processor: PublishPreflightProcessor;

  beforeEach(() => {
    processor = new PublishPreflightProcessor();
  });

  it("should have name='publishPreflight' and priority=10", () => {
    expect(processor.name).toBe("publishPreflight");
    expect(processor.priority).toBe(10);
  });

  it("should extend PostProcessor (type='post')", () => {
    expect(processor.type).toBe("post");
  });

  it("should return ProcessorResult with PreflightResult data", async () => {
    const result = await processor.execute({ operation: "publish" });
    expect(result).toHaveProperty("success");
    expect(result).toHaveProperty("data");
    expect(result).toHaveProperty("duration");
    expect(result).toHaveProperty("processorName");
    expect(result.processorName).toBe("publishPreflight");
  });

  it("should include {compliant, checks, summary, checkedAt} in data", async () => {
    const result = await processor.execute({ operation: "publish" });
    const data = result.data as Record<string, unknown>;
    expect(data).toHaveProperty("compliant");
    expect(data).toHaveProperty("checks");
    expect(data).toHaveProperty("summary");
    expect(data).toHaveProperty("checkedAt");
  });

  it("should check README.md existence", async () => {
    const result = await processor.execute({ operation: "publish" });
    const data = result.data as Record<string, unknown>;
    const checks = data.checks as Array<Record<string, unknown>>;
    const readmeCheck = checks.find((c) => c.name === "README.md exists");
    expect(readmeCheck).toBeDefined();
    expect(readmeCheck).toHaveProperty("passed");
    expect(readmeCheck).toHaveProperty("required", true);
  });

  it("should check AGENTS.md existence", async () => {
    const result = await processor.execute({ operation: "publish" });
    const data = result.data as Record<string, unknown>;
    const checks = data.checks as Array<Record<string, unknown>>;
    const agentsCheck = checks.find((c) => c.name === "AGENTS.md exists");
    expect(agentsCheck).toBeDefined();
    expect(agentsCheck).toHaveProperty("passed");
    expect(agentsCheck).toHaveProperty("required", true);
  });

  it("should check CHANGELOG.md existence", async () => {
    const result = await processor.execute({ operation: "publish" });
    const data = result.data as Record<string, unknown>;
    const checks = data.checks as Array<Record<string, unknown>>;
    const changelogCheck = checks.find((c) => c.name === "CHANGELOG.md exists");
    expect(changelogCheck).toBeDefined();
    expect(changelogCheck).toHaveProperty("passed");
    expect(changelogCheck).toHaveProperty("required", true);
  });
});

describe("InferenceImprovementProcessor", () => {
  let processor: InferenceImprovementProcessor;

  beforeEach(() => {
    processor = new InferenceImprovementProcessor();
  });

  it("should have name='inferenceImprovement' and priority=5", () => {
    expect(processor.name).toBe("inferenceImprovement");
    expect(processor.priority).toBe(5);
  });

  it("should extend PostProcessor (type='post')", () => {
    expect(processor.type).toBe("post");
  });

  it("should return {success, workflowTriggered, context} on success", async () => {
    const result = await processor.execute({ operation: "commit" });
    expect(result.success).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(data).toHaveProperty("success", true);
    expect(data).toHaveProperty("workflowTriggered", true);
    expect(data).toHaveProperty("context");
  });

  it("should prepare workflow context with reflections, logs, reports", async () => {
    const workflowContext = await (processor as any).prepareWorkflowContext(process.cwd());
    expect(workflowContext).toHaveProperty("dataLocations");
    expect(workflowContext.dataLocations).toHaveProperty("reflections");
    expect(workflowContext.dataLocations).toHaveProperty("logs");
    expect(workflowContext.dataLocations).toHaveProperty("reports");
    expect(Array.isArray(workflowContext.dataLocations.reflections)).toBe(true);
    expect(Array.isArray(workflowContext.dataLocations.logs)).toBe(true);
    expect(Array.isArray(workflowContext.dataLocations.reports)).toBe(true);
  });

  it("should include timestamp and workflow in context", async () => {
    const workflowContext = await (processor as any).prepareWorkflowContext(process.cwd());
    expect(workflowContext).toHaveProperty("timestamp");
    expect(workflowContext).toHaveProperty("workflow");
    expect(workflowContext.workflow).toHaveProperty("phase", "pending");
    expect(workflowContext.workflow).toHaveProperty("triggered", false);
  });
});

describe("CoverageAnalysisProcessor", () => {
  let processor: CoverageAnalysisProcessor;

  beforeEach(() => {
    processor = new CoverageAnalysisProcessor();
  });

  it("should have name='coverageAnalysis' and priority=45", () => {
    expect(processor.name).toBe("coverageAnalysis");
    expect(processor.priority).toBe(45);
  });

  it("should extend PostProcessor (type='post')", () => {
    expect(processor.type).toBe("post");
  });

  it("should return {success: true, message: 'no file path specified'} when no file", async () => {
    const result = await processor.execute({});
    expect(result.success).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(data.message).toBe("no file path specified");
  });

  it("should return coverage percentage and message when file path provided", async () => {
    const fs = await import("fs");
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue("line1\nline2\nline3\n");

    const result = await processor.execute({ filePath: "/some/test-file.ts" });
    expect(result.success).toBe(true);
    const inner = (result.data as any).data as Record<string, unknown>;
    expect(inner).toHaveProperty("coverage");
    expect(inner).toHaveProperty("message");
    expect(typeof inner.coverage).toBe("number");
  });

  it("should report low coverage message for files without test files", async () => {
    const fs = await import("fs");
    vi.mocked(fs.existsSync).mockReturnValue(false);

    const result = await processor.execute({ filePath: "/some/orphan.ts" });
    expect(result.success).toBe(true);
    const inner = (result.data as any).data as Record<string, unknown>;
    expect(inner.coverage).toBe(0);
  });
});

describe("StateValidationProcessor", () => {
  let processor: StateValidationProcessor;
  let mockStateManager: any;

  beforeEach(() => {
    mockStateManager = {
      get: vi.fn().mockReturnValue(undefined),
      set: vi.fn(),
      clear: vi.fn(),
    };
    processor = new StateValidationProcessor(mockStateManager);
  });

  it("should have name='stateValidation' and priority=12", () => {
    expect(processor.name).toBe("stateValidation");
    expect(processor.priority).toBe(12);
  });

  it("should extend PostProcessor (type='post')", () => {
    expect(processor.type).toBe("post");
  });

  it("should return {stateValid: false} when no active session", async () => {
    mockStateManager.get.mockReturnValue(undefined);
    const result = await processor.execute({});
    expect(result.success).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(data.stateValid).toBe(false);
  });

  it("should return {stateValid: true} when active session exists", async () => {
    mockStateManager.get.mockReturnValue({ id: "session-1" });
    const result = await processor.execute({});
    expect(result.success).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(data.stateValid).toBe(true);
  });

  it("should call stateManager.get with 'session:active'", async () => {
    await processor.execute({});
    expect(mockStateManager.get).toHaveBeenCalledWith("session:active");
  });
});

describe("RegressionTestingProcessor", () => {
  let processor: RegressionTestingProcessor;

  beforeEach(() => {
    processor = new RegressionTestingProcessor();
  });

  it("should have name='regressionTesting' and priority=15", () => {
    expect(processor.name).toBe("regressionTesting");
    expect(processor.priority).toBe(15);
  });

  it("should extend PostProcessor (type='post')", () => {
    expect(processor.type).toBe("post");
  });

  it("should return {regressions, issues, baseline, current} structure", async () => {
    const result = await processor.execute({});
    expect(result.success).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(data).toHaveProperty("regressions");
    expect(data).toHaveProperty("issues");
    expect(data).toHaveProperty("baseline");
    expect(data).toHaveProperty("current");
    expect(typeof data.regressions).toBe("number");
    expect(Array.isArray(data.issues)).toBe(true);
  });

  it("should return regressions=0 and empty baseline when no test-count.json exists", async () => {
    const result = await processor.execute({});
    const data = result.data as Record<string, unknown>;
    expect(data.regressions).toBe(0);
    expect(data.issues).toEqual([]);
    expect(data.baseline).toBeNull();
  });

  it("should detect >10% test count drop as regression", async () => {
    const fs = await import("fs");
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue(
      JSON.stringify({ totalTests: 100 }),
    );

    const processorInstance = new RegressionTestingProcessor();

    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync)
      .mockReturnValueOnce(JSON.stringify({ totalTests: 100 }))
      .mockReturnValueOnce(JSON.stringify({ totalTests: 85 }));

    const result = await processorInstance.execute({});
    const data = result.data as Record<string, unknown>;
    expect(data.regressions).toBe(1);
    expect(data.issues.length).toBeGreaterThan(0);
    expect(data.issues[0]).toEqual(
      expect.objectContaining({
        type: "new_failure",
      }),
    );
  });
});

describe("NudgeProcessor", () => {
  let processor: NudgeProcessor;

  beforeEach(() => {
    processor = new NudgeProcessor();
  });

  it("should have name='nudge' and priority=100", () => {
    expect(processor.name).toBe("nudge");
    expect(processor.priority).toBe(100);
  });

  it("should extend PostProcessor (type='post')", () => {
    expect(processor.type).toBe("post");
  });

  it("should return {success, nudgeDetected, stats} when no patterns active", async () => {
    const result = await processor.execute({ operation: "commit" });
    expect(result.success).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(data).toHaveProperty("nudgeDetected", false);
    expect(data).toHaveProperty("stats");
  });

  it("should return {success, nudgeDetected: true, pattern, suggestion} when patterns active", async () => {
    const { nudgeWatchdog } = await import("../../../monitoring/nudge-watchdog.js");
    vi.mocked(nudgeWatchdog.getStats).mockReturnValueOnce({
      thinkTags: 5,
      codeChanges: 0,
      explanations: 0,
      activePatterns: 3,
      lastNudgeAgo: 99999,
    });

    const activeProcessor = new NudgeProcessor();
    const result = await activeProcessor.execute({ operation: "commit" });
    expect(result.success).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(data).toHaveProperty("nudgeDetected", true);
    expect(data).toHaveProperty("pattern");
    expect(data).toHaveProperty("suggestion");
  });

  it("should record tool calls from toolInput", async () => {
    const { recordToolCall } = await import("../../../monitoring/nudge-watchdog.js");
    await processor.execute({
      operation: "commit",
      toolInput: { tool: "edit", args: { filePath: "test.ts" } },
    });
    expect(recordToolCall).toHaveBeenCalledWith("edit", expect.any(String));
  });

  it("should record code changes for edit/write tools", async () => {
    const { recordCodeChange } = await import("../../../monitoring/nudge-watchdog.js");
    await processor.execute({ tool: "edit", operation: "edit" });
    expect(recordCodeChange).toHaveBeenCalled();
  });
});

describe("SessionSummaryProcessor", () => {
  let processor: SessionSummaryProcessor;

  beforeEach(() => {
    processor = new SessionSummaryProcessor();
  });

  it("should have name='sessionSummary' and priority=15", () => {
    expect(processor.name).toBe("sessionSummary");
    expect(processor.priority).toBe(15);
  });

  it("should extend PostProcessor (type='post')", () => {
    expect(processor.type).toBe("post");
  });

  it("should return {summaryGenerated: false} for normal operations", async () => {
    const result = await processor.execute({ operation: "unknown", success: true });
    expect(result.success).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(data.summaryGenerated).toBe(false);
  });

  it("should track operations and increment operation count", async () => {
    await processor.execute({ operation: "write" });
    await processor.execute({ operation: "edit" });
    await processor.execute({ operation: "read" });
    await processor.execute({ operation: "test" });

    const result = await processor.execute({ operation: "commit" });
    const data = result.data as Record<string, unknown>;
    expect(data).toHaveProperty("summaryGenerated");
  });

  it("should generate summary on 5th operation", async () => {
    await processor.execute({ operation: "op1" });
    await processor.execute({ operation: "op2" });
    await processor.execute({ operation: "op3" });
    await processor.execute({ operation: "op4" });
    const result = await processor.execute({ operation: "op5" });
    const data = result.data as Record<string, unknown>;
    expect(data.summaryGenerated).toBe(true);
    expect(data).toHaveProperty("summary");
  });

  it("should track tool calls", async () => {
    await processor.execute({ operation: "edit" });
    await processor.execute({ operation: "edit" });
    const toolCalls = (processor as any).toolCalls as Map<string, number>;
    expect(toolCalls.get("edit")).toBe(2);
  });

  it("should track agent activities when agentName is provided", async () => {
    await processor.execute({ operation: "test", agentName: "@architect" });
    const agentActivities = (processor as any).agentActivities as Map<string, number>;
    expect(agentActivities.get("@architect")).toBe(1);
  });
});

describe("RefactoringLoggingProcessorWrapper", () => {
  let processor: RefactoringLoggingProcessorWrapper;

  beforeEach(() => {
    processor = new RefactoringLoggingProcessorWrapper();
  });

  it("should have name='refactoringLogging' and priority=8", () => {
    expect(processor.name).toBe("refactoringLogging");
    expect(processor.priority).toBe(8);
  });

  it("should extend PreProcessor (type='pre')", () => {
    expect(processor.type).toBe("pre");
  });

  it("should delegate execute() to wrapped processor for agent task contexts", async () => {
    const result = await processor.execute({
      agentName: "@refactorer",
      task: { description: "refactor module" },
      startTime: Date.now() - 5000,
    });
    expect(result.success).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(data.logged).toBe(true);
  });

  it("should return {logged: false, success: true} for non-agent contexts", async () => {
    const result = await processor.execute({ operation: "write" });
    expect(result.success).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(data.logged).toBe(false);
    expect(data.message).toBe("Not an agent task completion context");
  });

  it("should handle errors from wrapped processor gracefully", async () => {
    const { RefactoringLoggingProcessor } = await import("../../../processors/implementations/refactoring-logging-processor.js");
    vi.mocked(RefactoringLoggingProcessor).mockImplementationOnce(
      function() {
        this.execute = vi.fn().mockRejectedValue(new Error("wrapped failure"));
      } as any,
    );

    const failingProcessor = new RefactoringLoggingProcessorWrapper();
    const result = await failingProcessor.execute({
      agentName: "@refactorer",
      task: { description: "refactor module" },
      startTime: Date.now(),
    } as any);
    expect(result.success).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(data.logged).toBe(false);
    expect(data.success).toBe(false);
  });
});
