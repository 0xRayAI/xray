import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const packageRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const preCompact = path.join(packageRoot, 'src/integrations/cursor/hooks/pre-compact.js');
const loader = path.join(packageRoot, 'scripts/node/load-reflection-config.mjs');

function gitInit(root: string) {
  execFileSync('git', ['init'], { cwd: root, stdio: 'ignore' });
  execFileSync('git', ['config', 'user.email', 'cursor-hook@test'], { cwd: root, stdio: 'ignore' });
  execFileSync('git', ['config', 'user.name', 'cursor-hook'], { cwd: root, stdio: 'ignore' });
  writeFileSync(path.join(root, 'README.md'), 'cursor-hook\n');
  execFileSync('git', ['add', 'README.md'], { cwd: root, stdio: 'ignore' });
  execFileSync('git', ['commit', '-m', 'init hook metal'], { cwd: root, stdio: 'ignore' });
}

describe('Cursor preCompact reflection stub', () => {
  it('calls maybeRunReflectionStub inside the proof loop after the station write', () => {
    const src = readFileSync(preCompact, 'utf8');
    const loopAt = src.indexOf('for (const root of cursorCompactProofRoots');
    const afterLoop = src.indexOf('appendHookActivity(eventRoot', loopAt);
    const body = src.slice(loopAt, afterLoop);
    const writeAt = body.indexOf('writeSessionBoot(root, payload)');
    const callAt = body.indexOf('maybeRunReflectionStub(root)');
    expect(loopAt).toBeGreaterThanOrEqual(0);
    expect(afterLoop).toBeGreaterThan(loopAt);
    expect(writeAt).toBeGreaterThanOrEqual(0);
    expect(callAt).toBeGreaterThan(writeAt);
    expect(src.indexOf('process.exit(0)')).toBeGreaterThan(loopAt + callAt);
    expect(src).toContain("from '../../hooks/pipeline-hook-runtime.mjs'");
    const around = body.slice(Math.max(0, callAt - 40), callAt + 160);
    expect(around).toMatch(/try\s*\{[\s\S]*maybeRunReflectionStub\(root\)[\s\S]*catch\s*\{/);
  });

  it('fails closed when preCompact skips the stub: a due root records reflection-stub', () => {
    const tmp = mkdtempSync(path.join(tmpdir(), 'xray-precompact-stub-'));
    try {
      gitInit(tmp);
      mkdirSync(path.join(tmp, '.xray', 'state'), { recursive: true });
      writeFileSync(
        path.join(tmp, '.xray', 'state', 'STATION.md'),
        '# Station\n\nHost: cursor\nIntent: keep\nPlan: (none)\n',
      );
      writeFileSync(
        path.join(tmp, '.xray', 'features.json'),
        JSON.stringify({
          memory_routing: { enabled: false, provider: 'null' },
          synthesis: {
            enabled: false,
            reflection: {
              mode: 'minimal',
              thresholds: { minimal: { auto_generate: true, commit_threshold: 1 } },
            },
          },
        }),
      );
      const stdout = execFileSync(process.execPath, [preCompact], {
        cwd: tmp,
        input: JSON.stringify({
          hook_event_name: 'preCompact',
          trigger: 'auto',
          cwd: tmp,
        }),
        encoding: 'utf8',
        timeout: 20000,
        env: {
          ...process.env,
          XRAY_ROOT: tmp,
          XRAY_AI_PATH: tmp,
          CURSOR_PROJECT_DIR: tmp,
        },
      });
      const out = JSON.parse(stdout) as { user_message?: string };
      expect(out.user_message).toContain('0xRay Station written');
      const activity = readFileSync(path.join(tmp, 'logs', 'framework', 'activity.log'), 'utf8');
      expect(activity).toContain('"action":"reflection-stub"');
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });
});

describe('reflection loader default', () => {
  it('uses 25 when synthesis.reflection is unset', () => {
    const tmp = mkdtempSync(path.join(tmpdir(), 'xray-reflection-loader-'));
    try {
      const stdout = execFileSync(process.execPath, [loader], {
        cwd: tmp,
        encoding: 'utf8',
        env: { ...process.env, PROJECT_ROOT: tmp },
      });
      expect(stdout).toContain('COMMIT_THRESHOLD=25');
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });
});
