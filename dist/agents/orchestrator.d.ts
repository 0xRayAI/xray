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
export declare const orchestrator: AgentConfig;
//# sourceMappingURL=orchestrator.d.ts.map