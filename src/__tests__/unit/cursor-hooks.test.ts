import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  classifyPreCompactEvent,
  cursorBootNeedsRefresh,
} from '../../integrations/cursor/hooks/cursor-hook-utils.js';
import {
  classifyUsageCite,
  parseInvokeProbeLog,
  stationUsageWindowLabel,
  writeCursorUsageReceipt,
} from '../../integrations/cursor/hooks/cursor-usage-receipt.js';

const packageRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const preTool = path.join(packageRoot, 'src/integrations/cursor/hooks/pre-tool-use.js');
const preCompact = path.join(packageRoot, 'src/integrations/cursor/hooks/pre-compact.js');
const afterEdit = path.join(packageRoot, 'src/integrations/cursor/hooks/after-file-edit.js');
const templateHooks = path.join(packageRoot, 'src/integrations/cursor/hooks/hooks.json');
const repoHooks = path.join(packageRoot, '.cursor/hooks.json');

const BEN_KEYS = [
  'Ticket: COMPACT-BEN-001',
  'Seed: 42',
  'Open cloud: bc-DEADBEEF',
  'Unfinished path: examples/cursor-cloud-compact/UNFINISHED.txt',
];

function seedBenStation(root: string) {
  const dest = path.join(root, '.xray', 'state', 'STATION.md');
  mkdirSync(path.dirname(dest), { recursive: true });
  writeFileSync(
    dest,
    [
      '# Station',
      '',
      'Host: grok (guided)',
      'Intent: old intent before compact',
      'Plan: (none)',
      'Git: n/a',
      'Repertoire: not required for this adapter (optional MCP)',
      '',
      ...BEN_KEYS,
      '',
      '## Durable',
      'keep-me-ben-001',
      '',
      '## Seed',
      'Never relaunch bc-DEADBEEF.',
      '',
      'Continue this card. Compaction and host change are the same cut. Do not cold-start.',
      '',
    ].join('\n'),
  );
  return dest;
}

function gitInit(root: string) {
  execFileSync('git', ['init'], { cwd: root, stdio: 'ignore' });
  execFileSync('git', ['config', 'user.email', 'cursor-hook@test'], { cwd: root, stdio: 'ignore' });
  execFileSync('git', ['config', 'user.name', 'cursor-hook'], { cwd: root, stdio: 'ignore' });
  writeFileSync(path.join(root, 'README.md'), 'cursor-hook\n');
  execFileSync('git', ['add', 'README.md'], { cwd: root, stdio: 'ignore' });
  execFileSync('git', ['commit', '-m', 'init hook metal'], { cwd: root, stdio: 'ignore' });
}

function plantFeatures(root: string) {
  mkdirSync(path.join(root, '.xray'), { recursive: true });
  writeFileSync(
    path.join(root, '.xray', 'features.json'),
    JSON.stringify({
      suit_temperament: { profile: 'auto' },
      multi_agent_orchestration: {
        enabled: true,
        lead_dev_mode: true,
        no_new_surface: true,
        per_suite_test_triage: true,
      },
      memory_routing: { enabled: false, provider: 'null' },
    }),
  );
}

function runHook(
  script: string,
  stdin: Record<string, unknown>,
  root: string,
  args: string[] = [],
): { stdout: string; status: number } {
  const result = execFileSync(process.execPath, [script, ...args], {
    cwd: root,
    input: JSON.stringify(stdin),
    encoding: 'utf8',
    timeout: 30000,
    env: {
      ...process.env,
      XRAY_ROOT: root,
      XRAY_AI_PATH: packageRoot,
      CURSOR_PROJECT_DIR: root,
    },
  });
  return { stdout: result.trim(), status: 0 };
}

