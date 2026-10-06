import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import {
  buildRepertoireResume,
  buildSessionBootPayload,
  ensureSessionBoot,
  writeSessionBoot,
  loadFeatures,
  resolveGrokHookEvent,
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

  it('buildSessionBootPayload does not keep extra.timestamp from a prior boot', () => {
    fs.writeFileSync(
      path.join(tmp, '.xray', 'features.json'),
      JSON.stringify({ multi_agent_orchestration: { lead_dev_mode: true } }),
    );
    const payload = buildSessionBootPayload(tmp, '0xray/cursor-pre-tool-use-boot', {
      host: 'cursor',
      hookEvent: 'lead-heat',
      timestamp: '2026-09-21T20:04:50.397Z',
    });
    expect(payload.hookEvent).toBe('lead-heat');
    expect(payload.timestamp).not.toBe('2026-09-21T20:04:50.397Z');
    expect(Date.parse(String(payload.timestamp))).toBeGreaterThan(Date.parse('2026-09-21T20:04:50.397Z'));
  });

  it('buildSessionBootPayload keeps pre_compact after later lead-heat', () => {
    fs.writeFileSync(
      path.join(tmp, '.xray', 'features.json'),
      JSON.stringify({ multi_agent_orchestration: { lead_dev_mode: true } }),
    );
    fs.mkdirSync(path.join(tmp, '.xray', 'state'), { recursive: true });
    fs.writeFileSync(
      path.join(tmp, '.xray', 'state', 'session-boot.json'),
      JSON.stringify({
        host: 'cursor',
        hookEvent: 'pre_compact',
        event_class: 'cursor-host-precompact',
        conversation_id: 'bc-compact-hold',
        lead_dev_mode: true,
        suit_profile: 'frontier',
        workspaceRoot: tmp,
        repertoireResume: 'Repertoire: not installed (memory_routing stays off)',
        stationLine: 'host cursor',
      }),
    );
    const payload = buildSessionBootPayload(tmp, '0xray/cursor-pre-tool-use-boot', {
      host: 'cursor',
      hookEvent: 'lead-heat',
    });
    expect(payload.hookEvent).toBe('pre_compact');
    expect(payload.arrivedHook).toBe('lead-heat');
    expect(payload.event_class).toBe('cursor-host-precompact');
    expect(payload.conversation_id).toBe('bc-compact-hold');
  });

  it('a prompt after compact reads the mill report', () => {
    fs.writeFileSync(
      path.join(tmp, '.xray', 'features.json'),
      JSON.stringify({ multi_agent_orchestration: { lead_dev_mode: true } }),
    );
    fs.writeFileSync(path.join(tmp, 'package.json'), `${JSON.stringify({ name: 'acme' })}\n`);
    const mill = path.join(tmp, '.xray', 'state', 'sleeve-mill.json');
    writeSessionBoot(
      tmp,
      buildSessionBootPayload(tmp, '0xray/grok-compact', {
        host: 'grok',
        hookEvent: 'pre_compact',
        intent: 'goggles',
      }),
    );
    expect(fs.existsSync(mill)).toBe(true);
    const saved = JSON.parse(fs.readFileSync(mill, 'utf8')) as { ranAt?: string };
    saved.ranAt = 'sentinel-ran';
    fs.writeFileSync(mill, `${JSON.stringify(saved)}\n`);
    const prompt = buildSessionBootPayload(tmp, '0xray/grok-user-prompt-submit', {
      host: 'grok',
      hookEvent: 'user_prompt_submit',
      intent: 'goggles',
    });
    expect(prompt.hookEvent).toBe('pre_compact');
    expect(prompt.arrivedHook).toBe('user_prompt_submit');
    writeSessionBoot(tmp, prompt);
    const lead = buildSessionBootPayload(tmp, '0xray/cursor-pre-tool-use-boot', {
      host: 'cursor',
      hookEvent: 'lead-heat',
    });
    expect(lead.arrivedHook).toBe('lead-heat');
    writeSessionBoot(tmp, lead);
    const channel = buildSessionBootPayload(tmp, '0xray/grok-session-start', {
      host: 'grok',
      intent: 'goggles',
    });
    expect(channel.arrivedHook).toBe('');
    expect(channel.hookEvent).toBe('pre_compact');
    writeSessionBoot(tmp, channel);
    expect(JSON.parse(fs.readFileSync(mill, 'utf8')).ranAt).toBe('sentinel-ran');
    writeSessionBoot(
      tmp,
      buildSessionBootPayload(tmp, '0xray/grok-session-start', {
        host: 'grok',
        hookEvent: 'session_start',
        intent: 'goggles',
      }),
    );
    expect(JSON.parse(fs.readFileSync(mill, 'utf8')).ranAt).not.toBe('sentinel-ran');
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
          repertoireResume: 'Repertoire: module unresolved',
          stationLine: 'host grok. intent: (none yet). plan: (none). git: n/a. Repertoire: module unresolved',
        },
        tmp,
      ),
    ).toBe(false);
    expect(
      sessionBootNeedsRefresh(
        {
          lead_dev_mode: true,
          host: 'grok',
          suit_profile: 'frontier',
          workspaceRoot: `${tmp}/`,
          repertoireResume: 'Repertoire: module unresolved',
          stationLine: 'host grok. intent: (none yet). plan: (none). git: n/a. Repertoire: module unresolved',
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

  it('keeps SessionStart a session start when the opening prompt is present', () => {
    const argv = ['node', 'session-start.js'];
    const env = {};
    expect(resolveGrokHookEvent({ hookEventName: 'SessionStart', prompt: 'goggles' }, argv, env)).toBe(
      'session_start',
    );
    expect(resolveGrokHookEvent({ hookEventName: 'session-start', prompt: 'goggles' }, argv, env)).toBe(
      'session_start',
    );
    expect(resolveGrokHookEvent({ hook: 'PreCompact', prompt: 'goggles' }, argv, env)).toBe('pre_compact');
    expect(resolveGrokHookEvent({ hookEventName: 'UserPromptSubmit', prompt: 'goggles' }, argv, env)).toBe(
      'user_prompt_submit',
    );
    expect(resolveGrokHookEvent({ prompt: 'goggles' }, argv, env)).toBe('user_prompt_submit');
    expect(
      resolveGrokHookEvent({ hookEventName: 'SessionStart', prompt: 'goggles' }, ['node', 'session-start.js', '--hook-event=user_prompt_submit'], env),
    ).toBe('user_prompt_submit');
  });

  it('runs the mill on SessionStart before the card when the opening prompt is present', () => {
    const project = fs.mkdtempSync(path.join(os.tmpdir(), 'xray-session-start-'));
    const home = fs.mkdtempSync(path.join(os.tmpdir(), 'xray-session-home-'));
    const machine = fs.mkdtempSync(path.join(os.tmpdir(), 'xray-session-machine-'));
    try {
      fs.writeFileSync(path.join(project, 'package.json'), `${JSON.stringify({ name: 'acme' })}\n`);
      const hook = path.join(path.dirname(new URL(import.meta.url).pathname), '../../integrations/grok/hooks/session-start.js');
      const ran = spawnSync(process.execPath, [hook], {
        cwd: project,
        input: JSON.stringify({
          workspaceRoot: project,
          cwd: project,
          hookEventName: 'SessionStart',
          prompt: 'goggles',
        }),
        encoding: 'utf8',
        env: {
          ...process.env,
          HOME: home,
          USERPROFILE: home,
          FOUNDRY_MACHINE_HOME: machine,
        },
      });
      expect(ran.status).toBe(0);
      const boot = JSON.parse(fs.readFileSync(path.join(project, '.xray/state/session-boot.json'), 'utf8')) as {
        hookEvent?: string;
      };
      expect(boot.hookEvent).toBe('session_start');
      expect(fs.existsSync(path.join(project, '.xray/state/sleeve-mill.json'))).toBe(true);
      const card = fs.readFileSync(path.join(project, '.xray/state/STATION.md'), 'utf8');
      expect(card).toContain('Working: last session_start');
      expect(card).toContain('Intent: goggles');
    } finally {
      fs.rmSync(project, { recursive: true, force: true });
      fs.rmSync(home, { recursive: true, force: true });
      fs.rmSync(machine, { recursive: true, force: true });
    }
  });
});