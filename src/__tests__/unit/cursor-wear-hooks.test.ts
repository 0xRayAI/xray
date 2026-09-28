import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import {
  chmodSync,
  copyFileSync,
  existsSync,
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
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const repoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const srcHooks = path.join(repoRoot, 'src/integrations/cursor/hooks');

const bridges = require(path.join(repoRoot, 'scripts/node/install-bridges.cjs')) as {
  wearCursorHooks: (target: string, packageRoot: string, log?: () => void) => string;
  unwearCursorHooks: (target: string) => boolean;
  installCursorBridge: (target: string, packageRoot: string, log?: () => void) => string | null;
  CURSOR_HOOK_EVENTS: Array<[string, string]>;
};

const { wearCursorHooks, unwearCursorHooks, installCursorBridge, CURSOR_HOOK_EVENTS } = bridges;

const EVENT_JS: Record<string, string> = {
  preToolUse: 'pre-tool-use.js',
  preCompact: 'pre-compact.js',
  afterFileEdit: 'after-file-edit.js',
  beforeShellExecution: 'pre-tool-use.js',
  beforeReadFile: 'pre-tool-use.js',
};

const CONSUMER_ORIGINAL =
  '{"version":1,"hooks":{"stop":[{"command":"./keep-me.sh","timeout":9}]}}\n';
const FACTORY_ORIGINAL =
  '{"version":1,"note":"factory","hooks":{"preToolUse":[{"command":"./user-before.sh"},{"command":".cursor/hooks/pre-tool-use.sh"}],"stop":[{"command":"./factory-stop.sh"}]}}\n';

function stubJs(marker: string): string {
  return `process.stdout.write(JSON.stringify({ from: ${JSON.stringify(marker)}, event: process.env.XRAY_HOOK_EVENT || '' }) + '\\n');\n`;
}

function plantDistHooks(packageRoot: string, marker: string) {
  const dest = path.join(packageRoot, 'dist', 'integrations', 'cursor', 'hooks');
  mkdirSync(dest, { recursive: true });
  for (const name of readdirSync(srcHooks)) {
    if (!name.endsWith('.sh')) continue;
    const target = path.join(dest, name);
    copyFileSync(path.join(srcHooks, name), target);
    chmodSync(target, 0o755);
  }
  for (const name of ['pre-tool-use.js', 'pre-compact.js', 'after-file-edit.js']) {
    writeFileSync(path.join(dest, name), stubJs(marker));
  }
  writeFileSync(
    path.join(packageRoot, 'package.json'),
    `${JSON.stringify({ name: '0xray', version: '0.0.0' })}\n`,
  );
}

function plantSrcHooks(root: string, marker: string) {
  const dest = path.join(root, 'src', 'integrations', 'cursor', 'hooks');
  mkdirSync(dest, { recursive: true });
  for (const name of ['pre-tool-use.js', 'pre-compact.js', 'after-file-edit.js']) {
    writeFileSync(path.join(dest, name), stubJs(marker));
  }
}

function plantRunnerScripts(root: string) {
  const dest = path.join(root, '.cursor', 'hooks');
  mkdirSync(dest, { recursive: true });
  for (const name of readdirSync(srcHooks)) {
    if (!name.endsWith('.sh')) continue;
    const target = path.join(dest, name);
    copyFileSync(path.join(srcHooks, name), target);
    chmodSync(target, 0o755);
  }
}

function gitInit(root: string) {
  execFileSync('git', ['init'], { cwd: root, stdio: 'ignore' });
}

function hookEnv(): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = { ...process.env, PATH: process.env.PATH || '/usr/bin:/bin' };
  delete env.XRAY_AI_PATH;
  delete env.XRAY_ROOT;
  delete env.CURSOR_PROJECT_DIR;
  delete env.XRAY_HOOK_EVENT;
  return env;
}

