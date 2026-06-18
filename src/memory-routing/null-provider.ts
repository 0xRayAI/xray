import type {
  MemoryAgentCapability,
  MemoryInheritedContext,
  MemoryOrchestrationTask,
  MemoryRoutingContext,
  MemoryRoutingProvider,
  MemoryThinDispatchResult,
} from './types.js';

const EMPTY_CONTEXT: MemoryRoutingContext = {
  providerId: 'null',
  matchedSignals: [],
  matchedTags: [],
  flags: {},
  synthesisAvailable: false,
};

export class NullMemoryRoutingProvider implements MemoryRoutingProvider {
  readonly id = 'null';
  readonly name = 'Null (no memory routing)';

  isAvailable(): boolean {
    return true;
  }

  buildRoutingContext(): MemoryRoutingContext {
    return { ...EMPTY_CONTEXT };
  }

  enhanceAgentCapabilities(
    base: Map<string, MemoryAgentCapability>,
  ): Map<string, MemoryAgentCapability> {
    return new Map(base);
  }

  enrichTasks(tasks: MemoryOrchestrationTask[]): MemoryOrchestrationTask[] {
    return tasks;
  }

  buildInheritedContext(): MemoryInheritedContext {
    return { providerId: 'null', matchedSignals: [], flags: {} };
  }

  selectAgent(
    capabilities: Map<string, MemoryAgentCapability>,
    requiredCapabilities: string[],
    complexity: number,
  ): string | null {
    let bestAgent: string | null = null;
    let bestScore = -1;

    for (const [agent, caps] of capabilities) {
      if (complexity > caps.complexityThreshold) continue;
      const matchCount = requiredCapabilities.filter((c) =>
        caps.capabilities.includes(c),
      ).length;
      const score = matchCount * 10 + caps.concurrentTasks;
      if (score > bestScore) {
        bestScore = score;
        bestAgent = agent;
      }
    }
    return bestAgent;
  }

  resolveThinDispatch(
    baseAgent: string,
    _operation: string,
    complexityScore: number,
  ): MemoryThinDispatchResult {
    return {
      agent: baseAgent,
      adjustedScore: complexityScore,
      context: { ...EMPTY_CONTEXT },
    };
  }
}

export function createMemoryRoutingProvider(): MemoryRoutingProvider {
  return new NullMemoryRoutingProvider();
}