import { createRequire } from 'node:module';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const requireCjs = createRequire(import.meta.url);
const repoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const {
  collectCompactSnapshot,
  quizCompactSnapshots,
  parseSnapshotArgs,
  formatQuiz,
  PATH_C_NEEDLES,
} = requireCjs(path.join(repoRoot, 'grok-bot/lib/compact-snapshot.cjs')) as {
  collectCompactSnapshot: (root: string, opts?: { now?: string }) => {
    kind: string;
    keys: { needle: string; present: boolean }[];
    probe: { preCompact: number };
    receipt: { event_class: string; trigger: string; usage: { context_tokens: number | null } } | null;
    harness: { hooksJson: boolean; repertoireNodeModules: boolean };
    usageCite: string;
  };
  quizCompactSnapshots: (
    before: unknown,
    after: unknown,
  ) => {
    survived: boolean;
    missingAfter: string[];
    probePreCompactDelta: number;
    hostReceipt: boolean;
    fillForbidden: boolean;
    usageOnAfterReceipt: { context_tokens: number | null };
  };
  parseSnapshotArgs: (argv: string[]) => { cwd: string | null; out: string | null; before: string | null; after: string | null };
  formatQuiz: (quiz: { survived: boolean; missingAfter: string[]; probePreCompactDelta: number; hostReceipt: boolean; usageOnAfterReceipt: { context_tokens: number | null; context_window_size: number | null } }) => string;
  PATH_C_NEEDLES: string[];
};

function plantPathC(root: string, opts?: { probeLines?: string; receipt?: object }) {
  mkdirSync(path.join(root, '.xray/state'), { recursive: true });
  mkdirSync(path.join(root, 'examples/cursor-cloud-compact'), { recursive: true });
  writeFileSync(
    path.join(root, '.xray/state/STATION.md'),
    [
      'Intent: COMPACT-BEN-001 Station-seed compact survival',
      'Ticket: COMPACT-BEN-001',
      'Seed: 42',
      'Open cloud: bc-DEADBEEF',
      '',
      '## Durable',
      'keep-me-ben-001',
      '',
    ].join('\n'),
  );
  writeFileSync(
    path.join(root, 'examples/cursor-cloud-compact/STATION.seed.md'),
    'Ticket: COMPACT-BEN-001\nSeed: 42\nOpen cloud: bc-DEADBEEF\nkeep-me-ben-001\n',
  );
  writeFileSync(
    path.join(root, 'examples/cursor-cloud-compact/UNFINISHED.txt'),
    'COMPACT-BEN-001 unfinished marker. Open cloud: bc-DEADBEEF — never relaunch.\n',
  );
  writeFileSync(
    path.join(root, '.xray/state/cursor-hook-invoke.log'),
    opts?.probeLines || 'ts=2026-09-15T09:00:00+00:00 event=preToolUse\n',
  );
  if (opts?.receipt) {
    writeFileSync(
      path.join(root, '.xray/state/cursor-precompact.json'),
      `${JSON.stringify(opts.receipt, null, 2)}\n`,
    );
  }
}

