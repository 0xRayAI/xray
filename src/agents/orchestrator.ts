import type { AgentConfig } from "./types.js";

/**
 * Orchestrator Agent - DEPRECATED
 * 
 * ARCHITECTURE CHANGE (2026-04-17):
 * 
 * Orchestration is now handled at the plugin level by agent-delegator.ts:
 * - Complexity analysis determines complexity score (0-100)
 * - At complexity >= 50, orchestrator-led strategy is used
 * - agent-delegator handles multi-agent coordination automatically
 * 
 * This agent is kept for backwards compatibility but is not used.
 * The delegation system (complexity-core.ts + agent-delegator.ts) 
 * is the real orchestrator at the framework level.
 * 
 * @deprecated Use agent-delegator for orchestration instead.
 */

export const orchestrator: AgentConfig = {
  name: "orchestrator",
  capabilities: [
    "multi-agent-orchestration",
    "workflow-management",
    "task-delegation",
    "conflict-resolution",
    "session-management",
  ],
  maxComplexity: 0,
  enabled: false,
  description:
    "DEPRECATED - Orchestration is now plugin-level via agent-delegator. Use complexity analysis in delegation system instead.",
  mode: "subagent",
  system: `This agent is DEPRECATED. 

Orchestration is handled automatically by the 0xRay plugin's agent-delegator:
- Complexity analysis runs on every task
- At complexity >= 50, multi-agent coordination is automatic
- agent-delegator.ts handles agent selection and coordination

Do NOT use this agent. The delegation system handles orchestration.`,
  temperature: 0.1,
  tools: {
    include: [],
  },
  permission: {
    edit: "allow",
    bash: {},
  },
};