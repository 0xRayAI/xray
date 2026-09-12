import { describe, expect, it } from 'vitest';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { inspectSuit } from '../../../scripts/foundry/inspect.mjs';
import { installForGrokCLI } from '../../integrations/grok/grok-cli.js';

const requireCjs = createRequire(import.meta.url);
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../..');

const {
  resolveGrokPluginDests,
  projectGrokPluginDir,
  machineGrokPluginDir,
  wouldClobberMachineGrok,
  mintConsumerSuit,
} = requireCjs(path.join(root, 'scripts/foundry/mint-suit.cjs')) as {
  resolveGrokPluginDests: (targetDir: string, env?: NodeJS.ProcessEnv, machine?: string) => string[];
  projectGrokPluginDir: (targetDir: string) => string;
  machineGrokPluginDir: (machine?: string) => string;
  wouldClobberMachineGrok: (dest: string, env?: NodeJS.ProcessEnv, machine?: string) => boolean;
  mintConsumerSuit: (pkg: string, target: string, log: (...a: unknown[]) => void) => unknown;
};

const { installGrokBridge } = requireCjs(path.join(root, 'scripts/node/install-bridges.cjs')) as {
  installGrokBridge: (
    targetDir: string,
    packageRoot: string,
    log: (...a: unknown[]) => void,
    opts?: { env?: NodeJS.ProcessEnv; machineHome?: string },
  ) => void;
};

function writeSeatPackage(dir: string, name: string): void {
  writeFileSync(
    path.join(dir, 'package.json'),
    `${JSON.stringify({ name, version: '1.0.0', private: true }, null, 2)}\n`,
  );
}

function pluginXrayRoot(pluginDir: string): string | undefined {
  const mcpPath = path.join(pluginDir, '.mcp.json');
  if (!existsSync(mcpPath)) return undefined;
  const mcp = JSON.parse(readFileSync(mcpPath, 'utf8')) as {
    mcpServers?: Record<string, { env?: { XRAY_ROOT?: string } }>;
  };
  return mcp.mcpServers?.['xray-enforcer']?.env?.XRAY_ROOT;
}

function seedMachinePlugin(machine: string, sentinelRoot: string): string {
  const machinePlugin = path.join(machine, '.grok', 'plugins', '0xray');
  mkdirSync(machinePlugin, { recursive: true });
  writeFileSync(
    path.join(machinePlugin, '.mcp.json'),
    `${JSON.stringify(
      {
        mcpServers: {
          'xray-enforcer': { command: 'npx', env: { XRAY_ROOT: sentinelRoot } },
        },
      },
      null,
      2,
    )}\n`,
  );
  writeFileSync(path.join(machinePlugin, 'SENTINEL.txt'), 'do-not-clobber\n');
  return machinePlugin;
}

