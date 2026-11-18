import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const checklist = path.join(root, 'ops/security/RAILWAY-ROTATION-2026-10-22.md');

describe('Railway rotation checklist', () => {
  const text = readFileSync(checklist, 'utf8');

  it('points at issue 560 without closing it', () => {
    expect(text).toContain('Refs #560');
    expect(text).not.toMatch(/Closes #560/);
  });

  it('names every service the checklist is responsible for', () => {
    for (const name of [
      'burst-live',
      'blurrn-mcp',
      'muse-house',
      'clearing',
      'groover registry',
      '0xray-moltbook',
      'GITHUB_READ_TOKEN',
      'SKILLS_REPO_TOKEN',
    ]) {
      expect(text, name).toContain(name);
    }
  });

  it('does not carry a token, a private key block, or an assigned secret', () => {
    expect(text).not.toMatch(/gh[pousr]_[A-Za-z0-9]/);
    expect(text).not.toMatch(/github_pat_[A-Za-z0-9_]/);
    expect(text).not.toMatch(/sk_live_[A-Za-z0-9]/);
    expect(text).not.toMatch(/sk-[A-Za-z0-9]{8,}/);
    expect(text).not.toMatch(/xai-[A-Za-z0-9]{8,}/);
    expect(text).not.toMatch(/BEGIN [A-Z ]*PRIVATE KEY/);
    expect(text).not.toMatch(/^[A-Z][A-Z0-9_]{2,}=[^\s].+$/m);
  });
});
