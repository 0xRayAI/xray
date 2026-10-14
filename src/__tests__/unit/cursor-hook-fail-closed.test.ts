/**
 * #255 B1/B2: Cursor gate hooks fail closed.
 * - pre-tool-use.js denies when its gate module is missing or throws at import (crash before the handler),
 *   when the gate throws a generic error, and on empty / malformed stdin.
 * - xray-cloud-hook.sh denies gate events when node or the hook file is missing.
 * - wear writes failClosed on the gate events in .cursor/hooks.json (fresh and existing files).
 */
import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { cursorHookErrorPermission } from '../../integrations/cursor/hooks/pre-tool-use.js';

const require = createRequire(import.meta.url);
const repoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const srcHooks = path.join(repoRoot, 'src/integrations/cursor/hooks');
const GATES = ['preToolUse', 'beforeShellExecution', 'beforeReadFile'];

/** Copy pre-tool-use.js into a temp tree with a chosen cursor-hook-utils.js (or none), then run it. */
function runWithUtils(utils: string | null, input = JSON.stringify({ tool_name: 'grep', tool_input: { pattern: 'x' } })) {
  const root = mkdtempSync(path.join(tmpdir(), 'hook-fc-'));
  const hooks = path.join(root, 'integrations', 'cursor', 'hooks');
  mkdirSync(hooks, { recursive: true });
  mkdirSync(path.join(root, 'integrations', 'hooks'), { recursive: true });
  copyFileSync(path.join(srcHooks, 'pre-tool-use.js'), path.join(hooks, 'pre-tool-use.js'));
  writeFileSync(path.join(root, 'integrations', 'hooks', 'pre-tool-speak.mjs'),
    'export const lensDecision = () => null; export const repertoireRoute = () => null;\n');
  writeFileSync(path.join(root, 'package.json'), '{"type":"module"}\n');
  if (utils !== null) writeFileSync(path.join(hooks, 'cursor-hook-utils.js'), utils);
  const r = spawnSync(process.execPath, [path.join(hooks, 'pre-tool-use.js')], { cwd: root, input, encoding: 'utf8' });
  return { status: r.status, out: r.stdout.trim() ? JSON.parse(r.stdout.trim().split('\n').pop() as string) : null, stderr: r.stderr };
}

const OK_UTILS_EXCEPT = (throwing: string) => `
const noop = () => {};
export const appendHookActivity = noop;
export const cursorWorkspaceRoot = () => process.cwd();
export async function readStdinJson() { ${throwing === 'read' ? "throw new Error('disk full');" : "const c=[]; for await (const x of process.stdin) c.push(x); const r=Buffer.concat(c).toString().trim(); if(!r) return {}; try { return JSON.parse(r); } catch { return {}; }"} }
export const cursorSessionId = () => 's';
export const cursorHeatRoots = () => [process.cwd()];
export const ensureCursorSessionBoot = noop;
export const cursorGateRoot = () => process.cwd();
export const loadFeatures = () => ({});
export const loadDelegationGateFeatures = () => ({});
export const cursorToolContext = (e) => ({ toolName: e.tool_name || 'unknown', toolInput: e.tool_input || {}, content: '', cmd: '', paths: [] });
export const evaluatePreToolGate = () => ({ allow: true });
export const isWriteTool = () => false;
export const isShellTool = () => false;
export const checkCodexPatterns = () => null;
export const checkFullTestSuite = () => null;
`;

describe('pre-tool-use.js fails closed', () => {
  it('control: a healthy gate allows a valid event', () => {
    expect(runWithUtils(OK_UTILS_EXCEPT('')).out?.permission).toBe('allow');
  });

  it('denies when the gate module is missing (ERR_MODULE_NOT_FOUND before the handler)', () => {
    const r = runWithUtils(null);
    expect(r.status).toBe(0);
    expect(r.out?.permission).toBe('deny');
  });

  it('denies when the gate module throws at import', () => {
    const r = runWithUtils("throw new Error('gate module broken at import');\n");
    expect(r.status).toBe(0);
    expect(r.out?.permission).toBe('deny');
  });

  it('denies a generic error thrown inside the handler (fails if the catch is wired to fail open)', () => {
    expect(runWithUtils(OK_UTILS_EXCEPT('read')).out?.permission).toBe('deny');
  });

  it('denies empty and malformed stdin', () => {
    expect(runWithUtils(OK_UTILS_EXCEPT(''), '').out?.permission).toBe('deny');
    expect(runWithUtils(OK_UTILS_EXCEPT(''), '{not json').out?.permission).toBe('deny');
    expect(runWithUtils(OK_UTILS_EXCEPT(''), '[1,2]').out?.permission).toBe('deny');
  });

  it('EACCES counts by error code only', () => {
    expect(cursorHookErrorPermission(Object.assign(new Error('x'), { code: 'EACCES' }))).toBe('allow');
    expect(cursorHookErrorPermission(new Error('open failed: EACCES'))).toBe('deny');
  });
});

