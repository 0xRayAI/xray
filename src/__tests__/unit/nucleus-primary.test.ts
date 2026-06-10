/**
 * Nucleus Primary Surface Tests (Phase 1F.1)
 *
 * Verifies that the nucleus barrel export exposes the correct surface,
 * that inference-cycle no longer carries MCP governance paths,
 * that boot-orchestrator.server.ts delegates to nucleus,
 * and that nucleus files use frameworkLogger exclusively.
 */

import { describe, test, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, "..", "..", "..");

function readSource(relativePath: string): string {
  return fs.readFileSync(path.join(PROJECT_ROOT, relativePath), "utf-8");
}

describe("nucleus barrel exports", () => {
  test("exports handleGovernRequest", async () => {
    const mod = await import("../../nucleus/index.js");
    expect(mod.handleGovernRequest).toBeDefined();
    expect(typeof mod.handleGovernRequest).toBe("function");
  });

  test("exports getGovernanceService", async () => {
    const mod = await import("../../nucleus/index.js");
    expect(mod.getGovernanceService).toBeDefined();
    expect(typeof mod.getGovernanceService).toBe("function");
  });

  test("exports governSingle", async () => {
    const mod = await import("../../nucleus/index.js");
    expect(mod.governSingle).toBeDefined();
    expect(typeof mod.governSingle).toBe("function");
  });

  test("exports NucleusOrchestrator", async () => {
    const mod = await import("../../nucleus/index.js");
    expect(mod.NucleusOrchestrator).toBeDefined();
    expect(typeof mod.NucleusOrchestrator).toBe("function");
  });

  test("exports scoreComplexity", async () => {
    const mod = await import("../../nucleus/index.js");
    expect(mod.scoreComplexity).toBeDefined();
    expect(typeof mod.scoreComplexity).toBe("function");
  });

  test("exports routeToAgent", async () => {
    const mod = await import("../../nucleus/index.js");
    expect(mod.routeToAgent).toBeDefined();
    expect(typeof mod.routeToAgent).toBe("function");
  });

  test("exports scoreAndRoute", async () => {
    const mod = await import("../../nucleus/index.js");
    expect(mod.scoreAndRoute).toBeDefined();
    expect(typeof mod.scoreAndRoute).toBe("function");
  });

  test("exports NUCLEUS_VERSION and NUCLEUS_DESCRIPTION", async () => {
    const mod = await import("../../nucleus/index.js");
    expect(mod.NUCLEUS_VERSION).toBeDefined();
    expect(typeof mod.NUCLEUS_VERSION).toBe("string");
    expect(mod.NUCLEUS_DESCRIPTION).toBeDefined();
    expect(typeof mod.NUCLEUS_DESCRIPTION).toBe("string");
  });

  test("exports NUCLEUS_THIN_DISPATCH_VERSION", async () => {
    const mod = await import("../../nucleus/index.js");
    expect(mod.NUCLEUS_THIN_DISPATCH_VERSION).toBeDefined();
    expect(typeof mod.NUCLEUS_THIN_DISPATCH_VERSION).toBe("string");
  });
});

describe("nucleus kernel re-exports over delegation/index.ts bridge", () => {
  test("re-exports scoreComplexity from delegation/index.ts", async () => {
    const mod = await import("../../delegation/index.js");
    expect(mod.scoreComplexity).toBeDefined();
    expect(typeof mod.scoreComplexity).toBe("function");
  });

  test("re-exports routeToAgent from delegation/index.ts", async () => {
    const mod = await import("../../delegation/index.js");
    expect(mod.routeToAgent).toBeDefined();
    expect(typeof mod.routeToAgent).toBe("function");
  });

  test("re-exports scoreAndRoute from delegation/index.ts", async () => {
    const mod = await import("../../delegation/index.js");
    expect(mod.scoreAndRoute).toBeDefined();
    expect(typeof mod.scoreAndRoute).toBe("function");
  });
});

describe("inference-cycle — no MCP governance paths", () => {
  const source = readSource("src/inference/inference-cycle.ts");

  test("does not export useGovernanceMcp", () => {
    expect(source).not.toMatch(/\buseGovernanceMcp\b/);
  });

  test("does not export parseGovernanceMcpResponse", () => {
    expect(source).not.toMatch(/\bparseGovernanceMcpResponse\b/);
  });

  test("does not export invokeAgentInternal", () => {
    expect(source).not.toMatch(/\binvokeAgentInternal\b/);
  });

  test("does not reference XRAY_FORCE_MCP_GOVERNANCE", () => {
    expect(source).not.toMatch(/XRAY_FORCE_MCP_GOVERNANCE/);
  });

  test("does not reference isGovernanceMcpPreferred", () => {
    expect(source).not.toMatch(/\bisGovernanceMcpPreferred\b/);
  });

  test("uses handleGovernRequest from nucleus", () => {
    expect(source).toMatch(/import.*handleGovernRequest.*nucleus/);
  });
});

