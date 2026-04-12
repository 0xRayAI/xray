/**
 * Orchestrator MCP Server Module
 *
 * Modular orchestrator server with clean facade pattern
 *
 * Architecture:
 * - server.ts: Main facade (OrchestratorServer class)
 * - types.ts: Type definitions
 * - config/agent-capabilities.ts: Agent capability management
 * - handlers/task-handler.ts: Task orchestration handler
 * - handlers/complexity-handler.ts: Complexity analysis handler
 * - handlers/status-handler.ts: Status query handler
 * - execution/execution-planner.ts: Execution planning logic
 */
export { OrchestratorServer, createOrchestratorServer } from './server.js';
export type { AgentCapability, OrchestrationTask, ExecutionPlan, OrchestrationResult, ComplexityAnalysis, TaskValidation, OrchestrationStatus, TaskExecutionContext, } from './types.js';
export { AgentCapabilitiesManager, getAgentCapabilitiesManager } from './config/agent-capabilities.js';
export { ExecutionPlanner, getExecutionPlanner } from './execution/execution-planner.js';
//# sourceMappingURL=index.d.ts.map