import { describe, it, expect, vi, beforeEach } from 'vitest';

const capturedHandlers = new Map<any, Function>();
const ListSchemaKey = {};
const CallSchemaKey = {};

vi.mock('@modelcontextprotocol/sdk/types.js', () => ({
  ListToolsRequestSchema: ListSchemaKey,
  CallToolRequestSchema: CallSchemaKey,
}));

vi.mock('@modelcontextprotocol/sdk/server/index.js', () => ({
  Server: function () {
    return {
      setRequestHandler: vi.fn((schema: any, handler: Function) => { capturedHandlers.set(schema, handler); }),
      connect: vi.fn(),
      close: vi.fn(),
    };
  },
}));

vi.mock('@modelcontextprotocol/sdk/server/stdio.js', () => ({
  StdioServerTransport: vi.fn(),
}));

function getListToolsHandler() {
  const handler = capturedHandlers.get(ListSchemaKey);
  return handler || null;
}

function getCallToolHandler() {
  const handler = capturedHandlers.get(CallSchemaKey);
  return handler || null;
}

describe('MCP Server Smoke Tests', () => {
  beforeEach(() => {
    capturedHandlers.clear();
  });

  describe('researcher.server.ts', () => {
    it('constructs and registers at least one tool', async () => {
      const { XrayLibrarianServer } = await import('../../mcps/researcher.server.js');
      const instance = new (XrayLibrarianServer as any)();
      expect(instance).toBeDefined();

      const handler = getListToolsHandler();
      expect(handler).not.toBeNull();

      const result = await handler();
      expect(result.tools).toBeDefined();
      expect(result.tools.length).toBeGreaterThan(0);
      expect(result.tools[0].name).toBeDefined();
    });

    it('registers analyze_proposal tool via CallToolRequestSchema', async () => {
      const { XrayLibrarianServer } = await import('../../mcps/researcher.server.js');
      new (XrayLibrarianServer as any)();

      const handler = getCallToolHandler();
      expect(handler).not.toBeNull();

      const result = await handler({ params: { name: 'analyze_proposal', arguments: { proposalTitle: 'Test', proposalDescription: 'Desc' } } });
      expect(result.content).toBeDefined();
      expect(result.content[0].text).toContain('DECISION:');
    });
  });

  describe('enforcer-tools.server.ts', () => {
    it('constructs and registers at least one tool', async () => {
      capturedHandlers.clear();
      const mod = await import('../../mcps/enforcer-tools.server.js');
      const instance = new (mod.default as any)();
      expect(instance).toBeDefined();

      const handler = getListToolsHandler();
      expect(handler).not.toBeNull();

      const result = await handler();
      expect(result.tools).toBeDefined();
      expect(result.tools.length).toBeGreaterThan(0);
    });
  });

  describe('framework-compliance-audit.server.ts', () => {
    it('constructs and registers at least one tool', async () => {
      capturedHandlers.clear();
      const { XrayFrameworkComplianceAuditServer } = await import('../../mcps/framework-compliance-audit.server.js');
      const instance = new (XrayFrameworkComplianceAuditServer as any)();
      expect(instance).toBeDefined();

      const handler = getListToolsHandler();
      expect(handler).not.toBeNull();

      const result = await handler();
      expect(result.tools).toBeDefined();
      expect(result.tools.length).toBeGreaterThan(0);
    });

    it('registers framework-compliance-audit tool', async () => {
      capturedHandlers.clear();
      const { XrayFrameworkComplianceAuditServer } = await import('../../mcps/framework-compliance-audit.server.js');
      new (XrayFrameworkComplianceAuditServer as any)();

      const handler = getCallToolHandler();
      expect(handler).not.toBeNull();

      const result = await handler({ params: { name: 'framework-compliance-audit', arguments: {} } });
      expect(result.content).toBeDefined();
      expect(result.content.length).toBeGreaterThan(0);
    });
  });
});