describe("boot-orchestrator.server.ts — delegates to nucleus", () => {
  const source = readSource("src/mcps/boot-orchestrator.server.ts");

  test("imports NucleusOrchestrator from nucleus", () => {
    expect(source).toMatch(/import[\s\S]*?NucleusOrchestrator[\s\S]*?nucleus\/orchestrator/);
  });

  test("does not define independent boot state fields", () => {
    expect(source).not.toMatch(/private\s+bootStatus/);
    expect(source).not.toMatch(/private\s+bootSequence\s*=/);
  });

  test("does not contain validatePrerequisites method", () => {
    expect(source).not.toMatch(/validatePrerequisites/);
  });

  test("does not contain executeParallelBoot method", () => {
    expect(source).not.toMatch(/executeParallelBoot/);
  });

  test("does not contain executeSequentialBoot method", () => {
    expect(source).not.toMatch(/executeSequentialBoot/);
  });

  test("does not contain initConfiguration method", () => {
    expect(source).not.toMatch(/initConfiguration/);
  });

  test("does not contain initLogging method", () => {
    expect(source).not.toMatch(/initLogging/);
  });

  test("does not contain saveShutdownState method", () => {
    expect(source).not.toMatch(/saveShutdownState/);
  });

  test("references orchestrator for bootSequence", () => {
    expect(source).toMatch(/this\.orchestrator\.bootSequence/);
  });
});

describe("nucleus files — frameworkLogger only, no console.*", () => {
  const nucleusDir = path.resolve(PROJECT_ROOT, "src", "nucleus");
  const files = fs.readdirSync(nucleusDir).filter((f) => f.endsWith(".ts"));

  for (const file of files) {
    test(`${file} does not use console.*`, () => {
      const content = fs.readFileSync(path.join(nucleusDir, file), "utf-8");
      const lines = content.split("\n");
      const consoleLines = lines.filter(
        (l) => l.match(/console\.(log|warn|error|info|debug|trace)/) && !l.match(/\/\/.*console\./),
      );
      expect(consoleLines).toHaveLength(0);
    });
  }
});

describe("NucleusOrchestrator runtime behavior", () => {
  test("scoreComplexity returns expected shape", async () => {
    const { scoreComplexity } = await import("../../nucleus/index.js");
    const result = scoreComplexity("refactor authentication module", {
      files: ["auth.ts", "user.ts", "roles.ts"],
      changes: { added: 50, deleted: 10, modified: 20 },
      riskLevel: "medium",
    });
    expect(result).toBeDefined();
    expect(typeof result.score).toBe("number");
    expect(["simple", "moderate", "complex", "enterprise"]).toContain(result.level);
    expect(typeof result.recommendedStrategy).toBe("string");
    expect(Array.isArray(result.reasoning)).toBe(true);
  });

  test("routeToAgent returns a string for numeric score", async () => {
    const { routeToAgent } = await import("../../nucleus/index.js");
    const agent = routeToAgent(10);
    expect(typeof agent).toBe("string");
    expect(agent.length).toBeGreaterThan(0);
  });

  test("routeToAgent returns a string for ComplexityScore object", async () => {
    const { routeToAgent, scoreComplexity } = await import("../../nucleus/index.js");
    const score = scoreComplexity("simple task", { files: ["a.ts"] });
    const agent = routeToAgent(score);
    expect(typeof agent).toBe("string");
    expect(agent.length).toBeGreaterThan(0);
  });

  test("routeToAgent accepts explicit level override", async () => {
    const { routeToAgent } = await import("../../nucleus/index.js");
    const agent = routeToAgent(100, "enterprise");
    expect(typeof agent).toBe("string");
    expect(agent.length).toBeGreaterThan(0);
  });

  test("scoreAndRoute returns score and agent", async () => {
    const { scoreAndRoute } = await import("../../nucleus/index.js");
    const result = scoreAndRoute("fix login bug", {
      files: ["login.ts"],
      changes: { added: 5, deleted: 2 },
    });
    expect(result).toHaveProperty("score");
    expect(result).toHaveProperty("agent");
    expect(typeof result.score.score).toBe("number");
    expect(typeof result.agent).toBe("string");
  });
});
