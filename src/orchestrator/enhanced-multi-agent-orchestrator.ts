/**
 * Enhanced Multi-Agent Orchestration
 * Real functionality for agent lifecycle management and security
 */

import { StringRayStateManager } from "../state/state-manager.js";
import { frameworkLogger } from "../core/framework-logger.js";
import {
  ComplexityAnalyzer,
} from "../delegation/complexity-analyzer.js";
import { createAgentDelegator } from "../delegation/agent-delegator.js";
import { strRayConfigLoader } from "../core/config-loader.js";

export interface AgentSpawnRequest {
  agentType: string;
  task: string;
  context?: Record<string, any>;
  priority?: "low" | "medium" | "high" | "critical";
  timeout?: number;
  dependencies?: string[];
}

export interface SpawnedAgent {
  id: string;
  agentType: string;
  task: string;
  status: "spawning" | "active" | "completed" | "failed" | "cancelled";
  startTime: number;
  endTime?: number;
  result?: any;
  error?: string;
  cleanupRequired: boolean;
}

export interface AgentOrchestrationState {
  activeAgents: Map<string, SpawnedAgent>;
  pendingSpawns: AgentSpawnRequest[];
  completedAgents: Map<string, SpawnedAgent>;
  failedAgents: Map<string, SpawnedAgent>;
  agentDependencies: Map<string, string[]>;
  isMainOrchestrator: boolean;
}

export class EnhancedMultiAgentOrchestrator {
  private state: AgentOrchestrationState;
  private stateManager: StringRayStateManager;
  private complexityAnalyzer: ComplexityAnalyzer;
  private agentDelegator: any;

  constructor(
    stateManager?: StringRayStateManager,
    isMainOrchestrator: boolean = false,
  ) {
    this.stateManager = stateManager || new StringRayStateManager();
    this.complexityAnalyzer = new ComplexityAnalyzer();
    this.agentDelegator = createAgentDelegator(
      this.stateManager,
      strRayConfigLoader,
    );

    this.state = {
      activeAgents: new Map(),
      pendingSpawns: [],
      completedAgents: new Map(),
      failedAgents: new Map(),
      agentDependencies: new Map(),
      isMainOrchestrator,
    };
  }

  /**
   * SECURITY: Prevent subagents from spawning other subagents
   */
  private isCurrentlyExecutingAsSubagent(): boolean {
    return !this.state.isMainOrchestrator;
  }

