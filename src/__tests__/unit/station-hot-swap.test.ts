import { describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { execFileSync } from 'child_process';
import {
  applyStationHeat,
  clipIntent,
  formatStationMarkdown,
  writeStationMarkdown,
} from '../../integrations/hooks/station-hook-runtime.mjs';
import { writeSuitSessionBoot } from '../../nucleus/suit-temperament.js';
import { buildSessionBootPayload, writeSessionBoot } from '../../integrations/grok/hooks/grok-hook-utils.js';

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
    const heat = applyStationHeat(
      os.tmpdir(),
      'grok',
      {},
      { host: 'grok', intent: 'keep the line moving' },
    );
    expect(heat.intent).toBe('keep the line moving');
    expect(heat.hotSwap).toBeNull();
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
});
