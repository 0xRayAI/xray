import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { describe, expect, it } from 'vitest';
import { formatLook, look } from '../../integrations/hooks/goggles.mjs';

function writeBoot(root: string, host: string) {
  const dir = path.join(root, '.xray', 'state');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'session-boot.json'), JSON.stringify({ host }));
}

describe('goggles lens', () => {
  it('refuses a second plane', () => {
    const seen = look(os.tmpdir(), 'host,house');
    expect(seen.ok).toBe(false);
    if (!seen.ok) expect(seen.error).toMatch(/one plane/i);
  });

  it('looks at the worn host and offers one move only for Grok', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'xray-goggles-host-'));
    try {
      writeBoot(root, 'grok');
      const seen = look(root, 'host');
      expect(seen.ok).toBe(true);
      if (!seen.ok) return;
      expect(seen.worn).toBe('Grok');
      expect(seen.digest).toMatch(/throws the note away/);
      expect(seen.one).toMatch(/Read \.xray\/state\/STATION\.md/);
      expect(formatLook(seen).match(/^One: /m)).toHaveLength(1);

      writeBoot(root, 'cursor');
      const cursor = look(root, 'host');
      expect(cursor.ok).toBe(true);
      if (!cursor.ok) return;
      expect(cursor.one).toBeNull();
      expect(cursor.digest).toMatch(/one line/);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it('says the house is off without calling that a broken suit', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'xray-goggles-house-'));
    try {
      writeBoot(root, 'grok');
      const off = look(root, 'house');
      expect(off.ok).toBe(true);
      if (!off.ok) return;
      expect(off.digest).toBe(
        'house is not enabled here. A missing house is not a broken suit.',
      );
      expect(off.digest).not.toMatch(/is the suit/);
      expect(off.one).toBeNull();

      writeBoot(root, 'grok-bot');
      const bot = look(root, 'house');
      expect(bot.ok).toBe(true);
      if (!bot.ok) return;
      expect(bot.digest).toBe(
        'house is not enabled here. The house is how this chat shares rules.',
      );
      expect(bot.digest).not.toMatch(/is the suit/);
      expect(bot.one).toMatch(/house init/);

      fs.mkdirSync(path.join(root, 'house'), { recursive: true });
      fs.writeFileSync(
        path.join(root, 'house', 'HOUSE.md'),
        '# House\n\n- (example) Owner\n',
      );
      const empty = look(root, 'house');
      expect(empty.ok).toBe(true);
      if (!empty.ok) return;
      expect(empty.digest).toBe('Example lines are still empty.');
      expect(empty.digest).not.toBe('house on');
      expect(empty.one).toBe('Fill the example lines in house/HOUSE.md.');

      fs.writeFileSync(path.join(root, 'house', 'HOUSE.md'), '# House\n\n## Owner\nAda.\n');
      const on = look(root, 'house');
      expect(on.ok).toBe(true);
      if (!on.ok) return;
      expect(on.digest).toBe('house on');
      expect(on.one).toBeNull();
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it('keeps the card, the project file, and the package seed as three numbers', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'xray-goggles-counts-'));
    try {
      writeBoot(root, 'grok');
      fs.mkdirSync(path.join(root, '.xray', 'state', 'repertoire'), { recursive: true });
      fs.writeFileSync(
        path.join(root, '.xray', 'state', 'STATION.md'),
        'Repertoire: on — 59 signals\n',
      );
      fs.writeFileSync(
        path.join(root, '.xray', 'state', 'repertoire', 'curated_signals.json'),
        JSON.stringify({ signals: Array.from({ length: 59 }, (_, i) => ({ name: `s${i}` })) }),
      );
      fs.mkdirSync(path.join(root, 'node_modules', '@0xray', 'repertoire', 'data'), {
        recursive: true,
      });
      fs.writeFileSync(
        path.join(root, 'node_modules', '@0xray', 'repertoire', 'data', 'curated_signals.json'),
        JSON.stringify({ signals: [{ name: 'a' }, { name: 'b' }] }),
      );
      const seen = look(root, 'counts');
      expect(seen.ok).toBe(true);
      if (!seen.ok) return;
      expect(seen.digest).toContain('59');
      expect(seen.digest).toContain('2');
      expect(seen.one).toBeNull();

      fs.writeFileSync(path.join(root, '.xray', 'state', 'STATION.md'), 'Repertoire: on — 45 signals\n');
      const stale = look(root, 'counts');
      expect(stale.ok).toBe(true);
      if (!stale.ok) return;
      expect(stale.one).toMatch(/project file/);
      expect(stale.one).toMatch(/package seed/);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});
