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
    input: JSON.stringify(payload),
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
  it('denies a grep that names no plane', () => {
    const result = runCursorHook({
      cwd: '/tmp',
      tool_name: 'grep',
      tool_input: { pattern: 'hello', path: 'src' },
    });
    expect(result.status).toBe(0);
    const out = JSON.parse(result.stdout);
    expect(out.permission).toBe('deny');
    expect(out.agent_message).toBe('Name one plane.');
  });

  it('allows a grep whose path names one plane', () => {
    const result = runCursorHook({
      cwd: '/tmp',
      tool_name: 'grep',
      tool_input: { pattern: 'hello', path: '/tmp/package-face/src' },
    });
    expect(result.status).toBe(0);
    const out = JSON.parse(result.stdout);
    expect(out.permission).toBe('allow');
  });
});