describe('xray-cloud-hook.sh fails closed', () => {
  function runWrapper(event: string, env: Record<string, string> = {}) {
    const cwd = mkdtempSync(path.join(tmpdir(), 'hook-wrap-'));
    const hooks = path.join(cwd, '.cursor', 'hooks');
    mkdirSync(hooks, { recursive: true });
    copyFileSync(path.join(srcHooks, 'xray-cloud-hook.sh'), path.join(hooks, 'xray-cloud-hook.sh'));
    const r = spawnSync('/bin/sh', [path.join(hooks, 'xray-cloud-hook.sh'), event, 'pre-tool-use.js'], {
      cwd, input: '{}', encoding: 'utf8', env: { PATH: process.env.PATH as string, HOME: cwd, ...env } });
    return JSON.parse(r.stdout.trim());
  }

  it('denies gate events when the hook file is missing', () => {
    for (const ev of GATES) expect(runWrapper(ev).permission).toBe('deny');
  });

  it('denies when node is not on PATH', () => {
    expect(runWrapper('preToolUse', { PATH: '/nonexistent' }).permission).toBe('deny');
  });

  it('non-gate events are not blocked', () => {
    expect(runWrapper('afterFileEdit').permission).toBe('allow');
  });
});

describe('installed hooks.json sets failClosed on gate events', () => {
  const bridges = require(path.join(repoRoot, 'scripts/node/install-bridges.cjs')) as {
    wearCursorHooks: (target: string, packageRoot: string, log?: () => void, opts?: { outerRoots?: boolean }) => string;
  };
  const read = (t: string) => JSON.parse(readFileSync(path.join(t, '.cursor', 'hooks.json'), 'utf8'));

  const gitDir = (prefix: string) => { const t = mkdtempSync(path.join(tmpdir(), prefix)); spawnSync('git', ['init', '-q', t]); return t; };
  it('fresh wear', () => {
    const t = gitDir('wear-fc-');
    bridges.wearCursorHooks(t, repoRoot, () => {}, { outerRoots: false });
    const h = read(t).hooks;
    for (const ev of GATES) expect(h[ev][0].failClosed).toBe(true);
    expect(h.afterFileEdit[0].failClosed).toBeUndefined();
  });

  it('cloud-safe merge upgrades an existing relative hooks.json', () => {
    const merged = (bridges as unknown as { mergeCloudSafeCursorHooks: (x: unknown) => { hooks: Record<string, Array<{ failClosed?: boolean }>> } })
      .mergeCloudSafeCursorHooks({ version: 1, hooks: {
        preToolUse: [{ command: '.cursor/hooks/pre-tool-use.sh' }],
        beforeShellExecution: [{ command: '.cursor/hooks/before-shell-execution.sh' }],
        beforeReadFile: [{ command: '.cursor/hooks/before-read-file.sh' }] } });
    for (const ev of GATES) expect(merged.hooks[ev][0].failClosed).toBe(true);
  });

  it('installed merge upgrades an older dist entry without failClosed', () => {
    const b = bridges as unknown as { mergeInstalledCursorHooks: (x: unknown, y: unknown) => { hooks: Record<string, Array<{ command: string; failClosed?: boolean }>> } };
    const cmd = (s: string) => `node_modules/0xray/dist/integrations/cursor/hooks/${s}`;
    const shipped = {
      preToolUse: [{ command: cmd('pre-tool-use.sh'), failClosed: true }],
      afterFileEdit: [{ command: cmd('after-file-edit.sh') }],
    };
    const out = b.mergeInstalledCursorHooks({ version: 1, hooks: {
      preToolUse: [{ command: cmd('pre-tool-use.sh') }], afterFileEdit: [{ command: cmd('after-file-edit.sh') }] } }, shipped);
    expect(out.hooks.preToolUse[0].failClosed).toBe(true);
    expect(out.hooks.afterFileEdit[0].failClosed).toBeUndefined();
  });

  it('shipped template has failClosed on gate events', () => {
    const h = JSON.parse(readFileSync(path.join(srcHooks, 'hooks.json'), 'utf8')).hooks;
    for (const ev of GATES) expect(h[ev][0].failClosed).toBe(true);
  });
});

describe('bootstrap build on a fresh checkout (gate module missing)', () => {
  const sh = (command: string) => JSON.stringify({ tool_name: 'Shell', tool_input: { command } });
  it('allows the exact build command so the hook cannot block its own build', () => {
    expect(runWithUtils(null, sh('npm ci && npm run build')).out?.permission).toBe('allow');
    expect(runWithUtils(null, sh('npm run build')).out?.permission).toBe('allow');
  });
  it('still denies any other command while the gate is missing', () => {
    expect(runWithUtils(null, sh('git push origin main')).out?.permission).toBe('deny');
    expect(runWithUtils(null, sh('npm run build; rm -rf /')).out?.permission).toBe('deny');
    expect(runWithUtils(null).out?.permission).toBe('deny');
  });
});

describe('bootstrap build when utils load but the built gate is missing (cloud checkout)', () => {
  const sh = (command: string) => JSON.stringify({ tool_name: 'Shell', tool_input: { command } });
  const MISSING_GATE = `throw Object.assign(new Error('delegation-gate.js missing'), { code: 'ERR_MODULE_NOT_FOUND' });\n`;
  it('allows the exact build command', () => {
    expect(runWithUtils(MISSING_GATE, sh('npm ci && npm run build')).out?.permission).toBe('allow');
  });
  it('denies everything else', () => {
    expect(runWithUtils(MISSING_GATE, sh('git push')).out?.permission).toBe('deny');
  });
  it('the runtime loader tags its missing-gate error with ERR_MODULE_NOT_FOUND', () => {
    const src = readFileSync(path.join(repoRoot, 'src/integrations/hooks/delegation-gate-runtime.mjs'), 'utf8');
    expect(src).toMatch(/delegation-gate\.js missing[\s\S]{0,120}code: 'ERR_MODULE_NOT_FOUND'/);
  });
});
