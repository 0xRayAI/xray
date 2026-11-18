import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../..');

function read(rel: string): string {
  return readFileSync(path.join(root, rel), 'utf8');
}

const listingFiles = [
  'grok-bot/skills/stand-up-fleet/SKILL.md',
  'grok-bot/AGENTS.md',
  'grok-bot/SKILLS.md',
  'grok-bot/llms.txt',
  'grok-bot/README.md',
  'grok-bot/package.json',
];

describe('Fleet Setup listing source', () => {
  it('shows the NEAR path and drops the stop before pay', () => {
    const skill = read('grok-bot/skills/stand-up-fleet/SKILL.md');
    expect(skill).toContain('foundry');
    expect(skill).toContain('near-pay');
    expect(skill).toContain('near-cap');
    expect(skill).toContain('near-escrow');
    expect(skill).toContain('Grok Bot one-click');
    expect(skill).toContain('### CLI');
    expect(skill).toContain('https://docs.0xray.dev/earn/one-click.txt');
    expect(skill).toContain('near-seat');
    expect(skill).toContain('Listing: pending');
    expect(skill).not.toMatch(/stops before pay/i);
    for (const rel of listingFiles) {
      expect(read(rel).toLowerCase()).not.toContain('stops before pay');
    }
  });
});
