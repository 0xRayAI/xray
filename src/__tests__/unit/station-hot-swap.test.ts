import { describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { execFileSync } from 'child_process';
import {
  applyStationHeat,
  clipIntent,
  extractPreservedStationLines,
  formatStationMarkdown,
  mergeStationMarkdown,
  readRepertoireWorking,
  writeStationMarkdown,
} from '../../integrations/hooks/station-hook-runtime.mjs';
import { writeSuitSessionBoot } from '../../nucleus/suit-temperament.js';
import { buildSessionBootPayload, writeSessionBoot } from '../../integrations/grok/hooks/grok-hook-utils.js';

const SEEDED_CUSTOM_KEYS = [
  'Ticket: COMPACT-AB-001',
  'Seed: factory-seed-0.2',
  'Open cloud: bc-abc123',
  'Unfinished path: src/integrations/hooks/station-hook-runtime.cjs',
];

function seedStationCard(root: string, extras: string[] = SEEDED_CUSTOM_KEYS) {
  const dest = path.join(root, '.xray', 'state', 'STATION.md');
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(
    dest,
    [
      '# Station',
      '',
      'Host: grok (guided)',
      'Intent: old intent before compact',
      'Plan: (none)',
      'Git: n/a',
      'Repertoire: not installed (memory_routing stays off)',
      '',
      ...extras,
      '',
      '## Durable',
      'Keep this seed block across compact.',
      '',
      'Continue this card. Compaction and host change are the same cut. Do not cold-start.',
      'Grok does not inject this file — Read it. OpenCode injects. Do not thicken the Grok exo.',
      '',
    ].join('\n'),
  );
  return dest;
}

function expectCustomStationKeys(card: string) {
  for (const line of SEEDED_CUSTOM_KEYS) {
    expect(card).toContain(line);
    expect(card.split(line).length - 1).toBe(1);
  }
  expect(card).toContain('## Durable');
  expect(card).toContain('Keep this seed block across compact.');
}

function countStationFooters(card: string) {
  return {
    continueCount: card.split('Continue this card.').length - 1,
    grokCount: card.split('Grok does not inject this file').length - 1,
  };
}

function gitInit(root: string) {
  execFileSync('git', ['init'], { cwd: root, stdio: 'ignore' });
  execFileSync('git', ['config', 'user.email', 'station@test'], { cwd: root, stdio: 'ignore' });
  execFileSync('git', ['config', 'user.name', 'station'], { cwd: root, stdio: 'ignore' });
  fs.writeFileSync(path.join(root, 'README.md'), 'station\n');
  execFileSync('git', ['add', '.'], { cwd: root, stdio: 'ignore' });
  execFileSync('git', ['commit', '-m', 'init'], { cwd: root, stdio: 'ignore' });
}

describe('station hot-swap', () => {
  it('clips intent and formats a card without Repertoire', () => {
    expect(clipIntent('  keep moving  \n')).toBe('keep moving');
    expect(clipIntent('<user_query> put the suit through the paces </user_query>')).toBe(
      'put the suit through the paces',
    );
    const md = formatStationMarkdown({
      host: 'grok',
      suit_profile: 'frontier',
      intent: 'survive the cut',
      planLine: null,
      git: { branch: 'feat/v4-temperament', head: 'abc1234' },
      repertoireResume: 'Repertoire: not installed (memory_routing stays off)',
    });
    expect(md).toContain('Host: grok (frontier)');
    expect(md).toContain('Intent: survive the cut');
    expect(md).toContain('Do not cold-start');
    expect(md).toContain('Grok does not inject this file');
    expect(md).not.toContain('Hot-swap:');
  });

  it('stranger without Repertoire still gets git + intent heat', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'xray-station-stranger-'));
    try {
      gitInit(tmp);
      fs.mkdirSync(path.join(tmp, '.xray'), { recursive: true });
      fs.writeFileSync(
        path.join(tmp, '.xray', 'features.json'),
        JSON.stringify({
          suit_temperament: { profile: 'auto' },
          memory_routing: { enabled: false, provider: 'null' },
        }),
      );
      const payload = buildSessionBootPayload(tmp, 'test/stranger', { intent: 'make the cut the test' });
      writeSessionBoot(tmp, payload);
      expect(payload.intent).toBe('make the cut the test');
      expect(payload.git?.head).toBeTruthy();
      expect(payload.stationLine).toContain('intent: make the cut the test');
      expect(payload.repertoireResume).toMatch(/not installed/);
      const card = fs.readFileSync(path.join(tmp, '.xray', 'state', 'STATION.md'), 'utf8');
      expect(card).toContain('make the cut the test');
      expect(card).toContain('Do not cold-start');
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('host change marks hot-swap on the same card', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'xray-station-swap-'));
    try {
      gitInit(tmp);
      fs.mkdirSync(path.join(tmp, '.xray'), { recursive: true });
      fs.writeFileSync(
        path.join(tmp, '.xray', 'features.json'),
        JSON.stringify({
          suit_temperament: { profile: 'auto' },
          multi_agent_orchestration: { lead_dev_mode: true },
        }),
      );
      writeSuitSessionBoot(tmp, 'grok', { intent: 'wear the exo' });
      const afterGrok = JSON.parse(
        fs.readFileSync(path.join(tmp, '.xray', 'state', 'session-boot.json'), 'utf8'),
      ) as { host: string; hotSwap: null };
      expect(afterGrok.host).toBe('grok');
      expect(afterGrok.hotSwap).toBeNull();
      writeSuitSessionBoot(tmp, 'hermes', {});
      const afterHermes = JSON.parse(
        fs.readFileSync(path.join(tmp, '.xray', 'state', 'session-boot.json'), 'utf8'),
      ) as { host: string; hotSwap: { from: string; to: string }; intent: string };
      expect(afterHermes.host).toBe('hermes');
      expect(afterHermes.hotSwap).toEqual({ from: 'grok', to: 'hermes' });
      expect(afterHermes.intent).toBe('wear the exo');
      const card = fs.readFileSync(path.join(tmp, '.xray', 'state', 'STATION.md'), 'utf8');
      expect(card).toContain('Hot-swap: grok → hermes');
      expect(card).toContain('wear the exo');
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('same-host compact keeps the last hot-swap stamp', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'xray-station-keep-swap-'));
    try {
      gitInit(tmp);
      fs.mkdirSync(path.join(tmp, '.xray'), { recursive: true });
      fs.writeFileSync(
        path.join(tmp, '.xray', 'features.json'),
        JSON.stringify({ suit_temperament: { profile: 'auto' } }),
      );
      writeSuitSessionBoot(tmp, 'grok', { intent: 'survive compact after swap' });
      writeSuitSessionBoot(tmp, 'opencode', {});
      const afterSwap = JSON.parse(
        fs.readFileSync(path.join(tmp, '.xray', 'state', 'session-boot.json'), 'utf8'),
      ) as { hotSwap: { from: string; to: string } };
      expect(afterSwap.hotSwap).toEqual({ from: 'grok', to: 'opencode' });
      writeSuitSessionBoot(tmp, 'opencode', { source: '0xray/grok-compact' });
      const afterCompact = JSON.parse(
        fs.readFileSync(path.join(tmp, '.xray', 'state', 'session-boot.json'), 'utf8'),
      ) as { host: string; hotSwap: { from: string; to: string }; intent: string };
      expect(afterCompact.host).toBe('opencode');
      expect(afterCompact.hotSwap).toEqual({ from: 'grok', to: 'opencode' });
      expect(afterCompact.intent).toBe('survive compact after swap');
      const card = fs.readFileSync(path.join(tmp, '.xray', 'state', 'STATION.md'), 'utf8');
      expect(card).toContain('Hot-swap: grok → opencode');
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('applyStationHeat keeps prior intent when the new event has none', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'xray-station-keep-intent-'));
    try {
      const heat = applyStationHeat(
        tmp,
        'grok',
        {},
        { host: 'grok', intent: 'keep the line moving' },
      );
      expect(heat.intent).toBe('keep the line moving');
      expect(heat.hotSwap).toBeNull();
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('plan line uses live todos, not a stale description, then git subject', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'xray-station-plan-'));
    try {
      gitInit(tmp);
      fs.mkdirSync(path.join(tmp, '.xray', 'state'), { recursive: true });
      fs.writeFileSync(
        path.join(tmp, '.xray', 'state', 'lead-dev-plan.json'),
        JSON.stringify({
          active: true,
          description: 'STALE description that is already done',
          phases: [
            {
              todos: [
                { id: '2.1', task: 'Live constitution deny', status: 'completed' },
                { id: '2.2', task: 'Harness Repertoire working state', status: 'in_progress' },
              ],
            },
          ],
        }),
      );
      const live = applyStationHeat(tmp, 'grok', { intent: 'integrate repertoire' }, {});
      expect(live.planLine).toBe('Harness Repertoire working state');

      fs.writeFileSync(
        path.join(tmp, '.xray', 'state', 'lead-dev-plan.json'),
        JSON.stringify({
          active: true,
          description: 'STALE description that is already done',
          phases: [{ todos: [{ id: '2.1', task: 'done work', status: 'completed' }] }],
        }),
      );
      const gitPlan = applyStationHeat(tmp, 'grok', { intent: 'integrate repertoire' }, {});
      expect(gitPlan.planLine).toBe('init');
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('leftover memory_routing off becomes Repertoire on when the module resolves', () => {
    const parent = fs.mkdtempSync(path.join(os.tmpdir(), 'xray-station-rep-'));
    const tmp = path.join(parent, 'xray');
    const repertoire = path.join(parent, 'repertoire');
    try {
      fs.mkdirSync(tmp, { recursive: true });
      gitInit(tmp);
      fs.mkdirSync(path.join(tmp, '.xray'), { recursive: true });
      fs.writeFileSync(
        path.join(tmp, '.xray', 'features.json'),
        JSON.stringify({
          memory_routing: { enabled: false, provider: 'null' },
        }),
      );
      fs.mkdirSync(path.join(repertoire, 'dist', 'provider'), { recursive: true });
      fs.mkdirSync(path.join(repertoire, 'data'), { recursive: true });
      fs.writeFileSync(path.join(repertoire, 'package.json'), JSON.stringify({ name: '@0xray/repertoire' }));
      fs.writeFileSync(path.join(repertoire, 'dist', 'provider', 'memory-routing-provider.js'), 'export {}\n');
      fs.writeFileSync(
        path.join(repertoire, 'data', 'curated_signals.json'),
        JSON.stringify({ signals: [{ name: 'three-subsystem-verifiable-os' }] }),
      );
      const heat = applyStationHeat(tmp, 'grok', { intent: 'wear repertoire', matchedSignals: ['three-subsystem-verifiable-os', 'bedrock-field-guide'] }, {});
      expect(heat.repertoireResume).toMatch(/^Repertoire: on/);
      expect(heat.repertoireResume).toContain('1 signals');
      expect(heat.workingLine).toContain('three-subsystem-verifiable-os');
      expect(heat.workingLine).not.toContain('bedrock-');
      const card = writeStationMarkdown(tmp, { ...heat, host: 'grok', suit_profile: 'frontier' });
      const md = fs.readFileSync(card || '', 'utf8');
      expect(md).toContain('Repertoire: on');
      expect(md).toContain('Working:');
      expect(fs.existsSync(path.join(tmp, '.xray', 'state', 'repertoire-working.json'))).toBe(true);

      fs.writeFileSync(
        path.join(tmp, '.xray', 'features.json'),
        JSON.stringify({
          memory_routing: { enabled: false, provider: 'repertoire' },
        }),
      );
      const opted = applyStationHeat(tmp, 'grok', { intent: 'opt out' }, {});
      expect(opted.repertoireResume).toMatch(/memory_routing off/);
    } finally {
      fs.rmSync(parent, { recursive: true, force: true });
    }
  });

  it('reloads overlay OP-PROC onto repertoire-working, not Station', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'xray-op-proc-reload-'));
    try {
      gitInit(tmp);
      fs.mkdirSync(path.join(tmp, '.xray', 'state', 'repertoire'), { recursive: true });
      const opProc = [
        'station-survives-the-cut',
        'repertoire-is-long-running-kb',
        'compact-rekey-from-disk',
        'factory-seed-is-not-the-brain',
      ];
      fs.writeFileSync(
        path.join(tmp, '.xray', 'state', 'repertoire', 'curated_signals.json'),
        JSON.stringify({
          signals: opProc.map((name) => ({ name })),
        }),
      );
      const heat = applyStationHeat(tmp, 'cursor', { intent: 'survive compact after swap' }, {});
      const working = readRepertoireWorking(tmp);
      expect(working?.opProcNames).toEqual(expect.arrayContaining(opProc));
      const card = writeStationMarkdown(tmp, { ...heat, host: 'cursor', suit_profile: 'frontier' });
      const md = fs.readFileSync(card || '', 'utf8');
      expect(md).toMatch(/Repertoire:/);
      expect(md).not.toContain('factory-seed-is-not-the-brain');
      expect(md).not.toContain('compact-rekey-from-disk');
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('wake heat hydrates subject overlay and keeps repo-* off opProc', () => {
    const parent = fs.mkdtempSync(path.join(os.tmpdir(), 'xray-memory-wake-'));
    const tmp = path.join(parent, 'xray');
    const repertoire = path.join(parent, 'repertoire');
    try {
      fs.mkdirSync(tmp, { recursive: true });
      gitInit(tmp);
      fs.mkdirSync(path.join(repertoire, 'dist', 'provider'), { recursive: true });
      fs.mkdirSync(path.join(repertoire, 'data'), { recursive: true });
      fs.writeFileSync(path.join(repertoire, 'package.json'), JSON.stringify({ name: '@0xray/repertoire' }));
      fs.writeFileSync(path.join(repertoire, 'dist', 'provider', 'memory-routing-provider.js'), 'export {}\n');
      fs.writeFileSync(
        path.join(repertoire, 'data', 'curated_signals.json'),
        JSON.stringify({ signals: [{ name: 'three-subsystem-verifiable-os' }] }),
      );
      fs.writeFileSync(
        path.join(repertoire, 'data', 'stack-overlay.json'),
        JSON.stringify({ signals: [{ name: 'station-survives-the-cut' }] }),
      );
      fs.writeFileSync(
        path.join(repertoire, 'data', 'subject-overlay.json'),
        JSON.stringify({
          signals: [
            {
              name: 'repo-clearing',
              definition: 'Clearing hangar. x402 pay rail.',
            },
          ],
        }),
      );
      fs.mkdirSync(path.join(tmp, '.xray', 'state'), { recursive: true });
      fs.writeFileSync(
        path.join(tmp, '.xray', 'state', 'NOTES.md'),
        '**Pickup line:** Wake is the memory. Bookmark, index, and mind meet on heat.\n',
      );
      const heat = applyStationHeat(tmp, 'cursor', { intent: 'BRAIN-003 wake join' }, {});
      const dest = JSON.parse(
        fs.readFileSync(path.join(tmp, '.xray', 'state', 'repertoire', 'curated_signals.json'), 'utf8'),
      );
      const names = dest.signals.map((signal: { name: string }) => signal.name);
      expect(names).toEqual(
        expect.arrayContaining([
          'three-subsystem-verifiable-os',
          'station-survives-the-cut',
          'repo-clearing',
        ]),
      );
      const working = readRepertoireWorking(tmp);
      expect(working?.pickup).toMatch(/Wake is the memory/);
      expect(working?.destCount).toBe(3);
      expect(working?.opProcNames).toEqual(
        expect.arrayContaining(['three-subsystem-verifiable-os', 'station-survives-the-cut']),
      );
      expect(working?.opProcNames).not.toContain('repo-clearing');
      expect(heat.repertoireResume).toContain('3 signals');
    } finally {
      fs.rmSync(parent, { recursive: true, force: true });
    }
  });

  it('writeStationMarkdown is the Read target', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'xray-station-md-'));
    try {
      const dest = writeStationMarkdown(tmp, {
        host: 'openclaw',
        suit_profile: 'guided',
        intent: 'swap floors',
        repertoireResume: 'Repertoire: not installed (memory_routing stays off)',
      });
      expect(dest).toBe(path.join(tmp, '.xray', 'state', 'STATION.md'));
      expect(fs.readFileSync(dest || '', 'utf8')).toContain('Host: openclaw (guided)');
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('mergeStationMarkdown keeps custom keys and Durable while updating stock', () => {
    const existing = [
      '# Station',
      '',
      'Host: grok (guided)',
      'Intent: old intent',
      ...SEEDED_CUSTOM_KEYS,
      '',
      '## Durable',
      'Keep this seed block across compact. Hold npm.',
      '',
      'Continue this card. Compaction and host change are the same cut. Do not cold-start.',
      '',
    ].join('\n');
    const stock = formatStationMarkdown({
      host: 'grok',
      suit_profile: 'frontier',
      intent: 'survive the cut after compact',
      planLine: 'merge station on PreCompact',
      git: { branch: 'cursor/station-merge', head: 'deadbeef' },
      repertoireResume: 'Repertoire: on — 8 signals',
      workingLine: 'Working: station-merge',
    });
    const merged = mergeStationMarkdown(stock, existing);
    expect(merged).toContain('Host: grok (frontier)');
    expect(merged).toContain('Intent: survive the cut after compact');
    expect(merged).toContain('Repertoire: on — 8 signals');
    expect(merged).toContain('Working: station-merge');
    expect(merged).not.toContain('Intent: old intent');
    expect(merged).not.toMatch(/hold\s+npm/i);
    expectCustomStationKeys(merged);
    expect(countStationFooters(merged)).toEqual({ continueCount: 1, grokCount: 1 });
  });

  it('Seed does not swallow stock footers so repeated heat stays one footer', () => {
    const footer = [
      'Continue this card. Compaction and host change are the same cut. Do not cold-start.',
      'Grok does not inject this file — Read it. OpenCode injects. Do not thicken the Grok exo.',
    ];
    const existing = [
      '# Station',
      '',
      'Host: cursor (frontier)',
      'Intent: (none yet)',
      'Ticket: KILLER-DUAL-CLOUD',
      '## Durable',
      'killer-dual-arm-s-suited',
      '',
      '## Seed',
      'Never relaunch this bc. Continue the card.',
      '',
      'Compact: preCompact Y (count=4) · usage host-field · repertoire fastened',
      '',
      'Usage: source=precompact-stdin window=256000 tokens=230787',
      '',
      ...footer,
      '',
      ...footer,
      '',
      ...footer,
    ].join('\n');
    const preserved = extractPreservedStationLines(existing).join('\n');
    expect(preserved).toContain('Ticket: KILLER-DUAL-CLOUD');
    expect(preserved).toContain('## Durable');
    expect(preserved).toContain('killer-dual-arm-s-suited');
    expect(preserved).toContain('## Seed');
    expect(preserved).toContain('Never relaunch this bc. Continue the card.');
    expect(preserved).toContain('Compact: preCompact Y (count=4)');
    expect(preserved).toContain('Usage: source=precompact-stdin window=256000 tokens=230787');
    expect(preserved).not.toContain('Continue this card. Compaction');
    expect(preserved).not.toContain('Grok does not inject this file');

    const stock = formatStationMarkdown({
      host: 'cursor',
      suit_profile: 'frontier',
      intent: '(none yet)',
      planLine: 'fix station seed footer stack',
      git: { branch: 'cursor/station-seed-footer-02fe', head: 'abc1234' },
      repertoireResume: 'Repertoire: on — 8 signals',
      workingLine: 'Working: last pre_compact @ deadbeef',
    });
    const once = mergeStationMarkdown(stock, existing);
    const twice = mergeStationMarkdown(stock, once);
    expect(countStationFooters(once)).toEqual({ continueCount: 1, grokCount: 1 });
    expect(countStationFooters(twice)).toEqual({ continueCount: 1, grokCount: 1 });
    expect(twice).toContain('Ticket: KILLER-DUAL-CLOUD');
    expect(twice).toContain('Never relaunch this bc. Continue the card.');
  });

  it('writeStationMarkdown merges a seeded card instead of wipe-then-write', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'xray-station-merge-'));
    try {
      const dest = seedStationCard(tmp);
      writeStationMarkdown(tmp, {
        host: 'grok',
        suit_profile: 'frontier',
        intent: 'survive the cut after compact',
        planLine: 'merge station on PreCompact',
        git: { branch: 'cursor/station-merge', head: 'deadbeef' },
        repertoireResume: 'Repertoire: on — 8 signals',
        workingLine: 'Working: station-merge',
      });
      const card = fs.readFileSync(dest, 'utf8');
      expect(card).toContain('Host: grok (frontier)');
      expect(card).toContain('Intent: survive the cut after compact');
      expect(card).toContain('Plan: merge station on PreCompact');
      expect(card).toContain('Git: cursor/station-merge@deadbeef');
      expect(card).toContain('Repertoire: on — 8 signals');
      expect(card).toContain('Working: station-merge');
      expect(card).not.toContain('Intent: old intent before compact');
      expectCustomStationKeys(card);

      writeStationMarkdown(tmp, {
        host: 'hermes',
        suit_profile: 'guided',
        intent: 'second heat still merges',
        repertoireResume: 'Repertoire: on — 8 signals',
        workingLine: 'Working: last post_compact',
      });
      const again = fs.readFileSync(dest, 'utf8');
      expect(again).toContain('Host: hermes (guided)');
      expect(again).toContain('Intent: second heat still merges');
      expect(again).toContain('Working: last post_compact');
      expectCustomStationKeys(again);
      expect(countStationFooters(again)).toEqual({ continueCount: 1, grokCount: 1 });
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('PreCompact writeSessionBoot path keeps custom Station keys', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'xray-station-compact-merge-'));
    try {
      gitInit(tmp);
      fs.mkdirSync(path.join(tmp, '.xray'), { recursive: true });
      fs.writeFileSync(
        path.join(tmp, '.xray', 'features.json'),
        JSON.stringify({
          suit_temperament: { profile: 'auto' },
          memory_routing: { enabled: false, provider: 'null' },
        }),
      );
      const dest = seedStationCard(tmp);
      const payload = buildSessionBootPayload(tmp, '0xray/grok-compact', {
        host: 'grok',
        hookEvent: 'pre_compact',
        intent: 'COMPACT-AB-001 survive compact without wiping seed',
      });
      writeSessionBoot(tmp, payload);
      const card = fs.readFileSync(dest, 'utf8');
      expect(card).toContain('Host: grok');
      expect(card).toContain('Intent: COMPACT-AB-001 survive compact without wiping seed');
      expect(card).not.toContain('Intent: old intent before compact');
      expectCustomStationKeys(card);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });
});
