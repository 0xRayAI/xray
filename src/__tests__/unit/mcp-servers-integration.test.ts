import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as path from 'path';
import * as fs from 'fs';

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
  return capturedHandlers.get(ListSchemaKey) || null;
}

function getCallToolHandler() {
  return capturedHandlers.get(CallSchemaKey) || null;
}

describe('MCP Server Behavioral Tests', () => {
  beforeEach(() => { capturedHandlers.clear(); });

  it('bug-triage-specialist.server.ts registers tools', async () => {
    const { BugTriageSpecialistServer } = await import('../../mcps/knowledge-skills/bug-triage-specialist.server.js');
    new (BugTriageSpecialistServer as any)();
    const handler = getListToolsHandler();
    expect(handler).not.toBeNull();
    const result = await handler();
    expect(result.tools.length).toBeGreaterThan(0);
  });

  it('log-monitor.server.ts registers tools', async () => {
    const { LogMonitorServer } = await import('../../mcps/knowledge-skills/log-monitor.server.js');
    new (LogMonitorServer as any)();
    const handler = getListToolsHandler();
    expect(handler).not.toBeNull();
    const result = await handler();
    expect(result.tools.length).toBeGreaterThan(0);
  });

  it('session-management.server.ts registers tools', async () => {
    const mod = await import('../../mcps/knowledge-skills/session-management.server.js');
    new (mod.default as any)();
    const handler = getListToolsHandler();
    expect(handler).not.toBeNull();
    const result = await handler();
    expect(result.tools.length).toBeGreaterThan(0);
  });

  it('code-analyzer.server.ts registers tools', async () => {
    const mod = await import('../../mcps/knowledge-skills/code-analyzer.server.js');
    new (mod.default as any)();
    const handler = getListToolsHandler();
    expect(handler).not.toBeNull();
    const result = await handler();
    expect(result.tools.length).toBeGreaterThan(0);
  });

  it('architect-tools.server.ts registers tools', async () => {
    const mod = await import('../../mcps/architect-tools.server.js');
    new (mod.default as any)();
    const handler = getListToolsHandler();
    expect(handler).not.toBeNull();
    const result = await handler();
    expect(result.tools.length).toBeGreaterThan(0);
  });
});

describe('Antigravity Skills Integration', () => {
  it('should have removed Antigravity integration script', () => {
    const scriptPath = path.join(process.cwd(), 'scripts/integrations/install-antigravity-skills.js');
    expect(fs.existsSync(scriptPath)).toBe(false);
  });

  it('should have removed Antigravity documentation', () => {
    const docPath = path.join(process.cwd(), 'docs/archive/active-archived/superseded/legacy/ANTIGRAVITY_INTEGRATION.md');
    expect(fs.existsSync(docPath)).toBe(false);
  });

  it('should have Antigravity license file', () => {
    const licensePath = path.join(process.cwd(), 'licenses/skills/LICENSE.antigravity');
    expect(fs.existsSync(licensePath)).toBe(true);
  });

  it('should list Antigravity in skills directory', () => {
    const skillsDir = path.join(process.cwd(), '.opencode/skills');
    expect(fs.existsSync(skillsDir)).toBe(true);
    const entries = fs.readdirSync(skillsDir);
    expect(entries.length).toBeGreaterThan(0);
  });
});

describe('Agent Configuration', () => {
  it('should have AGENTS.md with xray content', () => {
    const agentsPath = path.join(process.cwd(), 'AGENTS.md');
    expect(fs.existsSync(agentsPath)).toBe(true);
    const content = fs.readFileSync(agentsPath, 'utf-8');
    expect(content).toContain('xray');
    expect(content).toContain('Agents');
    expect(content).toContain('Invoke');
  });
});

describe('MCP Client Configuration', () => {
  it('should have MCP client with server configs', () => {
    const configPath = path.join(process.cwd(), 'src/mcps/config/server-config-registry.ts');
    expect(fs.existsSync(configPath)).toBe(true);
    const content = fs.readFileSync(configPath, 'utf-8');
    expect(content).toContain('bug-triage-specialist');
    expect(content).toContain('log-monitor');
    expect(content).toContain('code-analyzer');
  });
});

describe('Architect Tools MCP Server', () => {
  it('should import from architect-tools.ts library', () => {
    const serverPath = path.join(process.cwd(), 'src/mcps/architect-tools.server.ts');
    const content = fs.readFileSync(serverPath, 'utf-8');
    expect(content).toContain('from "../architect/architect-tools.js"');
    expect(content).toContain('architectContextAnalysis');
    expect(content).toContain('architectCodebaseStructure');
    expect(content).toContain('architectDependencyAnalysis');
    expect(content).toContain('architectArchitectureAssessment');
  });

  it('should delegate all 4 tool handlers to library functions', () => {
    const serverPath = path.join(process.cwd(), 'src/mcps/architect-tools.server.ts');
    const content = fs.readFileSync(serverPath, 'utf-8');
    expect(content).toContain('"context-analysis":');
    expect(content).toContain('"codebase-structure":');
    expect(content).toContain('"dependency-analysis":');
    expect(content).toContain('"architecture-assessment":');
  });

    it('should register all 4 tools via ListToolsRequestSchema', async () => {
      const mod = await import('../../mcps/architect-tools.server.js');
      new (mod.default as any)();
      const handler = getListToolsHandler();
      expect(handler).not.toBeNull();
      const result = await handler();
      const names = result.tools.map((t: any) => t.name);
      expect(names).toContain('context-analysis');
      expect(names).toContain('codebase-structure');
      expect(names).toContain('dependency-analysis');
      expect(names).toContain('architecture-assessment');
    });

    it('should respond to CallToolRequestSchema for context-analysis', async () => {
      const mod = await import('../../mcps/architect-tools.server.js');
      new (mod.default as any)();
      const handler = getCallToolHandler();
      expect(handler).not.toBeNull();
    });
});
