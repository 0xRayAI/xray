import { describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { compareVersions, decideFreshness, describeFreshness, freshnessNeedsRefresh } from '../../nucleus/work-freshness.mjs';

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

  it('treats this 0xray repo as the package when no install is recorded', () => {
    const decision = decideFreshness({
      behind: 0,
      wornSuit: null,
      publishedSuit: '4.0.34',
      repoName: '0xray',
      repoVersion: '4.0.34',
    });
    expect(decision.stale).toBe(false);
  });

  it('blocks this repo when its version is older than npm', () => {
    const decision = decideFreshness({
      behind: 0,
      wornSuit: null,
      publishedSuit: '4.0.34',
      repoName: '0xray',
      repoVersion: '4.0.9',
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

  it('refreshes a missing or hour-old freshness stamp', () => {
    const root = mkdtempSync(join(tmpdir(), 'xray-fresh-due-'));
    try {
      expect(freshnessNeedsRefresh(root, 1_700_000_000_000)).toBe(true);
      mkdirSync(join(root, '.xray', 'state'), { recursive: true });
      writeFileSync(join(root, '.xray', 'state', 'freshness.json'), `${JSON.stringify({
        checkedAt: '2026-10-13T17:38:44.449Z',
      })}\n`);
      const checked = Date.parse('2026-10-13T17:38:44.449Z');
      expect(freshnessNeedsRefresh(root, checked + 60 * 60 * 1000 - 1)).toBe(false);
      expect(freshnessNeedsRefresh(root, checked + 60 * 60 * 1000)).toBe(true);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('names a stash so it is compared before a drop', () => {
    const line = describeFreshness({ behind: 0, wornSuit: '4.0.34', publishedSuit: '4.0.34', stashCount: 5 });
    expect(line).toMatch(/5 set aside/);
    expect(line).toMatch(/compare before drop/);
  });
});
