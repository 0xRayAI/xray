import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { lookCards } from '../../integrations/hooks/goggles-pipeline.mjs';
import { TOOLS, dispatchTool } from '../../integrations/hooks/goggles-mcp.mjs';

const LAUNCHER = fileURLToPath(new URL('../../../scripts/mjs/run-goggles-mcp.mjs', import.meta.url));
const NINE = ['ground', 'routing', 'house', 'boot', 'governance', 'memory-recall', 'orchestration', 'processor', 'reporting'];

function tempRoot(): string {
  return mkdtempSync(join(tmpdir(), 'goggles-mcp-'));
}

afterEach(() => {
  delete process.env.GOGGLES_PLANES_PATH;
  delete process.env.GOGGLES_ORGAN_PATH;
});

describe('goggles MCP', () => {
  it('lists only look and status_lens', () => {
    expect(TOOLS.map((tool) => tool.name)).toEqual(['look', 'status_lens']);
    const copy = TOOLS.map((tool) => tool.description).join('\n');
    expect(copy).toMatch(/LENS\.md/);
    expect(copy).toMatch(/Entry and Exit/);
    expect(copy).not.toMatch(/Kind 0|quiet \(match\)/);
    expect(copy).not.toMatch(/Dynamo|Clearing|Repertoire/);
    expect(copy).not.toMatch(/memory-recall/);
    for (const name of NINE) expect(copy).not.toContain(name);
    const lookTool = TOOLS[0] as { inputSchema?: { properties?: { plane?: { enum?: string[]; description?: string } } } };
    expect(lookTool.inputSchema?.properties?.plane?.enum).toBeUndefined();
    expect(lookTool.inputSchema?.properties?.plane?.description).toMatch(/card/);
  });

  it('an extra argument is refused', async () => {
    const { payload, isError } = await dispatchTool('look', { outer: 'dichotomy', plane: 'routing' }, tempRoot());
    expect(isError).toBe(true);
    expect(payload.error.reason).toBe('Unknown argument.');
  });

  it('a worn name is not a card plane', async () => {
    const { payload, isError } = await dispatchTool('look', { plane: 'dichotomy' }, tempRoot());
    expect(isError).toBe(true);
    expect(payload.error.reason).toBe('Name one plane.');
  });

  it('card skills show the path on the card', async () => {
    const { payload, isError } = await dispatchTool('look', { plane: 'domain' }, tempRoot());
    expect(isError).toBe(false);
    expect(payload.content.skills).toBe('lens-gate, stamp-plate, record-map, station-card, memory-recall');
  });

  it('card planes come from the organ list', async () => {
    const root = tempRoot();
    const { payload, isError } = await dispatchTool('look', { plane: 'dev' }, root);
    expect(isError).toBe(false);
    expect(payload.content.plane).toBe('dev');
    const thing = await dispatchTool('look', { plane: 'lens-gate' }, root);
    expect(thing.isError).toBe(false);
    expect(thing.payload.content.card).toBe('lens-gate');
    const missed = await dispatchTool('look', { plane: 'not-a-card' }, root);
    expect(missed.isError).toBe(true);
    expect(missed.payload.error.reason).toBe('Name one plane.');
    rmSync(root, { recursive: true, force: true });
  });

  it('synthesis names its plate', async () => {
    const { payload, isError } = await dispatchTool('look', { plane: 'synthesis' }, tempRoot());
    expect(isError).toBe(false);
    expect(payload.content.card).toBe('synthesis');
    expect(payload.content.plate).toBe('docs-site/docs/plates/synthesis.md');
    expect(payload.content.entry).toContain('a gate, a turn, or a finished todo');
    expect(payload.content.exit).toContain('due or not due');
    expect(payload.content.stamp).toBe('');
  });

  it('a card with no plate names the stamp skill', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'goggles-mcp-unplated-'));
    const table = JSON.parse(readFileSync(fileURLToPath(new URL('../../integrations/hooks/goggles-planes.json', import.meta.url)), 'utf8'));
    table.unplated = { file: 'src/core/config-paths.ts' };
    const planes = join(dir, 'planes.json');
    writeFileSync(planes, JSON.stringify(table));
    process.env.GOGGLES_PLANES_PATH = planes;
    try {
      const { payload, isError } = await dispatchTool('look', { plane: 'unplated' }, tempRoot());
      expect(isError).toBe(false);
      expect(payload.content.card).toBe('unplated');
      expect(payload.content.stamp).toContain('.agents/skills/stamp-plate/SKILL.md');
      expect(payload.content.stamp).toContain('one plate for this card');
      expect(existsSync(fileURLToPath(new URL('../../../docs-site/docs/plates/unplated.md', import.meta.url)))).toBe(false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('an empty look returns the current card', async () => {
    const { payload, isError } = await dispatchTool('look', {}, tempRoot());
    expect(isError).toBe(false);
    expect(payload.mode).toBe('card');
    expect(payload.content.plane).toBe('dev');
    expect(payload.content.entry).toContain('package.json');
    expect(payload.content.exit).toContain('this repo');
  });

  it('dev is the card for this checkout', async () => {
    const { payload, isError } = await dispatchTool('look', { plane: 'dev' }, tempRoot());
    expect(isError).toBe(false);
    expect(payload.mode).toBe('card');
    const card = payload.content;
    expect(card.plane).toBe('dev');
    expect(card.digest).toBe('This checkout.');
    expect(card.files).toEqual(['src', 'grok-bot', 'docs-site', 'AGENTS.md', 'package.json', 'README.md']);
    expect(card.entry).toBe('package.json, src, and grok-bot/OP-PROC.md.');
    expect(card.exit).toBe('A change that stays in this repo.');
    expect(card.setup).toBe('You are in this repo.');
    expect(card.teardown).toBe('Leave other repos alone.');
    expect(card.skills).toBe('orchestrator, researcher, project-analysis, git-workflow, tech-writer');
    expect(card.notes).toEqual([]);
    expect(JSON.stringify(card)).not.toContain('The reading is');
    expect(JSON.stringify(card)).not.toContain('n/a');
    expect(JSON.stringify(card)).not.toContain('Sleeve:');
  });

  it('integration returns the stored card', async () => {
    const organ = lookCards(['integration'])[0];
    const { payload } = await dispatchTool('look', { plane: 'integration' }, tempRoot());
    const card = payload.content;
    expect(card.entry).toBe(organ.entry);
    expect(card.entry).toBe('The hook, the dispatch, or the bridge this file sits on.');
    expect(card.exit).toBe('The next call. Stop there.');
    expect(card.notes.join('\n')).not.toContain('Empty:');
    expect(card.notes.join('\n')).not.toContain('Holds.');
  });

  it('a dev look keeps every file on the card', async () => {
    const { payload, isError } = await dispatchTool('look', { plane: 'dev' }, tempRoot());
    expect(isError).toBe(false);
    expect(payload.mode).toBe('card');
    expect(payload.content.files).toContain('src');
    expect(payload.content.files).toContain('README.md');
    expect(payload.content.setup).toBe('You are in this repo.');
  });

  it('a plate path is not a card plane', async () => {
    const { payload, isError } = await dispatchTool(
      'look',
      { plane: 'docs-site/docs/plates/routing.md' },
      tempRoot(),
    );
    expect(isError).toBe(true);
    expect(payload.error.code).toBe('invalid_args');
    expect(payload.mode).not.toBe('card');
  });

  it('a plane name returns that view', async () => {
    const root = tempRoot();
    const { payload, isError } = await dispatchTool('look', { plane: 'integration' }, root);
    expect(isError).toBe(false);
    expect(payload.mode).toBe('card');
    expect(payload.content.plane).toBe('integration');
    expect(payload.content.files).toContain('src/nucleus');
    expect(payload.content.files).toContain('src/integrations');
    const lens = readFileSync(join(root, '.xray', 'state', 'LENS.md'), 'utf8');
    expect(lens.startsWith('Plane: integration\n')).toBe(true);
    expect(lens).toContain('Entry: The hook, the dispatch, or the bridge this file sits on.');
    expect(lens).toContain('Exit: The next call. Stop there.');
    rmSync(root, { recursive: true, force: true });
  });

  it('an unknown argument is refused', async () => {
    const { payload, isError } = await dispatchTool('look', { outer: 'outer' }, tempRoot());
    expect(isError).toBe(true);
    expect(payload.error.reason).toBe('Unknown argument.');
  });

  it('status_lens says whether the organ is worn', async () => {
    const root = tempRoot();
    try {
      const missing = await dispatchTool('status_lens', {}, root);
      expect(missing.isError).toBe(false);
      expect(missing.payload.organ).toBe('worn');
      expect(missing.payload.stamps).toBeUndefined();
      expect(missing.payload.lensPath).toBe('.xray/state/LENS.md');
      expect(JSON.stringify(missing.payload)).not.toContain('nine');
      expect(JSON.stringify(missing.payload)).not.toContain('memory-recall');
      expect(JSON.stringify(missing.payload)).not.toContain('Kind 0');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('prefixed tool names still hit the same two tools', async () => {
    const { payload, isError } = await dispatchTool('goggles__look', { plane: 'integration' }, tempRoot());
    expect(isError).toBe(false);
    expect(payload.mode).toBe('card');
    expect(payload.content.plane).toBe('integration');
    const status = await dispatchTool('goggles__status_lens', { extra: true }, tempRoot());
    expect(status.isError).toBe(true);
    expect(status.payload.error.code).toBe('invalid_args');
  });

  it('the launcher speaks look and status_lens on stdio', async () => {
    const root = tempRoot();
    try {
      const listed = await stdioTools(LAUNCHER, root);
      expect(listed).toEqual(['look', 'status_lens']);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('a symlinked server still speaks', async () => {
    const root = tempRoot();
    const link = join(root, 'goggles-mcp.mjs');
    try {
      symlinkSync(fileURLToPath(new URL('../../integrations/hooks/goggles-mcp.mjs', import.meta.url)), link);
      const listed = await stdioTools(link, root);
      expect(listed).toEqual(['look', 'status_lens']);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

function stdioTools(script: string, cwd: string): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const proc = spawn(process.execPath, [script], {
      cwd,
      env: { ...process.env, GOGGLES_ROOT: cwd, GOGGLES_PLANES_PATH: '' },
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    let out = '';
    let err = '';
    let asked = false;
    let settled = false;
    let timer: ReturnType<typeof setTimeout>;
    const finish = (error: Error | null, names?: string[]) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (error) reject(error);
      else resolve(names ?? []);
    };
    timer = setTimeout(() => {
      proc.kill();
      finish(new Error(`stdio timeout: ${out.slice(0, 400)} ${err.slice(0, 200)}`));
    }, 8000);
    proc.stdout.on('data', (chunk) => {
      out += chunk.toString();
      const lines = out.split('\n').filter((line) => line.trim().startsWith('{'));
      if (!lines.some((line) => line.includes('serverInfo'))) return;
      if (!asked) {
        asked = true;
        proc.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' })}\n`);
        proc.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'tools/list' })}\n`);
      }
      if (!lines.some((line) => line.includes('"id":2') || line.includes('"id": 2'))) return;
      const listed = lines.find((line) => line.includes('status_lens'));
      if (!listed) return;
      try {
        const message = JSON.parse(listed);
        finish(null, message.result.tools.map((tool: { name: string }) => tool.name));
      } catch (error) {
        finish(error instanceof Error ? error : new Error(String(error)));
      }
      proc.kill();
    });
    proc.stderr.on('data', (chunk) => {
      err += chunk.toString();
    });
    proc.on('exit', (code) => {
      finish(new Error(`launcher exited ${code} before tools/list: ${err.slice(0, 300)} ${out.slice(0, 200)}`));
    });
    proc.stdin.write(`${JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'goggles-mcp-test', version: '0' },
      },
    })}\n`);
  });
}
