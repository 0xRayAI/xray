import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { resetConfigDirCache } from '../../core/config-paths.js';
import {
  classifyMcpInstallerArgs,
  showMCPStatusCommand,
} from '../../cli/commands/mcp-install.js';

const tempDirs: string[] = [];

afterEach(() => {
  delete process.env.XRAY_CONFIG_DIR;
  resetConfigDirCache();
  for (const dir of tempDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

function installFixture(body: string): string {
  const dir = mkdtempSync(path.join(tmpdir(), 'mcp-status-'));
  tempDirs.push(dir);
  writeFileSync(path.join(dir, 'installed-mcps.json'), body);
  process.env.XRAY_CONFIG_DIR = dir;
  resetConfigDirCache();
  return dir;
}

describe('mcp installer command aliases', () => {
  it('maps colon and hyphen forms onto list, status, install, and remove', () => {
    expect(classifyMcpInstallerArgs([])).toEqual({ kind: 'status' });
    expect(classifyMcpInstallerArgs(['status'])).toEqual({ kind: 'status' });
    expect(classifyMcpInstallerArgs(['mcp:status'])).toEqual({ kind: 'status' });
    expect(classifyMcpInstallerArgs(['mcp-status'])).toEqual({ kind: 'status' });
    expect(classifyMcpInstallerArgs(['mcp:list'])).toEqual({ kind: 'list' });
    expect(classifyMcpInstallerArgs(['mcp-list'])).toEqual({ kind: 'list' });
    expect(classifyMcpInstallerArgs(['mcp:install', 'github-mcp'])).toEqual({
      kind: 'install',
      name: 'github-mcp',
    });
    expect(classifyMcpInstallerArgs(['mcp-install', 'github-mcp'])).toEqual({
      kind: 'install',
      name: 'github-mcp',
    });
    expect(classifyMcpInstallerArgs(['mcp:remove', 'xmcp'])).toEqual({
      kind: 'remove',
      name: 'xmcp',
    });
    expect(classifyMcpInstallerArgs(['mcp-remove', 'xmcp'])).toEqual({
      kind: 'remove',
      name: 'xmcp',
    });
    expect(classifyMcpInstallerArgs(['mcp:nope'])).toEqual({
      kind: 'unknown',
      command: 'mcp:nope',
    });
  });

  it('mcp:status and mcp-status show installed servers through the status command', () => {
    installFixture(
      JSON.stringify({
        'github-mcp': {
          name: 'github-mcp',
          url: 'https://example.invalid/github-mcp',
          description: 'GitHub community MCP',
        },
      }),
    );
    const lines: string[] = [];
    const log = vi.spyOn(console, 'log').mockImplementation((...args: unknown[]) => {
      lines.push(args.map(String).join(' '));
    });
    try {
      showMCPStatusCommand();
    } finally {
      log.mockRestore();
    }
    const text = lines.join('\n');
    expect(text).not.toContain('Unknown command');
    expect(text).toContain('github-mcp');
    expect(text).toContain('GitHub community MCP');
    const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../..');
    const dispatcher = readFileSync(path.join(root, 'src/cli/commands/mcp-install.ts'), 'utf8');
    expect(dispatcher).toContain('if (!isDirectRun) return');
    expect(dispatcher).toContain('normalizeMcpInstallerToken(args[0])');
    expect(dispatcher).toContain('Unknown command: ${command}');
  });

  it('an unknown installer token stays unknown instead of being stripped', () => {
    expect(classifyMcpInstallerArgs(['mcp:status-typo'])).toEqual({
      kind: 'unknown',
      command: 'mcp:status-typo',
    });
  });
});
