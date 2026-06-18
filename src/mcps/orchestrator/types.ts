/**
 * Orchestrator MCP Server Types
 * 
 * Type definitions for the orchestrator MCP server module
 */

export interface AgentCapability {
  capabilities: string[];
  complexityThreshold: number;
  concurrentTasks: number;
  /** Populated by active MemoryRoutingProvider (e.g. Repertoire) */
  memorySignals?: string[];
  memoryTags?: string[];
}

export interface OrchestrationTaskMetadata {
  memorySignals?: string[];
  matchedPrimitives?: string[];
  synthesisContext?: string;
  ontologicalTrapDetected?: boolean;
  memoryProviderId?: string;
}

export interface OrchestrationTask {
  id: string;
  description: string;
  type: string;
  priority?: 'critical' | 'high' | 'medium' | 'low';
  dependencies?: string[];
  estimatedComplexity?: number;
  metadata?: OrchestrationTaskMetadata;
}

export interface ExecutionPlan {
  tasks: OrchestrationTask[];
  strategy: 'parallel' | 'sequential' | 'optimized';
  agentAssignments: Map<string, OrchestrationTask[]>;
  estimatedDuration: number;
  memoryContext?: Record<string, unknown>;
}

export interface OrchestrationResult {
  sessionId: string;
  success: boolean;
  completedTasks: number;
  failedTasks: number;
  duration: number;
  agentUtilization: Record<string, number>;
  agentOutputs?: Record<string, string>;
  bottlenecks: string[];
  recommendations: string[];
}

export interface ComplexityAnalysis {
  overallComplexity: number;
  recommendedStrategy: string;
  taskComplexity: Array<{ complexity: number; category: string }>;
  agentAssignments: Array<{ agent: string; taskCount: number; utilization: number }>;
  estimatedDuration: number;
  parallelPotential: number;
}

export interface TaskValidation {
  valid: boolean;
  errors: string[];
}

export interface ActiveAside {
  asideId: string;
  description: string;
  sessionId?: string;
  parentAsideId?: string;
  startedAt: number;
  inheritedContext?: Record<string, unknown>;
  priorVerdictContext?: Record<string, unknown>;
  observations: AsideObservation[];
}

export interface AsideObservation {
  key: string;
  value: string;
  source: string;
}

export interface AsideContextOptions {
  description: string;
  inheritedContext?: Record<string, unknown>;
  priorVerdictContext?: Record<string, unknown>;
  sessionId?: string;
  parentAsideId?: string;
}

export interface AsideResult {
  asideId: string;
  description: string;
  success: boolean;
  duration: number;
  observations: AsideObservation[];
  priorVerdictContext?: Record<string, unknown>;
  error?: string;
}

export interface OrchestrationStatus {
  activeSessions: number;
  totalTasks: number;
  agentUtilization: Record<string, number>;
  recentSessions: Array<{
    sessionId: string;
    status: string;
    tasks: number;
    duration: number;
  }>;
  activeAsideCount?: number;
  activeAsideIds?: string[];
}

export interface TaskExecutionContext {
  sessionId: string;
  task: OrchestrationTask;
  assignedAgent: string;
  startTime: number;
}

/** Result of actually executing one task via an agent/MCP server */
export interface TaskExecutionResult {
  taskId: string;
  agent: string;
  success: boolean;
  output: string;
  durationMs: number;
}