function runSh(script: string, cwd: string): { stdout: string; log: string } {
  const stdout = execFileSync('/bin/sh', [script], {
    cwd,
    encoding: 'utf8',
    input: '{}',
    timeout: 10000,
    env: hookEnv(),
  }).trim();
  const logPath = path.join(cwd, '.xray', 'state', 'cursor-hook-invoke.log');
  const log = existsSync(logPath) ? readFileSync(logPath, 'utf8') : '';
  return { stdout, log };
}

function commandsOf(hooksPath: string): Record<string, string[]> {
  const doc = JSON.parse(readFileSync(hooksPath, 'utf8')) as {
    hooks: Record<string, Array<{ command?: string }>>;
  };
  const out: Record<string, string[]> = {};
  for (const [name, entries] of Object.entries(doc.hooks)) {
    out[name] = entries.map((entry) => String(entry.command || ''));
  }
  return out;
}

describe('cursor wear wires installed dist hooks', () => {
  it('merges user hook entries and adds only shipped 0xray hooks', () => {
    const factory = mkdtempSync(path.join(tmpdir(), 'xray-wear-merge-'));
    const consumer = path.join(factory, 'examples', 'suited');
    const packageRoot = path.join(consumer, 'node_modules', '0xray');
    try {
      gitInit(factory);
      writeFileSync(path.join(factory, 'package.json'), `${JSON.stringify({ name: '0xray' })}\n`);
      mkdirSync(path.join(factory, '.cursor'), { recursive: true });
      writeFileSync(path.join(factory, '.cursor', 'hooks.json'), FACTORY_ORIGINAL);
      plantRunnerScripts(factory);
      mkdirSync(consumer, { recursive: true });
      writeFileSync(path.join(consumer, 'package.json'), `${JSON.stringify({ name: 'recall-bench' })}\n`);
      mkdirSync(path.join(consumer, '.cursor'), { recursive: true });
      writeFileSync(path.join(consumer, '.cursor', 'hooks.json'), CONSUMER_ORIGINAL);
      writeFileSync(path.join(consumer, '.cursor', 'user-owned.txt'), 'keep\n');
      plantDistHooks(packageRoot, 'dist');

      const dogfoodSh = readdirSync(path.join(repoRoot, '.cursor', 'hooks'))
        .filter((name) => name.endsWith('.sh'))
        .sort();
      expect(dogfoodSh).toEqual([
        'after-file-edit.sh',
        'before-read-file.sh',
        'before-shell-execution.sh',
        'invoke-probe.sh',
        'pre-compact.sh',
        'pre-tool-use.sh',
        'xray-cloud-hook.sh',
      ]);

      wearCursorHooks(consumer, packageRoot, () => {});

      const consumerHooks = commandsOf(path.join(consumer, '.cursor', 'hooks.json'));
      const consumerDoc = JSON.parse(readFileSync(path.join(consumer, '.cursor', 'hooks.json'), 'utf8')) as {
        hooks: { stop: Array<{ command: string; timeout: number }> };
      };
      expect(consumerDoc.hooks.stop[0]).toEqual({ command: './keep-me.sh', timeout: 9 });
      for (const [event, script] of CURSOR_HOOK_EVENTS) {
        expect(consumerHooks[event]).toEqual([
          `node_modules/0xray/dist/integrations/cursor/hooks/${script}`,
        ]);
      }
      expect(consumerHooks.preCompact?.[0]).toContain('pre-compact.sh');

      const factoryHooks = commandsOf(path.join(factory, '.cursor', 'hooks.json'));
      const factoryDoc = JSON.parse(readFileSync(path.join(factory, '.cursor', 'hooks.json'), 'utf8')) as {
        note: string;
        hooks: { stop: Array<{ command: string }> };
      };
      expect(factoryDoc.note).toBe('factory');
      expect(factoryDoc.hooks.stop[0].command).toBe('./factory-stop.sh');
      expect(factoryHooks.preToolUse).toEqual([
        './user-before.sh',
        'examples/suited/node_modules/0xray/dist/integrations/cursor/hooks/pre-tool-use.sh',
      ]);
      expect(factoryHooks.preCompact).toEqual([
        'examples/suited/node_modules/0xray/dist/integrations/cursor/hooks/pre-compact.sh',
      ]);
      expect(readFileSync(path.join(consumer, '.cursor', 'user-owned.txt'), 'utf8')).toBe('keep\n');
    } finally {
      rmSync(factory, { recursive: true, force: true });
    }
  });

  it('wearing twice writes identical bytes from an empty project and from a user hook', () => {
    const empty = mkdtempSync(path.join(tmpdir(), 'xray-wear-empty-'));
    const factory = mkdtempSync(path.join(tmpdir(), 'xray-wear-idem-'));
    try {
      const emptyPkg = path.join(empty, 'node_modules', '0xray');
      plantDistHooks(emptyPkg, 'dist');
      installCursorBridge(empty, emptyPkg, () => {});
      const once = readFileSync(path.join(empty, '.cursor', 'hooks.json'));
      wearCursorHooks(empty, emptyPkg, () => {});
      const twice = readFileSync(path.join(empty, '.cursor', 'hooks.json'));
      expect(Buffer.compare(once, twice)).toBe(0);
      expect(twice.toString('utf8')).toContain('pre-compact.sh');

      gitInit(factory);
      writeFileSync(path.join(factory, 'package.json'), `${JSON.stringify({ name: '0xray' })}\n`);
      const consumer = path.join(factory, 'examples', 'suited');
      mkdirSync(path.join(consumer, '.cursor'), { recursive: true });
      writeFileSync(path.join(consumer, 'package.json'), `${JSON.stringify({ name: 'recall-bench' })}\n`);
      writeFileSync(path.join(consumer, '.cursor', 'hooks.json'), CONSUMER_ORIGINAL);
      mkdirSync(path.join(factory, '.cursor'), { recursive: true });
      writeFileSync(path.join(factory, '.cursor', 'hooks.json'), FACTORY_ORIGINAL);
      const packageRoot = path.join(consumer, 'node_modules', '0xray');
      plantDistHooks(packageRoot, 'dist');
      wearCursorHooks(consumer, packageRoot, () => {});
      const consumerOnce = readFileSync(path.join(consumer, '.cursor', 'hooks.json'));
      const factoryOnce = readFileSync(path.join(factory, '.cursor', 'hooks.json'));
      wearCursorHooks(consumer, packageRoot, () => {});
      expect(Buffer.compare(consumerOnce, readFileSync(path.join(consumer, '.cursor', 'hooks.json')))).toBe(0);
      expect(Buffer.compare(factoryOnce, readFileSync(path.join(factory, '.cursor', 'hooks.json')))).toBe(0);
    } finally {
      rmSync(empty, { recursive: true, force: true });
      rmSync(factory, { recursive: true, force: true });
    }
  });

  it('unwear restores a pre-existing hooks.json byte for byte and removes a hooks.json wear created', () => {
    const empty = mkdtempSync(path.join(tmpdir(), 'xray-unwear-empty-'));
    const factory = mkdtempSync(path.join(tmpdir(), 'xray-unwear-user-'));
    try {
      const emptyPkg = path.join(empty, 'node_modules', '0xray');
      plantDistHooks(emptyPkg, 'dist');
      wearCursorHooks(empty, emptyPkg, () => {});
      expect(existsSync(path.join(empty, '.cursor', 'hooks.json'))).toBe(true);
      expect(unwearCursorHooks(empty)).toBe(true);
      expect(existsSync(path.join(empty, '.cursor'))).toBe(false);
      expect(unwearCursorHooks(empty)).toBe(false);

      gitInit(factory);
      writeFileSync(path.join(factory, 'package.json'), `${JSON.stringify({ name: '0xray' })}\n`);
      plantSrcHooks(factory, 'src');
      plantRunnerScripts(factory);
      mkdirSync(path.join(factory, '.cursor'), { recursive: true });
      writeFileSync(path.join(factory, '.cursor', 'hooks.json'), FACTORY_ORIGINAL);
      writeFileSync(path.join(factory, '.cursor', 'user-owned.txt'), 'factory-keep\n');
      const consumer = path.join(factory, 'examples', 'suited');
      mkdirSync(path.join(consumer, '.cursor'), { recursive: true });
      writeFileSync(path.join(consumer, 'package.json'), `${JSON.stringify({ name: 'recall-bench' })}\n`);
      writeFileSync(path.join(consumer, '.cursor', 'hooks.json'), CONSUMER_ORIGINAL);
      const packageRoot = path.join(consumer, 'node_modules', '0xray');
      plantDistHooks(packageRoot, 'dist');
      wearCursorHooks(consumer, packageRoot, () => {});
      expect(readFileSync(path.join(factory, '.cursor', 'hooks.json'), 'utf8')).not.toBe(FACTORY_ORIGINAL);
      expect(unwearCursorHooks(consumer)).toBe(true);
      expect(readFileSync(path.join(consumer, '.cursor', 'hooks.json'), 'utf8')).toBe(CONSUMER_ORIGINAL);
      expect(readFileSync(path.join(factory, '.cursor', 'hooks.json'), 'utf8')).toBe(FACTORY_ORIGINAL);
      expect(readFileSync(path.join(factory, '.cursor', 'user-owned.txt'), 'utf8')).toBe('factory-keep\n');
      const restored = runSh(path.join(factory, '.cursor', 'hooks', 'pre-compact.sh'), factory);
      expect(JSON.parse(restored.stdout).from).toBe('src');
    } finally {
      rmSync(empty, { recursive: true, force: true });
      rmSync(factory, { recursive: true, force: true });
    }
  });

  it('each shipped hook logs the absolute js path it executes', () => {
    const factory = mkdtempSync(path.join(tmpdir(), 'xray-wear-log-'));
    const consumer = path.join(factory, 'examples', 'suited');
    const packageRoot = path.join(consumer, 'node_modules', '0xray');
    try {
      gitInit(factory);
      writeFileSync(path.join(factory, 'package.json'), `${JSON.stringify({ name: '0xray' })}\n`);
      plantSrcHooks(factory, 'src');
      mkdirSync(consumer, { recursive: true });
      writeFileSync(path.join(consumer, 'package.json'), `${JSON.stringify({ name: 'recall-bench' })}\n`);
      plantDistHooks(packageRoot, 'dist');
      wearCursorHooks(consumer, packageRoot, () => {});
      const worn = commandsOf(path.join(factory, '.cursor', 'hooks.json'));
      const logPath = path.join(factory, '.xray', 'state', 'cursor-hook-invoke.log');
      if (existsSync(logPath)) rmSync(logPath);

      for (const [event, script] of CURSOR_HOOK_EVENTS) {
        const command = worn[event]?.[0];
        expect(command).toBeTruthy();
        const stdout = execFileSync('/bin/sh', [path.join(factory, command as string)], {
          cwd: factory,
          encoding: 'utf8',
          input: '{}',
          timeout: 10000,
          env: hookEnv(),
        }).trim();
        const parsed = JSON.parse(stdout) as { from: string; event: string };
        expect(parsed.from).toBe('dist');
        expect(parsed.event).toBe(event);
        expect(script.endsWith('.sh')).toBe(true);
      }

      const lines = readFileSync(logPath, 'utf8')
        .split(/\n/)
        .map((line) => line.trim())
        .filter((line) => line.length > 0);
      expect(lines).toHaveLength(CURSOR_HOOK_EVENTS.length);
      for (const [event] of CURSOR_HOOK_EVENTS) {
        const match = lines.find((item) => new RegExp(`(?:^|\\s)event=${event}(?:\\s|$)`).test(item));
        expect(match, event).toBeTruthy();
        const js = /(?:^|\s)js=(\S+)/.exec(match as string);
        expect(js).toBeTruthy();
        const jsPath = (js as RegExpExecArray)[1];
        expect(path.isAbsolute(jsPath)).toBe(true);
        expect(jsPath).toBe(path.join(packageRoot, 'dist', 'integrations', 'cursor', 'hooks', EVENT_JS[event]));
        expect(existsSync(jsPath)).toBe(true);
        expect(jsPath).not.toContain(`${path.sep}src${path.sep}integrations${path.sep}`);
      }
    } finally {
      rmSync(factory, { recursive: true, force: true });
    }
  });

  it('consumer resolution prefers installed node_modules over repo src', () => {
    const factory = mkdtempSync(path.join(tmpdir(), 'xray-wear-resolve-'));
    const consumer = path.join(factory, 'examples', 'suited');
    const packageRoot = path.join(consumer, 'node_modules', '0xray');
    try {
      gitInit(factory);
      writeFileSync(path.join(factory, 'package.json'), `${JSON.stringify({ name: '0xray' })}\n`);
      plantSrcHooks(factory, 'src');
      mkdirSync(consumer, { recursive: true });
      writeFileSync(path.join(consumer, 'package.json'), `${JSON.stringify({ name: 'recall-bench' })}\n`);
      plantDistHooks(packageRoot, 'dist');
      plantRunnerScripts(consumer);
      const fromConsumerScript = runSh(path.join(consumer, '.cursor', 'hooks', 'pre-compact.sh'), factory);
      expect(JSON.parse(fromConsumerScript.stdout).from).toBe('dist');
      const consumerJs = /(?:^|\s)js=(\S+)/.exec(
        readFileSync(path.join(factory, '.xray', 'state', 'cursor-hook-invoke.log'), 'utf8').trim().split('\n').pop() ||
          '',
      );
      expect(consumerJs?.[1]).toBe(
        path.join(packageRoot, 'dist', 'integrations', 'cursor', 'hooks', 'pre-compact.js'),
      );

      wearCursorHooks(consumer, packageRoot, () => {});
      const worn = commandsOf(path.join(factory, '.cursor', 'hooks.json'));
      const fromWorn = runSh(path.join(factory, worn.preCompact[0]), factory);
      expect(JSON.parse(fromWorn.stdout).from).toBe('dist');
      expect(worn.preCompact[0]).toBe(
        'examples/suited/node_modules/0xray/dist/integrations/cursor/hooks/pre-compact.sh',
      );
    } finally {
      rmSync(factory, { recursive: true, force: true });
    }
  });

  it('dogfood resolution keeps repo src when the project is 0xray', () => {
    const factory = mkdtempSync(path.join(tmpdir(), 'xray-wear-dogfood-'));
    try {
      writeFileSync(path.join(factory, 'package.json'), `${JSON.stringify({ name: '0xray' })}\n`);
      plantSrcHooks(factory, 'src');
      plantDistHooks(path.join(factory, 'node_modules', '0xray'), 'nested-dist');
      const nested = path.join(factory, 'examples', 'suited');
      mkdirSync(nested, { recursive: true });
      writeFileSync(path.join(nested, 'package.json'), `${JSON.stringify({ name: 'recall-bench' })}\n`);
      plantDistHooks(path.join(nested, 'node_modules', '0xray'), 'nested-dist');
      plantRunnerScripts(factory);
      const ran = runSh(path.join(factory, '.cursor', 'hooks', 'pre-compact.sh'), factory);
      expect(JSON.parse(ran.stdout).from).toBe('src');
      const js = /(?:^|\s)js=(\S+)/.exec(ran.log.trim().split('\n').pop() || '');
      expect(js?.[1]).toBe(path.join(factory, 'src', 'integrations', 'cursor', 'hooks', 'pre-compact.js'));
    } finally {
      rmSync(factory, { recursive: true, force: true });
    }
  });
});
