/**
 * Monitoring polls must see the same agent the full snapshot would,
 * without copying every spawn map.
 */

import { afterAll, describe, expect, it } from "vitest";
import { agentSpawnGovernor } from "./agent-spawn-governor.js";
import {
  type AgentOrchestrationState,
  EnhancedMultiAgentOrchestrator,
  type SpawnedAgent,
} from "./enhanced-multi-agent-orchestrator.js";

function makeAgent(
  id: string,
  status: SpawnedAgent["status"],
): SpawnedAgent {
  return {
    id,
    agentType: "researcher",
    task: `task-${id}`,
    status,
    startTime: 1,
    progress: status === "completed" ? 100 : 10,
    clickable: true,
    monitorable: true,
    cleanupRequired: false,
    spawnTrackingId: undefined,
  };
}

function stateOf(
  orchestrator: EnhancedMultiAgentOrchestrator,
): AgentOrchestrationState {
  return (orchestrator as unknown as { state: AgentOrchestrationState }).state;
}

describe("getMonitoredAgent", () => {
  afterAll(() => {
    agentSpawnGovernor.destroy();
  });

  it("matches snapshot precedence without cloning the maps", () => {
    const orchestrator = new EnhancedMultiAgentOrchestrator(undefined, true);
    const state = stateOf(orchestrator);

    const active = makeAgent("only-active", "active");
    const completed = makeAgent("only-completed", "completed");
    const failed = makeAgent("only-failed", "failed");
    const shadowedActive = makeAgent("shadowed", "active");
    const shadowedFailed = makeAgent("shadowed", "failed");
    shadowedFailed.error = "boom";

    state.activeAgents.set(active.id, active);
    state.activeAgents.set(shadowedActive.id, shadowedActive);
    state.completedAgents.set(completed.id, completed);
    state.failedAgents.set(failed.id, failed);
    state.failedAgents.set(shadowedFailed.id, shadowedFailed);

    const snapshot = orchestrator.getMonitoringInterface();

    expect(orchestrator.getMonitoredAgent("only-active")).toBe(active);
    expect(orchestrator.getMonitoredAgent("only-completed")).toBe(completed);
    expect(orchestrator.getMonitoredAgent("only-failed")).toBe(failed);
    expect(orchestrator.getMonitoredAgent("shadowed")).toBe(shadowedFailed);
    expect(orchestrator.getMonitoredAgent("missing")).toBeUndefined();

    expect(orchestrator.getMonitoredAgent("only-active")).toBe(
      snapshot["only-active"],
    );
    expect(orchestrator.getMonitoredAgent("only-completed")).toBe(
      snapshot["only-completed"],
    );
    expect(orchestrator.getMonitoredAgent("only-failed")).toBe(
      snapshot["only-failed"],
    );
    expect(orchestrator.getMonitoredAgent("shadowed")).toBe(snapshot["shadowed"]);
    expect(snapshot["shadowed"]?.status).toBe("failed");
    expect(snapshot["shadowed"]?.error).toBe("boom");
  });

  it("looks up one agent among a large pool under a generous ceiling", () => {
    const orchestrator = new EnhancedMultiAgentOrchestrator(undefined, true);
    const state = stateOf(orchestrator);
    const pool = 4000;

    for (let i = 0; i < pool; i++) {
      const id = `agent-${i}`;
      const bucket = i % 3;
      const agent = makeAgent(
        id,
        bucket === 0 ? "active" : bucket === 1 ? "completed" : "failed",
      );
      if (bucket === 0) state.activeAgents.set(id, agent);
      else if (bucket === 1) state.completedAgents.set(id, agent);
      else state.failedAgents.set(id, agent);
    }

    const targetId = "agent-2500";
    const fromSnapshot = orchestrator.getMonitoringInterface()[targetId];
    expect(orchestrator.getMonitoredAgent(targetId)).toBe(fromSnapshot);

    const lookups = 2000;
    const started = performance.now();
    for (let i = 0; i < lookups; i++) {
      orchestrator.getMonitoredAgent(targetId);
    }
    const elapsed = performance.now() - started;

    expect(elapsed).toBeLessThan(500);
  });
});
