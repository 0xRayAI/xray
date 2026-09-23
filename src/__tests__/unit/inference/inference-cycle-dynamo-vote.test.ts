import { afterEach, describe, expect, it, vi } from "vitest";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import type { SessionInference } from "../../../inference/session-capture.js";

const callServerTool = vi.fn();

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

function writeSessions(root: string): void {
  const inferenceDir = path.join(root, "docs", "inference");
  fs.mkdirSync(inferenceDir, { recursive: true });
  for (let i = 0; i < 4; i++) {
    fs.writeFileSync(path.join(inferenceDir, `session-s${i}.json`), JSON.stringify(makeSession(`s${i}`)));
  }
}

describe("Inference cycle Dynamo MCP vote", () => {
  let tmpDir: string;
  const previousForce = process.env.XRAY_FORCE_MCP_GOVERNANCE;

  afterEach(() => {
    if (tmpDir) fs.rmSync(tmpDir, { recursive: true, force: true });
    callServerTool.mockReset();
    if (previousForce === undefined) delete process.env.XRAY_FORCE_MCP_GOVERNANCE;
    else process.env.XRAY_FORCE_MCP_GOVERNANCE = previousForce;
  });

  it("keeps a Dynamo-shaped vote instead of abstaining", async () => {
    process.env.XRAY_FORCE_MCP_GOVERNANCE = "true";
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "xray-dynamo-vote-"));
    writeSessions(tmpDir);
    callServerTool.mockResolvedValue({
      content: [{
        type: "text",
        text: JSON.stringify({
          overallDecision: "needs_revision",
          results: [{
            finalDecision: "needs_revision",
            averageConfidence: 0.76,
            votes: [{ server: "external-dynamo", decision: "needs_revision", confidence: 0.76 }],
          }],
        }),
      }],
    });

    const cycle = new InferenceCycle(tmpDir, undefined, { skipApply: true, skipDeployVerify: true });
    const result = await cycle.maybeRunCycle();
    const dynamoVote = result.votes.find((vote) => vote.confidence === 0.76);

    expect(callServerTool).toHaveBeenCalled();
    expect(dynamoVote?.decision).toBe("needs_revision");
    expect(dynamoVote?.details.join(" ")).toContain("external-dynamo: needs_revision (0.76)");
    expect(dynamoVote?.details.join(" ")).not.toContain("parse-failed");
  });

  it("stores an unreadable governance error instead of abstaining at 0.5", async () => {
    process.env.XRAY_FORCE_MCP_GOVERNANCE = "true";
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "xray-dynamo-err-"));
    writeSessions(tmpDir);
    callServerTool.mockResolvedValue({
      isError: true,
      content: [{
        type: "text",
        text: "Governance failed: Dynamo Solar SSOT is required but InferenceGovernanceIntegration is not available.",
      }],
    });

    const cycle = new InferenceCycle(tmpDir, undefined, { skipApply: true, skipDeployVerify: true });
    const result = await cycle.maybeRunCycle();

    expect(result.votes.length).toBeGreaterThan(0);
    for (const vote of result.votes) {
      expect(vote.decision).toBe("reject");
      expect(vote.confidence).toBe(0);
      expect(vote.details[0]).toContain("InferenceGovernanceIntegration is not available");
      expect(vote.details[0]).not.toContain("parse-failed");
    }
  });
});