describe('Grok multi-seat wear — project dest, no last-wins machine clobber', () => {
  it('resolveGrokPluginDests is project-only on shared HOME; isolated HOME adds seat dest', () => {
    const project = '/tmp/forge-suit';
    const machine = '/home/box';
    expect(resolveGrokPluginDests(project, { HOME: machine }, machine)).toEqual([
      path.join(project, '.grok', 'plugins', '0xray'),
    ]);
    expect(projectGrokPluginDir(project)).toBe(path.join(project, '.grok', 'plugins', '0xray'));
    expect(machineGrokPluginDir(machine)).toBe(path.join(machine, '.grok', 'plugins', '0xray'));

    const isolated = '/tmp/seat-home';
    expect(resolveGrokPluginDests(project, { HOME: isolated }, machine)).toEqual([
      path.join(project, '.grok', 'plugins', '0xray'),
      path.join(isolated, '.grok', 'plugins', '0xray'),
    ]);
    expect(
      wouldClobberMachineGrok(path.join(machine, '.grok', 'plugins', '0xray'), { HOME: isolated }, machine),
    ).toBe(true);
    expect(
      wouldClobberMachineGrok(path.join(isolated, '.grok', 'plugins', '0xray'), { HOME: isolated }, machine),
    ).toBe(false);
  });

  it('two seats mint + grok last-mile without last-wins clobber of machine plugin', async () => {
    const machine = mkdtempSync(path.join(tmpdir(), 'box-home-'));
    const seatA = mkdtempSync(path.join(tmpdir(), 'forge-suit-'));
    const seatB = mkdtempSync(path.join(tmpdir(), 'critic-suit-'));
    try {
      writeSeatPackage(seatA, 'forge-suit');
      writeSeatPackage(seatB, 'critic-suit');
      const machinePlugin = seedMachinePlugin(machine, '/home/box/other-seat');
      const env = { HOME: machine, USERPROFILE: machine };

      expect(resolveGrokPluginDests(seatA, env, machine)).toEqual([
        path.join(seatA, '.grok', 'plugins', '0xray'),
      ]);

      mintConsumerSuit(root, seatA, () => undefined);
      mintConsumerSuit(root, seatB, () => undefined);
      installGrokBridge(seatA, root, () => undefined, { env, machineHome: machine });
      installGrokBridge(seatB, root, () => undefined, { env, machineHome: machine });

      expect(readFileSync(path.join(machinePlugin, 'SENTINEL.txt'), 'utf8')).toBe('do-not-clobber\n');
      expect(pluginXrayRoot(machinePlugin)).toBe('/home/box/other-seat');
      expect(pluginXrayRoot(path.join(seatA, '.grok', 'plugins', '0xray'))).toBe(path.resolve(seatA));
      expect(pluginXrayRoot(path.join(seatB, '.grok', 'plugins', '0xray'))).toBe(path.resolve(seatB));
      expect(pluginXrayRoot(path.join(seatA, '.grok', 'plugins', '0xray'))).not.toBe(
        pluginXrayRoot(path.join(seatB, '.grok', 'plugins', '0xray')),
      );

      const inspectA = await inspectSuit(seatA, {
        millRoot: root,
        skipLive: true,
        env,
        machineHome: machine,
      });
      expect(inspectA.ok, JSON.stringify(inspectA.checks, null, 2)).toBe(true);
      const isolatedA = inspectA.checks.find((c) => c.id === 'isolated-home') as {
        isolated?: boolean;
        dest?: string;
        machinePlugin?: string;
      };
      expect(isolatedA.isolated).toBe(false);
      expect(isolatedA.dest).toBe(path.join(seatA, '.grok', 'plugins', '0xray'));
      expect(isolatedA.machinePlugin).toBe(machinePlugin);

      const inspectB = await inspectSuit(seatB, {
        millRoot: root,
        skipLive: true,
        env,
        machineHome: machine,
      });
      expect(inspectB.ok, JSON.stringify(inspectB.checks, null, 2)).toBe(true);
      const isolatedB = inspectB.checks.find((c) => c.id === 'isolated-home') as {
        dest?: string;
      };
      expect(isolatedB.dest).toBe(path.join(seatB, '.grok', 'plugins', '0xray'));
    } finally {
      rmSync(machine, { recursive: true, force: true });
      rmSync(seatA, { recursive: true, force: true });
      rmSync(seatB, { recursive: true, force: true });
    }
  });

  it('isolated HOME last-mile wears seat dest and refuses machine plugin', () => {
    const machine = mkdtempSync(path.join(tmpdir(), 'passwd-home-'));
    const isolatedHome = mkdtempSync(path.join(tmpdir(), 'seat-home-'));
    const seat = mkdtempSync(path.join(tmpdir(), 'herald-suit-'));
    try {
      writeSeatPackage(seat, 'herald-suit');
      const machinePlugin = seedMachinePlugin(machine, '/home/box/other-seat');
      const env = { HOME: isolatedHome, USERPROFILE: isolatedHome };

      installGrokBridge(seat, root, () => undefined, { env, machineHome: machine });

      expect(readFileSync(path.join(machinePlugin, 'SENTINEL.txt'), 'utf8')).toBe('do-not-clobber\n');
      expect(pluginXrayRoot(machinePlugin)).toBe('/home/box/other-seat');
      expect(existsSync(path.join(machinePlugin, '.mcp.json'))).toBe(true);
      expect(pluginXrayRoot(path.join(seat, '.grok', 'plugins', '0xray'))).toBe(path.resolve(seat));
      expect(pluginXrayRoot(path.join(isolatedHome, '.grok', 'plugins', '0xray'))).toBe(
        path.resolve(seat),
      );
    } finally {
      rmSync(machine, { recursive: true, force: true });
      rmSync(isolatedHome, { recursive: true, force: true });
      rmSync(seat, { recursive: true, force: true });
    }
  });

  it('grok install two seats pin distinct XRAY_ROOT and leave machine plugin alone', async () => {
    const machine = mkdtempSync(path.join(tmpdir(), 'box-home-cli-'));
    const seatA = mkdtempSync(path.join(tmpdir(), 'blinky-suit-'));
    const seatB = mkdtempSync(path.join(tmpdir(), 'herald-suit-'));
    try {
      writeSeatPackage(seatA, 'blinky-suit');
      writeSeatPackage(seatB, 'herald-suit');
      const machinePlugin = seedMachinePlugin(machine, '/home/box/other-seat');
      const env = { HOME: machine, USERPROFILE: machine };

      await installForGrokCLI({
        force: true,
        env,
        machineHome: machine,
        targetDir: seatA,
      });
      await installForGrokCLI({
        force: true,
        env,
        machineHome: machine,
        targetDir: seatB,
      });

      expect(readFileSync(path.join(machinePlugin, 'SENTINEL.txt'), 'utf8')).toBe('do-not-clobber\n');
      expect(pluginXrayRoot(machinePlugin)).toBe('/home/box/other-seat');
      expect(pluginXrayRoot(path.join(seatA, '.grok', 'plugins', '0xray'))).toBe(path.resolve(seatA));
      expect(pluginXrayRoot(path.join(seatB, '.grok', 'plugins', '0xray'))).toBe(path.resolve(seatB));
    } finally {
      rmSync(machine, { recursive: true, force: true });
      rmSync(seatA, { recursive: true, force: true });
      rmSync(seatB, { recursive: true, force: true });
    }
  });
});
