import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const script = path.join(root, 'scripts/mjs/verify-four-floor-compact.mjs');
const grokSession = path.join(root, 'dist/integrations/grok/hooks/session-start.js');

describe('four-floor compact survival', () => {
  it('drives Grok/Hermes/OpenCode/OpenClaw compact-equivalent hooks and keeps the card', () => {
    expect(existsSync(script)).toBe(true);
    if (!existsSync(grokSession)) {
      return;
    }
    const out = execFileSync(process.execPath, [script], {
      cwd: root,
      encoding: 'utf8',
      timeout: 60000,
    });
    expect(out).toContain('FLOOR-COMPACT-SURVIVE-grok');
    expect(out).toContain('FLOOR-COMPACT-SURVIVE-hermes');
    expect(out).toContain('FLOOR-COMPACT-SURVIVE-opencode');
    expect(out).toContain('FLOOR-COMPACT-SURVIVE-openclaw');
    expect(out).toContain('Hot-swap: grok → opencode');
    expect(out).toContain('grok constitution denies Codex 11');
    expect(out).toContain('grok constitution denies Codex 69 new surface');
    expect(out).toContain('grok constitution denies destructive shell');
    expect(out).toContain('hermes constitution denies Codex 69 new surface');
    expect(out).toContain('opencode constitution denies destructive shell');
    expect(out).toContain('openclaw constitution denies Codex 11');
    expect(out).toContain('hermes temperament denies spawn without plan');
    expect(out).toContain('grok memory signals survived');
    expect(out).toContain('openclaw Repertoire still on');
    expect(out).toContain('four-floor compact survival passed');
  });
});
