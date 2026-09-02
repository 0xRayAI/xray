import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const root = process.cwd();
const bridge = path.join(root, 'src/integrations/hermes-agent/bridge.mjs');

function runBridge(cwd: string, payload: Record<string, unknown>) {
  return execFileSync(process.execPath, [bridge, '--cwd', cwd], {
    encoding: 'utf8',
    input: JSON.stringify(payload),
    timeout: 20000,
    env: { ...process.env, XRAY_ROOT: cwd },
  });
}

describe('hermes bridge lifecycle logs', () => {
  const dirs: string[] = [];

  afterEach(() => {
    for (const dir of dirs.splice(0)) {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('logs session-start and [nudge] into activity.log', () => {
    const tmp = mkdtempSync(path.join(tmpdir(), 'xray-hermes-bridge-'));
    dirs.push(tmp);
    mkdirSync(path.join(tmp, '.xray'), { recursive: true });
    writeFileSync(
      path.join(tmp, 'package.json'),
      JSON.stringify({ name: 'hermes-bridge-fixture', dependencies: { '0xray': '4.0.0' } }),
    );
    writeFileSync(
      path.join(tmp, '.xray', 'features.json'),
      JSON.stringify({ multi_agent_orchestration: { enabled: true } }),
    );

    const started = JSON.parse(
      runBridge(tmp, { command: 'session-start', sessionId: 'vitest-hermes-1' }),
    ) as { ok?: boolean; sessionId?: string };
    expect(started.ok).toBe(true);
    expect(started.sessionId).toBe('vitest-hermes-1');

    const post = JSON.parse(
      runBridge(tmp, {
        command: 'post-process',
        tool: 'write_file',
        args: { filePath: 'src/a.ts' },
        result: { success: true },
      }),
    ) as { processors?: unknown };
    expect(post.processors).toBeDefined();

    const activity = readFileSync(path.join(tmp, 'logs', 'framework', 'activity.log'), 'utf8');
    expect(activity).toMatch(/session-start: session=vitest-hermes-1/);
    expect(activity).toMatch(/\[nudge\]/);
  });
});
