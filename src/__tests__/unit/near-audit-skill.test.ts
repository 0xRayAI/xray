import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../..');

describe('near-audit skill', () => {
  const skill = readFileSync(path.join(root, 'grok-bot/skills/near-audit/SKILL.md'), 'utf8');
  const index = readFileSync(path.join(root, 'grok-bot/SKILLS.md'), 'utf8');

  it('keeps the phase-2 checks and refuses an exploit writeup', () => {
    expect(skill).toContain('name: near-audit');
    expect(skill).toContain('predecessor_account_id');
    expect(skill).toContain('Do not move the debit into the callback.');
    expect(skill).toContain('One in-flight withdraw on the whole contract is a valid fix.');
    expect(skill).toContain('Do not copy a training table of NS ids.');
    expect(skill).toContain('Do not write an exploit scenario, a proof-of-concept, or an attack transaction.');
    expect(skill).toContain('Do not deploy. Do not transfer. Do not print a key, seed, or mnemonic.');
    expect(skill).not.toMatch(/\bplanes\b/i);
    expect(skill).not.toMatch(/dial/i);
    expect(index).toContain('skills/near-audit/SKILL.md');
  });
});
