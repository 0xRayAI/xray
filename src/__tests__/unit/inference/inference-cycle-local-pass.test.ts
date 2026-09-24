import { afterEach, describe, expect, it, vi } from "vitest";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import type { SessionInference } from "../../../inference/session-capture.js";

const callServerTool = vi.fn(() => {
  throw new Error("Dynamo must not be called when inference governance is off");
});
const recordLesson = vi.fn(() => [] as string[]);

vi.mock("../../../core/features-config.js", () => ({
  featuresConfigLoader: {
    loadConfig: () => ({ inference_governance: { enabled: false } }),
  },
}));

vi.mock("../../../mcps/mcp-client.js", () => ({
  mcpClientManager: {
    callServerTool: (...args: unknown[]) => callServerTool(...args),
  },
}));

vi.mock("../../../memory-routing/record-lesson.js", () => ({
  recordLesson: (...args: unknown[]) => recordLesson(...args),
}));

import { InferenceCycle } from "../../../inference/inference-cycle.js";

function makeSession(id: string): SessionInference {
  return {
    sessionId: `session-${id}`,
    timestamp: new Date().toISOString(),
    span: { from: "HEAD~10", to: "HEAD" },
    problems: ["Bug: same bug every time"],
    approaches: ["Extract methods"],
    wrongTurns: [],
    solutions: ["Applied fix"],
    reasoningChain: [],
    patterns: [
      {
        name: "Extract Method",
        confidence: 0.9,
        evidence: ["3 new files in implementations/"],
        description: "Methods extracted from monolith",
      },
    ],
    matchedPrimitives: ["wake-cascade"],
    metrics: {
      commits: 10,
      filesChanged: 10,
      insertions: 100,
      deletions: 50,
      filesAdded: 2,
      filesDeleted: 1,
      uniqueDirs: 3,
    },
  };
}

describe("Inference cycle local governance pass", () => {
  let tmpDir: string;

  afterEach(() => {
    if (tmpDir) fs.rmSync(tmpDir, { recursive: true, force: true });
    callServerTool.mockClear();
    recordLesson.mockClear();
  });

  it("scores proposals on the local matrix when inference governance is off", async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "xray-local-pass-"));
    const inferenceDir = path.join(tmpDir, "docs", "inference");
    fs.mkdirSync(inferenceDir, { recursive: true });
    for (let i = 0; i < 4; i++) {
      fs.writeFileSync(path.join(inferenceDir, `session-s${i}.json`), JSON.stringify(makeSession(`s${i}`)));
    }

    const cycle = new InferenceCycle(tmpDir, undefined, { skipApply: true, skipDeployVerify: true });
    const result = await cycle.maybeRunCycle();

    expect(result.triggered).toBe(true);
    expect(result.votes.length).toBeGreaterThan(0);
    expect(callServerTool).not.toHaveBeenCalled();
    for (const vote of result.votes) {
      expect(vote.confidence).toBeGreaterThan(0);
      expect(vote.details[0]).toBe("local-matrix: inference_governance disabled");
      expect(vote.details.join(" ")).not.toMatch(/TAU/);
    }
    const patternVote = result.votes.find((vote) => {
      const proposal = result.proposals.find((item) => item.id === vote.proposalId);
      return proposal?.source === "recurring_pattern";
    });
    expect(patternVote?.decision).toBe("approve");
    expect(patternVote?.confidence).toBe(0.89);
    const lessons = recordLesson.mock.calls.map((call) => call[0] as { success: boolean; operation: string; signals?: string[] });
    expect(lessons.some((lesson) =>
      lesson.success
      && lesson.operation.includes("Extract Method")
      && lesson.signals?.includes("wake-cascade")
      && lesson.signals?.includes("Extract Method")
    )).toBe(true);
  });

  it("passes an empty signal list when the sessions named nothing", async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "xray-local-pass-"));
    const inferenceDir = path.join(tmpDir, "docs", "inference");
    fs.mkdirSync(inferenceDir, { recursive: true });
    for (let i = 0; i < 3; i++) {
      const unnamed = makeSession(`plain-${i}`);
      unnamed.problems = ["wake-cascade showed up in the writeup"];
      unnamed.patterns = [];
      unnamed.matchedPrimitives = [];
      unnamed.approaches = [];
      unnamed.solutions = [];
      fs.writeFileSync(path.join(inferenceDir, `session-plain-${i}.json`), JSON.stringify(unnamed));
    }

    const cycle = new InferenceCycle(tmpDir, undefined, { skipApply: true, skipDeployVerify: true });
    const result = await cycle.maybeRunCycle();
    const problem = result.proposals.find((proposal) => proposal.id.startsWith("problem:"));
    expect(problem?.namedSignals).toEqual([]);

    const lessons = recordLesson.mock.calls.map((call) => call[0] as { signals?: string[]; taskId: string });
    const problemLesson = lessons.find((lesson) => lesson.taskId.startsWith("problem:"));
    expect(problemLesson?.signals).toEqual([]);
  });

  it("grades a named signal when an external vote approves", async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "xray-external-grade-"));
    const cycle = new InferenceCycle(tmpDir, undefined, { skipApply: true, skipDeployVerify: true });
    const result = await cycle.governExternalProposals([{
      id: "named:wake-cascade:sess-ext",
      type: "codify",
      title: "wake-cascade",
      description: "named law",
      evidence: [],
      confidence: 0.9,
      source: "recurring_pattern",
      status: "pending",
      namedSignals: ["wake-cascade"],
      lesson: "fix: observe the law",
    }]);

    expect(result.votes[0]?.decision).toBe("approve");
    expect(callServerTool).not.toHaveBeenCalled();
    expect(recordLesson).toHaveBeenCalledWith(expect.objectContaining({
      taskId: "named:wake-cascade:sess-ext",
      success: true,
      signals: ["wake-cascade"],
      lesson: "fix: observe the law",
    }));
  });
});
