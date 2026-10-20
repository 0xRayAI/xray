import { describe, expect, it } from 'vitest';
import { formatStationMarkdown, mergeStationMarkdown } from '../../integrations/hooks/station-hook-runtime.mjs';

describe('mergeStationMarkdown kept lines', () => {
  it('keeps one Skills line, one Keys line, and a fleet plane', () => {
    const stock = formatStationMarkdown({});
    const existing = [
      stock.replace('Plane: (none)', 'Plane: core'),
      'Skills: station, seat-label, seat-github-key',
      'Keys: gh-forge',
      'Skills: stale',
    ].join('\n');
    const merged = mergeStationMarkdown(stock, existing);
    expect(merged.match(/^Skills:/gm)).toHaveLength(1);
    expect(merged.match(/^Keys:/gm)).toHaveLength(1);
    expect(merged).toContain('Skills: stale');
    expect(merged).toContain('Keys: gh-forge');
    expect(merged).toContain('Plane: core');
    expect(merged).not.toContain('Plane: (none)');
  });

  it('leaves a goggles plane to the stock card', () => {
    const stock = formatStationMarkdown({ plane: 'dev' });
    const existing = 'Plane: dev\nSkills: station\n';
    const merged = mergeStationMarkdown(stock, existing);
    expect(merged).toContain('Plane: dev');
    expect(merged.match(/^Plane:/gm)).toHaveLength(1);
    expect(merged).toContain('Skills: station');
  });
});
