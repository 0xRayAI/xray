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

describe('Plugin replacement — registerServer overrides core skill', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    pluginRegistry.resetForTest?.();
  });

  it('registers a mock server that replaces code-review dispatch', async () => {
    const mockHandler = vi.fn().mockResolvedValue({ result: 'mock-review-complete' });

    pluginRegistry.registerServer({
      name: 'code-review',
      tools: [
        { name: 'analyze_code_quality', description: 'Mock code quality analysis' },
        { name: 'review_pull_request', description: 'Mock PR review' },
      ],
      callTool: mockHandler,
    });

    expect(pluginRegistry.hasToolPlugin('code-review')).toBe(true);

    const result = await pluginRegistry.callSkillTool('code-review', 'analyze_code_quality', {
      filePath: 'src/test.ts',
    });

    expect(mockHandler).toHaveBeenCalledWith('analyze_code_quality', { filePath: 'src/test.ts' });
    expect(result).toEqual({ result: 'mock-review-complete' });
  });

  it('dispatches to mock instead of real server for multiple tools', async () => {
    const mockHandler = vi.fn(async (toolName: string, _args: Record<string, unknown>) => {
      if (toolName === 'analyze_code_quality') return { result: 'quality-ok' };
      if (toolName === 'review_pull_request') return { result: 'pr-reviewed' };
      return { result: 'unknown' };
    });

    pluginRegistry.registerServer({
      name: 'code-review',
      tools: [
        { name: 'analyze_code_quality', description: 'Mock' },
        { name: 'review_pull_request', description: 'Mock' },
      ],
      callTool: mockHandler,
    });

    const r1 = await pluginRegistry.callSkillTool('code-review', 'analyze_code_quality', { filePath: 'a.ts' });
    expect(r1).toEqual({ result: 'quality-ok' });

    const r2 = await pluginRegistry.callSkillTool('code-review', 'review_pull_request', { files: ['a.ts'] });
    expect(r2).toEqual({ result: 'pr-reviewed' });
  });

  it('rejects unknown tool on mock server', async () => {
    const mockHandler = vi.fn().mockRejectedValue(new Error('Unknown tool: nonexistent_tool'));

    pluginRegistry.registerServer({
      name: 'code-review',
      tools: [{ name: 'analyze_code_quality', description: 'Mock' }],
      callTool: mockHandler,
    });

    await expect(
      pluginRegistry.callSkillTool('code-review', 'nonexistent_tool', {}),
    ).rejects.toThrow('Unknown tool: nonexistent_tool');
  });

  it('resetForTest removes the mock', async () => {
    pluginRegistry.registerServer({
      name: 'code-review',
      tools: [{ name: 'analyze_code_quality', description: 'Mock' }],
      callTool: vi.fn().mockResolvedValue('mock-result'),
    });

    expect(pluginRegistry.hasToolPlugin('code-review')).toBe(true);

    pluginRegistry.resetForTest();

    expect(pluginRegistry.hasToolPlugin('code-review')).toBe(false);
    await expect(
      pluginRegistry.callSkillTool('code-review', 'analyze_code_quality', {}),
    ).rejects.toThrow('No tool plugin registered');
  });
});
