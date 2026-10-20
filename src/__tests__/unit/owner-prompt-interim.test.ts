import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../..');

const INTERIM =
  'On every owner message, first run `live-inbox <seat> --prompt --note "<gist>"`; when you launch or resume a cloud agent run `live-inbox <seat> --turn start --tag "bc-<first8> <track>"`; when it finishes or is cancelled run `live-inbox <seat> --turn end --tag "bc-<first8>"`. No exceptions for short turns.';

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
    expect(INTERIM).toContain('--turn start');
    expect(INTERIM).toContain('--turn end');
    expect(INTERIM).not.toContain('--act');
  });
});
