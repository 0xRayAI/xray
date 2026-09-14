import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { classifyPreCompactEvent } from '../../integrations/cursor/hooks/cursor-hook-utils.js';

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
    for (const hooks of [template.hooks, repo.hooks]) {
      expect(hooks.sessionStart).toBeUndefined();
      expect(hooks.preToolUse?.[0]?.command).toContain('pre-tool-use.js');
      expect(hooks.preCompact?.[0]?.command).toContain('pre-compact.js');
      expect(hooks.afterFileEdit?.[0]?.command).toContain('after-file-edit.js');
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
});
