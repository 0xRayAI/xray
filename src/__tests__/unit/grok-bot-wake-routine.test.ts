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

describe('WAKE-ROUTINE — a wake never answers a nudge or another seat on GitHub (#976)', () => {
  const wake = read('grok-bot/templates/house/fleet/WAKE-ROUTINE.md');
  const nudge = read('grok-bot/OP-PROC.md').split('\n').find((row) => row.includes('id="nudge"')) ?? '';

  it('records a still-waiting or nothing-changed line on the board and never comments', () => {
    expect(wake).toContain('gets no GitHub comment: record it on the board only');
    expect(wake).toContain('a still-waiting or nothing-changed line is recorded on the board');
    expect(wake).toContain('never gets a GitHub comment');
    expect(wake).not.toMatch(/still waiting gets one reply/i);
    expect(wake).not.toMatch(/still-waiting[^.]*gets one reply/i);
  });

  it('answers a nudge on the board only and never acknowledges another seat comment', () => {
    expect(wake).toContain('A nudge (L1, L2, L3, or station) is answered on the board only, never on GitHub');
    expect(wake).toContain("A seat never posts a comment that only acknowledges another seat's comment");
    expect(nudge).toContain('A nudge (L1, L2, L3, or station) is answered on the board only');
    expect(nudge).toContain("A seat never posts a comment that only acknowledges another seat's comment");
    expect(nudge).toContain('More than 3 seat comments on one issue or pull in a rolling hour pauses wakes');
  });

  it('lets the exit gate accept a wait that cites the existing issue URL', () => {
    expect(wake).toContain('the exit gate accepts that and does not need a new comment');
  });
});

