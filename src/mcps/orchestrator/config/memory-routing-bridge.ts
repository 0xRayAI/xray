/**
 * Bridge between orchestrator types and the pluggable MemoryRoutingProvider.
 */

import {
  getMemoryRoutingProviderSync,
  type MemoryAgentCapability,
  type MemoryOrchestrationTask,
  type MemoryRoutingProvider,
} from '../../../memory-routing/index.js';
import type { AgentCapability, OrchestrationTask } from '../types.js';

export function toMemoryCapability(caps: AgentCapability): MemoryAgentCapability {
  const result: MemoryAgentCapability = {
    capabilities: caps.capabilities,
    complexityThreshold: caps.complexityThreshold,
    concurrentTasks: caps.concurrentTasks,
  };
  if (caps.memorySignals) result.memorySignals = caps.memorySignals;
  if (caps.memoryTags) result.memoryTags = caps.memoryTags;
  return result;
}

export function fromMemoryCapability(caps: MemoryAgentCapability): AgentCapability {
  const result: AgentCapability = {
    capabilities: caps.capabilities,
    complexityThreshold: caps.complexityThreshold,
    concurrentTasks: caps.concurrentTasks,
  };
  if (caps.memorySignals) result.memorySignals = caps.memorySignals;
  if (caps.memoryTags) result.memoryTags = caps.memoryTags;
  return result;
}

export function toMemoryTask(task: OrchestrationTask): MemoryOrchestrationTask {
  const result: MemoryOrchestrationTask = {
    id: task.id,
    description: task.description,
    type: task.type,
  };
  if (task.priority) result.priority = task.priority;
  if (task.dependencies) result.dependencies = task.dependencies;
  if (task.estimatedComplexity !== undefined) result.estimatedComplexity = task.estimatedComplexity;
  if (task.metadata) result.metadata = task.metadata as Record<string, unknown>;
  return result;
}

export function fromMemoryTask(task: MemoryOrchestrationTask): OrchestrationTask {
  const result: OrchestrationTask = {
    id: task.id,
    description: task.description,
    type: task.type,
  };
  if (task.priority) result.priority = task.priority;
  if (task.dependencies) result.dependencies = task.dependencies;
  if (task.estimatedComplexity !== undefined) result.estimatedComplexity = task.estimatedComplexity;
  const metadata = task.metadata as OrchestrationTask['metadata'];
  if (metadata) result.metadata = metadata;
  return result;
}

export function toMemoryCapabilityMap(
  caps: Map<string, AgentCapability>,
): Map<string, MemoryAgentCapability> {
  return new Map(
    Array.from(caps.entries()).map(([k, v]) => [k, toMemoryCapability(v)]),
  );
}

export function fromMemoryCapabilityMap(
  caps: Map<string, MemoryAgentCapability>,
): Map<string, AgentCapability> {
  return new Map(
    Array.from(caps.entries()).map(([k, v]) => [k, fromMemoryCapability(v)]),
  );
}

export function getProvider(): MemoryRoutingProvider {
  return getMemoryRoutingProviderSync();
}