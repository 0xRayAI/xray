import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../mcps/mcp-client.js', () => ({
  mcpClientManager: { callServerTool: vi.fn() },
}));

vi.mock('../../mcps/orchestrator/config/memory-routing-bridge.js', () => ({
  getProvider: () => ({ id: 'null' }),
}));

vi.mock('../../core/framework-logger.js', () => ({
  frameworkLogger: { log: vi.fn() },
}));

import { TaskHandler } from '../../mcps/orchestrator/handlers/task-handler.js';

describe('TaskHandler deferred implementation agents', () => {
  let handler: TaskHandler;

  beforeEach(() => {
    handler = new TaskHandler();
  });

  it('does not fake-complete backend-engineer tasks', async () => {
    const response = await handler.handleOrchestrateTask(
      {
        description: 'implement feature',
        sessionId: 'sess-deferred',
        tasks: [
          {
            id: 'impl-1',
            description: 'swap dependencies',
            type: 'implement',
            estimatedComplexity: 40,
          },
        ],
      },
      { taskHistory: [], activeTasks: new Map() },
    );

    const text = response.content[0]?.text ?? '';
    expect(text).toContain('Deferred');
    expect(text).not.toContain('✅ COMPLETED');
    expect(text).toContain('host delegation');
  });
});