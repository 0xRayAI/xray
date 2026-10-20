import { mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const requireCjs = createRequire(import.meta.url);
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const kit = path.join(root, 'grok-bot');
const { initHouse, diagnoseSeat } = requireCjs(path.join(kit, 'lib', 'seat-doctor.cjs')) as {
  initHouse: (opts: { dir: string; kitRoot: string }) => {
    ok: boolean;
    code: number;
    files: string[];
  };
  diagnoseSeat: (opts: { cwd: string; env: Record<string, string> }) => {
    house: { status: string };
  };
};

const BANNER =
  '> 0xRay house example — not the general procedure. Your team\u2019s rules live in `house/` after `grok-bot house init`.';

const HOUSE_EXAMPLE_LINE = /^\s*[-*]?\s*\(example\)/;

function walkMd(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) out.push(...walkMd(full));
    else if (name.endsWith('.md')) out.push(full);
  }
  return out;
}

describe('grok-bot house template — USMail docs', () => {
  it('banners every ops markdown as a 0xRay house example', () => {
    const files = walkMd(path.join(kit, 'ops'));
    expect(files.length).toBeGreaterThan(0);
    for (const file of files) {
      const text = readFileSync(file, 'utf8');
      expect(text.split(BANNER).length - 1, file).toBe(1);
      const head = text.split(/\r?\n/).slice(0, 6).join('\n');
      expect(head, file).toContain(BANNER);
    }
    expect(readFileSync(path.join(kit, 'OP-PROC.md'), 'utf8')).not.toContain(BANNER);
    expect(readFileSync(path.join(kit, 'CADENCE.md'), 'utf8')).not.toContain(BANNER);
  });

  it('ships a blank Auto Review starter with no 0xRay lists', () => {
    const auto = readFileSync(path.join(kit, 'templates', 'house', 'AUTO-REVIEW.md'), 'utf8');
    expect(auto).toMatch(/^## Ask first$/m);
    expect(auto).toMatch(/^## Allow$/m);
    expect(auto).toMatch(/only house file that enforces Ask first and Allow/);
    expect(auto.match(/^1\.\s*$/gm)).toHaveLength(2);
    expect(auto).not.toMatch(/0xRay|blinky|forge|herald|USDC|Railway|npm|gist\.github/i);
  });

  it('keeps the roster optional and blank', () => {
    const house = readFileSync(path.join(kit, 'templates', 'house', 'HOUSE.md'), 'utf8');
    const roster = house.split(/^## Roster$/m)[1];
    expect(roster).toBeTruthy();
    expect(roster).toContain('ROLE-MAP.md');
    expect(roster).toContain('AUTO-REVIEW.md');
    for (const line of roster.split(/\r?\n/)) {
      expect(line).not.toMatch(HOUSE_EXAMPLE_LINE);
    }
    const map = readFileSync(path.join(kit, 'templates', 'house', 'ROLE-MAP.md'), 'utf8');
    expect(map).toContain('| Role | Seat name | Agent id |');
    expect(map.match(/^\| \| \| \|$/gm)).toHaveLength(3);
    expect(map).not.toMatch(/0xRay|blinky|forge|herald/i);
  });

  it('house init copies the new templates and doctor ignores a blank roster', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'grok-bot-house-template-'));
    try {
      const result = initHouse({ dir, kitRoot: kit });
      expect(result.ok).toBe(true);
      expect(result.code).toBe(0);
      const rels = result.files
        .map((file) => path.relative(path.join(dir, 'house'), file).split(path.sep).join('/'))
        .sort();
      expect(rels).toEqual([
        'ATTENTION_STATE.md',
        'AUTO-REVIEW.md',
        'BOARD-PROMPT.md',
        'HOUSE.md',
        'ROLE-MAP.md',
        'STATION-BOOT.md',
        'WAVE-SCHEDULE.md',
        'WAVEBOARD.md',
        'bifrost-waves.json',
        'fleet/TRACKS.md',
        'fleet/WAKE-ROUTINE.md',
        'fleet/activity.jsonl',
        'fleet/prompts.jsonl',
        'watchers/issue-sweep-last.txt',
        'watchers/merge-queue.md',
        'watchers/review-sent.log',
        'watchers/stall-sweep.log',
        'watchers/waveboard-static.md',
      ]);
      expect(rels).not.toContain('EXAMPLE.md');
      const queue = readFileSync(path.join(kit, 'templates', 'house', 'watchers', 'merge-queue.md'), 'utf8');
      const cadenceDoc = 'https://github.com/0xRayAI/xray/blob/main/docs/opproc-cadence.md';
      expect(queue).toContain(cadenceDoc);
      expect(queue).toContain("lab tester's merge watcher");
      expect(queue).not.toMatch(/\]\(\.{1,2}\//);
      expect(readFileSync(path.join(dir, 'house', 'watchers', 'merge-queue.md'), 'utf8')).toBe(queue);
      const copiedWaves = JSON.parse(readFileSync(path.join(dir, 'house', 'bifrost-waves.json'), 'utf8')) as { waves: unknown[] };
      expect(copiedWaves.waves).toEqual([]);
      expect(JSON.stringify(copiedWaves)).not.toContain('0xRayAI/xray');
      const localBoard = readFileSync(path.join(dir, 'house', 'WAVEBOARD.md'), 'utf8');
      expect(localBoard).toContain('when `LIVE_URL` is unset');
      expect(localBoard).not.toContain('Do not add open work');
      expect(localBoard).toContain('Open cards');
      const board = readFileSync(path.join(kit, 'templates', 'house', 'watchers', 'waveboard-static.md'), 'utf8');
      expect(board).toContain(cadenceDoc);
      expect(board).toMatch(/^## Card rule$/m);
      expect(board).toMatch(/^## Waiting on owner$/m);
      expect(board).toMatch(/^## Standing$/m);
      expect(readFileSync(path.join(kit, 'templates', 'house', 'HOUSE.md'), 'utf8')).toContain(cadenceDoc);
      const houseFile = path.join(dir, 'house', 'HOUSE.md');
      const filled = readFileSync(houseFile, 'utf8').replace(/^\s*[-*]?\s*\(example\).*$/gm, 'filled.');
      writeFileSync(houseFile, filled);
      expect(diagnoseSeat({ cwd: dir, env: {} }).house.status).toBe('pass');
      expect(readFileSync(path.join(dir, 'house', 'BOARD-PROMPT.md'), 'utf8')).toContain('name: Ada');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('board-prompt skill, wake trap, and the owner bullet name no sender', () => {
    const sentence = 'On any message, run the board-prompt skill first; it posts the turn and points at OP-PROC.';
    const skill = readFileSync(path.join(kit, 'skills/board-prompt/SKILL.md'), 'utf8');
    const role = readFileSync(path.join(kit, 'templates/house/ROLE-MAP.md'), 'utf8');
    expect(skill).toContain(`description: ${sentence}`);
    expect(role).toContain(sentence);
    expect(skill).toContain('from the owner');
    expect(skill).toContain('a seat DM');
    expect(skill).toContain('or in a room');
    const promptAt = skill.indexOf('live-inbox <seat> --prompt');
    const startAt = skill.indexOf('live-inbox <seat> --turn start --tag wake');
    const endAt = skill.indexOf('live-inbox <seat> --turn end --tag wake');
    expect(promptAt).toBeGreaterThan(-1);
    expect(startAt).toBeGreaterThan(promptAt);
    expect(endAt).toBeGreaterThan(startAt);
    expect(skill).toContain('before the work');
    expect(skill).toContain('On every exit');
    expect(skill).toContain('../../OP-PROC.md');
    expect(skill).toContain('https://github.com/0xRayAI/xray/blob/main/house/OP-PROC.md');
    expect(skill).toContain('one fixed summary the seat wrote, or it is omitted');
    expect(skill).toContain('stay out of `--note`');
    expect(skill).toContain('does not send a reply whose only job is to mark the turn');
    expect(skill).toContain('Continue the reply');
    expect(skill).toContain('still run turn end on the way out');
    expect(skill).toContain('its `--turn start`, and its `--turn end`');
    expect(skill).toContain('does not also run this skill');
    expect(skill).toContain('A webhook wake skips this post. WAKE-ROUTINE step 0 is that one start.');
    expect(skill).toContain('A webhook wake skips this post. The WAKE-ROUTINE EXIT trap is that one end.');
    const wake = readFileSync(path.join(kit, 'templates/house/fleet/WAKE-ROUTINE.md'), 'utf8');
    expect(wake).not.toContain('--from blaze');
    expect(wake).toContain("trap 'live-inbox <seat> --turn end --tag wake; live-inbox <seat> --release' EXIT");
    const steps = [...wake.matchAll(/^\d+\.\s+(.*)$/gm)].map((match) => match[1]);
    expect(steps[0]).toContain('live-inbox <seat> --prompt');
    expect(steps[0]).not.toContain('--from blaze');
    expect(steps[steps.length - 1]).toContain('live-inbox <seat> --turn end --tag wake');
    expect(steps[steps.length - 1].match(/--turn end/g)).toHaveLength(1);
    const bullet = (file: string) => {
      const line = readFileSync(file, 'utf8').split('\n').find((row) => row.includes('On any inbound message, the seat runs the board-prompt skill first.'));
      expect(line, file).toBeTruthy();
      expect(line).not.toMatch(/\b(Blaze|Ada|blaze)\b/);
    };
    bullet(path.join(kit, 'OP-PROC.md'));
    bullet(path.join(root, 'house/OP-PROC.md'));
    bullet(path.join(kit, 'templates/house/HOUSE.md'));
    expect(readFileSync(path.join(kit, 'templates/house/HOUSE.md'), 'utf8')).toMatch(/^name: Ada$/m);
    expect(readFileSync(path.join(root, 'house/HOUSE.md'), 'utf8')).toMatch(/^name: owner$/m);
  });
});
