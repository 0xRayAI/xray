import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { describe, expect, it, vi } from 'vitest';

const loads = vi.hoisted(() => ({ task: 0, complexity: 0, coordinator: 0 }));

vi.mock('../../../../mcps/orchestrator/handlers/task-handler.js', () => ({
  TaskHandler: class TaskHandler {
    constructor() {
      loads.task += 1;
    }
    async handleOrchestrateTask() {
      return { content: [{ type: 'text' as const, text: 'deferred-task' }] };
    }
  },
}));

vi.mock('../../../../mcps/orchestrator/handlers/complexity-handler.js', () => ({
  ComplexityHandler: class ComplexityHandler {
    constructor() {
      loads.complexity += 1;
    }
    async handleAnalyzeComplexity() {
      return {
        ok: true,
        content: [{ type: 'text' as const, text: 'deferred-complexity' }],
      };
    }
  },
}));

vi.mock('../../../../orchestrator/multi-agent-orchestration-coordinator.js', () => {
  loads.coordinator += 1;
  return {
    MultiAgentOrchestrationCoordinator: class MultiAgentOrchestrationCoordinator {
      constructor() {
        loads.coordinator += 1;
      }
    },
  };
});

import { createOrchestratorServer } from '../../../../mcps/orchestrator/server.js';

const serverSourcePath = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../../../mcps/orchestrator/server.ts',
);

function valueImportSpecifiers(source: string): string[] {
  const withoutComments = source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');
  const specs: string[] = [];
  const re = /import\s+(type\s+)?[\s\S]*?\sfrom\s+['"]([^'"]+)['"]/g;
  for (const match of withoutComments.matchAll(re)) {
    if (match[1]) continue;
    const spec = match[2];
    if (spec) specs.push(spec);
  }
  return specs;
}

describe('orchestrator MCP boot', () => {
  it('does not statically import the coordinator or heavy handlers', () => {
    const specs = valueImportSpecifiers(readFileSync(serverSourcePath, 'utf8'));
    const heavy = ['task-handler', 'complexity-handler', 'multi-agent-orchestration-coordinator', 'state-manager'];
    for (const spec of specs) {
      for (const name of heavy) {
        expect(spec, spec).not.toContain(name);
      }
    }
  });

  it('loads task and complexity handlers on tool call, not at boot', async () => {
    const server = createOrchestratorServer();
    const mcp = (server as unknown as {
      server: { connect: (transport: InstanceType<typeof InMemoryTransport>) => Promise<void> };
    }).server;
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    const client = new Client({ name: 'orchestrator-boot-test', version: '0.0.0' });

    try {
      await Promise.all([client.connect(clientTransport), mcp.connect(serverTransport)]);

      const listed = await client.listTools();
      const names = listed.tools.map((tool) => tool.name).sort();
      expect(names).toEqual([
        'analyze-complexity',
        'cancel-orchestration',
        'get-orchestration-status',
        'govern-and-apply',
        'optimize-orchestration',
        'orchestrate-task',
      ]);
      expect(loads).toEqual({ task: 0, complexity: 0, coordinator: 0 });

      const status = await client.callTool({
        name: 'get-orchestration-status',
        arguments: {},
      });
      const statusText = JSON.stringify(status);
      expect(statusText).toContain('Orchestration Status');
      expect(loads).toEqual({ task: 0, complexity: 0, coordinator: 0 });

      const orchestrated = await client.callTool({
        name: 'orchestrate-task',
        arguments: { description: 'boot probe' },
      });
      expect(JSON.stringify(orchestrated)).toContain('deferred-task');
      expect(loads.task).toBe(1);
      expect(loads.complexity).toBe(0);
      expect(loads.coordinator).toBe(0);

      const again = await client.callTool({
        name: 'orchestrate-task',
        arguments: { description: 'boot probe again' },
      });
      expect(JSON.stringify(again)).toContain('deferred-task');
      expect(loads.task).toBe(1);

      const complexity = await client.callTool({
        name: 'analyze-complexity',
        arguments: { tasks: [{ description: 'boot probe', type: 'test' }] },
      });
      expect(JSON.stringify(complexity)).toContain('deferred-complexity');
      expect(loads.complexity).toBe(1);
      expect(loads.coordinator).toBe(0);
    } finally {
      await client.close();
      await server.stop();
    }
  });
});
