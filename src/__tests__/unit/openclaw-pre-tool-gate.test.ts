import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { evaluateOpenClawHostPreTool } from '../../integrations/openclaw/pre-tool-gate.js';

describe('OpenClaw host PreToolUse', () => {
  let tmp: string;

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'xray-oc-pre-'));
    fs.mkdirSync(path.join(tmp, '.xray', 'state'), { recursive: true });
    fs.writeFileSync(
      path.join(tmp, '.xray', 'features.json'),
      JSON.stringify({
        suit_temperament: { profile: 'auto' },
        multi_agent_orchestration: {
          enabled: true,
          lead_dev_mode: true,
          no_new_surface: true,
        },
      }),
    );
  });

  afterEach(() => {
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it('guided OpenClaw denies spawn without plan', () => {
    const result = evaluateOpenClawHostPreTool(
      'Task',
      { prompt: 'explore repo', subagent_type: 'explore' },
      { projectRoot: tmp, sessionId: 'oc-1' },
    );
    expect(result.action).toBe('block');
    expect(result.gate).toBe('spawn-plan-missing');
  });

  it('constitution denies Codex 11 writes', () => {
    const result = evaluateOpenClawHostPreTool(
      'write',
      { path: 'src/foo.ts', content: 'const x: any = 1' },
      { projectRoot: tmp, sessionId: 'oc-1' },
    );
    expect(result.action).toBe('block');
    expect(result.gate).toBe('codex-11');
  });

  it('allows read tools', () => {
    const result = evaluateOpenClawHostPreTool(
      'read_file',
      { path: 'src/foo.ts' },
      { projectRoot: tmp, sessionId: 'oc-1' },
    );
    expect(result.action).toBe('allow');
  });
});
