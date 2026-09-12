import { chmodSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it, expect, vi, beforeEach } from 'vitest';

function installHangingHermes(): string {
  const dir = mkdtempSync(join(tmpdir(), 'xray-hermes-hang-'));
  const bin = join(dir, 'hermes');
  writeFileSync(
    bin,
    [
      '#!/bin/sh',
      'if [ "$1" = "--version" ]; then echo "hermes 0.7.0"; exit 0; fi',
      '# dead xai-oauth: invalid_grant retry hang (Blaze 2026-09-12)',
      'sleep 120',
      'echo "invalid_grant" >&2',
      'exit 1',
      '',
    ].join('\n'),
  );
  chmodSync(bin, 0o755);
  return bin;
}

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
      const previousHermesBin = process.env.HERMES_BIN;
      const previousAllowHermes = process.env.XRAY_GOVERNANCE_ALLOW_HERMES;
      process.env.HERMES_BIN = installHangingHermes();
      delete process.env.XRAY_GOVERNANCE_ALLOW_HERMES;

      try {
        const { XrayLibrarianServer } = await import('../../mcps/researcher.server.js');
        new (XrayLibrarianServer as any)();

        const handler = getCallToolHandler();
        expect(handler).not.toBeNull();

        const started = Date.now();
        const result = await handler({ params: { name: 'analyze_proposal', arguments: { proposalTitle: 'Test', proposalDescription: 'Desc' } } });
        expect(Date.now() - started).toBeLessThan(10_000);
        expect(result.content).toBeDefined();
        expect(result.content[0].text).toContain('DECISION:');
      } finally {
        if (previousHermesBin === undefined) delete process.env.HERMES_BIN;
        else process.env.HERMES_BIN = previousHermesBin;
        if (previousAllowHermes === undefined) delete process.env.XRAY_GOVERNANCE_ALLOW_HERMES;
        else process.env.XRAY_GOVERNANCE_ALLOW_HERMES = previousAllowHermes;
      }
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