describe('grok-bot compact snapshot', () => {
  it('parseSnapshotArgs reads cwd out before after', () => {
    expect(
      parseSnapshotArgs(['--cwd', '/tmp/seat', '--out', 'before.json', '--before', 'a.json', '--after', 'b.json']),
    ).toEqual({
      cwd: '/tmp/seat',
      out: 'before.json',
      before: 'a.json',
      after: 'b.json',
      json: false,
    });
  });

  it('snapshot finds Path C needles and does not invent usage', () => {
    const tmp = mkdtempSync(path.join(os.tmpdir(), 'compact-snap-'));
    try {
      plantPathC(tmp);
      const snap = collectCompactSnapshot(tmp, { now: '2026-09-15T10:41:27.000Z' });
      expect(snap.kind).toBe('grok-bot-compact-snapshot');
      expect(PATH_C_NEEDLES.every((needle) => snap.keys.some((row) => row.needle === needle && row.present))).toBe(
        true,
      );
      expect(snap.harness.hooksJson).toBe(false);
      expect(snap.harness.repertoireNodeModules).toBe(false);
      expect(snap.receipt).toBeNull();
      expect(snap.usageCite).toMatch(/Never chars÷4/);
      expect(JSON.stringify(snap)).not.toMatch(/chars÷4 =/);
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('quiz PASS when keys survive and host receipt appears', () => {
    const tmp = mkdtempSync(path.join(os.tmpdir(), 'compact-quiz-'));
    try {
      plantPathC(tmp, { probeLines: 'ts=t0 event=preToolUse\n' });
      const before = collectCompactSnapshot(tmp);
      plantPathC(tmp, {
        probeLines: 'ts=t0 event=preToolUse\nts=t1 event=preCompact cwd=/workspace\n',
        receipt: {
          event_class: 'cursor-host-precompact',
          trigger: 'auto',
          sessionId: 'bc-DEADBEEF',
        },
      });
      const after = collectCompactSnapshot(tmp);
      const quiz = quizCompactSnapshots(before, after);
      expect(quiz.survived).toBe(true);
      expect(quiz.missingAfter).toEqual([]);
      expect(quiz.probePreCompactDelta).toBe(1);
      expect(quiz.hostReceipt).toBe(true);
      expect(quiz.fillForbidden).toBe(true);
      expect(quiz.usageOnAfterReceipt.context_tokens).toBeNull();
      expect(formatQuiz(quiz)).toMatch(/A friend would hear:/);
      expect(formatQuiz(quiz)).toMatch(/Do not FILL/);
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('quiz FAIL when ticket is gone after compact', () => {
    const tmp = mkdtempSync(path.join(os.tmpdir(), 'compact-quiz-miss-'));
    try {
      plantPathC(tmp);
      const before = collectCompactSnapshot(tmp);
      writeFileSync(path.join(tmp, '.xray/state/STATION.md'), 'Intent: (none yet)\nWorking: station snapshot\n');
      writeFileSync(path.join(tmp, 'examples/cursor-cloud-compact/STATION.seed.md'), 'empty\n');
      writeFileSync(path.join(tmp, 'examples/cursor-cloud-compact/UNFINISHED.txt'), 'empty\n');
      const after = collectCompactSnapshot(tmp);
      const quiz = quizCompactSnapshots(before, after);
      expect(quiz.survived).toBe(false);
      expect(quiz.missingAfter).toContain('COMPACT-BEN-001');
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('CLI compact-snapshot --out writes JSON', () => {
    const tmp = mkdtempSync(path.join(os.tmpdir(), 'compact-cli-'));
    try {
      plantPathC(tmp);
      const dest = path.join(tmp, 'snap.json');
      const r = spawnSync(
        process.execPath,
        ['grok-bot/bin/grok-bot.js', 'compact-snapshot', '--cwd', tmp, '--out', dest],
        { cwd: repoRoot, encoding: 'utf8' },
      );
      expect(r.status).toBe(0);
      const parsed = JSON.parse(r.stdout) as { kind: string };
      expect(parsed.kind).toBe('grok-bot-compact-snapshot');
      const written = JSON.parse(readFileSync(dest, 'utf8')) as { kind: string };
      expect(written.kind).toBe('grok-bot-compact-snapshot');
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('CLI compact-quiz exits 0 when keys survive', () => {
    const tmp = mkdtempSync(path.join(os.tmpdir(), 'compact-quiz-cli-'));
    try {
      plantPathC(tmp, { probeLines: 'ts=t0 event=preToolUse\n' });
      const beforePath = path.join(tmp, 'before.json');
      const r1 = spawnSync(
        process.execPath,
        ['grok-bot/bin/grok-bot.js', 'compact-snapshot', '--cwd', tmp, '--out', beforePath],
        { cwd: repoRoot, encoding: 'utf8' },
      );
      expect(r1.status).toBe(0);
      plantPathC(tmp, {
        probeLines: 'ts=t0 event=preToolUse\nts=t1 event=preCompact\n',
        receipt: { event_class: 'cursor-host-precompact', trigger: 'auto' },
      });
      const afterPath = path.join(tmp, 'after.json');
      const r2 = spawnSync(
        process.execPath,
        ['grok-bot/bin/grok-bot.js', 'compact-snapshot', '--cwd', tmp, '--out', afterPath],
        { cwd: repoRoot, encoding: 'utf8' },
      );
      expect(r2.status).toBe(0);
      const quiz = spawnSync(
        process.execPath,
        ['grok-bot/bin/grok-bot.js', 'compact-quiz', '--before', beforePath, '--after', afterPath, '--json'],
        { cwd: repoRoot, encoding: 'utf8' },
      );
      expect(quiz.status).toBe(0);
      const parsed = JSON.parse(quiz.stdout) as { survived: boolean; fillForbidden: boolean };
      expect(parsed.survived).toBe(true);
      expect(parsed.fillForbidden).toBe(true);
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });
});
