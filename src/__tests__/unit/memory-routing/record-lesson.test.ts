import { beforeEach, describe, expect, it, vi } from "vitest";

const ingestFeedback = vi.fn();
const buildRoutingContext = vi.fn();

vi.mock("../../../memory-routing/provider-registry.js", () => ({
  ensureMemoryRoutingProviderSync: () => ({
    id: "repertoire",
    ingestFeedback,
    buildRoutingContext,
  }),
}));

import { recordLesson } from "../../../memory-routing/record-lesson.js";

describe("recordLesson", () => {
  beforeEach(() => {
    ingestFeedback.mockClear();
    buildRoutingContext.mockReset();
  });

  it("steps the signals the task text named and records the outcome", () => {
    buildRoutingContext.mockReturnValue({ matchedSignals: ["wake-cascade", "wake-cascade"] });

    const taught = recordLesson({
      operation: "Codify wake-cascade pattern",
      success: true,
      taskId: "prop-1",
      assignedAgent: "inference-cycle",
      sessionId: "cycle-1",
    });

    expect(taught).toEqual(["wake-cascade"]);
    expect(ingestFeedback).toHaveBeenCalledTimes(1);
    expect(ingestFeedback.mock.calls[0][0]).toMatchObject({
      memorySignals: ["wake-cascade"],
      success: true,
      taskId: "prop-1",
    });
  });

  it("writes nothing when the task names no stored signal", () => {
    buildRoutingContext.mockReturnValue({ matchedSignals: [] });

    const taught = recordLesson({
      operation: "Codify Extract Method pattern",
      success: false,
      taskId: "prop-2",
      assignedAgent: "inference-cycle",
      sessionId: "cycle-1",
    });

    expect(taught).toEqual([]);
    expect(ingestFeedback).not.toHaveBeenCalled();
  });

  it("grades signals the task already named even when the text matches nothing", () => {
    buildRoutingContext.mockReturnValue({ matchedSignals: [] });

    const taught = recordLesson({
      operation: "Codify test-expansion pattern",
      success: false,
      taskId: "prop-3",
      assignedAgent: "inference-cycle",
      sessionId: "cycle-1",
      signals: ["wake-cascade", "wake-cascade"],
      lesson: "fix: observe the law",
    });

    expect(taught).toEqual(["wake-cascade"]);
    expect(ingestFeedback).toHaveBeenCalledTimes(1);
    expect(ingestFeedback.mock.calls[0][0]).toMatchObject({
      memorySignals: ["wake-cascade"],
      success: false,
      lesson: "fix: observe the law",
    });
  });

  it("writes nothing when the named signal list is empty", () => {
    buildRoutingContext.mockReturnValue({ matchedSignals: ["wake-cascade"] });

    const taught = recordLesson({
      operation: "wake-cascade",
      success: true,
      taskId: "prop-4",
      assignedAgent: "inference-cycle",
      sessionId: "cycle-1",
      signals: [],
    });

    expect(taught).toEqual([]);
    expect(ingestFeedback).not.toHaveBeenCalled();
    expect(buildRoutingContext).not.toHaveBeenCalled();
  });

  it("stores a lesson under a task-derived name when nothing matches", () => {
    buildRoutingContext.mockReturnValue({ matchedSignals: [] });
    const operation = "compaction memory bench suited arm";
    const lesson = "bench-token:abc remembered";

    const taught = recordLesson({
      operation,
      success: true,
      taskId: "wear:bench",
      assignedAgent: "code-reviewer",
      sessionId: "sess-1",
      lesson,
    });

    const coined = "compaction-memory-bench-suited-arm";
    expect(taught).toEqual([coined]);
    expect(operation.includes(coined.split("-").join(" "))).toBe(true);
    expect(ingestFeedback).toHaveBeenCalledTimes(1);
    expect(ingestFeedback.mock.calls[0][0]).toMatchObject({
      memorySignals: [coined],
      lesson,
      success: true,
      taskId: "wear:bench",
    });
  });

  it("stores a lesson when the caller passes an empty signal list", () => {
    buildRoutingContext.mockReturnValue({ matchedSignals: ["wake-cascade"] });
    const operation = "compaction memory bench suited arm";
    const lesson = "bench-token:abc remembered";

    const taught = recordLesson({
      operation,
      success: true,
      taskId: "wear:bench",
      assignedAgent: "code-reviewer",
      sessionId: "sess-1",
      signals: [],
      lesson,
    });

    expect(taught).toEqual(["compaction-memory-bench-suited-arm"]);
    expect(buildRoutingContext).not.toHaveBeenCalled();
    expect(ingestFeedback.mock.calls[0][0]).toMatchObject({
      memorySignals: ["compaction-memory-bench-suited-arm"],
      lesson,
    });
  });

  it("keeps a matched signal when the task also carries a lesson", () => {
    buildRoutingContext.mockReturnValue({ matchedSignals: ["wake-cascade"] });

    const taught = recordLesson({
      operation: "Codify wake-cascade pattern",
      success: true,
      taskId: "prop-5",
      assignedAgent: "inference-cycle",
      sessionId: "cycle-1",
      lesson: "fix: observe the law",
    });

    expect(taught).toEqual(["wake-cascade"]);
    expect(ingestFeedback.mock.calls[0][0]).toMatchObject({
      memorySignals: ["wake-cascade"],
      lesson: "fix: observe the law",
    });
  });

  it("does not coin a name when the lesson is blank", () => {
    buildRoutingContext.mockReturnValue({ matchedSignals: [] });

    const taught = recordLesson({
      operation: "compaction memory bench suited arm",
      success: true,
      taskId: "prop-blank",
      assignedAgent: "inference-cycle",
      sessionId: "cycle-1",
      lesson: "   ",
    });

    expect(taught).toEqual([]);
    expect(ingestFeedback).not.toHaveBeenCalled();
  });
});
