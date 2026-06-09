import { describe, it, expect, vi, beforeEach } from 'vitest';
import { pluginRegistry } from '../plugin-registry.js';
import type { SkillPlugin } from '../plugin-registry.js';

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
});