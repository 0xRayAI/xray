import { describe, expect, it } from 'vitest';
import { spawnSync } from 'child_process';
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

function assignmentNames(args: string[]): string[] {
  const names: string[] = [];
  for (const arg of args) {
    if (!/^[A-Za-z_][A-Za-z0-9_]*=/.test(arg)) break;
    const name = arg.split('=')[0];
    if (name) names.push(name);
  }
  return names;
}

function innerAfterScoped(args: string[]): string[] {
  let i = 0;
  if (args[i] === '-i' || args[i] === '--ignore-environment') i += 1;
  while (i < args.length && /^[A-Za-z_][A-Za-z0-9_]*=/.test(args[i] || '')) i += 1;
  return args.slice(i);
}

describe('bridge-mcp-wiring', () => {
  it('builds 7 portable xray servers scoped with env -i and no project root when target is omitted', () => {
    const portable = wiring.buildPortableProjectMcpJson();
    const names = Object.keys(portable.mcpServers);
    expect(names.filter((n: string) => n.startsWith('xray-'))).toHaveLength(7);
    const governance = portable.mcpServers['xray-governance'];
    expect(governance.command).toBe('env');
    expect(governance.args[0]).toBe('-i');
    expect(governance.env?.XRAY_FORCE_MCP_GOVERNANCE).toBe('true');
    expect(governance.env?.XRAY_ROOT).toBeUndefined();
    expect(governance.env?.PATH).toBeTruthy();
    expect(governance.env?.HOME).toBeTruthy();
    expect(governance.env?.NODE_OPTIONS).toBeUndefined();
    const raw = JSON.stringify(portable);
    expect(raw).not.toMatch(/NPM_TOKEN|CURSOR_AUTH_TOKEN|GITHUB_TOKEN|GH_TOKEN|RAILWAY_TOKEN/);
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
    expect(entries['xray-skills'].command[0]).toBe('env');
    expect(entries['xray-skills'].command[1]).toBe('-i');
    expect(innerAfterScoped(entries['xray-skills'].command.slice(1))).toEqual([
      'npx',
      '-y',
      `0xray@${installedVersion}`,
      'mcp',
      'skills',
    ]);
    expect(entries['xray-skills'].command).not.toContain('0xray');
    expect(entries['xray-skills'].environment.PATH).toBeTruthy();
    expect(entries['xray-skills'].environment.HOME).toBeTruthy();
    expect(entries['xray-skills'].environment.XRAY_ROOT).toBe('/tmp/consumer');
    expect(entries['xray-skills'].environment.XRAY_FORCE_MCP_GOVERNANCE).toBeUndefined();
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
      expect(portable.mcpServers['xray-researcher'].command).toBe('env');
      expect(innerAfterScoped(portable.mcpServers['xray-researcher'].args)).toEqual([
        'node',
        cli,
        'mcp',
        'researcher',
      ]);
      expect(portable.mcpServers['xray-researcher'].env.XRAY_ROOT).toBe(targetDir);
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
      const mcp = JSON.parse(readFileSync(dest, 'utf8')) as {
        customTop?: boolean;
        mcpServers: Record<
          string,
          { command?: string; args?: string[]; enabled?: boolean; env?: Record<string, string> }
        >;
      };
      expect(mcp.customTop).toBe(true);
      expect(mcp.mcpServers['user-extra']).toEqual({ command: 'echo', args: ['hi'] });
      expect(mcp.mcpServers['xray-skills']?.enabled).toBe(false);
      expect(mcp.mcpServers['xray-governance']?.env?.L1_MARKER_ENV).toBe('kept');
      expect(mcp.mcpServers['xray-governance']?.env?.XRAY_FORCE_MCP_GOVERNANCE).toBe('true');
      expect(mcp.mcpServers['xray-governance']?.args).toContain('L1_MARKER_ENV=kept');
      expect(innerAfterScoped(mcp.mcpServers['xray-researcher']?.args || [])).toEqual([
        'npx',
        '-y',
        `0xray@${installedVersion}`,
        'mcp',
        'researcher',
      ]);
      expect(mcp.mcpServers['xray-researcher']?.args).not.toContain('0xray');
      const again = readFileSync(dest, 'utf8');
      wiring.deployPortableProjectMcpJson(targetDir);
      expect(readFileSync(dest, 'utf8')).toBe(again);
      expect(again).not.toBe(before);
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
      expect(mcp.mcpServers['xray-skills'].command).toBe('env');
      expect(innerAfterScoped(mcp.mcpServers['xray-skills'].args)).toEqual(['node', cli, 'mcp', 'skills']);
      expect(mcp.mcpServers['xray-skills'].enabled).toBe(false);
      expect(mcp.mcpServers['xray-skills'].env?.L1_MARKER_ENV).toBe('kept');
      expect(mcp.mcpServers['xray-skills'].args).toContain('L1_MARKER_ENV=kept');
      expect(mcp.mcpServers['xray-skills'].env?.NPM_TOKEN).toBeUndefined();
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

  it('drops inherited token env from the server process while keeping user keys', () => {
    const targetDir = mkdtempSync(path.join(os.tmpdir(), 'xray-mcp-scope-'));
    const cli = path.join(targetDir, 'node_modules', '0xray', 'dist', 'cli', 'index.js');
    mkdirSync(path.dirname(cli), { recursive: true });
    writeFileSync(
      cli,
      [
        "const { spawn } = require('child_process');",
        'const child = spawn(process.execPath, ["-e", "process.stdout.write(Object.keys(process.env).sort().join(String.fromCharCode(10)))"], {',
        '  env: Object.assign({}, process.env),',
        "  stdio: ['ignore', 'inherit', 'inherit'],",
        '});',
        "child.on('exit', (code) => process.exit(code == null ? 0 : code));",
        '',
      ].join('\n'),
    );
    try {
      wiring.deployPortableProjectMcpJson(targetDir);
      const dest = path.join(targetDir, '.mcp.json');
      const hand = JSON.parse(readFileSync(dest, 'utf8')) as {
        mcpServers: Record<string, { env?: Record<string, string> }>;
      };
      const governanceEnv = hand.mcpServers['xray-governance']?.env || {};
      hand.mcpServers['xray-governance'] = {
        ...hand.mcpServers['xray-governance'],
        env: { ...governanceEnv, L1_MARKER_ENV: 'kept' },
      };
      writeFileSync(dest, `${JSON.stringify(hand, null, 2)}\n`);
      wiring.deployPortableProjectMcpJson(targetDir);
      const mcp = JSON.parse(readFileSync(dest, 'utf8')) as {
        mcpServers: Record<string, { command: string; args: string[]; env: Record<string, string> }>;
      };
      for (const name of Object.keys(mcp.mcpServers)) {
        const entry = mcp.mcpServers[name];
        if (!name.startsWith('xray-')) continue;
        expect(entry.command).toBe('env');
        expect(entry.args[0]).toBe('-i');
        const names = assignmentNames(entry.args.slice(1));
        expect(names).toContain('PATH');
        expect(names).toContain('HOME');
        expect(names).toContain('XRAY_ROOT');
        expect(names).not.toContain('NPM_TOKEN');
        expect(names).not.toContain('CURSOR_AUTH_TOKEN');
        expect(names).not.toContain('NODE_OPTIONS');
        const result = spawnSync(entry.command, entry.args, {
          encoding: 'utf8',
          env: {
            ...process.env,
            NPM_TOKEN: 'fake_npm_x',
            CURSOR_AUTH_TOKEN: 'fake_cur_x',
            GITHUB_TOKEN: 'ghp_fake',
            RAILWAY_TOKEN: 'rw_fake',
          },
        });
        expect(result.status, result.stderr).toBe(0);
        const childNames = (result.stdout || '').trim().split('\n').filter(Boolean);
        expect(childNames).not.toContain('NPM_TOKEN');
        expect(childNames).not.toContain('CURSOR_AUTH_TOKEN');
        expect(childNames).not.toContain('GITHUB_TOKEN');
        expect(childNames).not.toContain('RAILWAY_TOKEN');
        expect(childNames).toContain('PATH');
        expect(childNames).toContain('HOME');
        expect(childNames).toContain('XRAY_ROOT');
        if (name === 'xray-governance') {
          expect(childNames).toContain('XRAY_FORCE_MCP_GOVERNANCE');
          expect(childNames).toContain('L1_MARKER_ENV');
        } else {
          expect(childNames).not.toContain('XRAY_FORCE_MCP_GOVERNANCE');
        }
      }
    } finally {
      rmSync(targetDir, { recursive: true, force: true });
    }
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