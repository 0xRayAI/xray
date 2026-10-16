import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { evaluateOpenClawHostPreTool } from '../../integrations/openclaw/pre-tool-gate.js';
import { writeSuitSessionBoot } from '../../nucleus/suit-temperament.js';

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

  it('heats STATION.md on first OpenClaw tool of a session, not again', () => {
    const first = evaluateOpenClawHostPreTool(
      'read_file',
      { path: 'src/foo.ts' },
      { projectRoot: tmp, sessionId: 'oc-heat-1' },
    );
    expect(first.action).toBe('allow');
    const card = path.join(tmp, '.xray', 'state', 'STATION.md');
    expect(fs.existsSync(card)).toBe(true);
    const boot = JSON.parse(
      fs.readFileSync(path.join(tmp, '.xray', 'state', 'session-boot.json'), 'utf8'),
    ) as { host: string; sessionId: string };
    expect(boot.host).toBe('openclaw');
    expect(boot.sessionId).toBe('oc-heat-1');
    const firstMtime = fs.statSync(card).mtimeMs;
    evaluateOpenClawHostPreTool(
      'read_file',
      { path: 'src/bar.ts' },
      { projectRoot: tmp, sessionId: 'oc-heat-1' },
    );
    expect(fs.statSync(card).mtimeMs).toBe(firstMtime);
    evaluateOpenClawHostPreTool(
      'read_file',
      { path: 'src/baz.ts' },
      { projectRoot: tmp, sessionId: 'oc-heat-2' },
    );
    const boot2 = JSON.parse(
      fs.readFileSync(path.join(tmp, '.xray', 'state', 'session-boot.json'), 'utf8'),
    ) as { sessionId: string };
    expect(boot2.sessionId).toBe('oc-heat-2');
  });

  it('install-then-first-tool rewrites a session-less OpenClaw card', () => {
    writeSuitSessionBoot(tmp, 'openclaw', { source: '0xray/openclaw-install' });
    const card = path.join(tmp, '.xray', 'state', 'STATION.md');
    const installMtime = fs.statSync(card).mtimeMs;
    const first = evaluateOpenClawHostPreTool(
      'read_file',
      { path: 'src/foo.ts' },
      { projectRoot: tmp, sessionId: 'oc-after-install' },
    );
    expect(first.action).toBe('allow');
    const boot = JSON.parse(
      fs.readFileSync(path.join(tmp, '.xray', 'state', 'session-boot.json'), 'utf8'),
    ) as { sessionId: string };
    expect(boot.sessionId).toBe('oc-after-install');
    expect(fs.statSync(card).mtimeMs).toBeGreaterThanOrEqual(installMtime);
  });
});
