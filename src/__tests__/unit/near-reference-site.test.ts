import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const reference = readFileSync(path.join(root, 'docs-site/src/pages/near/reference.md'), 'utf8');
const research = readFileSync(path.join(root, 'docs-site/src/pages/near/research.md'), 'utf8');
const navbar = readFileSync(path.join(root, 'docs-site/docusaurus.config.ts'), 'utf8');

const banned = /\b(mill|forge|nibbler|arch1|blaze|critic|hangar|groover|packet|plane)\b|house\/dist|RACI/i;
const secret = /ed25519:[1-9A-HJ-NP-Za-km-z]{20,}|private_key|e1144[a-z0-9]+\.testnet|xray1144/;

function links(text: string): string[] {
  return [...text.matchAll(/\]\((https?:\/\/[^)\s]+)\)/g)].map((match) => match[1]);
}

describe('near reference site', () => {
  it('keeps the public pages plain and points earn at the reference', () => {
    expect(reference).toContain('# NEAR reference');
    expect(reference).toContain('## Do not use');
    expect(reference).toContain('/near/research');
    expect(reference).toContain('/earn');
    expect(research).toContain('# NEAR research notes');
    expect(research).toContain('/near/reference');
    expect(research).toContain('Sender and receiver should be different');
    expect(research).toContain('File::create');
    expect(research).toContain('https://faucet.circle.com/');
    expect(research).toContain('tx_status');
    expect(research).toContain('EXPERIMENTAL_tx_status');
    expect(navbar).toContain("to: '/near/reference'");
    for (const text of [reference, research]) {
      expect(text).not.toMatch(banned);
      expect(text).not.toMatch(secret);
      const found = links(text);
      expect(found.length).toBeGreaterThan(10);
      for (const link of found) {
        expect(link.startsWith('https://')).toBe(true);
      }
    }
  });
});
