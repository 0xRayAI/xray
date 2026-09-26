import { describe, expect, it } from 'vitest';
import { createRequire } from 'module';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const packageRoot = path.join(__dirname, '..', '..', '..');
const wiring = require(path.join(packageRoot, 'scripts', 'node', 'bridge-mcp-wiring.cjs'));
const installedVersion = (
  JSON.parse(readFileSync(path.join(packageRoot, 'package.json'), 'utf8')) as { version: string }
).version;

describe('bridge-mcp-wiring', () => {
  it('builds 7 portable xray servers without absolute paths', () => {
    const portable = wiring.buildPortableProjectMcpJson();
    const names = Object.keys(portable.mcpServers);
    expect(names.filter((n: string) => n.startsWith('xray-'))).toHaveLength(7);
    const raw = JSON.stringify(portable);
    expect(raw).not.toMatch(/\/Users\//);
    expect(portable.mcpServers['xray-governance'].env?.XRAY_FORCE_MCP_GOVERNANCE).toBe('true');
  });

  it('builds Hermes mcp_servers with XRAY_ROOT for consumer cwd', () => {
    const targetDir = '/tmp/repertoire-consumer';
    const servers = wiring.buildHermesMcpServers(targetDir);
    expect(Object.keys(servers).filter((n: string) => n.startsWith('xray-'))).toHaveLength(7);
    expect(servers['xray-enforcer'].env.XRAY_ROOT).toBe(targetDir);
  });

  it('builds OpenCode mcp entries as local enabled servers pinned to the installed version', () => {
    const entries = wiring.buildOpencodeMcpEntries('/tmp/consumer');
    expect(entries['xray-skills'].type).toBe('local');
    expect(entries['xray-skills'].enabled).toBe(true);
    expect(entries['xray-skills'].command).toEqual(['npx', '-y', `0xray@${installedVersion}`, 'mcp', 'skills']);
    expect(entries['xray-skills'].command).not.toContain('0xray');
  });

  it('prefers the installed CLI and never emits an unpinned npx 0xray launch', () => {
    const targetDir = mkdtempSync(path.join(os.tmpdir(), 'xray-mcp-pin-'));
    const cli = path.join(targetDir, 'node_modules', '0xray', 'dist', 'cli', 'index.js');
    mkdirSync(path.dirname(cli), { recursive: true });
    writeFileSync(cli, '#!/usr/bin/env node\n');
    try {
      const launch = wiring.pinnedMcpLaunch(targetDir, 'governance');
      expect(launch.command).toBe('node');
      expect(launch.args).toEqual([cli, 'mcp', 'governance']);
      expect(launch.commandList).toEqual(['node', cli, 'mcp', 'governance']);
      const portable = wiring.buildPortableProjectMcpJson(targetDir);
      expect(portable.mcpServers['xray-researcher'].command).toBe('node');
      expect(portable.mcpServers['xray-researcher'].args).toEqual([cli, 'mcp', 'researcher']);
      const raw = JSON.stringify(portable);
      expect(raw).not.toContain('"0xray"');
    } finally {
      rmSync(targetDir, { recursive: true, force: true });
    }
  });

  it('keeps user pins, disabled flags, and extra env keys on .mcp.json', () => {
    const targetDir = mkdtempSync(path.join(os.tmpdir(), 'xray-mcp-user-'));
    const dest = path.join(targetDir, '.mcp.json');
    const cli = path.join(targetDir, 'node_modules', '0xray', 'dist', 'cli', 'index.js');
    mkdirSync(path.dirname(cli), { recursive: true });
    writeFileSync(cli, '#!/usr/bin/env node\n');
    try {
      wiring.deployPortableProjectMcpJson(targetDir);
      const handEdited = JSON.parse(readFileSync(dest, 'utf8')) as {
        mcpServers: Record<string, { command?: string; args?: string[]; enabled?: boolean; env?: Record<string, string> }>;
        customTop?: boolean;
      };
      handEdited.customTop = true;
      handEdited.mcpServers['xray-governance'].env = {
        ...(handEdited.mcpServers['xray-governance'].env || {}),
        L1_MARKER_ENV: 'kept',
      };
      handEdited.mcpServers['xray-researcher'].command = 'npx';
      handEdited.mcpServers['xray-researcher'].args = ['-y', `0xray@${installedVersion}`, 'mcp', 'researcher'];
      handEdited.mcpServers['xray-skills'].enabled = false;
      handEdited.mcpServers['user-extra'] = { command: 'echo', args: ['hi'] };
      writeFileSync(dest, `${JSON.stringify(handEdited, null, 2)}\n`);
      const before = readFileSync(dest, 'utf8');
      wiring.deployPortableProjectMcpJson(targetDir);
      expect(readFileSync(dest, 'utf8')).toBe(before);
    } finally {
      rmSync(targetDir, { recursive: true, force: true });
    }
  });

  it('repins an unpinned 0xray launch without dropping user env or enabled false', () => {
    const targetDir = mkdtempSync(path.join(os.tmpdir(), 'xray-mcp-unpinned-'));
    const dest = path.join(targetDir, '.mcp.json');
    const cli = path.join(targetDir, 'node_modules', '0xray', 'dist', 'cli', 'index.js');
    mkdirSync(path.dirname(cli), { recursive: true });
    writeFileSync(cli, '#!/usr/bin/env node\n');
    writeFileSync(
      dest,
      `${JSON.stringify({
        mcpServers: {
          'xray-skills': {
            command: 'npx',
            args: ['-y', '0xray', 'mcp', 'skills'],
            enabled: false,
            env: { L1_MARKER_ENV: 'kept' },
          },
        },
      })}\n`,
    );
    try {
      wiring.deployPortableProjectMcpJson(targetDir);
      const mcp = JSON.parse(readFileSync(dest, 'utf8')) as {
        mcpServers: Record<string, { command: string; args: string[]; enabled?: boolean; env?: Record<string, string> }>;
      };
      expect(mcp.mcpServers['xray-skills'].command).toBe('node');
      expect(mcp.mcpServers['xray-skills'].args).toEqual([cli, 'mcp', 'skills']);
      expect(mcp.mcpServers['xray-skills'].enabled).toBe(false);
      expect(mcp.mcpServers['xray-skills'].env?.L1_MARKER_ENV).toBe('kept');
    } finally {
      rmSync(targetDir, { recursive: true, force: true });
    }
  });

  it('builds OpenClaw mcp servers with XRAY_ROOT for consumer cwd', () => {
    const targetDir = '/tmp/openclaw-consumer';
    const servers = wiring.buildOpenClawMcpServers(targetDir);
    expect(Object.keys(servers).filter((n: string) => n.startsWith('xray-'))).toHaveLength(7);
    expect(servers['xray-governance'].env.XRAY_FORCE_MCP_GOVERNANCE).toBe('true');
    expect(servers['xray-governance'].env.XRAY_ROOT).toBe(targetDir);
  });

  it('keeps install-bridges and grok-cli wired to bridge-mcp-wiring SSOT', () => {
    const packageRoot = path.join(__dirname, '..', '..', '..');
    const installSrc = readFileSync(path.join(packageRoot, 'scripts/node/install-bridges.cjs'), 'utf8');
    const grokSrc = readFileSync(path.join(packageRoot, 'src/integrations/grok/grok-cli.ts'), 'utf8');
    expect(installSrc).toContain('XRAY_MCP_SERVERS');
    expect(installSrc).toContain('bridge-mcp-wiring.cjs');
    expect(installSrc).not.toMatch(/const XRAY_MCP_SERVERS = \[/);
    expect(grokSrc).toContain('bridge-mcp-wiring.cjs');
    expect(grokSrc).not.toMatch(/const XRAY_MCP_SERVERS = \[/);
    expect(grokSrc).toContain('resolveRepertoireMcp');
  });

  it('enableMemoryRoutingIfResolves only when leftover default-off and module exists', () => {
    const parent = mkdtempSync(path.join(os.tmpdir(), 'xray-rep-enable-'));
    const consumer = path.join(parent, 'app');
    const repertoire = path.join(parent, 'repertoire');
    mkdirSync(consumer, { recursive: true });
    mkdirSync(path.join(repertoire, 'dist', 'provider'), { recursive: true });
    writeFileSync(path.join(repertoire, 'package.json'), JSON.stringify({ name: '@0xray/repertoire' }));
    writeFileSync(path.join(repertoire, 'dist', 'provider', 'memory-routing-provider.js'), 'export {}\n');
    try {
      const on = wiring.enableMemoryRoutingIfResolves(
        { memory_routing: { enabled: false, provider: 'null' } },
        consumer,
      );
      expect(on.changed).toBe(true);
      expect(on.features.memory_routing.enabled).toBe(true);
      expect(on.features.memory_routing.provider).toBe('repertoire');
      expect(on.features.memory_routing.config.statePath).toBe(
        '.xray/state/repertoire/inference-state.json',
      );
      expect(on.features.memory_routing.config.feedbackDir).toBe(
        '.xray/state/repertoire/feedback',
      );

      const optOut = wiring.enableMemoryRoutingIfResolves(
        { memory_routing: { enabled: false, provider: 'repertoire' } },
        consumer,
      );
      expect(optOut.changed).toBe(false);

      const other = mkdtempSync(path.join(os.tmpdir(), 'xray-rep-none-'));
      try {
        const missing = wiring.enableMemoryRoutingIfResolves(
          { memory_routing: { enabled: false, provider: 'null' } },
          other,
        );
        expect(missing.changed).toBe(false);
      } finally {
        rmSync(other, { recursive: true, force: true });
      }
    } finally {
      rmSync(parent, { recursive: true, force: true });
    }
  });

  it('prefers node_modules organ over sibling repertoire', () => {
    const parent = mkdtempSync(path.join(os.tmpdir(), 'xray-rep-prefer-'));
    const consumer = path.join(parent, 'app');
    mkdirSync(path.join(consumer, 'node_modules', '@0xray', 'repertoire', 'dist', 'mcp'), { recursive: true });
    mkdirSync(path.join(consumer, 'node_modules', '@0xray', 'repertoire', 'dist', 'provider'), { recursive: true });
    writeFileSync(
      path.join(consumer, 'node_modules', '@0xray', 'repertoire', 'dist', 'mcp', 'server.js'),
      'export {}\n',
    );
    writeFileSync(
      path.join(consumer, 'node_modules', '@0xray', 'repertoire', 'dist', 'provider', 'memory-routing-provider.js'),
      'export {}\n',
    );
    const sibling = path.join(parent, 'repertoire');
    mkdirSync(path.join(sibling, 'dist', 'mcp'), { recursive: true });
    mkdirSync(path.join(sibling, 'dist', 'provider'), { recursive: true });
    writeFileSync(path.join(sibling, 'package.json'), JSON.stringify({ name: '@0xray/repertoire' }));
    writeFileSync(path.join(sibling, 'dist', 'mcp', 'server.js'), 'export {}\n');
    writeFileSync(path.join(sibling, 'dist', 'provider', 'memory-routing-provider.js'), 'export {}\n');
    try {
      const mcp = wiring.resolveRepertoireMcp(consumer);
      const provider = wiring.resolveRepertoireProvider(consumer);
      expect(mcp).toContain(`${path.sep}node_modules${path.sep}@0xray${path.sep}repertoire${path.sep}`);
      expect(provider).toContain(`${path.sep}node_modules${path.sep}@0xray${path.sep}repertoire${path.sep}`);
    } finally {
      rmSync(parent, { recursive: true, force: true });
    }
  });

  it('resolves repertoire from packed 0xray vendor when not hoisted', () => {
    const consumer = mkdtempSync(path.join(os.tmpdir(), 'xray-rep-packed-vendor-'));
    const organ = path.join(
      consumer,
      'node_modules',
      '0xray',
      'vendor',
      '@0xray',
      'repertoire',
    );
    mkdirSync(path.join(organ, 'dist', 'mcp'), { recursive: true });
    mkdirSync(path.join(organ, 'dist', 'provider'), { recursive: true });
    writeFileSync(path.join(organ, 'package.json'), JSON.stringify({ name: '@0xray/repertoire' }));
    writeFileSync(path.join(organ, 'dist', 'mcp', 'server.js'), 'export {}\n');
    writeFileSync(
      path.join(organ, 'dist', 'provider', 'memory-routing-provider.js'),
      'export {}\n',
    );
    try {
      expect(wiring.resolveRepertoireMcp(consumer)).toBe(
        path.join(organ, 'dist', 'mcp', 'server.js'),
      );
      expect(wiring.resolveRepertoireProvider(consumer)).toBe(
        path.join(organ, 'dist', 'provider', 'memory-routing-provider.js'),
      );
    } finally {
      rmSync(consumer, { recursive: true, force: true });
    }
  });

  it('portable project mcp stays 7 xray servers', () => {
    const portable = wiring.buildPortableProjectMcpJson();
    expect(Object.keys(portable.mcpServers).filter((n: string) => n.startsWith('xray-'))).toHaveLength(7);
    expect(portable.mcpServers.repertoire).toBeUndefined();
  });
});