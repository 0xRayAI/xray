import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  buildRepertoireResume,
  buildSessionBootPayload,
  ensureSessionBoot,
  loadFeatures,
  resolveSiblingWorkspaceRoots,
  sessionBootNeedsRefresh,
} from '../../integrations/grok/hooks/grok-hook-utils.js';
import { handlePostToolUse } from '../../integrations/grok/hooks/post-tool-use.js';

describe('grok-hook-utils', () => {
  let tmp: string;
  let siblingDir: string;

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'xray-grok-utils-'));
    siblingDir = fs.mkdtempSync(path.join(os.tmpdir(), 'xray-sibling-'));
    fs.mkdirSync(path.join(tmp, '.xray'), { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tmp, { recursive: true, force: true });
    fs.rmSync(siblingDir, { recursive: true, force: true });
  });

  it('resolveSiblingWorkspaceRoots resolves configured sibling paths', () => {
    fs.writeFileSync(
      path.join(tmp, '.xray', 'features.json'),
      JSON.stringify({
        multi_agent_orchestration: {
          sibling_repos: [{ path: siblingDir, label: 'ui-workspace' }],
        },
      }),
    );
    const roots = resolveSiblingWorkspaceRoots(tmp);
    expect(roots).toHaveLength(1);
    expect(roots[0]?.path).toBe(siblingDir);
    expect(roots[0]?.label).toBe('ui-workspace');
  });

  it('buildSessionBootPayload includes siblingWorkspaceRoots when configured', () => {
    fs.writeFileSync(
      path.join(tmp, '.xray', 'features.json'),
      JSON.stringify({
        multi_agent_orchestration: {
          lead_dev_mode: true,
          sibling_repos: [siblingDir],
        },
      }),
    );
    const payload = buildSessionBootPayload(tmp, 'test/session-start');
    expect(payload.siblingWorkspaceRoots).toBeDefined();
    expect(payload.siblingWorkspaceRoots?.[0]?.path).toBe(siblingDir);
    expect(payload.host).toBe('grok');
    expect(payload.repertoireResume).toMatch(/^Repertoire:/);
  });

  it('sessionBootNeedsRefresh when workspaceRoot or host is stale', () => {
    expect(
      sessionBootNeedsRefresh(
        { lead_dev_mode: true, workspaceRoot: '/Users/blaze/dev/xray' },
        tmp,
      ),
    ).toBe(true);
    expect(
      sessionBootNeedsRefresh(
        {
          lead_dev_mode: true,
          host: 'grok',
          suit_profile: 'frontier',
          workspaceRoot: tmp,
          repertoireResume: 'Repertoire: not installed (memory_routing stays off)',
          stationLine: 'host grok. intent: (none yet). plan: (none). git: n/a. Repertoire: not installed (memory_routing stays off)',
        },
        tmp,
      ),
    ).toBe(false);
  });

  it('ensureSessionBoot rewrites leftover boot from another machine', () => {
    fs.writeFileSync(
      path.join(tmp, '.xray', 'features.json'),
      JSON.stringify({
        suit_temperament: { profile: 'auto' },
        multi_agent_orchestration: { lead_dev_mode: true },
      }),
    );
    fs.mkdirSync(path.join(tmp, '.xray', 'state'), { recursive: true });
    fs.writeFileSync(
      path.join(tmp, '.xray', 'state', 'session-boot.json'),
      JSON.stringify({
        lead_dev_mode: true,
        workspaceRoot: '/Users/blaze/dev/xray',
        source: '0xray/grok-pre-tool-use-boot',
      }),
    );
    ensureSessionBoot(tmp, 'test/refresh');
    const boot = JSON.parse(
      fs.readFileSync(path.join(tmp, '.xray', 'state', 'session-boot.json'), 'utf8'),
    );
    expect(boot.host).toBe('grok');
    expect(boot.workspaceRoot).toBe(tmp);
    expect(boot.suit_profile).toBe('frontier');
    expect(boot.repertoireResume).toMatch(/^Repertoire:/);
  });

  it('loadFeatures forwards grok_postprocessor_light from features.json', () => {
    fs.writeFileSync(
      path.join(tmp, '.xray', 'features.json'),
      JSON.stringify({
        grok_postprocessor_light: true,
        multi_agent_orchestration: { lead_dev_mode: true },
      }),
    );
    expect(loadFeatures(tmp).grok_postprocessor_light).toBe(true);
    fs.writeFileSync(
      path.join(tmp, '.xray', 'features.json'),
      JSON.stringify({ multi_agent_orchestration: { lead_dev_mode: true } }),
    );
    expect(loadFeatures(tmp).grok_postprocessor_light).toBe(false);
  });

  it('PostToolUse runs grok_postprocessor_light when the flag is on', () => {
    fs.writeFileSync(
      path.join(tmp, '.xray', 'features.json'),
      JSON.stringify({ grok_postprocessor_light: true }),
    );
    handlePostToolUse(
      {
        workspaceRoot: tmp,
        toolName: 'Write',
        toolInput: { path: 'src/a.ts' },
      },
      tmp,
    );
    const marker = path.join(tmp, '.xray', 'inference', 'postprocessor-light-latest.json');
    expect(fs.existsSync(marker)).toBe(true);
    const payload = JSON.parse(fs.readFileSync(marker, 'utf8')) as { tool: string; mode: string };
    expect(payload.tool).toBe('Write');
    expect(payload.mode).toBe('grok-post-tool-light');
  });

  it('buildRepertoireResume reports on when sibling Repertoire is enabled', () => {
    const parent = fs.mkdtempSync(path.join(os.tmpdir(), 'xray-rep-parent-'));
    const consumer = path.join(parent, 'xray-app');
    const repertoire = path.join(parent, 'repertoire');
    fs.mkdirSync(path.join(consumer, '.xray'), { recursive: true });
    fs.mkdirSync(path.join(repertoire, 'dist', 'provider'), { recursive: true });
    fs.mkdirSync(path.join(repertoire, 'data'), { recursive: true });
    fs.writeFileSync(path.join(repertoire, 'package.json'), JSON.stringify({ name: '@0xray/repertoire' }));
    fs.writeFileSync(path.join(repertoire, 'dist', 'provider', 'memory-routing-provider.js'), 'export {}\n');
    fs.writeFileSync(
      path.join(repertoire, 'data', 'curated_signals.json'),
      JSON.stringify({ signals: [{ name: 'a' }, { name: 'b' }] }),
    );
    fs.writeFileSync(
      path.join(consumer, '.xray', 'features.json'),
      JSON.stringify({
        memory_routing: {
          enabled: true,
          provider: 'repertoire',
          config: { signalsPath: '../repertoire/data/curated_signals.json' },
        },
      }),
    );
    try {
      expect(buildRepertoireResume(consumer)).toBe('Repertoire: on — 2 signals');
    } finally {
      fs.rmSync(parent, { recursive: true, force: true });
    }
  });
});