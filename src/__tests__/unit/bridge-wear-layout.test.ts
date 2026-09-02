import { describe, expect, it } from 'vitest';
import { homedir, tmpdir } from 'os';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.join(__dirname, '../../..');
const require = createRequire(import.meta.url);
const wiring = require(path.join(packageRoot, 'scripts/node/bridge-mcp-wiring.cjs')) as {
  isEphemeralInstallRoot: (targetDir: string) => boolean;
  resolveOpenClawPluginDir: (packageRoot: string) => string | null;
  resolveOpenClawPreToolHookSource: (packageRoot: string) => string | null;
  writeOpenClawConsumerArtifacts: (targetDir: string) => boolean;
  maybeWriteOpenClawCliBackend: () => boolean;
};

describe('4.0 host wear layout', () => {
  it('resolves OpenClaw plugin and stdin hook from this checkout', () => {
    const pluginDir = wiring.resolveOpenClawPluginDir(packageRoot);
    const hookSrc = wiring.resolveOpenClawPreToolHookSource(packageRoot);
    expect(pluginDir).toBeTruthy();
    expect(existsSync(path.join(pluginDir || '', 'index.js'))).toBe(true);
    expect(hookSrc).toBeTruthy();
    expect(existsSync(hookSrc || '')).toBe(true);
  });

  it('skips machine OpenClaw consumer marker for ephemeral e2e roots', () => {
    const marker = path.join(homedir(), '.openclaw', 'xray-consumer-root.txt');
    const before = existsSync(marker) ? readFileSync(marker, 'utf8') : null;
    wiring.writeOpenClawConsumerArtifacts('/tmp/hermes-0xray-e2e-layout-test');
    const after = existsSync(marker) ? readFileSync(marker, 'utf8') : null;
    expect(after).toBe(before);
  });

  it('writes opencode-cli backend into a temp OpenClaw config', () => {
    const tmp = mkdtempSync(path.join(tmpdir(), 'openclaw-cli-backend-'));
    const prev = process.env.OPENCLAW_CONFIG_PATH;
    try {
      const cfgPath = path.join(tmp, 'openclaw.json');
      writeFileSync(
        cfgPath,
        `${JSON.stringify({ agents: { defaults: { model: { primary: 'opencode/big-pickle' } } } }, null, 2)}\n`,
      );
      process.env.OPENCLAW_CONFIG_PATH = cfgPath;
      const written = wiring.maybeWriteOpenClawCliBackend();
      expect(written).toBe(true);
      const cfg = JSON.parse(readFileSync(cfgPath, 'utf8')) as {
        agents: { defaults: { model: { primary: string }; cliBackends: Record<string, { command: string }> } };
      };
      expect(cfg.agents.defaults.model.primary).toBe('opencode-cli/big-pickle');
      expect(cfg.agents.defaults.cliBackends['opencode-cli'].command).toContain('opencode');
    } finally {
      process.env.OPENCLAW_CONFIG_PATH = prev;
      rmSync(tmp, { recursive: true, force: true });
    }
  });
});
