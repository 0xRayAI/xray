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
  wearCursorHooks: (
    target: string,
    packageRoot: string,
    log?: () => void,
    opts?: { outerRoots?: boolean },
  ) => string;
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

function assertNoRepoWearState(root: string) {
  expect(existsSync(path.join(root, '.cursor', 'xray-hook-wear.json'))).toBe(false);
  expect(existsSync(path.join(root, '.cursor', 'hooks.json.xray-before'))).toBe(false);
}

function captureStream(stream: 'stdout' | 'stderr', run: () => void): string {
  const lines: string[] = [];
  const target = stream === 'stdout' ? process.stdout : process.stderr;
  const orig = target.write.bind(target);
  target.write = ((chunk: string | Uint8Array) => {
    lines.push(typeof chunk === 'string' ? chunk : Buffer.from(chunk).toString('utf8'));
    return true;
  }) as typeof target.write;
  try {
    run();
  } finally {
    target.write = orig;
  }
  return lines.join('');
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
      const factoryScript = readFileSync(path.join(factory, '.cursor', 'hooks', 'pre-compact.sh'));

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

      expect(readFileSync(path.join(factory, '.cursor', 'hooks.json'), 'utf8')).toBe(FACTORY_ORIGINAL);
      expect(Buffer.compare(readFileSync(path.join(factory, '.cursor', 'hooks', 'pre-compact.sh')), factoryScript)).toBe(0);
      expect(existsSync(path.join(consumer, '.cursor', 'hooks'))).toBe(false);
      assertNoRepoWearState(consumer);
      assertNoRepoWearState(factory);
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
      wearCursorHooks(consumer, packageRoot, () => {});
      expect(Buffer.compare(consumerOnce, readFileSync(path.join(consumer, '.cursor', 'hooks.json')))).toBe(0);
      expect(readFileSync(path.join(factory, '.cursor', 'hooks.json'), 'utf8')).toBe(FACTORY_ORIGINAL);
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
      expect(readFileSync(path.join(factory, '.cursor', 'hooks.json'), 'utf8')).toBe(FACTORY_ORIGINAL);
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
      expect(existsSync(path.join(factory, '.cursor', 'hooks.json'))).toBe(false);
      const worn = commandsOf(path.join(consumer, '.cursor', 'hooks.json'));
      const logPath = path.join(factory, '.xray', 'state', 'cursor-hook-invoke.log');
      if (existsSync(logPath)) rmSync(logPath);

      for (const [event, script] of CURSOR_HOOK_EVENTS) {
        const command = worn[event]?.[0];
        expect(command).toBeTruthy();
        const stdout = execFileSync('/bin/sh', [path.resolve(consumer, command as string)], {
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

      const planted = readFileSync(path.join(consumer, '.cursor', 'hooks', 'pre-compact.sh'));
      wearCursorHooks(consumer, packageRoot, () => {});
      expect(Buffer.compare(readFileSync(path.join(consumer, '.cursor', 'hooks', 'pre-compact.sh')), planted)).toBe(0);
      expect(existsSync(path.join(factory, '.cursor', 'hooks.json'))).toBe(false);
      const worn = commandsOf(path.join(consumer, '.cursor', 'hooks.json'));
      const fromWorn = runSh(path.resolve(consumer, worn.preCompact[0]), factory);
      expect(JSON.parse(fromWorn.stdout).from).toBe('dist');
      expect(worn.preCompact[0]).toBe(
        'node_modules/0xray/dist/integrations/cursor/hooks/pre-compact.sh',
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

  it('keeps a user .cursor/hooks script when the name matches a shipped hook', () => {
    const project = mkdtempSync(path.join(tmpdir(), 'xray-wear-collide-'));
    const packageRoot = path.join(project, 'node_modules', '0xray');
    const userScript = '#!/bin/sh\necho user-pre-compact\n';
    const original =
      '{"version":1,"hooks":{"preCompact":[{"command":".cursor/hooks/pre-compact.sh","timeout":4}]}}\n';
    try {
      mkdirSync(path.join(project, '.cursor', 'hooks'), { recursive: true });
      writeFileSync(path.join(project, '.cursor', 'hooks', 'pre-compact.sh'), userScript);
      chmodSync(path.join(project, '.cursor', 'hooks', 'pre-compact.sh'), 0o755);
      writeFileSync(path.join(project, '.cursor', 'hooks.json'), original);
      plantDistHooks(packageRoot, 'dist');
      wearCursorHooks(project, packageRoot, () => {});
      expect(readFileSync(path.join(project, '.cursor', 'hooks', 'pre-compact.sh'), 'utf8')).toBe(userScript);
      const hooks = commandsOf(path.join(project, '.cursor', 'hooks.json'));
      expect(hooks.preCompact).toEqual([
        '.cursor/hooks/pre-compact.sh',
        'node_modules/0xray/dist/integrations/cursor/hooks/pre-compact.sh',
      ]);
      expect(unwearCursorHooks(project)).toBe(true);
      expect(readFileSync(path.join(project, '.cursor', 'hooks.json'), 'utf8')).toBe(original);
      expect(readFileSync(path.join(project, '.cursor', 'hooks', 'pre-compact.sh'), 'utf8')).toBe(userScript);
      assertNoRepoWearState(project);
    } finally {
      rmSync(project, { recursive: true, force: true });
    }
  });

  it('does not write CURSOR_PROJECT_DIR or a repos/xray ancestor unless outer roots are requested', () => {
    const base = mkdtempSync(path.join(tmpdir(), 'xray-wear-outer-'));
    const ancestor = path.join(base, 'a', 'b', 'c');
    const project = path.join(ancestor, 'project');
    const outer = path.join(base, 'cursor-project-dir');
    const packageRoot = path.join(project, 'node_modules', '0xray');
    const previous = process.env.CURSOR_PROJECT_DIR;
    try {
      mkdirSync(path.join(ancestor, 'repos', 'xray'), { recursive: true });
      mkdirSync(project, { recursive: true });
      mkdirSync(outer, { recursive: true });
      gitInit(project);
      plantDistHooks(packageRoot, 'dist');
      process.env.CURSOR_PROJECT_DIR = outer;
      wearCursorHooks(project, packageRoot, () => {});
      expect(existsSync(path.join(outer, '.cursor', 'hooks.json'))).toBe(false);
      expect(existsSync(path.join(ancestor, '.cursor', 'hooks.json'))).toBe(false);
      expect(existsSync(path.join(project, '.cursor', 'hooks.json'))).toBe(true);

      const printed = captureStream('stdout', () => {
        wearCursorHooks(project, packageRoot, () => {}, { outerRoots: true });
      });
      expect(existsSync(path.join(outer, '.cursor', 'hooks.json'))).toBe(true);
      expect(existsSync(path.join(ancestor, '.cursor', 'hooks.json'))).toBe(false);
      expect(printed).toContain(`cursor-wear: wrote outer hooks at ${outer}\n`);
      expect(printed).not.toContain(ancestor);
    } finally {
      if (previous === undefined) delete process.env.CURSOR_PROJECT_DIR;
      else process.env.CURSOR_PROJECT_DIR = previous;
      rmSync(base, { recursive: true, force: true });
    }
  });

  it('does not edit an outer checkout or the factory examples/ben-proof/suited parent', () => {
    const outer = mkdtempSync(path.join(tmpdir(), 'xray-wear-nested-'));
    const factory = mkdtempSync(path.join(tmpdir(), 'xray-wear-suited-'));
    const userHook = '#!/bin/sh\necho outer-user-hook\n';
    try {
      gitInit(outer);
      mkdirSync(path.join(outer, 'repos', 'xray'), { recursive: true });
      mkdirSync(path.join(outer, '.cursor', 'hooks'), { recursive: true });
      writeFileSync(path.join(outer, '.cursor', 'hooks.json'), FACTORY_ORIGINAL);
      writeFileSync(path.join(outer, '.cursor', 'hooks', 'pre-compact.sh'), userHook);
      const inner = path.join(outer, 'nested', 'repo');
      mkdirSync(inner, { recursive: true });
      gitInit(inner);
      const innerPkg = path.join(inner, 'node_modules', '0xray');
      plantDistHooks(innerPkg, 'dist');
      writeFileSync(path.join(inner, 'package.json'), `${JSON.stringify({ name: 'inner-app' })}\n`);
      wearCursorHooks(inner, innerPkg, () => {});
      expect(readFileSync(path.join(outer, '.cursor', 'hooks.json'), 'utf8')).toBe(FACTORY_ORIGINAL);
      expect(readFileSync(path.join(outer, '.cursor', 'hooks', 'pre-compact.sh'), 'utf8')).toBe(userHook);
      expect(commandsOf(path.join(inner, '.cursor', 'hooks.json')).preCompact).toEqual([
        'node_modules/0xray/dist/integrations/cursor/hooks/pre-compact.sh',
      ]);
      expect(existsSync(path.join(inner, '.cursor', 'hooks'))).toBe(false);
      expect(unwearCursorHooks(inner)).toBe(true);
      expect(existsSync(path.join(inner, '.cursor'))).toBe(false);
      expect(readFileSync(path.join(outer, '.cursor', 'hooks.json'), 'utf8')).toBe(FACTORY_ORIGINAL);
      expect(readFileSync(path.join(outer, '.cursor', 'hooks', 'pre-compact.sh'), 'utf8')).toBe(userHook);

      gitInit(factory);
      writeFileSync(path.join(factory, 'package.json'), `${JSON.stringify({ name: '0xray' })}\n`);
      mkdirSync(path.join(factory, '.cursor', 'hooks'), { recursive: true });
      writeFileSync(path.join(factory, '.cursor', 'hooks.json'), FACTORY_ORIGINAL);
      writeFileSync(path.join(factory, '.cursor', 'hooks', 'pre-tool-use.sh'), userHook);
      writeFileSync(path.join(factory, '.cursor', 'hooks', 'pre-compact.sh'), userHook);
      const suited = path.join(factory, 'examples', 'ben-proof', 'suited');
      mkdirSync(path.join(suited, '.cursor'), { recursive: true });
      writeFileSync(path.join(suited, 'package.json'), `${JSON.stringify({ name: 'recall-bench' })}\n`);
      writeFileSync(path.join(suited, '.cursor', 'hooks.json'), CONSUMER_ORIGINAL);
      const packageRoot = path.join(suited, 'node_modules', '0xray');
      plantDistHooks(packageRoot, 'dist');
      wearCursorHooks(suited, packageRoot, () => {});
      expect(readFileSync(path.join(factory, '.cursor', 'hooks.json'), 'utf8')).toBe(FACTORY_ORIGINAL);
      expect(readFileSync(path.join(factory, '.cursor', 'hooks', 'pre-tool-use.sh'), 'utf8')).toBe(userHook);
      expect(readFileSync(path.join(factory, '.cursor', 'hooks', 'pre-compact.sh'), 'utf8')).toBe(userHook);
      expect(existsSync(path.join(suited, '.cursor', 'hooks'))).toBe(false);
      assertNoRepoWearState(suited);
      assertNoRepoWearState(factory);
      expect(readFileSync(path.join(suited, '.cursor', 'hooks.json'), 'utf8')).toContain(
        'node_modules/0xray/dist/integrations/cursor/hooks/pre-compact.sh',
      );
      expect(unwearCursorHooks(suited)).toBe(true);
      expect(readFileSync(path.join(suited, '.cursor', 'hooks.json'), 'utf8')).toBe(CONSUMER_ORIGINAL);
      expect(readFileSync(path.join(factory, '.cursor', 'hooks.json'), 'utf8')).toBe(FACTORY_ORIGINAL);
      expect(readFileSync(path.join(factory, '.cursor', 'hooks', 'pre-compact.sh'), 'utf8')).toBe(userHook);
    } finally {
      rmSync(outer, { recursive: true, force: true });
      rmSync(factory, { recursive: true, force: true });
    }
  });

  it('merges hooks.json comments and writes nothing when the file cannot be parsed', () => {
    const project = mkdtempSync(path.join(tmpdir(), 'xray-wear-jsonc-'));
    const packageRoot = path.join(project, 'node_modules', '0xray');
    const original = [
      '{',
      '  // keep me',
      '  "version": 1,',
      '  "hooks": {',
      '    "preCompact": [',
      '      { "command": ".cursor/hooks/pre-compact.sh" } // user runner',
      '    ],',
      '    "stop": [{ "command": "./keep.sh" }]',
      '  }',
      '}',
      '',
    ].join('\n');
    try {
      mkdirSync(path.join(project, '.cursor'), { recursive: true });
      writeFileSync(path.join(project, '.cursor', 'hooks.json'), original);
      plantDistHooks(packageRoot, 'dist');
      wearCursorHooks(project, packageRoot, () => {});
      const once = readFileSync(path.join(project, '.cursor', 'hooks.json'), 'utf8');
      expect(once).toContain('// keep me');
      expect(once).toContain('// user runner');
      expect(once).toContain('.cursor/hooks/pre-compact.sh');
      expect(once).toContain('./keep.sh');
      expect(once).toContain('node_modules/0xray/dist/integrations/cursor/hooks/pre-compact.sh');
      wearCursorHooks(project, packageRoot, () => {});
      expect(readFileSync(path.join(project, '.cursor', 'hooks.json'), 'utf8')).toBe(once);

      const broken = '{ "hooks": \n';
      writeFileSync(path.join(project, '.cursor', 'hooks.json'), broken);
      expect(() => wearCursorHooks(project, packageRoot, () => {})).toThrow(/refusing to edit/);
      expect(readFileSync(path.join(project, '.cursor', 'hooks.json'), 'utf8')).toBe(broken);
      expect(existsSync(path.join(project, '.cursor', 'hooks.json.xray-before'))).toBe(false);
    } finally {
      rmSync(project, { recursive: true, force: true });
    }
  });

  it('unwear warns and keeps edits made after wear', () => {
    const project = mkdtempSync(path.join(tmpdir(), 'xray-wear-edited-'));
    const packageRoot = path.join(project, 'node_modules', '0xray');
    try {
      plantDistHooks(packageRoot, 'dist');
      mkdirSync(path.join(project, '.cursor'), { recursive: true });
      writeFileSync(path.join(project, '.cursor', 'hooks.json'), CONSUMER_ORIGINAL);
      wearCursorHooks(project, packageRoot, () => {});
      const wornPath = path.join(project, '.cursor', 'hooks.json');
      const worn = JSON.parse(readFileSync(wornPath, 'utf8')) as {
        hooks: Record<string, Array<{ command: string; timeout?: number }>>;
      };
      worn.hooks.stop.push({ command: './added-after.sh', timeout: 3 });
      worn.hooks.preCompact.push({ command: './also-mine.sh' });
      writeFileSync(wornPath, `${JSON.stringify(worn, null, 2)}\n`);
      const stderr = captureStream('stderr', () => {
        expect(unwearCursorHooks(project)).toBe(true);
      });
      const after = readFileSync(wornPath, 'utf8');
      expect(stderr).toContain('changed after wear');
      expect(stderr).toContain('keeping those edits');
      expect(after).toContain('./added-after.sh');
      expect(after).toContain('./also-mine.sh');
      expect(after).toContain('./keep-me.sh');
      expect(after).not.toContain('node_modules/0xray/dist');
      expect(after).not.toBe(CONSUMER_ORIGINAL);
    } finally {
      rmSync(project, { recursive: true, force: true });
    }
  });
});
