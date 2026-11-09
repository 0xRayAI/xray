import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const read = (rel: string) => readFileSync(path.join(root, rel), 'utf8');

describe('WAKE-ROUTINE — station Full and the way-out on every path (#913, #942)', () => {
  const wake = read('grok-bot/templates/house/fleet/WAKE-ROUTINE.md');
  const boot = read('grok-bot/OP-PROC.md').split('\n').find((row) => row.includes('id="station-boot"')) ?? '';

  it('has no wording that lets a wake skip station or the wrap-up', () => {
    for (const text of [wake, boot]) {
      expect(text).not.toMatch(/\bskip/i);
      expect(text).not.toMatch(/\bquiet\b/i);
      expect(text).not.toMatch(/\bminimal\b/i);
      expect(text).not.toMatch(/does not also run/i);
      expect(text).not.toMatch(/no NOTES\.md write/i);
    }
    expect(wake).toContain('step 1 is station Full and step 7 is the station way-out, on every wake with no exception');
    expect(boot).toContain('on every path: an empty inbox, a duplicate, a still-waiting line, an early return, or an error');
    expect(wake).toContain('A wake whose last gate run did not exit 0 never says done, filed, or wrote');
  });

  it('names one TRACKS path', () => {
    const paths = new Set([...wake.matchAll(/`([^`]*TRACKS\.md)`/g)].map((m) => m[1]));
    expect([...paths]).toEqual(['ops/cloud-memory/TRACKS.md']);
    expect(boot).not.toContain('house/fleet/TRACKS.md');
  });
});
