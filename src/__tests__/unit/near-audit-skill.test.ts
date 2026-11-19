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
    expect(skill).toContain('https://docs.near.org/smart-contracts/security/checklist');
    expect(skill).toContain('https://docs.near.org/smart-contracts/security/one_yocto');
    expect(skill).toContain('https://docs.near.org/smart-contracts/security/cross-contract-calls/reentrancy');
    expect(skill).toContain('https://docs.near.org/smart-contracts/security/cross-contract-calls/callback-failures');
    expect(skill).toContain('https://docs.near.org/smart-contracts/security/cross-contract-calls/callbacks');
    expect(skill).toContain('https://docs.near.org/smart-contracts/security/storage');
    expect(skill).toContain('https://github.com/near/agent-skills/blob/main/skills/near-contract-audit/SKILL.md');
    expect(skill).toContain('https://github.com/near/agent-skills/blob/main/skills/near-smart-contracts/SKILL.md');
    expect(skill).toContain('https://github.com/vinibarbosabr/nearsc-auditor/blob/main/docs/RULES.md');
    expect(skill).toContain('https://docs.0xray.dev/near/reference');
    expect(skill).toContain('https://docs.0xray.dev/near/research');
    expect(skill).toContain('../near-mill/SKILL.md');
    expect(skill).toContain('../near-seat/SKILL.md');
    expect(skill).not.toMatch(/\bplanes\b/i);
    expect(skill).not.toMatch(/dial/i);
    expect(index).toContain('skills/near-audit/SKILL.md');
    const pack = readFileSync(path.join(root, 'grok-bot/package.json'), 'utf8');
    expect(pack).toContain('"skills/near-audit"');
  });
});
