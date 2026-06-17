import * as fs from "fs";
import * as path from "path";
import { spawn } from "child_process";
import type {
  ToolArguments,
  PreProcessorResult,
  ProcessorManagerLike,
  ProcessorResult,
} from "./plugin-types.js";
import type { PluginLogger } from "./plugin-logger.js";

export function spawnPromise(
  command: string,
  args: string[],
  cwd: string,
): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      stdio: ["ignore", "inherit", "pipe"],
    });
    let stderr = "";

    if (child.stderr) {
      child.stderr.on("data", (data) => {
        stderr += data.toString();
      });
    }

    child.on("close", (code) => {
      if (code === 0) {
        resolve({ stdout: "", stderr });
      } else {
        reject(new Error(`Process exited with code ${code}: ${stderr}`));
      }
    });

    child.on("error", (error) => {
      reject(error);
    });
  });
}

export function getFrameworkVersion(): string {
  try {
    const packageJsonPath = path.join(process.cwd(), "package.json");
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));
    return packageJson.version || "1.4.6";
  } catch {
    return "1.4.6";
  }
}

export function getFrameworkIdentity(): string {
  const version = getFrameworkVersion();
  return `0xRay Framework v${version} - AI Orchestration

🔧 Core: architect, code-reviewer, refactorer, testing-lead, strategist
📚 Codex: 5 Essential Terms (99.6% Error Prevention Target)
🎯 Goal: Progressive, production-ready development workflow

📖 Documentation: config dir (codex, config, agents docs) — resolved via config-paths
`;
}

export const TOOL_AGENT_MAP: Record<string, { agent: string; skill: string }> = {
  write:     { agent: "code-reviewer", skill: "write" },
  edit:      { agent: "code-reviewer", skill: "edit" },
  multiedit: { agent: "code-reviewer", skill: "multiedit" },
  bash:      { agent: "testing-lead", skill: "execution" },
  search:    { agent: "researcher",    skill: "search" },
  read:      { agent: "researcher",    skill: "read" },
  glob:      { agent: "researcher",    skill: "glob" },
  grep:      { agent: "researcher",    skill: "search" },
  ls:        { agent: "researcher",    skill: "list" },
};

export function classifyTaskType(tool: string, args?: ToolArguments): string {
  const cmd = String(args?.command ?? "").toLowerCase().trim();

  if (tool === "bash" && cmd) {
    if (/(npm|yarn|pnpm)\s+test|jest|vitest|mocha|pytest/.test(cmd)) return "testing";
    if (/(npm|yarn|pnpm)\s+run|npx|cargo|go run|make\s/.test(cmd)) return "build";
    if (/audit|security|snyk|owasp|bandit/.test(cmd)) return "security";
    if (/eslint|prettier|black|ruff|lint|format/.test(cmd)) return "lint";
    if (/git\s/.test(cmd)) return "git";
    if (/(npm|yarn|pnpm)\s+install|pip install|cargo add/.test(cmd)) return "install";
    if (/grep|rg |find |ls |cat |head |tail /.test(cmd)) return "search";
  }

  if (tool === "write") return "write";
  if (tool === "edit" || tool === "multiedit") return "edit";
  if (tool === "read") return "read";
  if (tool === "search" || tool === "grep" || tool === "glob") return "search";

  return "unknown";
}

export function isWriteEditOperation(tool: string): boolean {
  return tool === "write" || tool === "edit" || tool === "multiedit";
}

export function isPublishOperation(tool: string): boolean {
  return tool === "publish" || tool === "release" || tool === "npm-publish" || tool === "xray-release";
}

export function resolveAgentName(input: { agentType?: string } | undefined): string {
  const globalAgent = globalThis.currentAgent;
  if (globalAgent?.agentType) return globalAgent.agentType;
  if (globalAgent?.type) return globalAgent.type;
  if (input?.agentType) return input.agentType;
  return "architect";
}

export function registerAllProcessors(pm: ProcessorManagerLike): void {
  pm.registerProcessor({ name: "preValidate", type: "pre", priority: 10, enabled: true });
  pm.registerProcessor({ name: "codexCompliance", type: "pre", priority: 20, enabled: true });
  pm.registerProcessor({ name: "versionCompliance", type: "pre", priority: 25, enabled: true });
  pm.registerProcessor({ name: "testAutoCreation", type: "post", priority: 5, enabled: true });
  pm.registerProcessor({ name: "testExecution", type: "post", priority: 10, enabled: true });
  pm.registerProcessor({ name: "coverageAnalysis", type: "post", priority: 20, enabled: true });
}

export function registerAfterPostProcessors(pm: ProcessorManagerLike): void {
  pm.registerProcessor({ name: "testAutoCreation", type: "post", priority: 50, enabled: true });
  pm.registerProcessor({ name: "testExecution", type: "post", priority: 10, enabled: true });
  pm.registerProcessor({ name: "coverageAnalysis", type: "post", priority: 20, enabled: true });
}

export function logPreProcessorResults(results: PreProcessorResult, logger: PluginLogger): void {
  logger.log(
    `📊 Pre-processor result: ${results.success ? "SUCCESS" : "FAILED"} (${results.results.length} processors)`,
  );

  if (!results.success) {
    const failures = results.results.filter((r) => !r.success);
    for (const f of failures) {
      logger.error(`❌ Pre-processor ${f.processorName} failed: ${f.error}`);
    }
  } else {
    for (const r of results.results) {
      logger.log(`✅ Pre-processor ${r.processorName}: ${r.success ? "OK" : "FAILED"}`);
    }
  }
}

export function logPostProcessorResults(results: ProcessorResult[], logger: PluginLogger): void {
  const allSuccess = results.every((r) => r.success);
  logger.log(
    `📊 Post-processor result: ${allSuccess ? "SUCCESS" : "FAILED"} (${results.length} processors)`,
  );

  for (const r of results) {
    if (r.success) {
      logger.log(`✅ Post-processor ${r.processorName}: OK`);
    } else {
      logger.error(`❌ Post-processor ${r.processorName} failed: ${r.error}`);
    }
  }
}

export function logTestAutoCreationResult(results: ProcessorResult[], logger: PluginLogger): void {
  const testAutoResult = results.find((r) => r.processorName === "testAutoCreation");
  if (testAutoResult) {
    const data = testAutoResult.data as { testCreated?: boolean; testFile?: string } | undefined;
    if (testAutoResult.success && data?.testCreated && data?.testFile) {
      logger.log(`✅ TEST AUTO-CREATION: Created ${data.testFile}`);
    } else if (!testAutoResult.success) {
      logger.log(`ℹ️ TEST AUTO-CREATION: ${testAutoResult.error ?? "skipped - no new files"}`);
    }
  }
}
