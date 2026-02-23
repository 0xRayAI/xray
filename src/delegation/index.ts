/**
 * StringRay AI v1.3.4 - Delegation System
 *
 * Complete automatic multi-agent delegation system with complexity assessment
 * and session-based coordination.
 *
 * @version 1.1.0
 * @since 2026-01-07
 */

export {
  ComplexityAnalyzer,
  complexityAnalyzer,
} from "./complexity-analyzer.js";
export { AgentDelegator, createAgentDelegator } from "./agent-delegator.js";
export {
  SessionCoordinator,
  createSessionCoordinator,
} from "./session-coordinator.js";
export {
  TaskSkillRouter,
  taskSkillRouter,
  createTaskSkillRouter,
  routeTaskToAgent,
  preprocessTask,
} from "./task-skill-router.js";

// Re-export types
export type {
  ComplexityMetrics,
  ComplexityScore,
  ComplexityThresholds,
} from "./complexity-analyzer.js";

export type {
  DelegationRequest,
  DelegationResult,
  AgentCapability,
  DelegationMetrics,
} from "./agent-delegator.js";

export type {
  SessionContext,
  AgentInteraction,
  ConflictRecord,
  CoordinationState,
  Communication,
  SessionMetrics,
} from "./session-coordinator.js";

// Types are exported from task-skill-router.d.ts declaration file
