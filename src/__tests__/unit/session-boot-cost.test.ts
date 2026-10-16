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

  it("keeps a pre-seeded interactions key when another session is recorded", () => {
    const stateManager = new XrayStateManager();
    const seeded = { timestamp: 1, duration: 9, success: true, agentId: "keep" };
    stateManager.set("monitor:interactions", {
      seeded: [seeded],
    });
    stateManager.set("state_manager:dependencies", {
      seeded: {
        sessionId: "seeded",
        dependsOn: ["parent"],
        dependedBy: [],
        state: "active",
        priority: 1,
        metadata: { keep: true },
      },
    });
    const shared = new Map([
      ["k", { value: "kept", fromSessionId: "s", timestamp: 1 }],
    ]);
    stateManager.set("state_manager:groups", {
      seeded: {
        groupId: "seeded",
        sessionIds: ["s"],
        coordinatorSession: "s",
        state: "active",
        sharedState: shared,
        createdAt: 1,
      },
    });
    stateManager.set("state_manager:failover", {
      seeded: {
        sessionId: "seeded",
        backupCoordinators: ["backup"],
        failoverThreshold: 1,
        autoFailover: false,
      },
    });

    const interactionReads: string[] = [];
    const originalGet = stateManager.get.bind(stateManager);
    const originalSet = stateManager.set.bind(stateManager);
    stateManager.get = ((key: string) => {
      if (key === "monitor:interactions") interactionReads.push("get");
      return originalGet(key);
    }) as typeof stateManager.get;
    stateManager.set = ((key: string, value: unknown) => {
      if (key === "monitor:interactions") interactionReads.push("set");
      return originalSet(key, value);
    }) as typeof stateManager.set;

    const monitor = new SessionMonitor(
      stateManager,
      { getSessionStatus: () => ({ active: true, agentCount: 1 }) } as never,
      { getSessionMetadata: () => undefined } as never,
      { enableAlerts: false, enableMetrics: false },
    );
    const sessions = new SessionStateManager(stateManager, {
      shareContext: () => undefined,
      getSessionStatus: () => ({ active: true, agentCount: 1 }),
    } as never);

    expect(interactionReads).toEqual(["get"]);
    expect(monitor.getInteractionHistory("seeded")).toEqual([seeded]);
    expect(sessions.getDependencyChain("seeded")).toEqual({
      dependencies: ["parent"],
      dependents: [],
      canStart: false,
    });
    expect(sessions.getGroupState("seeded", "k")).toBe("kept");
    expect(sessions.getCoordinationStats().failoverConfigs).toBe(1);

    monitor.recordInteraction("fresh", {
      timestamp: 2,
      duration: 4,
      success: false,
    });
    sessions.registerDependency("fresh", ["seeded"], { role: "fresh" });
    sessions.createSessionGroup("fresh-group", ["s2"], "s2");
    sessions.configureFailover("fresh", ["other"], 2, true);

    const interactions = stateManager.get<Record<string, { duration: number; agentId?: string }[]>>(
      "monitor:interactions",
    );
    expect(interactions?.seeded).toEqual([seeded]);
    expect(interactions?.fresh?.map((item) => item.duration)).toEqual([4]);
    expect(interactionReads[0]).toBe("get");
    expect(interactionReads).toContain("set");

    const dependencies = stateManager.get<Record<string, {
      dependsOn: string[];
      dependedBy: string[];
      metadata: { keep?: boolean; role?: string };
      state: string;
    }>>("state_manager:dependencies");
    expect(dependencies?.seeded?.metadata).toEqual({ keep: true });
    expect(dependencies?.seeded?.state).toBe("active");
    expect(dependencies?.seeded?.dependedBy).toEqual(["fresh"]);
    expect(dependencies?.fresh?.dependsOn).toEqual(["seeded"]);
    expect(dependencies?.fresh?.metadata).toEqual({ role: "fresh" });

    const groups = stateManager.get<Record<string, { sessionIds: string[] }>>("state_manager:groups");
    expect(groups?.seeded?.sessionIds).toEqual(["s"]);
    expect(groups?.["fresh-group"]?.sessionIds).toEqual(["s2"]);
    expect(sessions.getGroupState("seeded", "k")).toBe("kept");

    const failover = stateManager.get<Record<string, { backupCoordinators: string[] }>>(
      "state_manager:failover",
    );
    expect(failover?.seeded?.backupCoordinators).toEqual(["backup"]);
    expect(failover?.fresh?.backupCoordinators).toEqual(["other"]);
    expect(sessions.getCoordinationStats().failoverConfigs).toBe(2);
  });

  it("publishes one health copy and saves the status that matches the issues", async () => {
    const stateManager = new XrayStateManager();
    const original = {
      sessionId: "a",
      status: "healthy" as const,
      lastCheck: 10,
      responseTime: 20,
      errorCount: 0,
      activeAgents: 1,
      memoryUsage: 30,
      issues: [] as string[],
    };
    const sibling = {
      sessionId: "b",
      status: "degraded" as const,
      lastCheck: 4,
      responseTime: 5,
      errorCount: 1,
      activeAgents: 2,
      memoryUsage: 6,
      issues: ["kept"],
    };
    stateManager.set("monitor:health", { a: original, b: sibling });

    let seen:
      | {
          status: string;
          activeAgents: number;
          issues: string[];
          lastCheck: number;
          responseTime: number;
          memoryUsage: number;
          errorCount: number;
          storedStatus: string;
          storedAgents: number;
          storedIssues: string[];
          storedLastCheck: number;
          storedResponse: number;
        }
      | undefined;

    const monitor = new SessionMonitor(
      stateManager,
      { getSessionStatus: () => ({ active: false, agentCount: 7 }) } as never,
      {
        getSessionMetadata: () => {
          const live = monitor.getHealthStatus("a");
          const stored = stateManager.get<Record<string, {
            status: string;
            activeAgents: number;
            issues: string[];
            lastCheck: number;
            responseTime: number;
          }>>("monitor:health");
          const row = stored?.a;
          seen = {
            status: live?.status ?? "",
            activeAgents: live?.activeAgents ?? -1,
            issues: [...(live?.issues ?? [])],
            lastCheck: live?.lastCheck ?? -1,
            responseTime: live?.responseTime ?? -1,
            memoryUsage: live?.memoryUsage ?? -1,
            errorCount: live?.errorCount ?? -1,
            storedStatus: row?.status ?? "",
            storedAgents: row?.activeAgents ?? -1,
            storedIssues: [...(row?.issues ?? [])],
            storedLastCheck: row?.lastCheck ?? -1,
            storedResponse: row?.responseTime ?? -1,
          };
          return undefined;
        },
      } as never,
      { enableAlerts: false, enableMetrics: false },
    );

    const health = await monitor.performHealthCheck("a");

    expect(seen).toEqual({
      status: "healthy",
      activeAgents: 1,
      issues: [],
      lastCheck: 10,
      responseTime: 20,
      memoryUsage: 30,
      errorCount: 0,
      storedStatus: "healthy",
      storedAgents: 1,
      storedIssues: [],
      storedLastCheck: 10,
      storedResponse: 20,
    });
    expect(original).toEqual({
      sessionId: "a",
      status: "healthy",
      lastCheck: 10,
      responseTime: 20,
      errorCount: 0,
      activeAgents: 1,
      memoryUsage: 30,
      issues: [],
    });

    expect(health.issues).toContain("Session is not active");
    expect(health.status).toBe("degraded");
    expect(health.activeAgents).toBe(7);
    expect(health.lastCheck).toBeGreaterThan(10);
    expect(health.responseTime).toBeGreaterThanOrEqual(0);

    const stored = stateManager.get<Record<string, {
      sessionId: string;
      status: string;
      issues: string[];
      activeAgents: number;
      lastCheck: number;
      responseTime: number;
    }>>("monitor:health");
    expect(stored?.a).toBe(health);
    expect(stored?.a?.status).toBe("degraded");
    expect(stored?.a?.issues).toContain("Session is not active");
    expect(stored?.a?.status).not.toBe("healthy");
    expect(stored?.b).toBe(sibling);
    expect(stored?.b?.issues).toEqual(["kept"]);
  });
});
