import { describe, expect, it } from 'vitest';
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.join(__dirname, '../../..');
const require = createRequire(import.meta.url);
const { patchGrokHooks, grokHookShellCommand, isEphemeralInstallRoot, installAllBridges } = require(
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
      expect(String(hook.command)).toContain('dist/integrations/grok/hooks/');
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
        expect(String(hook.command)).toContain(`XRAY_AI_PATH=${packageRoot}`);
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

  it('isEphemeralInstallRoot skips machine ~/.grok for temp consumers', () => {
    expect(isEphemeralInstallRoot('/var/folders/jx/abc/T/opencode-0xray-e2e-1')).toBe(true);
    expect(isEphemeralInstallRoot('/tmp/hermes-0xray-e2e-1')).toBe(true);
    expect(isEphemeralInstallRoot('/Users/blaze/dev/xray')).toBe(false);
    expect(isEphemeralInstallRoot('/Users/blaze/dev/bedrock')).toBe(false);
  });
});
