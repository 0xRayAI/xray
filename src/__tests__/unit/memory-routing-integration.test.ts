import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NullMemoryRoutingProvider } from '../../memory-routing/null-provider.js';
import { resetMemoryRoutingProvider } from '../../memory-routing/provider-registry.js';
import type { MemoryRoutingProvider, OrchestratorFeedbackEntry } from '../../memory-routing/types.js';

const mockProvider: MemoryRoutingProvider = {
  id: 'test-provider',
  name: 'Test Provider',
  isAvailable: () => true,
  buildRoutingContext: (op) => ({
    providerId: 'test-provider',
    matchedSignals: op.includes('trap') ? ['test-signal'] : [],
    matchedTags: op.includes('trap') ? ['ontological-trap'] : [],
    flags: { ontologicalTrapDetected: op.includes('trap') },
    synthesisAvailable: false,
  }),
  enhanceAgentCapabilities: (base) => {
    const enriched = new Map(base);
    for (const [agent, caps] of enriched) {
      enriched.set(agent, {
        ...caps,
        memorySignals: ['test-signal'],
        capabilities: [...caps.capabilities, 'test-signal'],
      });
    }
    return enriched;
  },
  enrichTasks: (tasks) =>
    tasks.map((t) => ({
      ...t,
      metadata: { memorySignals: ['test-signal'], memoryProviderId: 'test-provider' },
    })),
  buildInheritedContext: () => ({
    providerId: 'test-provider',
    matchedSignals: [{ name: 'test-signal', definition: 'test', priority: 'high' }],
    flags: {},
  }),
  selectAgent: (_caps, _req, _complexity, operation) =>
    operation.includes('trap') ? 'architect' : 'code-reviewer',
  resolveThinDispatch: (baseAgent, operation, score) => ({
    agent: operation.includes('trap') ? 'architect' : baseAgent,
    adjustedScore: operation.includes('trap') ? score + 15 : score,
    context: {
      providerId: 'test-provider',
      matchedSignals: [],
      matchedTags: [],
      flags: {},
      synthesisAvailable: false,
    },
  }),
  ingestFeedback: vi.fn(),
};

vi.mock('../../memory-routing/index.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../memory-routing/index.js')>();
  return {
    ...actual,
    getMemoryRoutingProviderSync: () => mockProvider,
    initializeMemoryRouting: vi.fn(),
  };
});

vi.mock('../../core/framework-logger.js', () => ({
  frameworkLogger: { log: vi.fn().mockResolvedValue(undefined) },
}));

vi.mock('../../mcps/mcp-client.js', () => ({
  mcpClientManager: {
    callServerTool: vi.fn()
      .mockResolvedValueOnce({ content: [{ text: 'ok' }] })
      .mockRejectedValueOnce(new Error('task failed')),
  },
}));

describe('Memory routing integration', () => {
  beforeEach(() => {
    resetMemoryRoutingProvider();
    vi.clearAllMocks();
  });

  it('ExecutionPlanner enriches tasks and sets memoryContext', async () => {
    const { ExecutionPlanner } = await import(
      '../../mcps/orchestrator/execution/execution-planner.js'
    );
    const planner = new ExecutionPlanner();

    const plan = await planner.createExecutionPlan(
      [
        {
          id: 'task-1',
          description: 'ontological-trap attestation boundary review',
          type: 'design',
          estimatedComplexity: 40,
        },
      ],
      'optimized',
    );

    expect(plan.tasks[0].metadata?.memorySignals).toContain('test-signal');
    expect(plan.memoryContext).toBeDefined();
    expect((plan.memoryContext as { providerId?: string }).providerId).toBe('test-provider');
  });

  it('thinDispatch.scoreAndRoute uses provider resolveThinDispatch', async () => {
    const { scoreAndRoute } = await import('../../nucleus/thin-dispatch.js');
    const result = scoreAndRoute('ontological-trap attestation boundary', {});

    expect(result.agent).toBe('architect');
    expect(result.memoryRouting?.providerId).toBe('test-provider');
    expect(result.score.score).toBeGreaterThan(0);
  });

  it('TaskHandler ingestFeedback records per-task success and duration', async () => {
    const { TaskHandler } = await import('../../mcps/orchestrator/handlers/task-handler.js');
    const handler = new TaskHandler();

    await handler.handleOrchestrateTask(
      {
        description: 'test orchestration',
        sessionId: 'sess-1',
        tasks: [
          { id: 'ok-task', description: 'pass task', type: 'review', estimatedComplexity: 20 },
          { id: 'fail-task', description: 'fail task', type: 'review', estimatedComplexity: 20 },
        ],
      },
      { taskHistory: [], activeTasks: new Map() },
    );

    const ingest = mockProvider.ingestFeedback as ReturnType<typeof vi.fn>;
    expect(ingest).toHaveBeenCalled();

    const entries = ingest.mock.calls.map((c) => c[0] as OrchestratorFeedbackEntry);
    const okEntry = entries.find((e) => e.taskId === 'ok-task');
    const failEntry = entries.find((e) => e.taskId === 'fail-task');

    expect(entries).toHaveLength(2);
    expect(okEntry?.success).toBe(true);
    expect(failEntry?.success).toBe(false);
    expect(okEntry?.durationMs).toBeGreaterThanOrEqual(0);
    expect(failEntry?.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('null provider ingestFeedback is safely optional', () => {
    const nullProvider = new NullMemoryRoutingProvider();
    expect(nullProvider.ingestFeedback).toBeUndefined();
  });
});