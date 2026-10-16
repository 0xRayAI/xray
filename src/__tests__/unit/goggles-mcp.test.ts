import { spawn } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, symlinkSync } from 'node:fs';
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
  });

  it('plane on an outer with no cards is refused', async () => {
    const { payload, isError } = await dispatchTool('look', { outer: 'dichotomy', plane: 'routing' }, tempRoot());
    expect(isError).toBe(true);
    expect(payload.error.reason).toBe('plane goes with digest or triage only.');
  });

  it('kind with outer is refused', async () => {
    const { payload, isError } = await dispatchTool('look', { kind: '1', outer: 'digest', plane: 'boot' }, tempRoot());
    expect(isError).toBe(true);
    expect(payload.error.reason).toBe('Send kind or outer, not both.');
  });

  it('any other kind is refused', async () => {
    const { payload, isError } = await dispatchTool('look', { kind: '2' }, tempRoot());
    expect(isError).toBe(true);
    expect(payload.error.reason).toBe('kind is 1.');
  });

  it('card skills show the full path', async () => {
    const { payload, isError } = await dispatchTool('look', { outer: 'digest', plane: 'routing' }, tempRoot());
    expect(isError).toBe(false);
    expect(payload.content.skills).toBe('.agents/skills/routing/SKILL.md');
  });

  it('card planes come from the organ list', async () => {
    const { payload, isError } = await dispatchTool('look', { outer: 'digest', plane: 'lens-gate' }, tempRoot());
    expect(isError).toBe(false);
    expect(payload.content.plane).toBe('lens-gate');
  });

  it('stamp-plate is a selectable card plane', async () => {
    const { payload, isError } = await dispatchTool('look', { outer: 'digest', plane: 'stamp-plate' }, tempRoot());
    expect(isError).toBe(false);
    expect(payload.mode).toBe('card');
    expect(payload.content.plane).toBe('stamp-plate');
    expect(payload.content.skills).toBe('.agents/skills/stamp-plate/SKILL.md');
  });

  it('dichotomy is a reading, not a card', async () => {
    const { payload, isError } = await dispatchTool('look', { outer: 'dichotomy' }, tempRoot());
    expect(isError).toBe(false);
    expect(payload.mode).toBe('reading');
    expect(payload.content).toBe('The reading is dichotomy.');
    expect(payload.content).not.toMatch(/Plane:|files/);
  });

  it('digest ground is the card with empties empty', async () => {
    const { payload, isError } = await dispatchTool('look', { outer: 'digest', plane: 'ground' }, tempRoot());
    expect(isError).toBe(false);
    expect(payload.mode).toBe('card');
    const card = payload.content;
    expect(card.plane).toBe('ground');
    expect(card.flavor).toBe('digest');
    expect(card.digest).toBe('Home. The dev plane.');
    expect(card.files).toContain('scripts/foundry');
    expect(card.entry).toBe('');
    expect(card.exit).toBe('');
    expect(card.setup).toBe('');
    expect(card.teardown).toBe('');
    expect(card.skills).toBe('SKILLS.md');
    expect(card.notes).toEqual([]);
    expect(JSON.stringify(card)).not.toContain('The reading is');
    expect(JSON.stringify(card)).not.toContain('n/a');
  });

  it('triage routing returns the stored card', async () => {
    const organ = lookCards(['triage', 'routing'])[0];
    const { payload } = await dispatchTool('look', { outer: 'triage', plane: 'routing' }, tempRoot());
    const card = payload.content;
    expect(card.entry).toBe(organ.entry);
    expect(card.entry).toBe('task text · context · thresholds');
    expect(card.notes.join('\n')).not.toContain('Empty:');
    expect(card.notes.join('\n')).not.toContain('Holds.');
  });

  it('one artifact on a multi-file plane keeps the view', async () => {
    const { payload, isError } = await dispatchTool(
      'look',
      { outer: 'digest', plane: 'ground', scope: 'one artifact' },
      tempRoot(),
    );
    expect(isError).toBe(false);
    expect(payload.mode).toBe('card');
    expect(payload.content.files).toContain('scripts/foundry');
    expect(payload.content.setup).toBe('');
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
    const { payload, isError } = await dispatchTool('look', { plane: 'routing' }, root);
    expect(isError).toBe(false);
    expect(payload.mode).toBe('card');
    expect(payload.content.plane).toBe('routing');
    expect(payload.content.files).toEqual(['src/nucleus/thin-dispatch.ts']);
    const lens = readFileSync(join(root, '.xray', 'state', 'LENS.md'), 'utf8');
    expect(lens.startsWith('Plane: routing\n')).toBe(true);
    expect(lens).toContain('Entry: task text · context · thresholds');
    expect(lens).toContain('Exit: agent · strategy · adjusted score · file');
    rmSync(root, { recursive: true, force: true });
  });

  it('the whole set is name one plane', async () => {
    const { payload, isError } = await dispatchTool('look', { outer: 'outer' }, tempRoot());
    expect(isError).toBe(true);
    expect(payload.error.code).toBe('name_one');
    expect(payload.error.reason).toBe('Name one plane.');
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
    const { payload, isError } = await dispatchTool('goggles__look', { outer: 'loop' }, tempRoot());
    expect(isError).toBe(false);
    expect(payload.content).toBe('The reading is loop.');
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
