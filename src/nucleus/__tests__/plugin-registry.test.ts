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
});