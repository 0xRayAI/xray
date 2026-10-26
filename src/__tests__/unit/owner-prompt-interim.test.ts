import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../..');

const PROMPT = 'live-inbox <seat> --prompt --from owner --note "<gist>"';
const ACK = 'live-inbox <seat> --ack <id>';
const ACK_ALL = '--ack all';
const TURN_START = 'live-inbox <seat> --turn start --tag "bc-<first8> <track>"';
const TURN_END = 'live-inbox <seat> --turn end --tag "bc-<first8>"';

const CLOUD_LAUNCH = 'live-inbox <seat> --cloud launch --agent <bc-id> --tag <card>';
const CLOUD_FINISH = 'live-inbox <seat> --cloud finished --agent <bc-id> --tag <card>';
const INTERIM =
  `On every owner message, first run \`${PROMPT}\`; after handling any inbox line (in chat or on a wake), ack it right away with \`${ACK}\` (or \`${ACK_ALL}\` once everything open is handled); when you launch or resume a cloud agent run \`${TURN_START}\` and \`${CLOUD_LAUNCH}\` (resume uses \`--cloud reply\`); when it finishes or is cancelled run \`${TURN_END}\` and \`${CLOUD_FINISH}\` (cancel uses \`--cloud cancel\`). The tag is owner/repo#n or xray#n. The cloud agent does not post that line. No exceptions for short turns.`;

const FILES = [
  'grok-bot/OP-PROC.md',
  'house/OP-PROC.md',
  'grok-bot/templates/house/HOUSE.md',
  'grok-bot/templates/house/fleet/WAKE-ROUTINE.md',
  'grok-bot/skills/station/SKILL.md',
];

describe('owner-prompt interim line', () => {
  it('is the same line in each seat file', () => {
    for (const rel of FILES) {
      const text = readFileSync(path.join(root, rel), 'utf8');
      expect(text, rel).toContain(INTERIM);
      expect(text, rel).not.toContain('--act');
    }
  });

  it('is station skill step 1 and uses --turn, not --act', () => {
    const text = readFileSync(path.join(root, 'grok-bot/skills/station/SKILL.md'), 'utf8');
    const light = text.split('## Light')[1]?.split('## Full')[0] ?? '';
    expect(light).toContain(`1. ${INTERIM}`);
    expect(INTERIM).toContain(PROMPT);
    expect(INTERIM).toContain(TURN_START);
    expect(INTERIM).toContain(TURN_END);
    expect(INTERIM).not.toContain('--act');
    expect(text).not.toContain('`from` is the `name:`');
  });

  it('asserts that wording in step 0, the inbound bullet, and the board-prompt skill', () => {
    const wake = readFileSync(path.join(root, 'grok-bot/templates/house/fleet/WAKE-ROUTINE.md'), 'utf8');
    const step0 = wake.split('\n').find((row) => row.startsWith('0. ')) ?? '';
    for (const phrase of [PROMPT, ACK, ACK_ALL, TURN_START, TURN_END]) {
      expect(step0, 'WAKE-ROUTINE step 0').toContain(phrase);
    }
    expect(step0).not.toContain('Pass no `--from`');

    const inboundFiles = [
      'grok-bot/OP-PROC.md',
      'house/OP-PROC.md',
      'grok-bot/templates/house/HOUSE.md',
    ];
    for (const rel of inboundFiles) {
      const line = readFileSync(path.join(root, rel), 'utf8')
        .split('\n')
        .find((row) => row.includes('runs the station skill first')) ?? '';
      expect(line, rel).not.toBe('');
      expect(line, rel).not.toContain('board-prompt skill first');
      expect(line, rel).not.toContain('no `--from`');
    }

    const skill = readFileSync(path.join(root, 'grok-bot/skills/board-prompt/SKILL.md'), 'utf8');
    expect(skill).toContain('../station/SKILL.md');
    expect(skill).toContain('../../OP-PROC.md#station-boot');
    for (const phrase of [PROMPT, ACK, ACK_ALL, TURN_START, TURN_END]) {
      expect(skill, 'board-prompt').toContain(phrase);
    }
    expect(skill).not.toContain('Pass no `--from`');
  });

  it('slices the three stale copies to the finish tag without a track', () => {
    const step3 = readFileSync(path.join(root, 'grok-bot/templates/house/BOARD-PROMPT.md'), 'utf8')
      .split('\n')
      .find((row) => row.startsWith('3. ')) ?? '';
    for (const phrase of [PROMPT, ACK, ACK_ALL, TURN_START, TURN_END]) {
      expect(step3).toContain(phrase);
    }
    expect(step3).not.toContain('--tag wake');
    expect(step3).not.toContain('with no `--from`');
    expect(step3).not.toContain('--turn end --tag "bc-<first8> <track>"');

    const mesh = readFileSync(path.join(root, 'grok-bot/templates/house/HOUSE.md'), 'utf8')
      .split('\n')
      .find((row) => row.includes('Live mesh')) ?? '';
    for (const phrase of [PROMPT, ACK, ACK_ALL, TURN_START, TURN_END]) {
      expect(mesh).toContain(phrase);
    }
    expect(mesh).not.toContain('--turn end --tag "bc-<first8> <track>"');

    const skill = readFileSync(path.join(root, 'grok-bot/skills/board-prompt/SKILL.md'), 'utf8');
    expect(skill).toContain('../station/SKILL.md');
    expect(skill).toContain('#station-boot');
    expect(skill).toContain('--note "<gist>"');
    expect(skill).not.toContain('omitting `--note` is the usual post');
    expect(skill).not.toContain('## Note');
    expect(skill.split('\n').some((row) => row.startsWith('5. '))).toBe(false);
    expect(skill).toContain(TURN_END);
    expect(skill).not.toContain('--turn end --tag "bc-<first8> <track>"');
  });
});
