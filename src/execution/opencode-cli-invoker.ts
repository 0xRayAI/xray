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
import { getConfigDir } from "../core/config-paths.js";

// Module-level cache for opencode availability check
let opencodeAvailable: boolean | null = null;

// thinDispatch + governance gate registration for 'opencode-invocation' flow (SSOT)
try {
  import('../mcps/orchestrator/execution/execution-planner.js')
    .then(({ getExecutionCoordinator }) => {
      const coord = getExecutionCoordinator();
      coord.registerExecutionFlow({
        name: 'opencode-invocation',
        type: 'engine-execution',
        ownerModule: 'src/execution',
        capabilities: ['legacy-opencode-spawn', 'agent-invocation', 'fallback-execution'],
        metadata: { note: 'Opencode invocation flow under orchestrator SSOT funnel' },
      });
    })
    .catch(() => {
      // Silent safe degradation
      frameworkLogger.log('execution', 'coordinator-registration-skipped', 'warning', {
        reason: 'dynamic import failed (safe; opencode invocation unchanged)',
      });
    });
} catch {
  // Sync outer guard (defensive)
  frameworkLogger.log('execution', 'coordinator-registration-error', 'warning', {
    reason: 'outer guard (opencode invocation unaffected)',
  });
}

export async function invokeViaOpencode(
  agentName: string,
  prompt: string,
  projectRoot: string = process.cwd(),
): Promise<string> {
  // In pure MCP mode we must never reach here
  if (process.env.XRAY_FORCE_MCP_GOVERNANCE === "true") {
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

  const trackingId: string | undefined = undefined;

  if (opencodeAvailable === null) {
    try {
      execSync("which opencode", { stdio: "pipe", timeout: 3000 });
      opencodeAvailable = true;
    } catch {
      opencodeAvailable = false;
    }
  }

  if (!opencodeAvailable) {
    throw new Error("opencode CLI is not available in PATH");
  }

  // Resolve the actual opencode project root (where .opencode/ config lives)
  const opencodeRoot = resolveOpencodeRoot(projectRoot);

  frameworkLogger.log("inference-cycle", "opencode-spawn-start", "info", {
    agentName,
    trackingId,
    opencodeRoot,
  });

  // thinDispatch mediation for 'opencode-invocation' flow (SSOT)
  try {
    import('../mcps/orchestrator/execution/execution-planner.js')
      .then(({ getExecutionCoordinator }) => {
        const coord = getExecutionCoordinator();
        const _dispatchAck = coord.thinDispatch('opencode-invocation', {
          handoff: 'legacy-opencode-execution',
          agentName,
        });
      })
      .catch(() => {
        frameworkLogger.log('execution', 'coordinator-dispatch-skipped', 'warning', {
          reason: 'dynamic import failed (safe)',
        });
      });
  } catch {
    frameworkLogger.log('execution', 'coordinator-dispatch-error', 'warning', {
      reason: 'outer guard',
    });
  }

  try {
    const { getExecutionCoordinator } = await import('../mcps/orchestrator/execution/execution-planner.js');
    const coord = getExecutionCoordinator();
    const govVerdict = await coord.requestGovernanceDecisionBeforeDispatch(
      'opencode-invocation',
      `opencode-invocation continuation (legacy OpenCode CLI for agent "${agentName}"). Current dispatch state (Gauge via centralized helper) requires explicit Governance approval before actual CLI invocation / spawn of governed work via the legacy OpenCode path.`
    );
    await frameworkLogger.log('execution', 'governance-execution-verdict-received', 'info', {
      agentName,
      decision: govVerdict.decision,
      reasoningPreview: (govVerdict.reasoning || '').slice(0, 160),
      governanceCallId: govVerdict.governanceCallId,
      note: 'centralized governance gate exercised at opencode-invocation',
    });

    if (govVerdict.decision !== 'continue') {
      // Respect the non-bypassable verdict: block before any CLI invocation work.
      // No spawn, no opencode process launched.
      throw new Error(`GOVERNANCE_VERDICT: ${govVerdict.decision} — ${govVerdict.reasoning} (governanceCallId: ${govVerdict.governanceCallId || 'n/a'})`);
    }
    // 'continue' only — proceed with the now-governed opencode CLI invocation below.
  } catch (gateErr) {
    const msg = gateErr instanceof Error ? gateErr.message : String(gateErr);

    if (msg.includes('GOVERNANCE_VERDICT')) {
      throw gateErr; // propagate exact block from verdict check
    }
    // Setup or unexpected error in gate path: fail-closed to pause (consistent with hook tolerance)
    await frameworkLogger.log('execution', 'governance-execution-gate-error', 'error', {
      error: msg,
      decision: 'pause (fail-closed at wire site)',
      note: 'governance gate path error treated as non-continue (no opencode CLI invocation performed)',
    });
    throw new Error(`GOVERNANCE_VERDICT: pause — Gate error at opencode-invocation wire: ${msg}`);
  }

  return new Promise((resolve, reject) => {
    const timeout = agentName === "architect" ? 300000 : 120000;
    let settled = false;
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        child.kill("SIGKILL");
        if (trackingId) {
        }
        reject(new Error(`opencode ${agentName} timed out`));
      }
    }, timeout);

    const child = spawn(
      "opencode",
      ["run", "--agent", agentName, "--message", prompt, "--format", "json"],
      {
        cwd: opencodeRoot,
        env: { ...process.env, NODE_ENV: "production", OPENCODE_MCP_CONFIG: "./node_modules/xray/opencode.json" },
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
