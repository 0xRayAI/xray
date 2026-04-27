/**
 * Nudge Watchdog Unit Tests
 *
 * @version 1.0.0
 */

import { describe, test, expect } from "vitest";
import {
  recordThinkTag,
  recordCodeChange,
  recordToolCall,
  recordFixAttempt,
  recordExplanation,
  getNudgeSuggestion,
  getNudgeWatchdog,
  recordProcessorFix,
} from "../../monitoring/nudge-watchdog.js";
import {
  NudgeProcessor,
  nudgeProcessor,
  executeNudgeProcessor,
} from "../../processors/implementations/nudge-processor.js";

describe("NudgeWatchdog exports", () => {
  test("should export helper functions", () => {
    expect(typeof recordThinkTag).toBe("function");
    expect(typeof recordCodeChange).toBe("function");
    expect(typeof recordToolCall).toBe("function");
    expect(typeof recordFixAttempt).toBe("function");
    expect(typeof recordExplanation).toBe("function");
    expect(typeof getNudgeSuggestion).toBe("function");
    expect(typeof getNudgeWatchdog).toBe("function");
    expect(typeof recordProcessorFix).toBe("function");
  });

  test("should export nudgeWatchdog singleton", () => {
    const watchdog = getNudgeWatchdog();
    expect(watchdog).toBeDefined();
    expect(typeof watchdog.getStats).toBe("function");
    expect(typeof watchdog.reset).toBe("function");
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

describe("Nudge Watchdog functionality", () => {
  test("should track think tags", () => {
    const initialStats = getNudgeWatchdog().getStats();
    const initialThinkTags = initialStats.thinkTags;

    recordThinkTag();
    recordThinkTag();

    const newStats = getNudgeWatchdog().getStats();
    expect(newStats.thinkTags).toBeGreaterThanOrEqual(initialThinkTags + 2);
  });

  test("should track code changes", () => {
    const initialStats = getNudgeWatchdog().getStats();
    const initialCodeChanges = initialStats.codeChanges;

    recordCodeChange();

    const newStats = getNudgeWatchdog().getStats();
    expect(newStats.codeChanges).toBeGreaterThanOrEqual(initialCodeChanges + 1);
  });

  test("should track tool calls", () => {
    recordToolCall("read", '{"filePath":"test.ts"}');
    recordToolCall("edit", '{"filePath":"test.ts"}');

    const stats = getNudgeWatchdog().getStats();
    expect(stats).toBeDefined();
    expect(typeof stats.thinkTags).toBe("number");
    expect(typeof stats.codeChanges).toBe("number");
    expect(typeof stats.explanations).toBe("number");
    expect(typeof stats.activePatterns).toBe("number");
    expect(typeof stats.lastNudgeAgo).toBe("number");
  });

  test("should track explanations", () => {
    const initialStats = getNudgeWatchdog().getStats();
    const initialExplanations = initialStats.explanations;

    recordExplanation();
    recordExplanation();

    const newStats = getNudgeWatchdog().getStats();
    expect(newStats.explanations).toBeGreaterThanOrEqual(initialExplanations + 2);
  });

  test("should track fix attempts", () => {
    recordFixAttempt("test.ts", "Syntax error");
    recordFixAttempt("test.ts", "Syntax error");

    const stats = getNudgeWatchdog().getStats();
    expect(stats).toBeDefined();
  });

  test("should record processor fix", () => {
    recordProcessorFix("test.ts", true, true);
    const stats = getNudgeWatchdog().getStats();
    expect(stats).toBeDefined();
  });

  test("should reset state", () => {
    recordThinkTag();
    recordCodeChange();
    recordExplanation();

    getNudgeWatchdog().reset();

    const stats = getNudgeWatchdog().getStats();
    expect(stats.thinkTags).toBe(0);
    expect(stats.codeChanges).toBe(0);
    expect(stats.explanations).toBe(0);
  });
});