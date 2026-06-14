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

describe('registerDefaultPlugins — smoke', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    pluginRegistry.resetForTest();
  });

  it('should register 26 plugins when called', async () => {
    const { registerDefaultPlugins } = await import('../../nucleus/default-plugins.js');
    const result = await registerDefaultPlugins();
    expect(result.registered).toBe(26);
    expect(result.failed).toEqual([]);
  });

  it('should register governance-critical plugins first', async () => {
    const { registerDefaultPlugins } = await import('../../nucleus/default-plugins.js');
    pluginRegistry.resetForTest();
    await registerDefaultPlugins();

    expect(pluginRegistry.hasToolPlugin('code-review')).toBe(true);
    expect(pluginRegistry.hasToolPlugin('security-audit')).toBe(true);
    expect(pluginRegistry.hasToolPlugin('researcher')).toBe(true);
  });

  it('should register all 6 batch categories', async () => {
    const { registerDefaultPlugins } = await import('../../nucleus/default-plugins.js');
    pluginRegistry.resetForTest();
    const result = await registerDefaultPlugins();

    const names = pluginRegistry.listToolPlugins();
    expect(result.registered).toBe(names.length);
    expect(names).toContain('code-review');
    expect(names).toContain('api-design');
    expect(names).toContain('code-analyzer');
    expect(names).toContain('devops-deployment');
    expect(names).toContain('content-creator');
    expect(names).toContain('bug-triage-specialist');
  });

  it('each registered plugin should expose tools', async () => {
    const { registerDefaultPlugins } = await import('../../nucleus/default-plugins.js');
    pluginRegistry.resetForTest();
    await registerDefaultPlugins();

    const names = pluginRegistry.listToolPlugins();
    for (const name of names) {
      const tools = pluginRegistry.listSkillTools(name);
      expect(tools.length).toBeGreaterThan(0);
    }
  });

  it('code-review should have 4 tools', async () => {
    const { registerDefaultPlugins } = await import('../../nucleus/default-plugins.js');
    pluginRegistry.resetForTest();
    await registerDefaultPlugins();

    const tools = pluginRegistry.listSkillTools('code-review');
    const toolNames = tools.map((t) => t.name);
    expect(toolNames).toContain('analyze_code_quality');
    expect(toolNames).toContain('review_pull_request');
    expect(toolNames).toContain('check_best_practices');
    expect(toolNames).toContain('analyze_proposal');
  });

  it('researcher should have codebase exploration tools', async () => {
    const { registerDefaultPlugins } = await import('../../nucleus/default-plugins.js');
    pluginRegistry.resetForTest();
    await registerDefaultPlugins();

    const tools = pluginRegistry.listSkillTools('researcher');
    expect(tools.length).toBeGreaterThan(0);
  });
});
