import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const prompt = readFileSync(path.join(root, 'docs-site/static/earn/one-click.txt'), 'utf8');
const page = readFileSync(path.join(root, 'docs-site/src/pages/earn.tsx'), 'utf8');
const checkout = 'git clone https://github.com/0xRayAI/xray';

describe('earn site', () => {
  it('hands Grok Bot a checkout of main and keeps the copy plain', () => {
    expect(prompt).toContain(checkout);
    expect(prompt).toContain('npm install');
    expect(prompt).toContain('node grok-bot/bin/grok-bot.js foundry-create --id <foundry-id> --seat <seat-id> --account <account-id>');
    expect(prompt).toContain('node grok-bot/bin/grok-bot.js hangar-list --agent-id <agent-id> --url <https-shop>');
    expect(prompt).toContain('node grok-bot/bin/grok-bot.js near-status');
    expect(prompt).toContain('The npx commands are coming in the next release.');
    expect(prompt).not.toContain('npx @0xray/grok-bot');
    expect(prompt).toContain('Pay. Pending.');
    expect(prompt).toContain('Cap. Pending.');
    expect(prompt).toContain('Escrow. Pending.');
    expect(prompt).toContain('Print the NEAR testnet account id and the foundry id');
    expect(prompt).toContain('Testnet only');
    expect(prompt).toContain('Do not print a private key');
    expect(page).toContain(checkout);
    expect(page).toContain('node grok-bot/bin/grok-bot.js near-status');
    expect(page).toContain('The npx commands are coming in the next release.');
    expect(page).not.toContain('npx @0xray/grok-bot');
    expect(page).toContain('Pay. Pending.');
    expect(page).toContain('Cap. Pending.');
    expect(page).toContain('Escrow. Pending.');
    expect(page).toContain('Base x402 is planned');
    expect(page).toContain('A NEAR testnet demo');
    expect(page).not.toMatch(/any chain/i);
    expect(page).toContain('/earn/one-click.txt');
    for (const text of [prompt, page]) {
      expect(text).not.toMatch(/\bplanes\b/i);
      expect(text).not.toMatch(/\bdials?\b/i);
      expect(text).not.toMatch(/\bDist\b/);
      expect(text).not.toMatch(/\blaunch(ed|ing)?\b/i);
    }
  });
});
