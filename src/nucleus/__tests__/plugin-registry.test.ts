import { describe, it, expect, vi, beforeEach } from 'vitest';
import { pluginRegistry } from '../plugin-registry.js';
import type { SkillPlugin, SkillToolPlugin } from '../plugin-registry.js';

vi.mock('../../core/framework-logger.js', () => ({
  frameworkLogger: { log: vi.fn().mockResolvedValue(undefined) },
}));

vi.mock('../../mcps/in-process-skill-registry.js', () => ({
  callInProcessSkill: vi.fn().mockResolvedValue({
    content: [{ type: 'text', text: '{"decision": "approve"}' }],
  }),
}));

describe('PluginRegistry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    pluginRegistry.resetForTest?.();
  });

  it('lists built-in governance skills by default', () => {
    const skills = pluginRegistry.list();
    expect(skills).toContain('code-review');
    expect(skills).toContain('security-audit');
    expect(skills).toContain('researcher');
  });

  it('has built-in skills without explicit registration', () => {
    expect(pluginRegistry.has('code-review')).toBe(true);
    expect(pluginRegistry.has('security-audit')).toBe(true);
    expect(pluginRegistry.has('researcher')).toBe(true);
  });

  it('allows post-boot registration of new skills', () => {
    const customSkill: SkillPlugin = {
      name: 'custom-review',
      analyzeProposal: vi.fn().mockResolvedValue({
        content: [{ type: 'text', text: 'custom result' }],
      }),
    };

    pluginRegistry.register(customSkill);
    expect(pluginRegistry.has('custom-review')).toBe(true);
    expect(pluginRegistry.list()).toContain('custom-review');
  });

  it('calls registered skill handlers', async () => {
    const handler = vi.fn().mockResolvedValue({
      content: [{ type: 'text', text: 'test result' }],
    });
    const skill: SkillPlugin = {
      name: 'test-skill',
      analyzeProposal: handler,
    };

    pluginRegistry.register(skill);
    const result = await pluginRegistry.callSkill('test-skill', {
      proposalTitle: 'Test',
      proposalDescription: 'A test proposal',
    });

    expect(handler).toHaveBeenCalledTimes(1);
    expect(result.content[0].text).toBe('test result');
  });

  it('throws for unknown skills', async () => {
    await expect(
      pluginRegistry.callSkill('nonexistent', { proposalTitle: 'x' }),
    ).rejects.toThrow('No skill registered: nonexistent');
  });

  it('falls back to built-in registry for governance skills', async () => {
    const result = await pluginRegistry.callSkill('code-review', {
      proposalTitle: 'Test proposal',
      proposalDescription: 'A test',
    });
    expect(result).toBeDefined();
    expect(result.content).toBeDefined();
  });

  // --- Phase 3: SkillToolPlugin tests ---

  it('registers and dispatches a multi-tool skill plugin', async () => {
    const toolHandler = vi.fn().mockResolvedValue({ result: 'analyzed' });
    const toolPlugin: SkillToolPlugin = {
      name: 'test-analyzer',
      callTool: toolHandler,
    };

    pluginRegistry.registerToolPlugin(toolPlugin);
    expect(pluginRegistry.hasToolPlugin('test-analyzer')).toBe(true);
    expect(pluginRegistry.listToolPlugins()).toContain('test-analyzer');

    const result = await pluginRegistry.callSkillTool('test-analyzer', 'analyze-code', { file: 'test.ts' });
    expect(toolHandler).toHaveBeenCalledWith('analyze-code', { file: 'test.ts' });
    expect(result).toEqual({ result: 'analyzed' });
  });

  it('throws when calling an unregistered tool plugin', async () => {
    await expect(
      pluginRegistry.callSkillTool('nonexistent', 'tool', {}),
    ).rejects.toThrow('No tool plugin registered: nonexistent');
  });

  it('lists multiple registered tool plugins', () => {
    const alpha: SkillToolPlugin = { name: 'alpha', callTool: vi.fn() };
    const beta: SkillToolPlugin = { name: 'beta', callTool: vi.fn() };

    pluginRegistry.registerToolPlugin(alpha);
    pluginRegistry.registerToolPlugin(beta);

    const names = pluginRegistry.listToolPlugins();
    expect(names).toContain('alpha');
    expect(names).toContain('beta');
  });

  it('overwrites tool plugins on re-registration', () => {
    const first: SkillToolPlugin = { name: 'overwrite-me', callTool: vi.fn().mockResolvedValue('first') };
    const second: SkillToolPlugin = { name: 'overwrite-me', callTool: vi.fn().mockResolvedValue('second') };

    pluginRegistry.registerToolPlugin(first);
    pluginRegistry.registerToolPlugin(second);

    // The latest registration wins
    const result = pluginRegistry.callSkillTool('overwrite-me', 'tool', {});
    expect(result).resolves.toBe('second');
  });

  // --- Phase 2B: multi-tool dispatch extensions ---

  it('returns tool definitions via listTools() on plugin', () => {
    const tools = [
      { name: 'tool-a', description: 'First tool', inputSchema: { type: 'object' } },
      { name: 'tool-b', description: 'Second tool' },
    ];
    const plugin: SkillToolPlugin = {
      name: 'discoverable',
      callTool: vi.fn(),
      listTools: () => tools,
    };
    pluginRegistry.registerToolPlugin(plugin);

    const listed = pluginRegistry.listSkillTools('discoverable');
    expect(listed).toEqual(tools);
  });

  it('returns empty tools list for plugin without listTools()', () => {
    const plugin: SkillToolPlugin = {
      name: 'no-list',
      callTool: vi.fn(),
    };
    pluginRegistry.registerToolPlugin(plugin);

    const listed = pluginRegistry.listSkillTools('no-list');
    expect(listed).toEqual([]);
  });

  it('returns empty tools list for unknown plugin', () => {
    const listed = pluginRegistry.listSkillTools('nonexistent');
    expect(listed).toEqual([]);
  });

  it('getToolPlugin returns the full plugin for introspection', () => {
    const plugin: SkillToolPlugin = {
      name: 'introspect-me',
      callTool: vi.fn().mockResolvedValue('ok'),
      listTools: () => [{ name: 'x', description: 'X tool' }],
    };
    pluginRegistry.registerToolPlugin(plugin);

    const retrieved = pluginRegistry.getToolPlugin('introspect-me');
    expect(retrieved).toBeDefined();
    expect(retrieved!.name).toBe('introspect-me');
    expect(retrieved!.listTools).toBeDefined();
    expect(retrieved!.listTools!()).toHaveLength(1);
    expect(retrieved!.listTools!()[0].name).toBe('x');
  });

  it('getToolPlugin returns undefined for unknown plugin', () => {
    expect(pluginRegistry.getToolPlugin('ghost')).toBeUndefined();
  });

  it('registerServer convenience wraps a server as SkillToolPlugin', async () => {
    const callToolFn = vi.fn().mockResolvedValue('server-result');
    const serverDef = {
      name: 'my-server',
      tools: [
        { name: 'tool1', description: 'Tool one' },
        { name: 'tool2', description: 'Tool two' },
      ],
      callTool: callToolFn,
    };

    pluginRegistry.registerServer(serverDef);
    expect(pluginRegistry.hasToolPlugin('my-server')).toBe(true);

    const result = await pluginRegistry.callSkillTool('my-server', 'tool1', { key: 'val' });
    expect(callToolFn).toHaveBeenCalledWith('tool1', { key: 'val' });
    expect(result).toBe('server-result');
  });

  it('registerServer exposes listTools via the registry', () => {
    pluginRegistry.registerServer({
      name: 'list-server',
      tools: [
        { name: 'a', description: 'Tool A' },
        { name: 'b', description: 'Tool B', inputSchema: { type: 'object' } },
      ],
      callTool: vi.fn(),
    });

    const tools = pluginRegistry.listSkillTools('list-server');
    expect(tools).toHaveLength(2);
    expect(tools[0].name).toBe('a');
    expect(tools[1].name).toBe('b');
    expect(tools[1].inputSchema).toEqual({ type: 'object' });
  });

  it('dispatches multiple tools on a single registered server', async () => {
    const handler = vi.fn((toolName: string, args: Record<string, unknown>) => {
      if (toolName === 'analyze') return Promise.resolve({ result: 'analysis' });
      if (toolName === 'format') return Promise.resolve({ result: 'formatted' });
      return Promise.resolve({ result: 'unknown' });
    });

    pluginRegistry.registerServer({
      name: 'multi-tool',
      tools: [
        { name: 'analyze', description: 'Analyze' },
        { name: 'format', description: 'Format' },
      ],
      callTool: handler,
    });

    const r1 = await pluginRegistry.callSkillTool('multi-tool', 'analyze', { code: 'x' });
    expect(r1).toEqual({ result: 'analysis' });

    const r2 = await pluginRegistry.callSkillTool('multi-tool', 'format', { code: 'y' });
    expect(r2).toEqual({ result: 'formatted' });
  });
});