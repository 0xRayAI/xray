import { afterAll, afterEach, describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  existsSync,
  lstatSync,
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

const repoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const wearScript = path.join(repoRoot, 'scripts/node/wear-cursor-hooks.cjs');
const setupScript = path.join(repoRoot, 'scripts/node/install-bridges.cjs');
const projectPrefix = '.xray-machine-bridges-test-';

/** sha256 of every file under the box-wide config trees a project install must leave alone. */
function snapshot(home: string): Record<string, string> {
  const out: Record<string, string> = {};
  const walk = (dir: string) => {
    if (!existsSync(dir)) return;
    for (const name of readdirSync(dir)) {
      const abs = path.join(dir, name);
      const st = lstatSync(abs);
      if (st.isDirectory()) walk(abs);
      else out[path.relative(home, abs)] = createHash('sha256').update(readFileSync(abs)).digest('hex');
    }
  };
  walk(path.join(home, '.grok', 'plugins'));
  walk(path.join(home, '.hermes'));
  walk(path.join(home, '.openclaw'));
  return out;
}

/** A shared HOME that already carries another project's plugin, Hermes config and OpenClaw config. */
function seedMachine(home: string, other: string) {
  const plugin = path.join(home, '.grok', 'plugins', '0xray');
  mkdirSync(path.join(plugin, 'hooks'), { recursive: true });
  writeFileSync(
    path.join(plugin, '.mcp.json'),
    `${JSON.stringify({ mcpServers: { 'xray-enforcer': { command: 'node', args: [`${other}/node_modules/0xray/scripts/node/mcp-launch.cjs`], env: { XRAY_ROOT: other } } } }, null, 2)}\n`,
  );
  writeFileSync(
    path.join(plugin, 'hooks', 'hooks.json'),
    `${JSON.stringify({ hooks: { PreToolUse: [{ command: `XRAY_AI_PATH="${other}/node_modules/0xray" node run.mjs` }] } }, null, 2)}\n`,
  );
  mkdirSync(path.join(home, '.hermes'), { recursive: true });
  writeFileSync(path.join(home, '.hermes', 'config.yaml'), `mcp_servers:\n  other:\n    env:\n      XRAY_ROOT: ${other}\n`);
  mkdirSync(path.join(home, '.openclaw'), { recursive: true });
  writeFileSync(path.join(home, '.openclaw', 'openclaw.json'), `${JSON.stringify({ plugins: {}, note: other })}\n`);
  writeFileSync(path.join(home, '.openclaw', 'xray-consumer-root.txt'), `${other}\n`);
}

function run(script: string, args: string[], cwd: string, home: string, extra: Record<string, string> = {}) {
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    HOME: home,
    USERPROFILE: home,
    FOUNDRY_MACHINE_HOME: home,
    ...extra,
  };
  delete env.XRAY_MACHINE_BRIDGES;
  Object.assign(env, extra);
  return spawnSync(process.execPath, [script, ...args], { cwd, encoding: 'utf8', env });
}

/**
 * The project must not sit under a tmp path, or the install treats it as an ephemeral
 * consumer and skips machine writes for that reason. Create it under the repo, not
 * os.homedir(): after #995, vitest sets HOME to a /tmp per-run dir.
 */
function cleanupTestProjects() {
  if (!existsSync(repoRoot)) return;
  for (const name of readdirSync(repoRoot)) {
    if (name.startsWith(projectPrefix)) {
      rmSync(path.join(repoRoot, name), { recursive: true, force: true });
    }
  }
}

function withProject(body: (project: string, home: string) => void) {
  const home = mkdtempSync(path.join(tmpdir(), 'xray-machine-home-'));
  const project = mkdtempSync(path.join(repoRoot, projectPrefix));
  try {
    writeFileSync(path.join(project, 'package.json'), `${JSON.stringify({ name: 'acme' })}\n`);
    spawnSync('git', ['init', '-q'], { cwd: project });
    seedMachine(home, '/home/box/other-project');
    body(project, home);
  } finally {
    rmSync(project, { recursive: true, force: true });
    rmSync(home, { recursive: true, force: true });
  }
}

afterEach(cleanupTestProjects);
afterAll(cleanupTestProjects);

describe('machine-wide bridge writes need XRAY_MACHINE_BRIDGES=1', () => {
  it('setup leaves ~/.grok/plugins, ~/.hermes and ~/.openclaw untouched by default', () => {
    withProject((project, home) => {
      const before = snapshot(home);
      const ran = run(setupScript, ['setup', '--git-hooks'], project, home);
      expect(ran.status, `${ran.stdout}\n${ran.stderr}`).toBe(0);
      expect(ran.stdout).toContain('machine-bridges: skipped');
      expect(ran.stdout).toContain('XRAY_MACHINE_BRIDGES=1');
      expect(snapshot(home)).toEqual(before);
      // The project-local equivalents are still written.
      expect(existsSync(path.join(project, '.grok', 'plugins', '0xray', '.mcp.json'))).toBe(true);
      expect(existsSync(path.join(project, '.hermes', 'plugins', 'xray-hermes', '.mcp.json'))).toBe(true);
      expect(existsSync(path.join(project, '.mcp.json'))).toBe(true);
      expect(existsSync(path.join(project, '.xray', 'config', 'openclaw.json'))).toBe(true);
    });
  });

  it('wear leaves the same machine files untouched by default', () => {
    withProject((project, home) => {
      const before = snapshot(home);
      const ran = run(wearScript, [project], project, home);
      expect(ran.status, `${ran.stdout}\n${ran.stderr}`).toBe(0);
      expect(ran.stdout).toContain('machine-bridges: skipped');
      expect(snapshot(home)).toEqual(before);
      expect(existsSync(path.join(project, '.grok', 'plugins', '0xray', '.mcp.json'))).toBe(true);
    });
  });

  it('the opt-in writes the machine config', () => {
    withProject((project, home) => {
      const before = snapshot(home);
      const ran = run(setupScript, ['setup'], project, home, { XRAY_MACHINE_BRIDGES: '1' });
      expect(ran.status, `${ran.stdout}\n${ran.stderr}`).toBe(0);
      expect(ran.stdout).not.toContain('machine-bridges: skipped');
      const after = snapshot(home);
      expect(after).not.toEqual(before);
      expect(readFileSync(path.join(home, '.openclaw', 'xray-consumer-root.txt'), 'utf8').trim()).toBe(
        project,
      );
      expect(existsSync(path.join(home, '.hermes', 'plugins', 'xray-hermes'))).toBe(true);
    });
  });
});
