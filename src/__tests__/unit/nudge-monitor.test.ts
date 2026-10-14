/**
 * Nudge Monitor Unit Tests
 *
 */

import { describe, test, it, expect, vi } from "vitest";
import {
  recordThinkTag,
  recordCodeChange,
  recordToolCall,
  recordFixAttempt,
  recordExplanation,
  getNudgeSuggestion,
  getNudgeMonitor,
  recordProcessorFix,
} from "../../monitoring/nudge-monitor.js";
import {
  NudgeProcessor,
  nudgeProcessor,
  executeNudgeProcessor,
} from "../../processors/implementations/nudge-processor.js";

describe("NudgeMonitor exports", () => {
  test("should export helper functions", () => {
    expect(typeof recordThinkTag).toBe("function");
    expect(typeof recordCodeChange).toBe("function");
    expect(typeof recordToolCall).toBe("function");
    expect(typeof recordFixAttempt).toBe("function");
    expect(typeof recordExplanation).toBe("function");
    expect(typeof getNudgeSuggestion).toBe("function");
    expect(typeof getNudgeMonitor).toBe("function");
    expect(typeof recordProcessorFix).toBe("function");
  });

  test("should export nudgeMonitor singleton", () => {
    const monitor = getNudgeMonitor();
    expect(monitor).toBeDefined();
    expect(typeof monitor.getStats).toBe("function");
    expect(typeof monitor.reset).toBe("function");
  });

  test("should return nudge suggestions", () => {
    const suggestions = [
      getNudgeSuggestion("think-loop"),
      getNudgeSuggestion("syntax-loop", { filePath: "test.ts" }),
      getNudgeSuggestion("death-spiral"),
      getNudgeSuggestion("tool-loop"),
      getNudgeSuggestion("repair-failure"),
    ];

    suggestions.forEach((suggestion) => {
      expect(typeof suggestion).toBe("string");
      expect(suggestion.length).toBeGreaterThan(0);
    });
  });
});

describe("Nudge Processor exports", () => {
  test("should export NudgeProcessor class", () => {
    expect(NudgeProcessor).toBeDefined();
    expect(typeof NudgeProcessor).toBe("function");
  });

  test("should export nudgeProcessor singleton", () => {
    expect(nudgeProcessor).toBeDefined();
    expect(nudgeProcessor.name).toBe("nudge");
    expect(nudgeProcessor.type).toBe("post");
    expect(typeof nudgeProcessor.execute).toBe("function");
  });

  test("should export executeNudgeProcessor function", () => {
    expect(typeof executeNudgeProcessor).toBe("function");
  });
});

describe("Nudge Monitor functionality", () => {
  test("should track think tags", () => {
    const initialStats = getNudgeMonitor().getStats();
    const initialThinkTags = initialStats.thinkTags;

    recordThinkTag();
    recordThinkTag();

    const newStats = getNudgeMonitor().getStats();
    expect(newStats.thinkTags).toBeGreaterThanOrEqual(initialThinkTags + 2);
  });

  test("should track code changes", () => {
    const initialStats = getNudgeMonitor().getStats();
    const initialCodeChanges = initialStats.codeChanges;

    recordCodeChange();

    const newStats = getNudgeMonitor().getStats();
    expect(newStats.codeChanges).toBeGreaterThanOrEqual(initialCodeChanges + 1);
  });

  test("should track tool calls", () => {
    recordToolCall("read", '{"filePath":"test.ts"}');
    recordToolCall("edit", '{"filePath":"test.ts"}');

    const stats = getNudgeMonitor().getStats();
    expect(stats).toBeDefined();
    expect(typeof stats.thinkTags).toBe("number");
    expect(typeof stats.codeChanges).toBe("number");
    expect(typeof stats.explanations).toBe("number");
    expect(typeof stats.activePatterns).toBe("number");
    expect(typeof stats.lastNudgeAgo).toBe("number");
  });

  test("should track explanations", () => {
    const initialStats = getNudgeMonitor().getStats();
    const initialExplanations = initialStats.explanations;

    recordExplanation();
    recordExplanation();

    const newStats = getNudgeMonitor().getStats();
    expect(newStats.explanations).toBeGreaterThanOrEqual(initialExplanations + 2);
  });

  test("should track fix attempts", () => {
    recordFixAttempt("test.ts", "Syntax error");
    recordFixAttempt("test.ts", "Syntax error");

    const stats = getNudgeMonitor().getStats();
    expect(stats).toBeDefined();
  });

  test("should record processor fix", () => {
    recordProcessorFix("test.ts", true, true);
    const stats = getNudgeMonitor().getStats();
    expect(stats).toBeDefined();
  });

  test("should reset state", () => {
    recordThinkTag();
    recordCodeChange();
    recordExplanation();

    getNudgeMonitor().reset();

    const stats = getNudgeMonitor().getStats();
    expect(stats.thinkTags).toBe(0);
    expect(stats.codeChanges).toBe(0);
    expect(stats.explanations).toBe(0);
  });
});
describe("nudge config key alias (nudge_watchdog -> nudge_monitor)", () => {
  it("reads the old key when the new one is unset, warning once", async () => {
    const { resolveNudgeConfig, resetLegacyNudgeWarning } = await import("../../monitoring/nudge-monitor.js");
    resetLegacyNudgeWarning();
    const warn = vi.fn();
    expect(resolveNudgeConfig({ nudge_watchdog: { enabled: false } }, warn)).toEqual({ enabled: false });
    expect(resolveNudgeConfig({ nudge_watchdog: { enabled: true } }, warn)).toEqual({ enabled: true });
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toMatch(/nudge_watchdog is deprecated.*nudge_monitor/);
  });

  it("the new key wins when both are set, with no warning", async () => {
    const { resolveNudgeConfig, resetLegacyNudgeWarning } = await import("../../monitoring/nudge-monitor.js");
    resetLegacyNudgeWarning();
    const warn = vi.fn();
    expect(resolveNudgeConfig({ nudge_monitor: { enabled: true }, nudge_watchdog: { enabled: false } }, warn)).toEqual({ enabled: true });
    expect(resolveNudgeConfig({}, warn)).toBeUndefined();
    expect(warn).not.toHaveBeenCalled();
  });
});
