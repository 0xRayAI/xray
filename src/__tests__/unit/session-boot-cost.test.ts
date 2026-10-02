import { describe, expect, it } from "vitest";
import { SessionCleanupManager } from "../../session/session-cleanup-manager.js";
import { SessionMonitor } from "../../session/session-monitor.js";
import { SessionStateManager } from "../../session/session-state-manager.js";
import { XrayStateManager } from "../../state/state-manager.js";

describe("session boot and field writes", () => {
  it("reads cleanup metadata once and keeps every session on a field write", () => {
    const stateManager = new XrayStateManager();
    stateManager.set("cleanup:session_metadata", {
      a: {
        sessionId: "a",
        createdAt: 1,
        lastActivity: 2,
        ttlMs: 9,
        isActive: true,
        agentCount: 0,
        memoryUsage: 0,
      },
      b: {
        sessionId: "b",
        createdAt: 3,
        lastActivity: 4,
        ttlMs: 9,
        isActive: true,
        agentCount: 1,
        memoryUsage: 5,
      },
    });

    let reads = 0;
    const originalGet = stateManager.get.bind(stateManager);
    stateManager.get = ((key: string) => {
      if (key === "cleanup:session_metadata") reads += 1;
      return originalGet(key);
    }) as typeof stateManager.get;

    const cleanup = new SessionCleanupManager(stateManager, {
      enableAutoCleanup: false,
    });
    expect(reads).toBe(1);

    cleanup.updateActivity("a");
    expect(cleanup.getSessionMetadata("b")?.memoryUsage).toBe(5);
    expect(cleanup.listSessions()).toHaveLength(2);
    expect(reads).toBe(1);

    const stored = stateManager.get<Record<string, { sessionId: string; lastActivity: number; agentCount: number; memoryUsage: number }>>(
      "cleanup:session_metadata",
    );
    expect(stored?.a?.sessionId).toBe("a");
    expect(stored?.a?.lastActivity).toBeGreaterThan(2);
    expect(stored?.b?.lastActivity).toBe(4);
    expect(stored?.b?.agentCount).toBe(1);
    expect(stored?.b?.memoryUsage).toBe(5);
  });

  it("reloads monitor health and metrics once without dropping sibling sessions", async () => {
    const stateManager = new XrayStateManager();
    stateManager.set("monitor:health", {
      a: {
        sessionId: "a",
        status: "healthy",
        lastCheck: 1,
        responseTime: 2,
        errorCount: 0,
        activeAgents: 1,
        memoryUsage: 3,
        issues: [],
      },
      b: {
        sessionId: "b",
        status: "degraded",
        lastCheck: 4,
        responseTime: 5,
        errorCount: 1,
        activeAgents: 2,
        memoryUsage: 6,
        issues: ["kept"],
      },
    });
    stateManager.set("monitor:metrics", {
      a: [
        {
          sessionId: "a",
          timestamp: 1,
          totalInteractions: 1,
          successfulInteractions: 1,
          failedInteractions: 0,
          averageResponseTime: 5,
          conflictResolutionRate: 1,
          coordinationEfficiency: 1,
          memoryUsage: 1,
          agentCount: 1,
        },
      ],
    });

    let healthReads = 0;
    let metricReads = 0;
    const originalGet = stateManager.get.bind(stateManager);
    stateManager.get = ((key: string) => {
      if (key === "monitor:health") healthReads += 1;
      if (key === "monitor:metrics") metricReads += 1;
      return originalGet(key);
    }) as typeof stateManager.get;

    const monitor = new SessionMonitor(
      stateManager,
      { getSessionStatus: () => ({ active: true, agentCount: 1 }) } as never,
      { getSessionMetadata: () => undefined } as never,
      { enableAlerts: false, enableMetrics: false },
    );

    expect(healthReads).toBe(1);
    expect(metricReads).toBe(1);
    expect(monitor.getHealthStatus("a")?.memoryUsage).toBe(3);
    expect(monitor.getHealthStatus("b")?.issues).toEqual(["kept"]);
    expect(monitor.getMetricsHistory("a")[0]?.averageResponseTime).toBe(5);

    monitor.registerSession("c");
    expect(healthReads).toBe(1);
    expect(metricReads).toBe(1);

    const health = await monitor.performHealthCheck("a");
    expect(health.sessionId).toBe("a");
    expect(health.status).toBeDefined();
    expect(health.lastCheck).toBeGreaterThan(0);
    expect(health.responseTime).toBeGreaterThanOrEqual(0);
    expect(health.errorCount).toBeGreaterThanOrEqual(0);
    expect(health.activeAgents).toBeGreaterThanOrEqual(0);
    expect(health.memoryUsage).toBeGreaterThanOrEqual(0);
    expect(Array.isArray(health.issues)).toBe(true);
    expect(healthReads).toBe(1);

    monitor.collectMetrics("a");
    expect(metricReads).toBe(1);

    const storedHealth = stateManager.get<Record<string, { sessionId: string; issues: string[] }>>("monitor:health");
    const storedMetrics = stateManager.get<Record<string, { averageResponseTime: number }[]>>("monitor:metrics");
    expect(storedHealth?.a?.sessionId).toBe("a");
    expect(storedHealth?.b?.sessionId).toBe("b");
    expect(storedHealth?.b?.issues).toEqual(["kept"]);
    expect(storedHealth?.c?.sessionId).toBe("c");
    expect(storedMetrics?.a?.[0]?.averageResponseTime).toBe(5);
    expect(storedMetrics?.a?.length).toBe(2);

    monitor.recordInteraction("a", { timestamp: Date.now(), duration: 100, success: true });
    monitor.recordInteraction("b", { timestamp: Date.now(), duration: 200, success: false });
    monitor.recordInteraction("a", { timestamp: Date.now(), duration: 300, success: true });
    const interactions = stateManager.get<Record<string, { duration: number }[]>>("monitor:interactions");
    expect(interactions?.a?.map((item) => item.duration)).toEqual([100, 300]);
    expect(interactions?.b?.map((item) => item.duration)).toEqual([200]);
  });

  it("keeps both dependency records when one field changes", () => {
    const stateManager = new XrayStateManager();
    const sessions = new SessionStateManager(stateManager, {} as never);
    sessions.registerDependency("a", [], { role: "a" });
    sessions.registerDependency("b", ["a"], { role: "b" });
    sessions.updateDependencyState("a", "active");

    const stored = stateManager.get<Record<string, {
      state: string;
      dependsOn: string[];
      dependedBy: string[];
      metadata: { role: string };
    }>>("state_manager:dependencies");
    expect(stored?.a?.state).toBe("active");
    expect(stored?.a?.metadata).toEqual({ role: "a" });
    expect(stored?.a?.dependedBy).toEqual(["b"]);
    expect(stored?.b?.dependsOn).toEqual(["a"]);
    expect(stored?.b?.metadata).toEqual({ role: "b" });
    expect(stored?.b?.state).toBe("pending");
  });
});
