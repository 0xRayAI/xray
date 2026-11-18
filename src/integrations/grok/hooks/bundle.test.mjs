import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { readWornBundle } from './grok-hook-utils.js';

describe('worn bundle', () => {
  it('reads the rule from the worn plugin', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'worn-bundle-'));
    const dir = path.join(root, '.grok', 'plugins', '0xray');
    mkdirSync(dir, { recursive: true });
    writeFileSync(path.join(dir, 'bundle.md'), 'same-path cluster\nPrefer that over serial deploys.\n');
    const text = readWornBundle(root);
    expect(text).toMatch(/same-path cluster/);
    expect(text).toMatch(/serial deploys/);
  });

  it('ships the bundle and the escalator in the plugin source', () => {
    const text = readWornBundle(path.resolve('src/integrations/grok/hooks', '../../../..'));
    expect(text).toMatch(/Critic Strict is once/);
    expect(text).toMatch(/one deploy/);
    expect(text).toMatch(/Prefer that over serial deploys/);
  });
});