describe('Cursor cloud hooks adapter', () => {
  it('ships version-1 project + consumer templates without sessionStart', () => {
    const template = JSON.parse(readFileSync(templateHooks, 'utf8')) as {
      version: number;
      hooks: Record<string, Array<{ command: string }>>;
    };
    const repo = JSON.parse(readFileSync(repoHooks, 'utf8')) as {
      version: number;
      hooks: Record<string, Array<{ command: string }>>;
    };
    expect(template.version).toBe(1);
    expect(repo.version).toBe(1);
    expect(existsSync(path.join(packageRoot, '.cursor/hooks/invoke-probe.sh'))).toBe(true);
    for (const cmd of Object.values(repo.hooks).flat().map((h) => h.command)) {
      expect(cmd).toContain('invoke-probe.sh');
    }
    for (const hooks of [template.hooks, repo.hooks]) {
      expect(hooks.sessionStart).toBeUndefined();
      expect(hooks.preToolUse?.[0]?.command).toContain('pre-tool-use.js');
      expect(hooks.preCompact?.[0]?.command).toContain('pre-compact.js');
      expect(hooks.afterFileEdit?.[0]?.command).toContain('after-file-edit.js');
    }
  });

  it('preToolUse rewrites Git when HEAD moves and keeps Ticket / Durable', () => {
    const tmp = mkdtempSync(path.join(tmpdir(), 'xray-cursor-metal-'));
    try {
      plantFeatures(tmp);
      gitInit(tmp);
      const dest = seedBenStation(tmp);
      runHook(preTool, { tool_name: 'Read', tool_input: { path: 'README.md' }, cwd: tmp }, tmp);
      const firstHead = execFileSync('git', ['rev-parse', '--short', 'HEAD'], {
        cwd: tmp,
        encoding: 'utf8',
      }).trim();
      expect(readFileSync(dest, 'utf8')).toContain(`@${firstHead}`);
      writeFileSync(path.join(tmp, 'MORE.md'), 'metal\n');
      execFileSync('git', ['add', 'MORE.md'], { cwd: tmp, stdio: 'ignore' });
      execFileSync('git', ['commit', '-m', 'move HEAD'], { cwd: tmp, stdio: 'ignore' });
      const nextHead = execFileSync('git', ['rev-parse', '--short', 'HEAD'], {
        cwd: tmp,
        encoding: 'utf8',
      }).trim();
      expect(nextHead).not.toBe(firstHead);
      expect(
        cursorBootNeedsRefresh(
          JSON.parse(readFileSync(path.join(tmp, '.xray', 'state', 'session-boot.json'), 'utf8')),
          tmp,
        ),
      ).toBe(true);
      runHook(preTool, { tool_name: 'Read', tool_input: { path: 'MORE.md' }, cwd: tmp }, tmp);
      const card = readFileSync(dest, 'utf8');
      expect(card).toContain(`@${nextHead}`);
      expect(card).toContain('Ticket: COMPACT-BEN-001');
      expect(card).toContain('keep-me-ben-001');
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('classifyPreCompactEvent honors host vs synthetic labels', () => {
    expect(classifyPreCompactEvent({}, [])).toBe('cursor-precompact-synthetic');
    expect(
      classifyPreCompactEvent(
        { hook_event_name: 'preCompact', trigger: 'auto', context_tokens: 12 },
        [],
      ),
    ).toBe('cursor-host-precompact');
    expect(
      classifyPreCompactEvent(
        { hook_event_name: 'preCompact', trigger: 'auto', context_tokens: 12 },
        ['--event-class=cursor-precompact-synthetic'],
      ),
    ).toBe('cursor-precompact-synthetic');
  });

  it('preToolUse emits Cursor permission allow on Read', () => {
    const tmp = mkdtempSync(path.join(tmpdir(), 'xray-cursor-allow-'));
    try {
      plantFeatures(tmp);
      const { stdout } = runHook(
        preTool,
        { tool_name: 'Read', tool_input: { path: 'README.md' }, cwd: tmp },
        tmp,
      );
      const out = JSON.parse(stdout) as { permission: string };
      expect(out.permission).toBe('allow');
      expect(existsSync(path.join(tmp, '.xray', 'state', 'STATION.md'))).toBe(true);
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('preToolUse emits permission deny on destructive Shell', () => {
    const tmp = mkdtempSync(path.join(tmpdir(), 'xray-cursor-deny-'));
    try {
      plantFeatures(tmp);
      const { stdout } = runHook(
        preTool,
        {
          tool_name: 'Shell',
          tool_input: { command: 'rm -rf /' },
          cwd: tmp,
        },
        tmp,
      );
      const out = JSON.parse(stdout) as { permission: string; user_message?: string };
      expect(out.permission).toBe('deny');
      expect(out.user_message).toMatch(/destructive/i);
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('preCompact merges COMPACT-BEN-001 seed keys and labels synthetic class', () => {
    const tmp = mkdtempSync(path.join(tmpdir(), 'xray-cursor-compact-'));
    try {
      plantFeatures(tmp);
      const dest = seedBenStation(tmp);
      const { stdout } = runHook(
        preCompact,
        {
          hook_event_name: 'preCompact',
          trigger: 'auto',
          context_tokens: 120000,
          cwd: tmp,
        },
        tmp,
        ['--event-class=cursor-precompact-synthetic'],
      );
      const out = JSON.parse(stdout) as { user_message?: string };
      expect(out.user_message).toContain('event_class=cursor-precompact-synthetic');
      const card = readFileSync(dest, 'utf8');
      expect(card).toContain('Host: cursor');
      expect(card).not.toContain('Intent: old intent before compact');
      for (const line of BEN_KEYS) {
        expect(card).toContain(line);
        expect(card.split(line).length - 1).toBe(1);
      }
      expect(card).toContain('keep-me-ben-001');
      const receipt = JSON.parse(
        readFileSync(path.join(tmp, '.xray', 'state', 'cursor-precompact.json'), 'utf8'),
      ) as { event_class: string };
      expect(receipt.event_class).toBe('cursor-precompact-synthetic');
      const usage = JSON.parse(
        readFileSync(path.join(tmp, '.xray', 'state', 'cursor-usage-receipt.json'), 'utf8'),
      ) as {
        usage: { context_tokens: number | null; forbidden: boolean };
        compact: { eventClass: string };
      };
      expect(usage.usage.forbidden).toBe(false);
      expect(usage.usage.context_tokens).toBe(120000);
      expect(usage.compact.eventClass).toBe('cursor-precompact-synthetic');
      expect(card).toContain('Compact:');
      expect(card).toContain('Usage:');
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('preCompact host-shaped stdin without override is cursor-host-precompact', () => {
    const tmp = mkdtempSync(path.join(tmpdir(), 'xray-cursor-host-compact-'));
    try {
      plantFeatures(tmp);
      seedBenStation(tmp);
      const { stdout } = runHook(
        preCompact,
        {
          hook_event_name: 'preCompact',
          trigger: 'manual',
          context_usage_percent: 90,
          cwd: tmp,
        },
        tmp,
      );
      const out = JSON.parse(stdout) as { user_message?: string };
      expect(out.user_message).toContain('event_class=cursor-host-precompact');
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('host preCompact then preToolUse keeps Compact/Usage rows and last pre_compact', () => {
    const tmp = mkdtempSync(path.join(tmpdir(), 'xray-cursor-survive-'));
    try {
      plantFeatures(tmp);
      const dest = seedBenStation(tmp);
      mkdirSync(path.join(tmp, '.xray', 'state'), { recursive: true });
      writeFileSync(
        path.join(tmp, '.xray', 'state', 'cursor-hook-invoke.log'),
        'ts=2026-09-15T09:30:49+00:00 event=preCompact cwd=/tmp node=/exec-daemon/node\n',
      );
      const compactOut = runHook(
        preCompact,
        {
          hook_event_name: 'preCompact',
          trigger: 'auto',
          context_tokens: 231344,
          cwd: tmp,
        },
        tmp,
      );
      expect(JSON.parse(compactOut.stdout).user_message).toContain('event_class=cursor-host-precompact');
      runHook(preTool, { tool_name: 'Read', tool_input: { path: 'README.md' }, cwd: tmp }, tmp);
      const card = readFileSync(dest, 'utf8');
      expect(card).toContain('Compact: preCompact Y (count=1)');
      expect(card).toContain('tokens=231344');
      expect(card).toContain('Working: last pre_compact');
      expect(card).toContain('Ticket: COMPACT-BEN-001');
      expect(card).toContain('keep-me-ben-001');
      const boot = JSON.parse(
        readFileSync(path.join(tmp, '.xray', 'state', 'session-boot.json'), 'utf8'),
      ) as { host: string; hookEvent?: string };
      expect(boot.host).toBe('cursor');
      expect(boot.hookEvent).toBe('pre_compact');
      const usage = JSON.parse(
        readFileSync(path.join(tmp, '.xray', 'state', 'cursor-usage-receipt.json'), 'utf8'),
      ) as { usage: { context_tokens: number | null }; compact: { eventClass: string; hostFired: boolean } };
      expect(usage.usage.context_tokens).toBe(231344);
      expect(usage.compact.eventClass).toBe('cursor-host-precompact');
      expect(usage.compact.hostFired).toBe(true);
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('afterFileEdit boots Station and emits empty object', () => {
    const tmp = mkdtempSync(path.join(tmpdir(), 'xray-cursor-edit-'));
    try {
      plantFeatures(tmp);
      const { stdout } = runHook(afterEdit, { file_path: 'README.md', cwd: tmp }, tmp);
      expect(JSON.parse(stdout)).toEqual({});
      expect(existsSync(path.join(tmp, '.xray', 'state', 'session-boot.json'))).toBe(true);
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('gitignore lists session-boot.json with other Station runtime files', () => {
    const ignore = readFileSync(path.join(packageRoot, '.gitignore'), 'utf8');
    expect(ignore).toMatch(/^\.xray\/state\/session-boot\.json$/m);
    expect(ignore).toMatch(/^\.xray\/state\/cursor-usage-receipt\.json$/m);
  });

  it('parseInvokeProbeLog counts host preCompact without synthetic invoke', () => {
    const tmp = mkdtempSync(path.join(tmpdir(), 'xray-cursor-probe-'));
    try {
      mkdirSync(path.join(tmp, '.xray', 'state'), { recursive: true });
      writeFileSync(
        path.join(tmp, '.xray', 'state', 'cursor-hook-invoke.log'),
        [
          'ts=2026-09-15T09:12:31+00:00 event=preToolUse cwd=/workspace node=/exec-daemon/node',
          'ts=2026-09-15T09:12:32+00:00 event=afterFileEdit cwd=/workspace node=/exec-daemon/node',
          'ts=2026-09-15T09:13:01+00:00 event=preCompact cwd=/workspace node=/exec-daemon/node',
        ].join('\n'),
      );
      const probe = parseInvokeProbeLog(tmp);
      expect(probe.exists).toBe(true);
      expect(probe.hostPreCompactFired).toBe(true);
      expect(probe.counts.preCompact).toBe(1);
      expect(probe.counts.preToolUse).toBe(1);
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('classifyUsageCite rejects FILL and accepts host fields or MCP identity miss', () => {
    expect(classifyUsageCite({ method: 'chars÷4', fillBytes: 12000 }).ok).toBe(false);
    expect(classifyUsageCite({ method: 'chars÷4', fillBytes: 12000 }).forbidden).toBe(true);
    expect(classifyUsageCite({ method: 'fill-only' }).forbidden).toBe(true);
    const host = classifyUsageCite({
      source: 'precompact-stdin',
      method: 'host-field',
      context_tokens: 48000,
      context_usage_percent: 12,
    });
    expect(host.ok).toBe(true);
    expect(host.miss).toBe(false);
    expect(host.context_tokens).toBe(48000);
    expect(stationUsageWindowLabel({ context_window_size: 256000, windowCite: 'Grok 500k locked' })).toBe(
      '256000',
    );
    expect(stationUsageWindowLabel({ windowCite: 'Grok 500k locked' })).toBe('Grok 500k locked');
    expect(stationUsageWindowLabel({})).toBe('MISS');
    const mcp = classifyUsageCite({
      source: 'cursor-cloud-run-info',
      method: 'mcp',
      model: 'cursor-grok-4.6-high',
      bcId: 'bc-cd19bb4e-a4bc-57da-8979-754bb0c202fe',
      windowCite: 'Grok 500k locked; host context_window_size MISS',
    });
    expect(mcp.ok).toBe(true);
    expect(mcp.miss).toBe(true);
    expect(mcp.context_tokens).toBeNull();
    expect(classifyUsageCite({}).ok).toBe(false);
    expect(classifyUsageCite({}).miss).toBe(true);
  });

  it('writeCursorUsageReceipt upserts Station compact row and refuses fill as ok', () => {
    const tmp = mkdtempSync(path.join(tmpdir(), 'xray-cursor-usage-'));
    try {
      plantFeatures(tmp);
      seedBenStation(tmp);
      writeFileSync(
        path.join(tmp, '.xray', 'state', 'cursor-hook-invoke.log'),
        'ts=2026-09-15T09:12:31+00:00 event=preToolUse cwd=/tmp node=/exec-daemon/node\n',
      );
      const dest = writeCursorUsageReceipt(tmp, {
        hooksAtBoot: true,
        usage: {
          source: 'cursor-cloud-run-info',
          method: 'mcp',
          model: 'cursor-grok-4.6-high',
          bcId: 'bc-test',
          windowCite: 'Grok 500k locked',
        },
      });
      expect(dest).toBe(path.join(tmp, '.xray', 'state', 'cursor-usage-receipt.json'));
      const receipt = JSON.parse(readFileSync(dest as string, 'utf8')) as {
        ok: boolean;
        compact: { hostFired: boolean; preCompactCount: number };
        usage: { miss: boolean; model: string };
      };
      expect(receipt.ok).toBe(true);
      expect(receipt.compact.hostFired).toBe(false);
      expect(receipt.compact.preCompactCount).toBe(0);
      expect(receipt.usage.miss).toBe(true);
      expect(receipt.usage.model).toBe('cursor-grok-4.6-high');
      const card = readFileSync(path.join(tmp, '.xray', 'state', 'STATION.md'), 'utf8');
      expect(card).toContain('Compact: preCompact N (count=0)');
      expect(card).toContain('Usage: source=cursor-cloud-run-info');
      expect(card).toContain('window=Grok 500k locked');
      expect(card).toContain('Ticket: COMPACT-BEN-001');
      const compactIdx = card.indexOf('Compact:');
      const continueIdx = card.lastIndexOf('Continue this card.');
      expect(compactIdx).toBeGreaterThan(-1);
      expect(compactIdx).toBeLessThan(continueIdx);
      const forbiddenDest = writeCursorUsageReceipt(tmp, {
        usage: { method: 'chars÷4', fillBytes: 99 },
      });
      const forbidden = JSON.parse(readFileSync(forbiddenDest as string, 'utf8')) as {
        ok: boolean;
        usage: { forbidden: boolean };
      };
      expect(forbidden.ok).toBe(false);
      expect(forbidden.usage.forbidden).toBe(true);
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('Station Usage window cites host context_window_size when stdin sent it', () => {
    const tmp = mkdtempSync(path.join(tmpdir(), 'xray-cursor-window-'));
    try {
      plantFeatures(tmp);
      seedBenStation(tmp);
      writeFileSync(
        path.join(tmp, '.xray', 'state', 'cursor-hook-invoke.log'),
        'ts=2026-09-15T10:12:45+00:00 event=preCompact cwd=/tmp node=/exec-daemon/node\n',
      );
      writeCursorUsageReceipt(tmp, {
        usage: {
          source: 'precompact-stdin',
          method: 'host-field',
          context_tokens: 232105,
          context_usage_percent: 90.666015625,
          context_window_size: 256000,
          model: 'cursor-grok-4.6-high',
        },
      });
      const card = readFileSync(path.join(tmp, '.xray', 'state', 'STATION.md'), 'utf8');
      expect(card).toContain('Usage: source=precompact-stdin model=cursor-grok-4.6-high window=256000 tokens=232105');
      expect(card).toContain('Compact: preCompact Y (count=1) · usage host-field');
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });
});
