import { describe, expect, it } from 'vitest';
import { compareVersions, decideFreshness, describeFreshness } from '../../nucleus/work-freshness.mjs';

describe('Codex 70 freshness', () => {
  it('orders versions', () => {
    expect(compareVersions('4.0.9', '4.0.34')).toBe(-1);
    expect(compareVersions('4.0.34', '4.0.34')).toBe(0);
    expect(compareVersions('4.0.35', '4.0.34')).toBe(1);
  });

  it('blocks edits while the checkout is behind', () => {
    const decision = decideFreshness({ behind: 471, wornSuit: '4.0.34', publishedSuit: '4.0.34' });
    expect(decision.stale).toBe(true);
    expect(decision.reason).toMatch(/Codex 70/);
    expect(decision.reason).toMatch(/471/);
  });

  it('blocks edits when the worn package is older than npm', () => {
    const decision = decideFreshness({
      behind: 0,
      wornSuit: '4.0.9',
      publishedSuit: '4.0.34',
      repoName: '0xray',
      repoVersion: '4.0.34',
    });
    expect(decision.stale).toBe(true);
    expect(decision.reason).toMatch(/4\.0\.9/);
  });

  it('allows a current checkout and package', () => {
    const decision = decideFreshness({
      behind: 0,
      wornSuit: '4.0.34',
      publishedSuit: '4.0.34',
      repoName: '0xray',
      repoVersion: '4.0.34',
    });
    expect(decision.stale).toBe(false);
  });

  it('names a stash so it is compared before a drop', () => {
    const line = describeFreshness({ behind: 0, wornSuit: '4.0.34', publishedSuit: '4.0.34', stashCount: 5 });
    expect(line).toMatch(/stashes 5/);
    expect(line).toMatch(/compare before drop/);
  });
});
