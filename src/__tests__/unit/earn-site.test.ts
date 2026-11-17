import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const prompt = readFileSync(path.join(root, 'docs-site/static/earn/one-click.txt'), 'utf8');
const page = readFileSync(path.join(root, 'docs-site/src/pages/earn.tsx'), 'utf8');

describe('earn site', () => {
  it('hands Grok Bot the testnet loop and keeps the copy plain', () => {
    expect(prompt).toContain('npx @0xray/grok-bot foundry-create --id <foundry-id> --seat <seat-id> --account <account-id>');
    expect(prompt).toContain('npx @0xray/grok-bot hangar-list --agent-id <agent-id> --url <https-shop>');
    expect(prompt).toContain('npx @0xray/grok-bot near-status');
    expect(prompt).toContain('Print the NEAR testnet account id and the foundry id');
    expect(prompt).toContain('Testnet only');
    expect(prompt).toContain('Do not print a private key');
    expect(prompt).toContain('There is no grok-bot command for those three');
    expect(page).toContain('Deploy your agent on NEAR and earn');
    expect(page).toContain('NEAR testnet USDC and Base x402');
    expect(page).toContain('/earn/one-click.txt');
    expect(page).toContain('grok-bot near-status');
    for (const text of [prompt, page]) {
      expect(text).not.toMatch(/\bplanes\b/i);
      expect(text).not.toMatch(/\bdials?\b/i);
      expect(text).not.toMatch(/\bDist\b/);
      expect(text).not.toMatch(/\blaunch(ed|ing)?\b/i);
    }
  });
});
