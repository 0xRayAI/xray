/**
 * StrRay Orchestrator MCP Server
 * 
 * This is a re-export from the new modular structure.
 * For the full implementation, see: src/mcps/orchestrator/
 * 
 * @deprecated Use src/mcps/orchestrator/server.ts instead
 */

export { OrchestratorServer, createOrchestratorServer } from './orchestrator/server.js';

// Re-export types for backward compatibility
export type {
  AgentCapability,
  OrchestrationTask,
  ExecutionPlan,
  OrchestrationResult,
  ComplexityAnalysis,
  TaskValidation,
  OrchestrationStatus,
  TaskExecutionContext,
} from './orchestrator/types.js';

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const { createOrchestratorServer } = await import('./orchestrator/server.js');
  const server = createOrchestratorServer();
  server.start().catch((error) => {
    console.error('Failed to start orchestrator server:', error);
    process.exit(1);
  });
}
