import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { listPackedPathsDryRun } from '../../../scripts/foundry/assert-packed-dist-cli.mjs';
import { reflectionIsDue } from '../../../scripts/node/reflection-due.mjs';
import { maybeRunReflectionStub } from '../../../src/integrations/hooks/pipeline-hook-runtime.mjs';

const packageRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const generator = path.join(packageRoot, 'scripts/node/auto-reflection-generator.mjs');

function gitInit(root: string) {
  execFileSync('git', ['init'], { cwd: root, stdio: 'ignore' });
  execFileSync('git', ['config', 'user.email', 'reflection@test'], { cwd: root, stdio: 'ignore' });
  execFileSync('git', ['config', 'user.name', 'reflection'], { cwd: root, stdio: 'ignore' });
}

function commitTimes(root: string, count: number) {
  for (let i = 0; i < count; i++) {
    writeFileSync(path.join(root, 'note.txt'), `${i}\n`);
    execFileSync('git', ['add', 'note.txt'], { cwd: root, stdio: 'ignore' });
    execFileSync('git', ['commit', '-m', `note ${i}`], { cwd: root, stdio: 'ignore' });
  }
}

function writeFeatures(root: string, threshold: number) {
  mkdirSync(path.join(root, '.xray'), { recursive: true });
  writeFileSync(
    path.join(root, '.xray', 'features.json'),
    JSON.stringify({
      synthesis: {
        enabled: false,
        reflection: {
          mode: 'minimal',
          thresholds: { minimal: { auto_generate: true, commit_threshold: threshold } },
        },
      },
    }),
  );
}

function feedbackDir(root: string) {
  return path.join(root, '.xray', 'state', 'repertoire', 'feedback');
}

function feedbackMarkdown(root: string): string[] {
  const dir = feedbackDir(root);
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((name) => name.endsWith('.md'))
    .sort();
}

function headOf(root: string) {
  return execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
}

function runGenerator(root: string) {
  execFileSync(process.execPath, [generator, '--trigger', 'commit-threshold', '--title', 'seat reflection'], {
    cwd: root,
    encoding: 'utf8',
    timeout: 20000,
  });
}

