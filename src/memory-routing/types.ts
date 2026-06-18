/**
 * Memory Routing Provider — pluggable contract for long-term memory enrichment.
 *
 * Repertoire is one implementation. Any provider exposing createMemoryRoutingProvider()
 * can be loaded via features.json memory_routing.module_path.
 */

export interface MemoryAgentCapability {
  capabilities: string[];
  complexityThreshold: number;
  concurrentTasks: number;
  memorySignals?: string[];
  memoryTags?: string[];
}

export interface MemoryOrchestrationTask {
  id: string;
  description: string;
  type: string;
  priority?: 'critical' | 'high' | 'medium' | 'low';
  dependencies?: string[];
  estimatedComplexity?: number;
  metadata?: Record<string, unknown>;
}

export interface MemoryTaskConfidence {
  signals: Array<{ name: string; confidence: number }>;
  matchedSignals: string[];
  avgConfidence: number;
  maxConfidence: number;
  highConfidenceTrapPresent: boolean;
  ontologicalTrapDetected: boolean;
  complexityBoost: number;
  recommendedAgent: string | null;
}

export interface MemoryRoutingContext {
  providerId: string;
  matchedSignals: string[];
  matchedTags: string[];
  flags: Record<string, boolean>;
  synthesisAvailable: boolean;
  signalConfidences?: Record<string, number>;
  avgMatchConfidence?: number;
}

export interface MemoryInheritedContext {
  providerId: string;
  matchedSignals: Array<{ name: string; definition: string; priority: string }>;
  synthesisExcerpt?: string;
  flags: Record<string, boolean>;
}

export interface MemoryThinDispatchResult {
  agent: string;
  adjustedScore: number;
  context: MemoryRoutingContext;
}

export interface OrchestratorFeedbackEntry {
  timestamp: string;
  sessionId: string;
  taskId: string;
  assignedAgent: string;
  memorySignals: string[];
  complexity: number;
  success: boolean;
  durationMs: number;
  dynamoResult?: Record<string, unknown>;
}

export interface MemoryRoutingProviderConfig {
  [key: string]: unknown;
}

/**
 * Contract every memory routing provider must implement.
 * Export factory: createMemoryRoutingProvider(config?) => MemoryRoutingProvider
 *
 * Agent selection split:
 * - selectAgent() — used by ExecutionPlanner / AgentCapabilitiesManager when
 *   required capabilities and operation text are known at plan time.
 * - resolveThinDispatch() — used by thinDispatch.scoreAndRoute() when only a
 *   complexity score and operation string exist; may adjust score and override
 *   the tier-default agent. Both may consult the same signal registry but
 *   operate at different pipeline stages.
 */
export interface MemoryRoutingProvider {
  readonly id: string;
  readonly name: string;
  isAvailable(): boolean;
  buildRoutingContext(operation: string): MemoryRoutingContext;
  enhanceAgentCapabilities(
    base: Map<string, MemoryAgentCapability>,
  ): Map<string, MemoryAgentCapability>;
  enrichTasks(tasks: MemoryOrchestrationTask[]): MemoryOrchestrationTask[];
  buildInheritedContext(tasks: MemoryOrchestrationTask[]): MemoryInheritedContext;
  selectAgent(
    capabilities: Map<string, MemoryAgentCapability>,
    requiredCapabilities: string[],
    complexity: number,
    operation: string,
  ): string | null;
  resolveThinDispatch(
    baseAgent: string,
    operation: string,
    complexityScore: number,
  ): MemoryThinDispatchResult;
  getTaskConfidence?(task: MemoryOrchestrationTask): MemoryTaskConfidence;
  ingestFeedback?(entry: OrchestratorFeedbackEntry): void;
}

export interface MemoryRoutingConfig {
  enabled: boolean;
  provider: 'null' | 'repertoire' | 'custom';
  module_path?: string;
  config?: MemoryRoutingProviderConfig;
}