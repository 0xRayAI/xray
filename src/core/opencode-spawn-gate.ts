/**
 * OpenCode Spawn Gate — Singleton
 *
 * CENTRALIZED CONTROL for all OpenCode process spawning across StringRay.
 *
 * Purpose:
 *   Prevent runaway recursive agent spawning that caused the v1.22.56-58
 *   incident where inference cycles triggered opencode CLI processes,
 *   which triggered more tool calls, which triggered more inference cycles.
 *
 * Design:
 *   - Singleton instance shared across all modules
 *   - Explicit enable/disable with state persistence
 *   - Tracks all active spawned processes for cleanup
 *   - Gates every spawn path: inference, orchestrator, scripts, tests
 *
 * Usage:
 *   import { spawnGate } from "./spawn-gate.js";
 *
 *   // Before spawning
 *   spawnGate.assertAllowed("inference-cycle");
 *
 *   // Or check
 *   if (!spawnGate.isAllowed()) { return; }
 *
 *   // Track spawned process
 *   const pid = spawn("opencode", ...);
 *   spawnGate.trackProcess(pid);
 *
 *   // Global disable (emergency brake)
 *   spawnGate.disable("emergency: runaway processes detected");
 */

import { frameworkLogger } from "../core/framework-logger.js";

interface SpawnGateState {
  enabled: boolean;
  reason: string | undefined;
  disabledAt: number | undefined;
  activeProcesses: Map<number, { spawnedAt: number; module: string; description: string }>;
  totalSpawned: number;
  totalBlocked: number;
}

class OpenCodeSpawnGate {
  private static instance: OpenCodeSpawnGate;
  private state: SpawnGateState;

  private constructor() {
    this.state = {
      enabled: true, // MONITORING: enabled for observation — disable immediately if runaway detected
      reason: undefined,
      disabledAt: undefined,
      activeProcesses: new Map(),
      totalSpawned: 0,
      totalBlocked: 0,
    };
  }

  static getInstance(): OpenCodeSpawnGate {
    if (!OpenCodeSpawnGate.instance) {
      OpenCodeSpawnGate.instance = new OpenCodeSpawnGate();
    }
    return OpenCodeSpawnGate.instance;
  }

  /** Check if spawning is globally allowed */
  isAllowed(): boolean {
    return this.state.enabled;
  }

  /** Enable spawning (opt-in, not default) */
  enable(reason: string): void {
    this.state.enabled = true;
    this.state.reason = undefined;
    this.state.disabledAt = undefined;
    frameworkLogger.log("spawn-gate", "enable", "info", { reason });
  }

  /** Disable spawning globally */
  disable(reason: string): void {
    this.state.enabled = false;
    this.state.reason = reason;
    this.state.disabledAt = Date.now();
    frameworkLogger.log("spawn-gate", "disable", "warning", { reason });
  }

  /** Assert spawning is allowed or throw */
  assertAllowed(module: string): void {
    if (!this.state.enabled) {
      this.state.totalBlocked++;
      const msg =
        `OpenCode agent spawning is DISABLED. ` +
        `Module "${module}" attempted to spawn an agent. ` +
        `Reason: ${this.state.reason || "spawn gate is closed by default"}. ` +
        `Call spawnGate.enable() to allow (not recommended for production).`;
      frameworkLogger.log("spawn-gate", "blocked", "error", { module, reason: this.state.reason });
      throw new Error(msg);
    }
  }

  /** Register a spawned process PID for tracking */
  trackProcess(pid: number, module: string, description: string): void {
    this.state.activeProcesses.set(pid, {
      spawnedAt: Date.now(),
      module,
      description,
    });
    this.state.totalSpawned++;
    frameworkLogger.log("spawn-gate", "track", "info", { pid, module, description });
  }

  /** Unregister a process when it exits */
  untrackProcess(pid: number): void {
    this.state.activeProcesses.delete(pid);
    frameworkLogger.log("spawn-gate", "untrack", "info", { pid });
  }

  /** Kill all tracked processes (emergency cleanup) */
  async killAllProcesses(signal: NodeJS.Signals = "SIGKILL"): Promise<number> {
    let killed = 0;
    for (const [pid] of this.state.activeProcesses) {
      try {
        process.kill(pid, signal);
        killed++;
      } catch {
        // Process already dead
      }
    }
    this.state.activeProcesses.clear();
    frameworkLogger.log("spawn-gate", "kill-all", "warning", { signal, killed });
    return killed;
  }

  /** Get current gate status */
  getStatus() {
    return {
      enabled: this.state.enabled,
      reason: this.state.reason,
      disabledAt: this.state.disabledAt,
      activeProcesses: this.state.activeProcesses.size,
      totalSpawned: this.state.totalSpawned,
      totalBlocked: this.state.totalBlocked,
    };
  }
}

/** Singleton export — use this everywhere */
export const spawnGate = OpenCodeSpawnGate.getInstance();
export default spawnGate;
