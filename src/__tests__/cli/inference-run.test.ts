import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

const root = process.cwd();
const cli = path.join(root, "dist/cli/index.js");

function requireCli(): void {
  if (!existsSync(cli)) {
    throw new Error("dist/cli/index.js missing — run npm run build");
  }
}

function writeProject(dir: string, features: Record<string, unknown>, session: boolean): void {
  writeFileSync(path.join(dir, "package.json"), JSON.stringify({ name: "0xray", version: "0.0.0" }));
  const xrayDir = path.join(dir, ".xray");
  mkdirSync(xrayDir, { recursive: true });
  writeFileSync(path.join(xrayDir, "features.json"), JSON.stringify(features));
  if (!session) return;
  const inferenceDir = path.join(dir, "docs", "inference");
  mkdirSync(inferenceDir, { recursive: true });
  writeFileSync(path.join(inferenceDir, "session-new-grade.json"), JSON.stringify({
    sessionId: "session-new-grade",
    timestamp: "2026-09-24T00:00:00.000Z",
    span: { from: "a", to: "b" },
    problems: [],
    approaches: ["fix: observe the law"],
    wrongTurns: [],
    solutions: [],
    patterns: [{ name: "fresh-law", confidence: 0.7, description: "once" }],
    matched_primitives: ["fresh-law"],
    metrics: { commits: 3 },
  }));
}

function run(dir: string, args: string[]) {
  requireCli();
  const env = { ...process.env };
  delete env.XRAY_ROOT;
  delete env.XRAY_CONFIG_DIR;
  delete env.XRAY_FORCE_MCP_GOVERNANCE;
  env.NODE_ENV = "development";
  return spawnSync(process.execPath, [cli, ...args], {
    cwd: dir,
    encoding: "utf8",
    timeout: 45000,
    env,
  });
}

describe("inference:run", () => {
  let tmpDir = "";

  afterEach(() => {
    if (tmpDir) rmSync(tmpDir, { recursive: true, force: true });
    tmpDir = "";
  });

  it("prints the disabled JSON and exits when inference is explicitly off", () => {
    tmpDir = mkdtempSync(path.join(tmpdir(), "xray-inference-run-"));
    writeProject(tmpDir, {
      inference: { enabled: false },
      memory_routing: { enabled: false, provider: "null" },
      inference_governance: { enabled: false },
    }, false);
    const result = run(tmpDir, ["inference:run", "--json"]);
    const combined = `${result.stdout}${result.stderr}`;
    expect(result.status, combined).toBe(0);
    expect(result.stdout.trim()).toBe(JSON.stringify({
      triggered: false,
      reason: "Inference feature disabled in features.json",
    }));
  });

  it("grades a new session id and exits after JSON", () => {
    tmpDir = mkdtempSync(path.join(tmpdir(), "xray-inference-run-"));
    writeProject(tmpDir, {
      inference: {
        description: "cycle",
        enabled: true,
        workflow_dir: ".xray/inference",
        reports_dir: ".xray/reports",
        pattern_matching: { enabled: true, confidence_threshold: 0.7 },
      },
      memory_routing: { enabled: false, provider: "null" },
      inference_governance: { enabled: false },
    }, true);
    const result = run(tmpDir, ["inference:run", "--force", "--no-apply", "--json"]);
    const combined = `${result.stdout}${result.stderr}`;
    expect(result.status, combined).toBe(0);
    const parsed = JSON.parse(result.stdout) as {
      triggered: boolean;
      proposals: Array<{ id: string }>;
      votes: Array<{ proposalId: string; decision: string }>;
    };
    expect(parsed.triggered).toBe(true);
    expect(parsed.proposals.some((proposal) => proposal.id === "named:fresh-law:session-new-grade")).toBe(true);
    const vote = parsed.votes.find((item) => item.proposalId === "named:fresh-law:session-new-grade");
    expect(vote?.decision).toBe("approve");
  });
});
