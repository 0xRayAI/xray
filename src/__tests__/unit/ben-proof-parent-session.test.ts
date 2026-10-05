import { execFileSync, spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import {
  chmodSync,
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const suited = path.join(root, 'examples/ben-proof/suited');
const srcHooks = path.join(root, 'src/integrations/cursor/hooks');

const bridges = require(path.join(root, 'scripts/node/install-bridges.cjs')) as {
  wearCursorHooks: (target: string, packageRoot: string, log?: () => void) => string | null;
  unwearCursorHooks: (target: string) => boolean;
};
const { deployManagedAgents } = require(path.join(root, 'scripts/node/postinstall.cjs')) as {
  deployManagedAgents: (pkg: string, target: string, log: () => void) => void;
};
const { overlayAgentsCard } = require(path.join(root, 'scripts/foundry/mint-suit.cjs')) as {
  overlayAgentsCard: (target: string, params: Record<string, unknown>) => boolean;
};

const OVERLAY = readFileSync(path.join(suited, 'AGENTS.md'), 'utf8');
const BENCH = readFileSync(path.join(root, 'examples/ben-proof/OP-PROC.md'), 'utf8');

function read(rel: string): string {
  return readFileSync(path.join(root, rel), 'utf8');
}

function gitInit(dir: string) {
  execFileSync('git', ['init'], { cwd: dir, stdio: 'ignore' });
}

function plantDistHooks(packageRoot: string) {
  const dest = path.join(packageRoot, 'dist', 'integrations', 'cursor', 'hooks');
  mkdirSync(dest, { recursive: true });
  for (const name of readdirSync(srcHooks)) {
    if (!name.endsWith('.sh')) continue;
    const target = path.join(dest, name);
    copyFileSync(path.join(srcHooks, name), target);
    chmodSync(target, 0o755);
  }
  writeFileSync(path.join(packageRoot, 'package.json'), `${JSON.stringify({ name: '0xray', version: '0.0.0' })}\n`);
}

function copySuitedHooks(target: string) {
  const dest = path.join(target, '.cursor', 'hooks');
  mkdirSync(dest, { recursive: true });
  copyFileSync(path.join(suited, '.cursor/hooks.json'), path.join(target, '.cursor/hooks.json'));
  for (const name of readdirSync(path.join(suited, '.cursor/hooks'))) {
    if (!name.endsWith('.sh')) continue;
    const file = path.join(dest, name);
    copyFileSync(path.join(suited, '.cursor/hooks', name), file);
    chmodSync(file, 0o755);
  }
}

function runHook(script: string, stdin: string): string {
  return execFileSync('/bin/sh', [script], {
    cwd: suited,
    encoding: 'utf8',
    input: stdin,
  }).trim();
}

/** A Task spawn voids the arm. A subagentStart deny report does not clear that. */
function benchArmStatus(trace: {
  taskSpawned: boolean;
  subagentStartPermission: 'deny' | 'allow' | 'none';
}): 'void' | 'open' {
  if (trace.taskSpawned) return 'void';
  return 'open';
}

describe('BEN dual parent-session override', () => {
  it('voids the arm when Task runs even if subagentStart only reports deny', () => {
    expect(benchArmStatus({ taskSpawned: true, subagentStartPermission: 'deny' })).toBe('void');
    expect(benchArmStatus({ taskSpawned: true, subagentStartPermission: 'allow' })).toBe('void');
    expect(benchArmStatus({ taskSpawned: false, subagentStartPermission: 'deny' })).toBe('open');
  });

  it('cites the bench OP-PROC winning over autonomy-command for this path only', () => {
    expect(BENCH).toContain('wins');
    expect(BENCH).toContain('Use Best Subagents');
    expect(BENCH).toContain('autonomy-command');
    expect(BENCH).toContain('u do ~ dont spawn subagent');
    expect(BENCH).toContain('voids that arm');
    expect(OVERLAY).toContain('OP-PROC wins');
    expect(OVERLAY).toContain('autonomy-command');
    expect(OVERLAY).not.toContain('<!-- 0xray-managed');
    expect(BENCH).toContain('even if the helper keeps running');
    expect(BENCH).toContain('subagentStart');
    expect(BENCH).toContain('is not the block');
    const house = read('house/OP-PROC.md');
    const houseBench = house.slice(house.indexOf('## Bench (compaction survival / BEN dual)'));
    for (const page of [BENCH, houseBench]) {
      expect(page).toContain('keeps reading and writing itself until the assigned corpus is finished');
      expect(page).toContain('Declaring done, `DONE-*`');
      expect(page).toContain('confirm');
      expect(page).toContain('chunk size');
      expect(page).toContain('placeholders');
      expect(page).toContain('for-loop, sed, or script');
      expect(page).toContain('not a fill');
      expect(page).toContain('voids that arm');
      expect(page).toContain('Task call');
    }
    expect(house).toContain('examples/ben-proof/OP-PROC.md');
    expect(house).toContain('wins');
    expect(houseBench.startsWith('## Bench (compaction survival / BEN dual)')).toBe(true);
    expect(read('grok-bot/OP-PROC.md')).not.toContain('examples/ben-proof/OP-PROC.md');
    expect(read('grok-bot/OP-PROC.md')).not.toContain('BEN dual');
    expect(read('AGENTS.md')).toContain('autonomy-command');
    expect(read('AGENTS.md')).toContain('subagent dispatch');
    expect(read('xray/codex.json')).toContain('Use Best Subagents, Reuse Session Context');
    expect(read('.cursor/hooks.json')).not.toContain('subagentStart');
    expect(read('src/integrations/cursor/hooks/hooks.json')).not.toContain('subagentStart');
  });

  it('tracks the suited overlay and ignores the wear sidecar', () => {
    const overlay = spawnSync('git', ['check-ignore', '-q', '--', 'examples/ben-proof/suited/AGENTS.md'], {
      cwd: root,
      encoding: 'utf8',
    });
    const sidecar = spawnSync('git', ['check-ignore', '-q', '--', 'examples/ben-proof/suited/AGENTS.md.0xray-new'], {
      cwd: root,
      encoding: 'utf8',
    });
    expect(overlay.status).toBe(1);
    expect(sidecar.status).toBe(0);
  });

  it('leaves the overlay in place across deployManagedAgents and overlayAgentsCard', () => {
    const kept = mkdtempSync(path.join(tmpdir(), 'xray-ben-overlay-'));
    const missing = mkdtempSync(path.join(tmpdir(), 'xray-ben-missing-'));
    const marked = mkdtempSync(path.join(tmpdir(), 'xray-ben-marked-'));
    try {
      for (const dir of [kept, missing, marked]) {
        writeFileSync(path.join(dir, 'package.json'), `${JSON.stringify({ name: 'recall-bench', version: '1.0.0' })}\n`);
        mkdirSync(path.join(dir, 'xray'), { recursive: true });
        writeFileSync(path.join(dir, 'xray/AGENTS.md'), '# Factory card\nFACTORY-CARD-SENTINEL\n');
      }
      writeFileSync(path.join(kept, 'AGENTS.md'), OVERLAY);
      deployManagedAgents(root, kept, () => undefined);
      expect(overlayAgentsCard(kept, {})).toBe(false);
      expect(readFileSync(path.join(kept, 'AGENTS.md'), 'utf8')).toBe(OVERLAY);
      const sidecar = readFileSync(path.join(kept, 'AGENTS.md.0xray-new'), 'utf8');
      expect(sidecar).toContain('autonomy-command');
      expect(sidecar).not.toContain('u do ~ dont spawn subagent');

      deployManagedAgents(root, missing, () => undefined);
      const worn = readFileSync(path.join(missing, 'AGENTS.md'), 'utf8');
      expect(worn).toContain('autonomy-command');
      expect(worn).not.toContain('u do ~ dont spawn subagent');

      writeFileSync(path.join(marked, 'AGENTS.md'), 'bench line\n<!-- 0xray-managed -->\n');
      expect(overlayAgentsCard(marked, {})).toBe(true);
      expect(readFileSync(path.join(marked, 'AGENTS.md'), 'utf8')).toContain('FACTORY-CARD-SENTINEL');
      expect(readFileSync(path.join(marked, 'AGENTS.md'), 'utf8')).not.toContain('bench line');
    } finally {
      rmSync(kept, { recursive: true, force: true });
      rmSync(missing, { recursive: true, force: true });
      rmSync(marked, { recursive: true, force: true });
    }
  });

  it('retargets stock runners to dist and keeps the Task deny through wear and unwear', () => {
    const hooks = JSON.parse(readFileSync(path.join(suited, '.cursor/hooks.json'), 'utf8')) as {
      hooks: {
        subagentStart: Array<{ command: string; failClosed?: boolean }>;
        preToolUse: Array<{ command: string; failClosed?: boolean; matcher?: string }>;
      };
    };
    const sub = hooks.hooks.subagentStart[0];
    expect(sub.command).toBe('.cursor/hooks/deny-subagent.sh');
    expect(sub.failClosed).toBe(true);
    const task = hooks.hooks.preToolUse.find((entry) => entry.command.endsWith('deny-task-tool.sh'));
    expect(task?.failClosed).toBe(true);
    expect(task?.matcher).toBe('Task');

    const denied = JSON.parse(runHook('.cursor/hooks/deny-subagent.sh', '{"subagent_type":"explore"}')) as {
      permission: string;
    };
    expect(denied.permission).toBe('deny');
    const taskDenied = JSON.parse(runHook('.cursor/hooks/deny-task-tool.sh', '{"tool_name":"Task"}')) as {
      permission: string;
    };
    expect(taskDenied.permission).toBe('deny');
    const readAllowed = JSON.parse(runHook('.cursor/hooks/deny-task-tool.sh', '{"tool_name":"Read"}')) as {
      permission: string;
    };
    expect(readAllowed.permission).toBe('allow');

    const project = mkdtempSync(path.join(tmpdir(), 'xray-ben-wear-'));
    const packageRoot = path.join(project, 'node_modules', '0xray');
    try {
      gitInit(project);
      writeFileSync(path.join(project, 'package.json'), `${JSON.stringify({ name: 'recall-bench' })}\n`);
      copySuitedHooks(project);
      plantDistHooks(packageRoot);
      const hooksPath = path.join(project, '.cursor/hooks.json');
      const before = readFileSync(hooksPath, 'utf8');
      bridges.wearCursorHooks(project, packageRoot, () => undefined);
      const wornText = readFileSync(hooksPath, 'utf8');
      expect(wornText).not.toBe(before);
      const worn = JSON.parse(wornText) as {
        hooks: Record<string, Array<{ command: string; failClosed?: boolean; matcher?: string }>>;
      };
      const stock: Array<[string, string]> = [
        ['preToolUse', 'pre-tool-use.sh'],
        ['preCompact', 'pre-compact.sh'],
        ['afterFileEdit', 'after-file-edit.sh'],
        ['beforeShellExecution', 'before-shell-execution.sh'],
        ['beforeReadFile', 'before-read-file.sh'],
      ];
      for (const [event, script] of stock) {
        const commands = worn.hooks[event].map((entry) => entry.command);
        expect(commands).toContain(`node_modules/0xray/dist/integrations/cursor/hooks/${script}`);
        expect(commands).not.toContain(`.cursor/hooks/${script}`);
      }
      expect(worn.hooks.preToolUse).toContainEqual({
        command: '.cursor/hooks/deny-task-tool.sh',
        failClosed: true,
        matcher: 'Task',
      });
      expect(worn.hooks.subagentStart).toEqual([
        { command: '.cursor/hooks/deny-subagent.sh', failClosed: true },
      ]);
      expect(bridges.unwearCursorHooks(project)).toBe(true);
      expect(readFileSync(hooksPath, 'utf8')).toBe(before);
    } finally {
      rmSync(project, { recursive: true, force: true });
    }
  });
});
