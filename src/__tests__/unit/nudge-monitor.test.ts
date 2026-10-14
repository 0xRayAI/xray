/**
 * Nudge Monitor Unit Tests
 *
 */

import { describe, test, expect } from "vitest";
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