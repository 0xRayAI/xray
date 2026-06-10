import { describe, it, expect, vi, beforeEach } from 'vitest';
import { pluginRegistry } from '../../nucleus/plugin-registry.js';

vi.mock('../../core/framework-logger.js', () => ({
  frameworkLogger: { log: vi.fn().mockResolvedValue(undefined) },
}));

vi.mock('../../mcps/in-process-skill-registry.js', () => ({
  callInProcessSkill: vi.fn().mockResolvedValue({
    content: [{ type: 'text', text: '{"decision": "approve"}' }],
  }),
}));

describe('Plugin registry — listSkillTools', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    pluginRegistry.resetForTest();
  });

  it('should return empty array for unregistered plugin', () => {
    const tools = pluginRegistry.listSkillTools('nonexistent');
    expect(tools).toEqual([]);
  });

  it('should return tools for registered server', () => {
    pluginRegistry.registerServer({
      name: 'test-skill',
      tools: [
        { name: 'tool1', description: 'First tool' },
        { name: 'tool2', description: 'Second tool' },
      ],
      callTool: vi.fn(),
    });

    const tools = pluginRegistry.listSkillTools('test-skill');
    expect(tools).toHaveLength(2);
    expect(tools[0].name).toBe('tool1');
    expect(tools[1].name).toBe('tool2');
  });
});

describe('Plugin registry — getToolPlugin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    pluginRegistry.resetForTest();
  });

  it('should return undefined for unregistered plugin', () => {
    expect(pluginRegistry.getToolPlugin('nonexistent')).toBeUndefined();
  });

  it('should return the registered plugin', () => {
    const handler = vi.fn();
    pluginRegistry.registerServer({
      name: 'my-skill',
      tools: [{ name: 'greet', description: 'Say hello' }],
      callTool: handler,
    });

    const plugin = pluginRegistry.getToolPlugin('my-skill');
    expect(plugin).toBeDefined();
    expect(plugin!.name).toBe('my-skill');
    expect(typeof plugin!.callTool).toBe('function');
    expect(plugin!.listTools).toBeDefined();
    expect(plugin!.listTools!()).toHaveLength(1);
  });
});

describe('Plugin registry — listToolPlugins', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    pluginRegistry.resetForTest();
  });

  it('should return empty list initially', () => {
    expect(pluginRegistry.listToolPlugins()).toEqual([]);
  });

  it('should return all registered plugin names', () => {
    pluginRegistry.registerServer({
      name: 'alpha',
      tools: [],
      callTool: vi.fn(),
    });
    pluginRegistry.registerServer({
      name: 'beta',
      tools: [],
      callTool: vi.fn(),
    });

    const names = pluginRegistry.listToolPlugins();
    expect(names).toContain('alpha');
    expect(names).toContain('beta');
    expect(names).toHaveLength(2);
  });
});

describe('Plugin registry — register (non-tool variant)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    pluginRegistry.resetForTest();
  });

  it('should register a skill plugin and make it callable', async () => {
    const handler = vi.fn().mockResolvedValue({
      content: [{ type: 'text', text: '{"decision": "approve"}' }],
    });

    pluginRegistry.register({
      name: 'custom-skill',
      analyzeProposal: handler,
    });

    const result = await pluginRegistry.callSkill('custom-skill', {
      proposalTitle: 'test',
    });
    expect(result.content[0].text).toContain('approve');
    expect(handler).toHaveBeenCalledWith({ proposalTitle: 'test' });
  });

  it('should list registered skill in list()', () => {
    pluginRegistry.register({
      name: 'custom-skill',
      analyzeProposal: vi.fn(),
    });

    const names = pluginRegistry.list();
    expect(names).toContain('custom-skill');
  });
});

describe('Plugin registry — has() with fallback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    pluginRegistry.resetForTest();
  });

  it('should return true for built-in governance skills', () => {
    expect(pluginRegistry.has('code-review')).toBe(true);
    expect(pluginRegistry.has('security-audit')).toBe(true);
    expect(pluginRegistry.has('researcher')).toBe(true);
  });

  it('should return false for unknown skill', () => {
    expect(pluginRegistry.has('completely-unknown')).toBe(false);
  });

  it('should return true for registered skill', () => {
    pluginRegistry.register({
      name: 'my-skill',
      analyzeProposal: vi.fn(),
    });
    expect(pluginRegistry.has('my-skill')).toBe(true);
  });
});

describe('Plugin registry — get() with fallback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    pluginRegistry.resetForTest();
  });

  it('should return handler for registered skill', async () => {
    const handler = vi.fn().mockResolvedValue({
      content: [{ type: 'text', text: 'ok' }],
    });
    pluginRegistry.register({ name: 'my-skill', analyzeProposal: handler });

    const fn = pluginRegistry.get('my-skill');
    expect(fn).toBeDefined();
    await fn!({ proposalTitle: 't' });
    expect(handler).toHaveBeenCalled();
  });

  it('should return fallback handler for built-in skills', () => {
    const fn = pluginRegistry.get('code-review');
    expect(fn).toBeDefined();
  });

  it('should return undefined for unknown skill', () => {
    expect(pluginRegistry.get('unknown-skill')).toBeUndefined();
  });
});

describe('Plugin registry — callSkillTool rejects unknown', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    pluginRegistry.resetForTest();
  });

  it('should throw descriptive error for unknown plugin', async () => {
    await expect(
      pluginRegistry.callSkillTool('nonexistent', 'tool', {}),
    ).rejects.toThrow(/No tool plugin registered/);
  });
});

describe('Plugin registry — resetForTest', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    pluginRegistry.resetForTest();
  });

  it('should clear all registrations', () => {
    pluginRegistry.registerServer({
      name: 'temp-skill',
      tools: [{ name: 't', description: 'test' }],
      callTool: vi.fn(),
    });
    expect(pluginRegistry.hasToolPlugin('temp-skill')).toBe(true);

    pluginRegistry.resetForTest();
    expect(pluginRegistry.hasToolPlugin('temp-skill')).toBe(false);
    expect(pluginRegistry.list()).toContain('code-review');
  });
});
