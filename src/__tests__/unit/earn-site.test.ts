import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const prompt = readFileSync(path.join(root, 'docs-site/static/earn/one-click.txt'), 'utf8');
const page = readFileSync(path.join(root, 'docs-site/src/pages/earn.tsx'), 'utf8');
const checkout = 'git clone https://github.com/0xRayAI/xray';
const nearCliInstall = 'npm install -g near-cli-rs@0.31.1';
const nearVersionCheck = 'near --version';

function beforeFoundryCreate(text: string): boolean {
  const installAt = text.indexOf(nearCliInstall);
  const versionAt = text.indexOf(nearVersionCheck);
  const createAt = text.indexOf('node grok-bot/bin/grok-bot.js foundry-create');
  return installAt >= 0 && versionAt > installAt && createAt > versionAt;
}

describe('earn site', () => {
  it('hands Grok Bot a checkout of main and keeps the copy plain', () => {
    expect(prompt).toContain(checkout);
    expect(prompt).toContain('npm install');
    expect(prompt).toContain('a short name for this machine');
    expect(beforeFoundryCreate(prompt)).toBe(true);
    expect(prompt).toContain('Node >= 24.22.3');
    expect(prompt).toContain('npm config set prefix ~/.npm-global');
    expect(prompt).toContain('export PATH="$HOME/.npm-global/bin:$PATH"');
    expect(prompt.indexOf('npm config set prefix ~/.npm-global')).toBeLessThan(prompt.indexOf(nearCliInstall));
    expect(prompt).toContain('foundry-create creates the NEAR account');
    expect(prompt).toContain('Pass a new name');
    expect(prompt).toContain('node grok-bot/bin/grok-bot.js foundry-create --id <foundry-id> --seat <seat-id> --account <new-name>.testnet');
    expect(prompt).toContain('node grok-bot/bin/grok-bot.js hangar-list --agent-id <agent-id> --url https://clearing.rippel.ai/v1/ping');
    expect(prompt).toContain('node grok-bot/bin/grok-bot.js near-status');
    expect(prompt).toContain('The npx commands are coming in the next release.');
    expect(prompt).not.toContain('npx @0xray/grok-bot');
    expect(prompt).toContain('near-pay');
    expect(prompt).toContain('near-cap');
    expect(prompt).toContain('near-escrow');
    expect(prompt).not.toContain('No grok-bot command yet');
    expect(prompt).toContain('Print the NEAR testnet account id and the foundry id');
    expect(prompt).toContain('Testnet only');
    expect(prompt).toContain('Do not print a private key');
    expect(page).toContain(checkout);
    expect(page).toContain('a short name for this machine');
    expect(beforeFoundryCreate(page)).toBe(true);
    expect(page).toContain('Node >= 24.22.3');
    expect(page).toContain('npm config set prefix ~/.npm-global');
    expect(page).toContain('https://clearing.rippel.ai/v1/ping');
    expect(page).toContain('foundry-create creates the NEAR account');
    expect(page).toContain('static/earn/one-click.txt');
    expect(page).not.toContain('Loading the prompt');
    expect(page).toContain('node grok-bot/bin/grok-bot.js near-status');
    expect(page).toContain('The npx commands are coming in the next release.');
    expect(page).not.toContain('npx @0xray/grok-bot');
    expect(page).toContain('grok-bot near-pay');
    expect(page).toContain('grok-bot near-cap');
    expect(page).toContain('grok-bot near-escrow');
    expect(page).not.toContain('No grok-bot command yet');
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
