import { spawnSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { cursorHookErrorPermission } from '../../integrations/cursor/hooks/pre-tool-use.js';
import { repertoireDecisionFields } from '../../integrations/hooks/pre-tool-speak.mjs';
import { repertoireDecisionFields as grokRepertoireDecisionFields } from '../../integrations/grok/hooks/pre-tool-use.js';

function runCursorHook(payload: Record<string, unknown>) {
  const cwd = mkdtempSync(join(tmpdir(), 'cursor-hook-'));
  const hook = join(process.cwd(), 'src/integrations/cursor/hooks/pre-tool-use.js');
  return spawnSync(process.execPath, [hook], {
    cwd,
    input: JSON.stringify({ ...payload, cwd }),
    encoding: 'utf8',
  });
}

describe('cursorHookErrorPermission', () => {
  it('allows an EACCES code', () => {
    const err = Object.assign(new Error('permission denied'), { code: 'EACCES' });
    expect(cursorHookErrorPermission(err)).toBe('allow');
  });

  it('denies a generic error', () => {
    expect(cursorHookErrorPermission(new Error('disk full'))).toBe('deny');
  });

  it('denies when only the message mentions EACCES (code check only)', () => {
    expect(cursorHookErrorPermission(new Error('open failed: EACCES'))).toBe('deny');
  });
});

describe('repertoireDecisionFields', () => {
  it('is unchanged on the shared module and the Grok re-export', () => {
    expect(repertoireDecisionFields).toBe(grokRepertoireDecisionFields);
  });
});

describe('cursor lens spoken path', () => {
  it('a search returns the dev card', () => {
    const result = runCursorHook({
      tool_name: 'Grep',
      tool_input: { pattern: 'hello', path: 'src' },
    });
    expect(result.status).toBe(0);
    const out = JSON.parse(result.stdout);
    expect(out.permission).toBe('deny');
    expect(out.agent_message).toContain('Plane: dev');
    expect(out.agent_message).toContain('Entry:');
  });

  it('opening a file on another plane returns that card and allows the open', () => {
    const result = runCursorHook({
      tool_name: 'Read',
      tool_input: { path: 'src/nucleus/thin-dispatch.ts' },
    });
    expect(result.status).toBe(0);
    const out = JSON.parse(result.stdout);
    expect(out.permission).toBe('allow');
    expect(out.agent_message).toContain('Plane: integration');
  });

  it('a glob of package.json on the dev plane runs', () => {
    const result = runCursorHook({
      tool_name: 'Grep',
      tool_input: { pattern: 'test', glob: 'package.json', path: '/tmp/not-a-repo' },
    });
    expect(result.status).toBe(0);
    const out = JSON.parse(result.stdout);
    expect(out.permission).toBe('allow');
    expect(out.agent_message ?? '').not.toContain('Plane: dev');
  });

  it('a file on this plane runs and a file on another plane returns the card', () => {
    const here = runCursorHook({
      tool_name: 'Grep',
      tool_input: { pattern: 'chmodIfNeeded', path: 'scripts/node/install-bridges.cjs' },
    });
    expect(here.status).toBe(0);
    const allowed = JSON.parse(here.stdout);
    expect(allowed.permission).toBe('allow');
    expect(allowed.agent_message ?? '').not.toContain('Plane:');

    const there = runCursorHook({
      tool_name: 'Grep',
      tool_input: { pattern: 'release', path: 'scripts/foundry/release.mjs' },
    });
    expect(there.status).toBe(0);
    const denied = JSON.parse(there.stdout);
    expect(denied.permission).toBe('deny');
    expect(denied.agent_message).toContain('Plane: dev');
  });
});

function runGrokHook(payload: Record<string, unknown>) {
  const cwd = mkdtempSync(join(tmpdir(), 'grok-hook-'));
  const hook = join(process.cwd(), 'src/integrations/grok/hooks/pre-tool-use.js');
  const env = { ...process.env };
  delete env.GROK_WORKSPACE_ROOT;
  delete env.CLAUDE_PROJECT_DIR;
  delete env.XRAY_ROOT;
  return spawnSync(process.execPath, [hook], {
    cwd,
    env,
    input: JSON.stringify({ ...payload, cwd }),
    encoding: 'utf8',
  });
}

describe('grok lens spoken path', () => {
  it('a glob of package.json on the dev plane runs', () => {
    const result = runGrokHook({
      toolName: 'grep',
      toolInput: { pattern: 'test', glob: 'package.json', path: '/tmp/not-a-repo' },
    });
    expect(result.status).toBe(0);
    const out = JSON.parse(result.stdout);
    expect(out.decision).toBe('allow');
    expect(out.reason ?? '').not.toContain('Plane: dev');
  });

  it('a file on this plane runs and a file on another plane returns the card', () => {
    const here = runGrokHook({
      toolName: 'grep',
      toolInput: { pattern: 'chmodIfNeeded', path: 'scripts/node/install-bridges.cjs' },
    });
    expect(here.status).toBe(0);
    const allowed = JSON.parse(here.stdout);
    expect(allowed.decision).toBe('allow');
    expect(allowed.reason ?? '').not.toContain('Plane:');

    const there = runGrokHook({
      toolName: 'grep',
      toolInput: { pattern: 'release', path: 'scripts/foundry/release.mjs' },
    });
    expect(there.status).toBe(0);
    const denied = JSON.parse(there.stdout);
    expect(denied.decision).toBe('deny');
    expect(denied.reason).toContain('Plane: dev');
  });
});
