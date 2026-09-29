import * as fs from 'fs';
import * as path from 'path';
import { describe, expect, it } from 'vitest';
import { HOST_TRUTH, hostTruthById, hostTruthCard } from '../../integrations/hooks/host-truth.mjs';

describe('host truth', () => {
  it('names the six chats and does not invent a seventh', () => {
    expect(HOST_TRUTH.map((row) => row.id)).toEqual([
      'cursor',
      'grok',
      'grok-bot',
      'openclaw',
      'hermes',
      'opencode',
    ]);
  });

  it('says who can stop a tool, who notices death, and who gets a note', () => {
    expect(hostTruthById('cursor')).toMatchObject({
      stopsTool: true,
      noticesDeath: true,
      note: 'one-line',
    });
    expect(hostTruthById('grok')).toMatchObject({
      stopsTool: true,
      noticesDeath: true,
      note: 'none',
    });
    expect(hostTruthById('grok-bot')).toMatchObject({
      stopsTool: false,
      noticesDeath: false,
      note: 'none',
    });
    expect(hostTruthById('openclaw')?.stopsTool).toBe(true);
    expect(hostTruthById('openclaw')?.noticesDeath).toBe(false);
    expect(hostTruthById('hermes')?.noticesDeath).toBe(false);
    expect(hostTruthById('opencode')).toMatchObject({
      stopsTool: true,
      noticesDeath: false,
      note: 'whole-card',
    });
  });

  it('the guide repeats the card, not a second wording', () => {
    const guide = fs.readFileSync(
      path.join(process.cwd(), 'docs-site/docs/guides/host-truth.md'),
      'utf8',
    );
    for (const row of HOST_TRUTH) {
      expect(guide).toContain(row.line);
    }
    expect(hostTruthCard().split('\n\n')).toHaveLength(6);
  });
});
