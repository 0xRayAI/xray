import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const card = JSON.parse(readFileSync(path.join(root, 'house/agents/mill/agent-card.json'), 'utf8')) as {
  type: string;
  name: string;
  description: string;
  image: string;
  services: Array<{ name: string; endpoint: string }>;
  x402Support: boolean;
  active: boolean;
  supportedTrust: string[];
  registrations: unknown[];
  groover: {
    did: string;
    dna: string;
    pack: string;
    variant: number;
    identityKey: string;
    grvrContract: string;
    grvrTokenId: number;
    dynamoCitation: string;
    level: number;
    grvrChainId: number;
  };
};

describe('mill agent card', () => {
  it('parses the ERC-8004 registration and keeps the required fields', () => {
    expect(card.type).toBe('https://eips.ethereum.org/EIPS/eip-8004#registration-v1');
    expect(card.name).toBe('mill-ebca068c23dd');
    expect(card.description.length).toBeGreaterThan(20);
    expect(card.image).toBe('https://registry-production-e2c4.up.railway.app/identity/token-image/6');
    expect(card.services.map((row) => row.name)).toEqual(['DID', 'GRVR', 'shop']);
    expect(card.services[0].endpoint).toBe('did:groover:ebca068c23dd2273ac4959ee25cc48ab4598f2936fc1954a163f2d46b16be739');
    expect(card.services[1].endpoint).toBe('eip155:8453:0x045B35480F289F8f83F53345A0f367875958957a/6');
    expect(card.services[2].endpoint).toBe('https://TODO-after-deploy.mill-foundry.invalid/v1/job');
    expect(card.services[2].endpoint).toContain('TODO-after-deploy');
    expect(card.x402Support).toBe(true);
    expect(card.active).toBe(true);
    expect(card.supportedTrust).toEqual(['reputation', 'groover-provenance']);
    expect(card.registrations).toEqual([]);
    expect(card.groover.did).toBe(card.services[0].endpoint);
    expect(card.groover.dna).toBe('0xd6987eb8b2864a5ed6b2d8fd4941bb7afdf86de455772c4ad1154aeb24264e15');
    expect(card.groover.pack).toBe('groover-identity');
    expect(card.groover.variant).toBe(11);
    expect(card.groover.identityKey).toBe('0x676512b49034c3f3786bb40b8486494c8408629b90dc4a70ed8b55a3092a263b');
    expect(card.groover.grvrContract).toBe('0x045B35480F289F8f83F53345A0f367875958957a');
    expect(card.groover.grvrTokenId).toBe(6);
    expect(card.groover.dynamoCitation).toBe('0xad9ebe52e37948ad407f91a2c6a6b97167c77a2eba601e2244caa37ef5c9a63a');
    expect(card.groover.level).toBe(3);
    expect(card.groover.grvrChainId).toBe(8453);
    expect(card.description).not.toMatch(/\bplanes\b/i);
    expect(card.description).not.toMatch(/\bgoggles\b/i);
  });
});
