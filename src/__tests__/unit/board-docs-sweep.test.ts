import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../..');

const BOARD_RULE =
  'Board rule. On every owner message run `live-inbox <seat> --prompt --from owner --note "<gist>"`. Ack a handled line with `live-inbox <seat> --ack <id>`, or `live-inbox <seat> --ack all` once every open line is handled. A cloud agent run uses `live-inbox <seat> --turn start --tag "bc-<first8> <track>"` and `live-inbox <seat> --turn end --tag "bc-<first8>"`. `--from owner` is required today.';
const KANBAN_NOTE =
  'Kanban note. The live page shows a read-only kanban above Activity. Columns are open, review, fix, merge, retest, and done. The deep link is `?card=`.';
const HISTORY_NOTE =
  'History note. Every activity line is archived to history. The word owner is the owner via LIVE_OWNER or the owner-name.';
const SENTENCES = [BOARD_RULE, KANBAN_NOTE, HISTORY_NOTE];

const PROMPT = 'live-inbox <seat> --prompt --from owner --note "<gist>"';
const ACK = '--ack <id>';
const ACK_ALL = '--ack all';
const TURN_START = '--turn start --tag "bc-<first8> <track>"';
const TURN_END = '--turn end --tag "bc-<first8>"';
const TRACK_FINISH = '--turn end --tag "bc-<first8> <track>"';
const COMMANDS = [PROMPT, ACK, ACK_ALL, TURN_START, TURN_END];

const BANNED = [
  'Pass no `--from`',
  'with no `--from`',
  'Drop a hardcoded `--from` name',
  TRACK_FINISH,
];

const SENTENCE_PATHS = [
  'grok-bot/skills/setup-house/SKILL.md',
  'grok-bot/README.md',
  'grok-bot/templates/house/HOUSE.md',
  'grok-bot/templates/house/STATION-BOOT.md',
  'grok-bot/templates/house/BOARD-PROMPT.md',
  'grok-bot/skills/board-prompt/SKILL.md',
  'grok-bot/OP-PROC.md',
  'house/OP-PROC.md',
  'grok-bot/templates/house/fleet/WAKE-ROUTINE.md',
  'grok-bot/skills/station/SKILL.md',
  'house/live/docs/fleet-setup.md',
  'house/live/docs/board.md',
  'docs-site/docs/guides/house.md',
  'docs-site/docs/plates/bifrost.md',
  'grok-bot/CHANGELOG.md',
  'CHANGELOG.md',
];

const ALL_PATHS = [
  ...SENTENCE_PATHS,
  'house/live/app/BOARD-DATA-MAP.md',
  'grok-bot/ops/packets/PACKET-KANBAN.md',
];

function read(rel: string): string {
  return readFileSync(path.join(root, rel), 'utf8');
}

function lineStarting(text: string, prefix: string): string {
  return text.split('\n').find((row) => row.startsWith(prefix)) ?? '';
}

describe('board docs sweep', () => {
  it('pastes the three sentences and drops the old contradictions', () => {
    for (const rel of SENTENCE_PATHS) {
      const text = read(rel);
      for (const sentence of SENTENCES) {
        expect(text, rel).toContain(sentence);
      }
    }
    for (const rel of ALL_PATHS) {
      const text = read(rel);
      for (const phrase of BANNED) {
        expect(text, rel).not.toContain(phrase);
      }
    }
  });

  it('slices BOARD-PROMPT step 3 to the one finish tag', () => {
    const step3 = lineStarting(read('grok-bot/templates/house/BOARD-PROMPT.md'), '3. ');
    for (const phrase of COMMANDS) {
      expect(step3).toContain(phrase);
    }
    expect(step3).not.toContain('--tag wake');
    expect(step3).not.toContain('with no `--from`');
    expect(step3).not.toContain(TRACK_FINISH);
  });

  it('slices the HOUSE live-mesh bullet to the one finish tag', () => {
    const line = read('grok-bot/templates/house/HOUSE.md')
      .split('\n')
      .find((row) => row.includes('Live mesh')) ?? '';
    for (const phrase of COMMANDS) {
      expect(line).toContain(phrase);
    }
    expect(line).not.toMatch(/live-inbox <seat> --prompt(?! --from owner)/);
    expect(line).not.toContain(TRACK_FINISH);
    expect(line).toContain('--room <name>');
  });

  it('points board-prompt at station and keeps the board rule', () => {
    const skill = read('grok-bot/skills/board-prompt/SKILL.md');
    expect(skill).toContain('../station/SKILL.md');
    expect(skill).toContain('../../OP-PROC.md#station-boot');
    expect(skill).toContain(BOARD_RULE);
    expect(skill).not.toContain('omitting `--note` is the usual post');
    expect(skill).not.toContain('## Note');
    expect(lineStarting(skill, '5. ')).toBe('');
    expect(read('grok-bot/OP-PROC.md')).toContain('still run turn end on the way out');
  });

  it('slices the owner-message row, the kanban fold, and the old drag line', () => {
    const activity = read('house/live/docs/board.md').split('## Seat activity (#275)')[1]?.split('\n## ')[0] ?? '';
    const row = activity.split('\n').find((line) => line.includes('Owner → seat message')) ?? '';
    for (const phrase of COMMANDS) {
      expect(row).toContain(phrase);
    }
    expect(row).toContain(TURN_END);
    expect(row).not.toContain('(no `--from`');
    expect(row).not.toContain('still renders');
    expect(row).not.toContain(TRACK_FINISH);

    const folds = read('house/live/app/BOARD-DATA-MAP.md')
      .split('\n')
      .find((line) => line.startsWith('| folds |')) ?? '';
    expect(folds).toContain('kanban');

    const kanbanPacket = read('grok-bot/ops/packets/PACKET-KANBAN.md');
    expect(kanbanPacket.toLowerCase()).not.toContain('signed-in user can drag');
    expect(kanbanPacket).toContain('Drag did not ship');
  });
});