  /**
   * Spawn an agent with dependency management
   */
  async spawnAgent(request: AgentSpawnRequest): Promise<SpawnedAgent> {
    // SECURITY: Prevent subagents from spawning more agents
    if (this.isCurrentlyExecutingAsSubagent()) {
      const error = new Error(
        `SECURITY: Subagent attempted to spawn another agent. ` +
        `Only the main orchestrator may spawn agents.`,
      );
      frameworkLogger.log("orchestrator", "security-violation", "error", {
        message: error.message,
        requestedAgent: request.agentType,
      });
      throw error;
    }

    const agentId = `agent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const spawnedAgent: SpawnedAgent = {
      id: agentId,
      agentType: request.agentType,
      task: request.task,
      status: "spawning",
      startTime: Date.now(),
      cleanupRequired: true,
    };

    this.state.activeAgents.set(agentId, spawnedAgent);

    // Handle dependencies
    if (request.dependencies && request.dependencies.length > 0) {
      this.state.agentDependencies.set(agentId, request.dependencies);

      const unmetDeps = request.dependencies.filter(
        (depId) =>
          !this.state.completedAgents.has(depId) ||
          this.state.completedAgents.get(depId)?.status !== "completed",
      );

      if (unmetDeps.length > 0) {
        frameworkLogger.log(
          "orchestrator",
          "agent-waiting-dependencies",
          "info",
          { agentId, waitingFor: unmetDeps },
        );
        this.state.pendingSpawns.push(request);
        return spawnedAgent;
      }
    }

    // Execute the agent
    this.executeAgent(spawnedAgent, request).catch((error) => {
      frameworkLogger.log(
        "orchestrator",
        "agent-execution-failed",
        "error",
        { agentId, error: error.message },
      );
    });

    return spawnedAgent;
  }

  /**
   * Execute agent using the agent delegator
   */
  private async executeAgent(
    agent: SpawnedAgent,
    request: AgentSpawnRequest,
  ): Promise<void> {
    try {
      agent.status = "active";

      // Execute via agent delegator
      const delegationRequest = {
        operation: "execute",
        files: [`task-${agent.id}.txt`],
        context: {
          agentName: request.agentType,
          taskDescription: request.task,
          priority: request.priority || "medium",
          timeout: request.timeout,
          ...request.context,
        },
      };

      const delegation = await this.agentDelegator.analyzeDelegation(delegationRequest);
      const result = await this.agentDelegator.executeDelegation(delegation, delegationRequest);

      // Mark as completed
      agent.status = "completed";
      agent.endTime = Date.now();
      agent.result = result;

      this.state.activeAgents.delete(agent.id);
      this.state.completedAgents.set(agent.id, agent);

      frameworkLogger.log(
        "orchestrator",
        "agent-completed",
        "info",
        {
          agentId: agent.id,
          agentType: agent.agentType,
          duration: agent.endTime - agent.startTime,
        },
      );

      // Check pending spawns
      this.checkPendingSpawns();
    } catch (error) {
      agent.status = "failed";
      agent.endTime = Date.now();
      agent.error = error instanceof Error ? error.message : String(error);

      this.state.activeAgents.delete(agent.id);
      this.state.failedAgents.set(agent.id, agent);

      frameworkLogger.log(
        "orchestrator",
        "agent-failed",
        "error",
        {
          agentId: agent.id,
          agentType: agent.agentType,
          error: agent.error,
        },
      );
    }
  }

  /**
   * Check for pending spawns that can now execute
   */
  private checkPendingSpawns(): void {
    const readySpawns = this.state.pendingSpawns.filter((spawn) => {
      if (!spawn.dependencies) return true;
      return spawn.dependencies.every(
        (depId) =>
          this.state.completedAgents.has(depId) &&
          this.state.completedAgents.get(depId)?.status === "completed",
      );
    });

    readySpawns.forEach((spawn) => {
      this.state.pendingSpawns = this.state.pendingSpawns.filter(
        (s) => s !== spawn,
      );
      this.spawnAgent(spawn);
    });
}

  /**
   * Get monitoring interface for external callers
   */
  getState(): Record<string, SpawnedAgent> {
    return {
      ...Object.fromEntries(this.state.activeAgents),
      ...Object.fromEntries(this.state.completedAgents),
      ...Object.fromEntries(this.state.failedAgents),
    };
  }

  /**
   * Cancel agent execution
   */
  async cancelAgent(agentId: string): Promise<boolean> {
    const agent = this.state.activeAgents.get(agentId);
    if (!agent) return false;

    agent.status = "cancelled";
    agent.endTime = Date.now();
    agent.cleanupRequired = true;

    this.state.activeAgents.delete(agentId);
    this.state.failedAgents.set(agentId, agent);

    frameworkLogger.log(
      "orchestrator",
      "agent-cancelled",
      "info",
      { agentId, agentType: agent.agentType },
    );

    return true;
  }

  /**
   * Get orchestration statistics
   */
  getStatistics(): {
    activeAgents: number;
    completedAgents: number;
    failedAgents: number;
    pendingSpawns: number;
  } {
    return {
      activeAgents: this.state.activeAgents.size,
      completedAgents: this.state.completedAgents.size,
      failedAgents: this.state.failedAgents.size,
      pendingSpawns: this.state.pendingSpawns.length,
    };
  }

  /**
   * Get monitoring interface for external callers
   */
  getMonitoringInterface(): Record<string, SpawnedAgent> {
    return {
      ...Object.fromEntries(this.state.activeAgents),
      ...Object.fromEntries(this.state.completedAgents),
      ...Object.fromEntries(this.state.failedAgents),
    };
  }

  /**
   * Shutdown orchestration system
   */
  async shutdown(): Promise<void> {
    // Cancel all active agents
    const activeAgentIds = Array.from(this.state.activeAgents.keys());
    await Promise.all(activeAgentIds.map((id) => this.cancelAgent(id)));

    frameworkLogger.log(
      "orchestrator",
      "🔄 Enhanced Multi-Agent Orchestrator shutdown complete",
      "info",
    );
  }
}

// Export singleton instance
export const enhancedMultiAgentOrchestrator =
  new EnhancedMultiAgentOrchestrator(undefined, true);
