import { describe, expect, it } from 'vitest';
import { spawnSync } from 'child_process';
import { copyFileSync, existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { resolveGrokHook } from '../../../scripts/mjs/run-grok-hook.mjs';
import { homedir, tmpdir } from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.join(__dirname, '../../..');
const require = createRequire(import.meta.url);
const {
  patchGrokHooks,
  grokHookShellCommand,
  scrubEphemeralMachineGrokPins,
  isEphemeralInstallRoot,
  isIsolatedHome,
  installAllBridges,
  resolveConsumerTargetDir,
  isInstallPrefixTarget,
} = require(
  path.join(packageRoot, 'scripts/node/install-bridges.cjs'),
);

function collectHookCommands(hooks: { hooks?: Record<string, Array<{ hooks?: Array<Record<string, unknown>> }>> }) {
  const out: Array<Record<string, unknown>> = [];
  for (const event of Object.values(hooks.hooks ?? {})) {
    for (const group of event) {
      for (const hook of group.hooks ?? []) {
        out.push(hook);
      }
    }
  }
  return out;
}

describe('Grok hooks.json command strings', () => {
  it('ships a template Grok can exec (no ignored args[])', () => {
    const raw = JSON.parse(
      readFileSync(
        path.join(packageRoot, 'src/integrations/grok/plugin/0xray/hooks/hooks.json'),
        'utf8',
      ),
    );
    const commands = collectHookCommands(raw);
    expect(commands.length).toBeGreaterThanOrEqual(6);
    for (const hook of commands) {
      expect(hook.args).toBeUndefined();
      expect(String(hook.command)).toContain('node ');
      expect(String(hook.command)).toContain('scripts/mjs/run-grok-hook.mjs');
      expect(String(hook.command)).toMatch(
        /XRAY_AI_PATH="\$\{XRAY_AI_PATH:-node_modules\/0xray\}"/,
      );
      expect(String(hook.command)).toMatch(
        /node "\$\{XRAY_AI_PATH:-node_modules\/0xray\}\/scripts\/mjs\/run-grok-hook\.mjs"/,
      );
      expect(hook.timeout).toBe(30);
    }
    const joined = JSON.stringify(raw);
    expect(joined).toContain('pre-tool-use.js');
    expect(joined).toContain('session-start.js');
    expect(joined).toContain('post-tool-use.js');
    expect(joined).toContain('--hook-event=user_prompt_submit');
    expect(joined).toContain('PreCompact');
    expect(joined).toContain('PostCompact');
    expect(joined).toContain('--hook-event=pre_compact');
  });

  it('patchGrokHooks pins absolute command strings and strips args', () => {
    const tmp = mkdtempSync(path.join(tmpdir(), 'xray-grok-hooks-'));
    try {
      const pluginDir = path.join(tmp, 'plugin');
      mkdirSync(path.join(pluginDir, 'hooks'), { recursive: true });
      writeFileSync(
        path.join(pluginDir, 'hooks', 'hooks.json'),
        readFileSync(
          path.join(packageRoot, 'src/integrations/grok/plugin/0xray/hooks/hooks.json'),
          'utf8',
        ),
      );
      mkdirSync(path.join(packageRoot, 'dist/integrations/grok/hooks'), { recursive: true });
      patchGrokHooks(pluginDir, packageRoot, tmp, () => {}, 'test');
      const patched = JSON.parse(readFileSync(path.join(pluginDir, 'hooks', 'hooks.json'), 'utf8'));
      const commands = collectHookCommands(patched);
      for (const hook of commands) {
        expect(hook.args).toBeUndefined();
        expect(String(hook.command)).toContain(`XRAY_AI_PATH=${JSON.stringify(packageRoot)}`);
        expect(String(hook.command)).toContain('node ');
        expect(hook.timeout).toBe(30);
      }
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('grokHookShellCommand is a single shell string', () => {
    const cmd = grokHookShellCommand(packageRoot, 'pre-tool-use.js');
    expect(cmd.startsWith('XRAY_AI_PATH=')).toBe(true);
    expect(cmd).toContain('pre-tool-use.js');
    expect(cmd).not.toContain('args');
  });

  it('grokHookShellCommand quotes paths so spaces survive', () => {
    const spaced = '/tmp/My Project/0xray';
    const cmd = grokHookShellCommand(spaced, 'pre-tool-use.js', '--hook-event=pre_compact');
    expect(cmd).toBe(
      `XRAY_AI_PATH=${JSON.stringify(spaced)} node ${JSON.stringify(
        path.join(spaced, 'scripts', 'mjs', 'run-grok-hook.mjs'),
      )} pre-tool-use.js --hook-event=pre_compact`,
    );
  });

  it('pins an ephemeral package at a durable wear for a real project', () => {
    const home = mkdtempSync(path.join(homedir(), 'xray-durable-home-'));
    const project = path.join(home, 'project');
    const pkg = mkdtempSync(path.join(tmpdir(), 'xray-ephemeral-pkg-'));
    const prev = process.env.FOUNDRY_MACHINE_HOME;
    process.env.FOUNDRY_MACHINE_HOME = home;
    try {
      mkdirSync(path.join(pkg, 'scripts', 'mjs'), { recursive: true });
      writeFileSync(path.join(pkg, 'scripts', 'mjs', 'run-grok-hook.mjs'), '#!/usr/bin/env node');
      mkdirSync(path.join(pkg, 'scripts', 'node'), { recursive: true });
      writeFileSync(path.join(pkg, 'scripts', 'node', 'mcp-launch.cjs'), '#!/usr/bin/env node');
      mkdirSync(path.join(pkg, 'node_modules', 'skip'), { recursive: true });
      writeFileSync(path.join(pkg, 'node_modules', 'skip', 'nope.js'), 'nope');
      const pluginDir = path.join(project, 'plugin');
      mkdirSync(path.join(pluginDir, 'hooks'), { recursive: true });
      writeFileSync(
        path.join(pluginDir, 'hooks', 'hooks.json'),
        readFileSync(path.join(packageRoot, 'src/integrations/grok/plugin/0xray/hooks/hooks.json'), 'utf8'),
      );
      patchGrokHooks(pluginDir, pkg, project, () => {}, 'test');
      const durable = path.join(home, '.grok', 'wears', '0xray');
      const patched = readFileSync(path.join(pluginDir, 'hooks', 'hooks.json'), 'utf8');
      expect(patched).toContain(JSON.stringify(durable));
      expect(patched).not.toContain(pkg);
      expect(existsSync(path.join(durable, 'scripts', 'mjs', 'run-grok-hook.mjs'))).toBe(true);
      expect(existsSync(path.join(durable, 'node_modules'))).toBe(false);
      const { buildPluginMcpJson, pinLauncherPackageRoot } = require(
        path.join(packageRoot, 'scripts/node/bridge-mcp-wiring.cjs'),
      );
      pinLauncherPackageRoot(durable);
      try {
        const mcp = JSON.stringify(buildPluginMcpJson(project));
        expect(mcp).toContain(path.join(durable, 'scripts', 'node', 'mcp-launch.cjs'));
        expect(mcp).not.toContain(pkg);
      } finally {
        pinLauncherPackageRoot('');
      }
    } finally {
      if (prev === undefined) delete process.env.FOUNDRY_MACHINE_HOME;
      else process.env.FOUNDRY_MACHINE_HOME = prev;
      rmSync(home, { recursive: true, force: true });
      rmSync(pkg, { recursive: true, force: true });
    }
  });

  it('drops a dead ephemeral XRAY_ROOT from the machine plugin', () => {
    const home = mkdtempSync(path.join(homedir(), 'xray-scrub-home-'));
    const durable = path.join(home, '.grok', 'wears', '0xray');
    const dead = path.join(tmpdir(), 'xray-setup-nogit-dead');
    try {
      mkdirSync(path.join(durable, 'scripts', 'mjs'), { recursive: true });
      writeFileSync(path.join(durable, 'scripts', 'mjs', 'run-grok-hook.mjs'), '#!/usr/bin/env node\n');
      mkdirSync(path.join(durable, 'scripts', 'node'), { recursive: true });
      writeFileSync(path.join(durable, 'scripts', 'node', 'mcp-launch.cjs'), '#!/usr/bin/env node\n');
      const plugin = path.join(home, '.grok', 'plugins', '0xray');
      mkdirSync(path.join(plugin, 'hooks'), { recursive: true });
      const deadCmd = `XRAY_AI_PATH=${JSON.stringify(dead)} node ${JSON.stringify(
        path.join(dead, 'scripts', 'mjs', 'run-grok-hook.mjs'),
      )} post-tool-use.js`;
      writeFileSync(
        path.join(plugin, 'hooks', 'hooks.json'),
        `${JSON.stringify(
          {
            hooks: {
              PostToolUse: [
                {
                  hooks: [
                    {
                      type: 'command',
                      command: deadCmd,
                      env: { XRAY_ROOT: dead, XRAY_AI_PATH: dead, KEEP: 'yes' },
                    },
                  ],
                },
              ],
            },
          },
          null,
          2,
        )}\n`,
      );
      writeFileSync(
        path.join(plugin, '.mcp.json'),
        `${JSON.stringify(
          {
            mcpServers: {
              'xray-enforcer': {
                command: 'node',
                args: [
                  path.join(dead, 'scripts', 'node', 'mcp-launch.cjs'),
                  '--keep',
                  'PATH,HOME,XRAY_ROOT',
                  '--',
                  'npx',
                ],
                env: { XRAY_ROOT: dead, XRAY_FORCE_MCP_GOVERNANCE: 'true' },
              },
            },
          },
          null,
          2,
        )}\n`,
      );
      expect(scrubEphemeralMachineGrokPins(home, durable)).toBe(2);
      const hook = JSON.parse(readFileSync(path.join(plugin, 'hooks', 'hooks.json'), 'utf8')).hooks
        .PostToolUse[0].hooks[0] as { command: string; env: Record<string, string> };
      expect(hook.command).toContain(path.join(durable, 'scripts', 'mjs', 'run-grok-hook.mjs'));
      expect(hook.command).not.toContain(dead);
      expect(hook.env.XRAY_AI_PATH).toBe(durable);
      expect(hook.env.XRAY_ROOT).toBeUndefined();
      expect(hook.env.KEEP).toBe('yes');
      const server = JSON.parse(readFileSync(path.join(plugin, '.mcp.json'), 'utf8')).mcpServers[
        'xray-enforcer'
      ] as { args: string[]; env: Record<string, string> };
      expect(server.args[0]).toBe(path.join(durable, 'scripts', 'node', 'mcp-launch.cjs'));
      expect(server.env.XRAY_ROOT).toBeUndefined();
      expect(server.env.XRAY_FORCE_MCP_GOVERNANCE).toBe('true');
      expect(scrubEphemeralMachineGrokPins(home, durable)).toBe(0);
      writeFileSync(
        path.join(plugin, '.mcp.json'),
        `${JSON.stringify({
          mcpServers: { 'xray-enforcer': { env: { XRAY_ROOT: '/home/box/other-seat' } } },
        })}\n`,
      );
      expect(scrubEphemeralMachineGrokPins(home, durable)).toBe(0);
      const kept = JSON.parse(readFileSync(path.join(plugin, '.mcp.json'), 'utf8')) as {
        mcpServers: { 'xray-enforcer': { env: { XRAY_ROOT: string } } };
      };
      expect(kept.mcpServers['xray-enforcer'].env.XRAY_ROOT).toBe('/home/box/other-seat');
    } finally {
      rmSync(home, { recursive: true, force: true });
    }
  });

  it('resolveGrokHook uses src when dist is gone', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'xray-hook-resolve-'));
    const srcHook = path.join(root, 'src', 'integrations', 'grok', 'hooks', 'pre-tool-use.js');
    const distHook = path.join(root, 'dist', 'integrations', 'grok', 'hooks', 'pre-tool-use.js');
    try {
      mkdirSync(path.dirname(srcHook), { recursive: true });
      writeFileSync(srcHook, 'export {}\n');
      expect(resolveGrokHook(root, 'pre-tool-use.js')).toBe(srcHook);
      expect(resolveGrokHook(root, '../pre-tool-use.js')).toBe('');
      mkdirSync(path.dirname(distHook), { recursive: true });
      writeFileSync(distHook, 'export {}\n');
      expect(resolveGrokHook(root, 'pre-tool-use.js')).toBe(distHook);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('the launcher runs src after dist is gone and allows a missing hook', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'xray-hook-launch-'));
    const launcherDir = path.join(root, 'scripts', 'mjs');
    const srcHook = path.join(root, 'src', 'integrations', 'grok', 'hooks', 'pre-tool-use.js');
    const launcher = path.join(launcherDir, 'run-grok-hook.mjs');
    try {
      mkdirSync(launcherDir, { recursive: true });
      mkdirSync(path.dirname(srcHook), { recursive: true });
      copyFileSync(path.join(packageRoot, 'scripts', 'mjs', 'run-grok-hook.mjs'), launcher);
      writeFileSync(
        srcHook,
        'process.stdout.write(\'{"decision":"deny","reason":"src"}\\n\');\nprocess.exit(0);\n',
      );
      const fromSrc = spawnSync(process.execPath, [launcher, 'pre-tool-use.js'], { encoding: 'utf8' });
      expect(fromSrc.status).toBe(0);
      expect(fromSrc.stdout.trim()).toBe('{"decision":"deny","reason":"src"}');

      const missing = spawnSync(process.execPath, [launcher, 'gone.js'], { encoding: 'utf8' });
      expect(missing.status).toBe(0);
      expect(missing.stdout.trim()).toBe('{"decision":"allow"}');

      writeFileSync(srcHook, 'throw new Error("boom");\n');
      const broken = spawnSync(process.execPath, [launcher, 'pre-tool-use.js'], { encoding: 'utf8' });
      expect(broken.status).toBe(0);
      expect(broken.stdout.trim()).toBe('{"decision":"allow"}');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('patchGrokHooks rewires stale args[] smoke hooks and adds compact events', () => {
    const tmp = mkdtempSync(path.join(tmpdir(), 'xray-grok-stale-'));
    try {
      const pluginDir = path.join(tmp, 'plugin');
      mkdirSync(path.join(pluginDir, 'hooks'), { recursive: true });
      writeFileSync(
        path.join(pluginDir, 'hooks', 'hooks.json'),
        JSON.stringify({
          hooks: {
            PreToolUse: [
              {
                matcher: '.*',
                hooks: [
                  {
                    type: 'command',
                    command: 'node',
                    args: ['/tmp/0xray-smoke/dist/integrations/grok/hooks/pre-tool-use.js'],
                    timeout: 30000,
                  },
                ],
              },
            ],
            SessionStart: [{ hooks: [{ type: 'command', command: 'node', args: ['old.js'] }] }],
          },
        }),
      );
      mkdirSync(path.join(packageRoot, 'dist/integrations/grok/hooks'), { recursive: true });
      patchGrokHooks(pluginDir, packageRoot, tmp, () => {}, 'stale');
      const patched = JSON.parse(readFileSync(path.join(pluginDir, 'hooks', 'hooks.json'), 'utf8'));
      const commands = collectHookCommands(patched);
      for (const hook of commands) {
        expect(hook.args).toBeUndefined();
        expect(String(hook.command)).toContain('node ');
        expect(hook.timeout).toBe(30);
      }
      expect(JSON.stringify(patched)).toContain('PreCompact');
      expect(JSON.stringify(patched)).toContain('--hook-event=pre_compact');
      expect(JSON.stringify(patched)).toContain('PostCompact');
      const discovered = path.join(tmp, '.grok', 'hooks', '0xray.json');
      expect(existsSync(discovered)).toBe(true);
      expect(readFileSync(discovered, 'utf8')).toContain('PreCompact');
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('postinstall writes nothing on dogfood', () => {
    const parent = mkdtempSync(path.join(tmpdir(), 'xray-postinstall-dogfood-'));
    const tmp = path.join(parent, 'xray');
    const repertoire = path.join(parent, 'repertoire');
    const { runPostinstall } = require(path.join(packageRoot, 'scripts/node/postinstall.cjs'));
    try {
      mkdirSync(tmp, { recursive: true });
      const pluginSrc = path.join(tmp, 'src/integrations/grok/plugin/0xray/hooks');
      mkdirSync(pluginSrc, { recursive: true });
      writeFileSync(
        path.join(pluginSrc, 'hooks.json'),
        readFileSync(
          path.join(packageRoot, 'src/integrations/grok/plugin/0xray/hooks/hooks.json'),
          'utf8',
        ),
      );
      mkdirSync(path.join(tmp, 'dist/integrations/grok/hooks'), { recursive: true });
      writeFileSync(path.join(tmp, 'dist/integrations/grok/hooks/pre-tool-use.js'), '');
      mkdirSync(path.join(tmp, '.xray'), { recursive: true });
      writeFileSync(
        path.join(tmp, '.xray', 'features.json'),
        JSON.stringify({ memory_routing: { enabled: false, provider: 'null' } }),
      );
      mkdirSync(path.join(repertoire, 'dist', 'provider'), { recursive: true });
      writeFileSync(path.join(repertoire, 'package.json'), JSON.stringify({ name: '@0xray/repertoire' }));
      writeFileSync(path.join(repertoire, 'dist', 'provider', 'memory-routing-provider.js'), 'export {}\n');

      runPostinstall(tmp, tmp, () => {});
      expect(existsSync(path.join(tmp, '.grok'))).toBe(false);
      const features = JSON.parse(readFileSync(path.join(tmp, '.xray', 'features.json'), 'utf8'));
      expect(features.memory_routing.enabled).toBe(false);
      expect(features.memory_routing.provider).toBe('null');
    } finally {
      rmSync(parent, { recursive: true, force: true });
    }
  });

  it('installAllBridges dogfood still patches discovery-path hooks', () => {
    const parent = mkdtempSync(path.join(tmpdir(), 'xray-dogfood-wear-'));
    const tmp = path.join(parent, 'xray');
    const repertoire = path.join(parent, 'repertoire');
    try {
      mkdirSync(tmp, { recursive: true });
      const pluginSrc = path.join(tmp, 'src/integrations/grok/plugin/0xray/hooks');
      mkdirSync(pluginSrc, { recursive: true });
      writeFileSync(
        path.join(pluginSrc, 'hooks.json'),
        readFileSync(
          path.join(packageRoot, 'src/integrations/grok/plugin/0xray/hooks/hooks.json'),
          'utf8',
        ),
      );
      mkdirSync(path.join(tmp, 'dist/integrations/grok/hooks'), { recursive: true });
      writeFileSync(path.join(tmp, 'dist/integrations/grok/hooks/pre-tool-use.js'), '');
      mkdirSync(path.join(tmp, 'scripts/mjs'), { recursive: true });
      writeFileSync(path.join(tmp, 'scripts/mjs/run-grok-hook.mjs'), '#!/usr/bin/env node\n');
      mkdirSync(path.join(tmp, '.xray'), { recursive: true });
      writeFileSync(
        path.join(tmp, '.xray', 'features.json'),
        JSON.stringify({ memory_routing: { enabled: false, provider: 'null' } }),
      );
      mkdirSync(path.join(repertoire, 'dist', 'provider'), { recursive: true });
      writeFileSync(path.join(repertoire, 'package.json'), JSON.stringify({ name: '@0xray/repertoire' }));
      writeFileSync(path.join(repertoire, 'dist', 'provider', 'memory-routing-provider.js'), 'export {}\n');

      installAllBridges({ packageRoot: tmp, targetDir: tmp, log: () => {} });
      const discovered = path.join(tmp, '.grok', 'hooks', '0xray.json');
      expect(existsSync(discovered)).toBe(true);
      expect(readFileSync(discovered, 'utf8')).toContain('PreCompact');
      const features = JSON.parse(readFileSync(path.join(tmp, '.xray', 'features.json'), 'utf8'));
      expect(features.memory_routing.enabled).toBe(true);
      expect(features.memory_routing.provider).toBe('repertoire');
    } finally {
      rmSync(parent, { recursive: true, force: true });
    }
  });

  it('dogfood wear materializes a missing features file and repertoire signals', () => {
    const parent = mkdtempSync(path.join(tmpdir(), 'xray-dogfood-missing-features-'));
    const tmp = path.join(parent, 'xray');
    const repertoire = path.join(parent, 'repertoire');
    try {
      mkdirSync(tmp, { recursive: true });
      const pluginSrc = path.join(tmp, 'src/integrations/grok/plugin/0xray/hooks');
      mkdirSync(pluginSrc, { recursive: true });
      writeFileSync(
        path.join(pluginSrc, 'hooks.json'),
        readFileSync(
          path.join(packageRoot, 'src/integrations/grok/plugin/0xray/hooks/hooks.json'),
          'utf8',
        ),
      );
      mkdirSync(path.join(tmp, 'dist/integrations/grok/hooks'), { recursive: true });
      writeFileSync(path.join(tmp, 'dist/integrations/grok/hooks/pre-tool-use.js'), '');
      mkdirSync(path.join(tmp, 'scripts/mjs'), { recursive: true });
      writeFileSync(path.join(tmp, 'scripts/mjs/run-grok-hook.mjs'), '#!/usr/bin/env node\n');
      mkdirSync(path.join(tmp, 'xray'), { recursive: true });
      writeFileSync(
        path.join(tmp, 'xray', 'features.json'),
        JSON.stringify({ memory_routing: { enabled: false, provider: 'null' } }),
      );
      mkdirSync(path.join(repertoire, 'dist', 'provider'), { recursive: true });
      mkdirSync(path.join(repertoire, 'data'), { recursive: true });
      writeFileSync(path.join(repertoire, 'package.json'), JSON.stringify({ name: '@0xray/repertoire' }));
      writeFileSync(path.join(repertoire, 'dist', 'provider', 'memory-routing-provider.js'), 'export {}\n');
      writeFileSync(path.join(repertoire, 'data', 'curated_signals.json'), '[{"name":"kept"}]\n');

      installAllBridges({ packageRoot: tmp, targetDir: tmp, log: () => {} });

      const features = JSON.parse(readFileSync(path.join(tmp, '.xray', 'features.json'), 'utf8'));
      expect(features.memory_routing.enabled).toBe(true);
      expect(features.memory_routing.provider).toBe('repertoire');
      expect(existsSync(path.join(tmp, '.xray', 'state', 'repertoire', 'curated_signals.json'))).toBe(true);
      expect(existsSync(path.join(tmp, '.xray', 'state', 'repertoire', 'inference-state.json'))).toBe(true);
      expect(existsSync(path.join(tmp, '.grok', 'hooks', '0xray.json'))).toBe(true);
      const discovered = readFileSync(path.join(tmp, '.grok', 'hooks', '0xray.json'), 'utf8');
      expect(discovered).toContain(path.join(tmp, 'scripts', 'mjs', 'run-grok-hook.mjs'));
    } finally {
      rmSync(parent, { recursive: true, force: true });
    }
  });

  it('dogfood wear plants an empty signals document when no source exists', () => {
    const parent = mkdtempSync(path.join(tmpdir(), 'xray-dogfood-empty-signals-'));
    const tmp = path.join(parent, 'xray');
    const repertoire = path.join(parent, 'repertoire');
    try {
      mkdirSync(tmp, { recursive: true });
      mkdirSync(path.join(tmp, '.xray'), { recursive: true });
      writeFileSync(
        path.join(tmp, '.xray', 'features.json'),
        JSON.stringify({ memory_routing: { enabled: false, provider: 'null' } }),
      );
      mkdirSync(path.join(repertoire, 'dist', 'provider'), { recursive: true });
      writeFileSync(path.join(repertoire, 'package.json'), JSON.stringify({ name: '@0xray/repertoire' }));
      writeFileSync(path.join(repertoire, 'dist', 'provider', 'memory-routing-provider.js'), 'export {}\n');

      installAllBridges({ packageRoot: tmp, targetDir: tmp, log: () => {} });

      const features = JSON.parse(readFileSync(path.join(tmp, '.xray', 'features.json'), 'utf8')) as {
        memory_routing: { provider: string };
      };
      expect(features.memory_routing.provider).toBe('repertoire');
      const written = JSON.parse(
        readFileSync(path.join(tmp, '.xray', 'state', 'repertoire', 'curated_signals.json'), 'utf8'),
      ) as { description?: string; schema_version?: string; signals?: unknown };
      expect(Array.isArray(written)).toBe(false);
      expect(written).toEqual({
        description: 'Curated high-signal primitives for Repertoire',
        schema_version: '1.1',
        signals: [],
      });
      expect(Array.isArray(written.signals)).toBe(true);
    } finally {
      rmSync(parent, { recursive: true, force: true });
    }
  });

  it('isEphemeralInstallRoot skips machine ~/.grok for temp consumers', () => {
    expect(isEphemeralInstallRoot('/var/folders/jx/abc/T/opencode-0xray-e2e-1')).toBe(true);
    expect(isEphemeralInstallRoot('/tmp/hermes-0xray-e2e-1')).toBe(true);
    expect(isEphemeralInstallRoot('/Users/blaze/dev/xray')).toBe(false);
    expect(isEphemeralInstallRoot('/Users/blaze/dev/bedrock')).toBe(false);
  });

  it('resolveConsumerTargetDir does not mill npm global prefix or npx cache', () => {
    const consumer = mkdtempSync(path.join(tmpdir(), 'xray-consumer-target-'));
    const prefix = mkdtempSync(path.join(tmpdir(), 'xray-global-lib-'));
    const npxRoot = mkdtempSync(path.join(tmpdir(), 'xray-_npx-'));
    try {
      writeFileSync(
        path.join(consumer, 'package.json'),
        `${JSON.stringify({ name: 'acme-app', version: '1.0.0' }, null, 2)}\n`,
      );
      const nested = path.join(consumer, 'node_modules', '0xray');
      mkdirSync(nested, { recursive: true });
      expect(resolveConsumerTargetDir(nested, consumer)).toBe(path.resolve(consumer));

      const globalPkg = path.join(prefix, 'node_modules', '0xray');
      mkdirSync(globalPkg, { recursive: true });
      expect(isInstallPrefixTarget(prefix)).toBe(true);
      expect(resolveConsumerTargetDir(globalPkg, prefix)).toBe(path.resolve(globalPkg));
      expect(resolveConsumerTargetDir(globalPkg, consumer)).toBe(path.resolve(consumer));

      const npxPkg = path.join(npxRoot, '_npx', 'deadbeef', 'node_modules', '0xray');
      mkdirSync(npxPkg, { recursive: true });
      const npxParent = path.join(npxRoot, '_npx', 'deadbeef');
      expect(isInstallPrefixTarget(npxParent)).toBe(true);
      expect(resolveConsumerTargetDir(npxPkg, consumer)).toBe(path.resolve(consumer));
    } finally {
      rmSync(consumer, { recursive: true, force: true });
      rmSync(prefix, { recursive: true, force: true });
      rmSync(npxRoot, { recursive: true, force: true });
    }
  });

  it('isIsolatedHome skips machine ~/.grok when HOME is not os.homedir()', () => {
    expect(isIsolatedHome({ HOME: '/tmp/lastmile-home' }, '/Users/blaze')).toBe(true);
    expect(isIsolatedHome({ HOME: '/Users/blaze' }, '/Users/blaze')).toBe(false);
    const bridges = readFileSync(path.join(packageRoot, 'scripts/node/install-bridges.cjs'), 'utf8');
    expect(bridges).toContain('skip machine ~/.grok plugin — isolated HOME');
    expect(bridges).toContain('skip machine ~/.grok plugin — project-scoped wear');
    expect(bridges).toContain('skip machine ~/.hermes plugin — isolated HOME');
    expect(bridges).toContain('skip machine ~/.openclaw skills — isolated HOME');
  });
});
