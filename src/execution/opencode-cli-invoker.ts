/**
 * OpenCode CLI Invoker (thin execution helper)
 *
 * Thin OpenCode fallback path under the three-subsystem Engine.
 * Owned by Autonomous Engine. All direct child_process and agent spawn execution here.
 * InferenceCycle is pure sensing + proposal + governance orchestration.
 */

import * as fs from "fs";
import * as path from "path";
import { execSync, spawn } from "child_process";
import { frameworkLogger } from "../core/framework-logger.js";
import { getAgentSpawn } from "../core/features-config.js";

import { spawnGate } from "../core/agent-spawn-gate.js";
import { agentSpawnGovernor } from "../orchestrator/agent-spawn-governor.js";
import { getConfigDir } from "../core/config-paths.js";

// Module-level cache for opencode availability check
let opencodeAvailable: boolean | null = null;

export async function invokeViaOpencode(
  agentName: string,
  prompt: string,
  projectRoot: string = process.cwd(),
): Promise<string> {
  // In pure MCP mode we must never reach here
  if (process.env.STRRAY_FORCE_MCP_GOVERNANCE === "true") {
    throw new Error(`[PURE MCP] invokeViaOpencode called for "${agentName}" — this path is forbidden.`);
  }

  // GATE: Centralized spawn gate — blocks all agent spawning by default
  spawnGate.assertAllowed("opencode-cli-invoker");

  // BLOCKED: Never spawn real opencode processes during tests — causes
  // runaway agent processes and non-deterministic test behavior.
  if (process.env.NODE_ENV === "test" || process.env.VITEST) {
    throw new Error(
      `Agent spawning is disabled in test environment. ` +
        `Agent "${agentName}" cannot be spawned during tests.`,
    );
  }

  // GOVERNED: Auto-spawning of OpenCode agents is now protected by the
  // AgentSpawnGovernor singleton and the agent_spawn feature flag.
  const spawnConfig = getAgentSpawn();
  if (!spawnConfig?.enabled) {
    throw new Error(
      `Auto-spawning of OpenCode agents is disabled. ` +
        `Agent "${agentName}" cannot be spawned automatically. ` +
        `Set agent_spawn.enabled=true in features.json to re-enable.`,
    );
  }

  // Authorize spawn via the singleton governor
  const auth = await agentSpawnGovernor.authorizeSpawn({
    agentType: agentName,
    operation: "inference-cycle-invoke",
  });
  if (!auth.authorized) {
    throw new Error(`Spawn denied by governance for "${agentName}": ${auth.reason}`);
  }
  const trackingId = auth.trackingId;

  if (opencodeAvailable === null) {
    try {
      execSync("which opencode", { stdio: "pipe", timeout: 3000 });
      opencodeAvailable = true;
    } catch {
      opencodeAvailable = false;
    }
  }

  if (!opencodeAvailable) {
    if (trackingId) await agentSpawnGovernor.failSpawn(trackingId, new Error("opencode CLI not available"));
    throw new Error("opencode CLI is not available in PATH");
  }

  // Resolve the actual opencode project root (where .opencode/ config lives)
  const opencodeRoot = resolveOpencodeRoot(projectRoot);

  frameworkLogger.log("inference-cycle", "opencode-spawn-start", "info", {
    agentName,
    trackingId,
    opencodeRoot,
  });

  // getExecutionCoordinator/execution-planner removed per v2 cleanup — warning log only
  frameworkLogger.log('execution', 'opencode-invocation-mediation-skipped', 'warning', {
    reason: 'execution-planner removed (opencode invocation continues via fallback)',
    agentName,
  });

  return new Promise((resolve, reject) => {
    const timeout = agentName === "architect" ? 300000 : 120000;
    let settled = false;
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        child.kill("SIGKILL");
        if (trackingId) {
          agentSpawnGovernor.failSpawn(trackingId, new Error(`opencode ${agentName} timed out`)).catch(() => {});
        }
        reject(new Error(`opencode ${agentName} timed out`));
      }
    }, timeout);

    const child = spawn(
      "opencode",
      ["run", "--agent", agentName, "--message", prompt, "--format", "json"],
      {
        cwd: opencodeRoot,
          env: { ...process.env, NODE_ENV: "production", OPENCODE_MCP_CONFIG: "./node_modules/0xray/opencode.json" },
        stdio: ["ignore", "pipe", "pipe"],
      },
    );

    let stdout = "";
    child.stdout?.on("data", (d: Buffer) => {
      stdout += d.toString();
    });
    child.stderr?.on("data", () => {
      /* ignore */
    });

    child.on("close", async (code) => {
      clearTimeout(timer);
      if (settled) return;
      settled = true;
      if (code === 0 && stdout.trim()) {
        if (trackingId) {
          await agentSpawnGovernor.completeSpawn(trackingId, true).catch(() => {});
        }
        frameworkLogger.log("inference-cycle", "opencode-spawn-success", "info", { agentName, trackingId });
        const textResponse = extractTextFromNdjson(stdout.trim());
        if (textResponse) {
          resolve(textResponse);
        } else {
          resolve(stdout.trim());
        }
      } else {
        const error = new Error(`${agentName} exited ${code}`);
        if (trackingId) {
          await agentSpawnGovernor.failSpawn(trackingId, error).catch(() => {});
        }
        frameworkLogger.log("inference-cycle", "opencode-spawn-failed", "error", { agentName, trackingId, code });
        reject(error);
      }
    });

    child.on("error", async (err) => {
      clearTimeout(timer);
      if (!settled) {
        settled = true;
        if (trackingId) {
          await agentSpawnGovernor.failSpawn(trackingId, err).catch(() => {});
        }
        frameworkLogger.log("inference-cycle", "opencode-spawn-error", "error", { agentName, trackingId, error: err.message });
        reject(err);
      }
    });
  });
}

function extractTextFromNdjson(output: string): string {
  const texts: string[] = [];
  for (const line of output.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const obj = JSON.parse(trimmed);
      if (obj.type === "text" && obj.part?.text) {
        texts.push(obj.part.text);
      }
    } catch {
      // skip non-JSON lines
    }
  }
  return texts.join("\n").trim();
}

function resolveOpencodeRoot(projectRoot: string): string {
  const configDir = getConfigDir(projectRoot);
  let dir = projectRoot;
  for (let i = 0; i < 10; i++) {
    if (fs.existsSync(path.join(dir, ".opencode"))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  const cwd = process.cwd();
  if (fs.existsSync(path.join(cwd, ".opencode"))) return cwd;
  return projectRoot;
}

// OpenCode execution owned by Autonomous Engine (thin fallback).