describe('automatic reflection reaches repertoire feedback', () => {
  it('writes one real reflection into the seat suit and does not run synthesis or confer', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'xray-reflection-seat-'));
    try {
      gitInit(root);
      commitTimes(root, 1);
      writeFeatures(root, 1);
      runGenerator(root);
      const files = feedbackMarkdown(root);
      expect(files).toHaveLength(1);
      const written = path.join(feedbackDir(root), files[0] ?? '');
      const body = readFileSync(written, 'utf8');
      expect(written.startsWith(feedbackDir(root))).toBe(true);
      expect(body).toContain('## 1. Executive Summary');
      expect(body).toContain('Auto-generated reflection stub');
      expect(body).toContain(`head: ${headOf(root)}`);
      expect(existsSync(path.join(root, 'docs', 'reflections'))).toBe(false);
      expect(existsSync(path.join(root, 'node_modules', '@0xray', 'repertoire'))).toBe(false);
      expect(existsSync(path.join(root, 'vendor', '@0xray', 'repertoire'))).toBe(false);
      expect(existsSync(path.join(root, '.xray', 'state', 'synthesis-checkpoint.json'))).toBe(false);
      expect(existsSync(path.join(root, '.xray', 'state', 'confer-checkpoint.json'))).toBe(false);

      runGenerator(root);
      expect(feedbackMarkdown(root)).toEqual(files);

      const again = maybeRunReflectionStub(root);
      expect(again).toBeNull();
      expect(feedbackMarkdown(root)).toEqual(files);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('the hook stub writes the same seat file', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'xray-reflection-stub-'));
    try {
      gitInit(root);
      commitTimes(root, 1);
      writeFeatures(root, 1);
      const first = maybeRunReflectionStub(root);
      expect(first).toMatchObject({ triggered: true, exitCode: 0 });
      const files = feedbackMarkdown(root);
      expect(files).toHaveLength(1);
      const body = readFileSync(path.join(feedbackDir(root), files[0] ?? ''), 'utf8');
      expect(body).toContain('## 1. Executive Summary');
      expect(body).toContain(`head: ${headOf(root)}`);
      expect(maybeRunReflectionStub(root)).toBeNull();
      expect(feedbackMarkdown(root)).toEqual(files);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('is due from the recorded head, not from mtime or HEAD modulo 25', () => {
    const quiet = mkdtempSync(path.join(tmpdir(), 'xray-reflection-quiet-'));
    const due = mkdtempSync(path.join(tmpdir(), 'xray-reflection-due-'));
    try {
      gitInit(quiet);
      commitTimes(quiet, 24);
      writeFeatures(quiet, 25);
      expect(reflectionIsDue(quiet, feedbackDir(quiet), 25)).toBe(false);
      runGenerator(quiet);
      expect(feedbackMarkdown(quiet)).toEqual([]);

      gitInit(due);
      commitTimes(due, 26);
      writeFeatures(due, 25);
      const rootSha = execFileSync('git', ['rev-list', '--max-parents=0', 'HEAD'], {
        cwd: due,
        encoding: 'utf8',
      })
        .trim()
        .split('\n')[0];
      const dir = feedbackDir(due);
      mkdirSync(dir, { recursive: true });
      writeFileSync(path.join(dir, 'prior-reflection.md'), `---\nhead: ${rootSha}\n---\nprior\n`);
      expect(reflectionIsDue(due, dir, 25)).toBe(true);
      runGenerator(due);
      const files = feedbackMarkdown(due);
      expect(files.length).toBe(2);
      const generated = files.find((name) => name.startsWith('checkpoint-'));
      expect(generated).toBeTruthy();
      const body = readFileSync(path.join(dir, generated ?? ''), 'utf8');
      expect(body).toContain('## 1. Executive Summary');
      expect(body).toContain(`head: ${headOf(due)}`);
    } finally {
      rmSync(quiet, { recursive: true, force: true });
      rmSync(due, { recursive: true, force: true });
    }
  });

  it('ships the minimal flag and leaves synthesis and confer off', () => {
    for (const rel of ['xray/features.json', '.xray/features.json']) {
      const features = JSON.parse(readFileSync(path.join(packageRoot, rel), 'utf8')) as {
        confer?: unknown;
        synthesis?: {
          enabled?: boolean;
          reflection?: {
            auto_generate?: boolean;
            mode?: string;
            thresholds?: { minimal?: { auto_generate?: boolean; commit_threshold?: number } };
          };
        };
      };
      expect(features.synthesis?.enabled).toBe(false);
      expect(features.confer).toBeUndefined();
      expect(features.synthesis?.reflection?.mode).toBe('minimal');
      expect(features.synthesis?.reflection?.auto_generate).toBeUndefined();
      expect(features.synthesis?.reflection?.thresholds?.minimal?.auto_generate).toBe(true);
      expect(features.synthesis?.reflection?.thresholds?.minimal?.commit_threshold).toBe(25);
    }

    const stub = readFileSync(path.join(packageRoot, 'src/integrations/hooks/pipeline-hook-runtime.mjs'), 'utf8');
    expect(stub).not.toContain('commits %');
    expect(stub).not.toContain('nucleus/synthesis');
    expect(stub).not.toContain('nucleus/confer');
    expect(stub).toContain('seatReflectionDir');

    const source = readFileSync(generator, 'utf8');
    expect(source).not.toContain('mtime');
    expect(source).not.toContain('statSync');
    expect(source).not.toContain('nucleus/synthesis');
    expect(source).not.toContain('nucleus/confer');

    const hermes = readFileSync(path.join(packageRoot, 'src/integrations/hermes-agent/bridge.mjs'), 'utf8');
    expect(hermes).toContain('maybeRunReflectionStub');
    const wake = readFileSync(
      path.join(packageRoot, 'grok-bot/templates/house/fleet/WAKE-ROUTINE.md'),
      'utf8',
    );
    expect(wake).toContain('auto-reflection-generator.mjs');
    expect(wake).toContain('.xray/state/repertoire/feedback');
    expect(readFileSync(path.join(packageRoot, '.github/workflows/mill-ci.yml'), 'utf8')).not.toContain(
      'auto-reflection-generator',
    );
  });

  it('npm pack excludes a reflection written in the seat suit', () => {
    const dir = feedbackDir(packageRoot);
    mkdirSync(dir, { recursive: true });
    const sentinel = path.join(dir, 'pack-sentinel-reflection.md');
    writeFileSync(sentinel, '---\nhead: abcdef1\n---\npack sentinel\n');
    try {
      const ignore = readFileSync(path.join(packageRoot, '.npmignore'), 'utf8');
      expect(ignore).toContain('.xray/state/repertoire/feedback/');
      const pkg = JSON.parse(readFileSync(path.join(packageRoot, 'package.json'), 'utf8')) as { files: string[] };
      expect(pkg.files.some((entry) => entry.includes('repertoire/feedback'))).toBe(false);
      const packed = listPackedPathsDryRun(packageRoot);
      expect(packed.some((entry) => entry.includes('pack-sentinel-reflection.md'))).toBe(false);
      expect(packed.some((entry) => entry.includes('.xray/state/repertoire/feedback'))).toBe(false);
      expect(packed.some((entry) => entry.startsWith('docs/reflections/'))).toBe(false);
    } finally {
      rmSync(sentinel, { force: true });
    }
  }, 180000);
});
