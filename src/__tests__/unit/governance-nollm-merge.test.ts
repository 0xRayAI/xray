/**
 * Locks 0f6c61cb: local no-LLM confer votes abstain, so mergeVotes cannot
 * PASS while the Dynamo solar filter is absent. eb6004b0 had let those votes count.
 *
 * Hammer-skip switches are observed, not rewritten. A switch that reaches
 * approve is a finding for the owner, recorded by this assertion failing.
 */
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { featuresConfigLoader } from "../../core/features-config.js";
import { mergeVotes } from "../../governance/governance-core.js";
import { GovernanceService } from "../../governance/governance-service.js";
import type { GovernanceResponse, GovernanceVote } from "../../governance/governance-types.js";
import { isGovernanceLlmConfigured } from "../../governance/llm-governance-provider.js";
import {
  getGovernanceIntegration,
  shutdownGovernanceIntegration,
} from "../../integrations/governance/index.js";

const LLM_ENV_KEYS = [
  "XRAY_GOVERNANCE_ALLOW_HERMES",
  "XRAY_LLM_ENDPOINT",
  "XRAY_GOVERNANCE_LLM_ENDPOINT",
  "XRAY_LLM_API_KEY",
  "XRAY_GOVERNANCE_LLM_API_KEY",
  "XRAY_GOVERNANCE_LLM_ENABLED",
  "XRAY_LLM_ENABLED",
  "XRAY_LLM_MODEL",
  "XRAY_GOVERNANCE_LLM_MODEL",
  "XRAY_LOCAL_MODE",
  "XRAY_GOVERNANCE_IN_PROCESS",
] as const;

const SKILL_SERVERS = ["code-review", "security-audit", "researcher"] as const;

const proposal = {
  id: "nollm-1",
  type: "fix" as const,
  title: "Tighten a guard",
  description: "Add a bounds check on the existing parser.",
  evidence: ["src/governance/governance-core.ts"],
};

type LoaderHandle = { featuresPath: string };

function loaderHandle(): LoaderHandle {
  return featuresConfigLoader as unknown as LoaderHandle;
}

function skillVotes(votes: GovernanceVote[]): GovernanceVote[] {
  return votes.filter((vote) =>
    (SKILL_SERVERS as readonly string[]).includes(vote.server),
  );
}

function assertNeverApprove(result: GovernanceResponse): void {
  expect(result.overallDecision).not.toBe("approve");
  for (const row of result.results) {
    expect(row.finalDecision).not.toBe("approve");
    expect(row.votes.some((vote) => vote.decision === "approve")).toBe(false);
  }
}

describe("no-LLM confer votes cannot PASS without Dynamo", () => {
  const savedEnv = new Map<string, string | undefined>();
  let savedFeaturesPath = "";
  const tempDirs: string[] = [];

  beforeEach(async () => {
    for (const key of LLM_ENV_KEYS) {
      savedEnv.set(key, process.env[key]);
      delete process.env[key];
    }
    process.env.XRAY_GOVERNANCE_IN_PROCESS = "1";
    savedFeaturesPath = loaderHandle().featuresPath;
    featuresConfigLoader.clearCache();
    await shutdownGovernanceIntegration();
  });

  afterEach(async () => {
    loaderHandle().featuresPath = savedFeaturesPath;
    featuresConfigLoader.clearCache();
    for (const key of LLM_ENV_KEYS) {
      const previous = savedEnv.get(key);
      if (previous === undefined) delete process.env[key];
      else process.env[key] = previous;
    }
    for (const dir of tempDirs.splice(0)) {
      rmSync(dir, { recursive: true, force: true });
    }
    await shutdownGovernanceIntegration();
  });

  function pointFeaturesAt(inferenceGovernance: Record<string, boolean>): void {
    const dir = mkdtempSync(join(tmpdir(), "xray-nollm-"));
    tempDirs.push(dir);
    writeFileSync(
      join(dir, "features.json"),
      JSON.stringify({ inference_governance: inferenceGovernance }),
    );
    loaderHandle().featuresPath = join(dir, "features.json");
    featuresConfigLoader.clearCache();
  }

  async function govern(requireExternalDynamo?: boolean): Promise<GovernanceResponse> {
    expect(isGovernanceLlmConfigured()).toBe(false);
    expect(getGovernanceIntegration()?.isAvailable() ?? false).toBe(false);
    const service = new GovernanceService();
    return service.govern({
      proposals: [proposal],
      ...(requireExternalDynamo === undefined
        ? {}
        : { options: { requireExternalDynamo } }),
    });
  }

  it("merges an all-abstain ballot from no-LLM confer votes and an unavailable Dynamo filter", async () => {
    const result = await govern(false);
    const votes = result.results[0]?.votes ?? [];

    expect(skillVotes(votes)).toHaveLength(3);
    for (const vote of skillVotes(votes)) {
      expect(vote.decision).toBe("abstain");
      expect(vote.reasoning).toContain("nested LLM not configured");
    }
    expect(votes.find((vote) => vote.server === "external-dynamo")?.decision).toBe("abstain");
    expect(votes.every((vote) => vote.decision === "abstain")).toBe(true);

    const merged = mergeVotes(votes);
    const conferOnly = mergeVotes(skillVotes(votes));
    expect(merged.finalDecision).toBe("reject");
    expect(conferOnly.finalDecision).toBe("reject");
    expect(result.results[0]?.finalDecision).toBe(merged.finalDecision);
    expect(result.overallDecision).toBe("reject");
    assertNeverApprove(result);
  });

  it("options.requireExternalDynamo=false does not PASS", async () => {
    const result = await govern(false);
    assertNeverApprove(result);
    expect(result.results[0]?.finalDecision).toBe("reject");
    expect(result.overallDecision).toBe("reject");
  });

  it("XRAY_LOCAL_MODE=1 does not PASS", async () => {
    process.env.XRAY_LOCAL_MODE = "1";
    const result = await govern();
    assertNeverApprove(result);
    expect(result.results[0]?.finalDecision).toBe("reject");
    expect(result.overallDecision).toBe("reject");
  });

  it("inference_governance.require_external_dynamo=false does not PASS", async () => {
    pointFeaturesAt({ require_external_dynamo: false });
    const result = await govern();
    assertNeverApprove(result);
    expect(result.results[0]?.finalDecision).toBe("reject");
    expect(result.overallDecision).toBe("reject");
  });

  it("inference_governance.local_mode=true does not PASS", async () => {
    pointFeaturesAt({ local_mode: true });
    const result = await govern();
    assertNeverApprove(result);
    expect(result.results[0]?.finalDecision).toBe("reject");
    expect(result.overallDecision).toBe("reject");
  });

  it("throws before merge when Dynamo is required and unavailable", async () => {
    await expect(govern()).rejects.toThrow(/Dynamo Solar SSOT is required/);
  });
});
