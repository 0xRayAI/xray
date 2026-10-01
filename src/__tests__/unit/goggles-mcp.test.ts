import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
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
    expect(copy).toMatch(/quiet/i);
    expect(copy).toMatch(/match/i);
    expect(copy).toMatch(/six/);
    expect(copy).not.toMatch(/Dynamo|Clearing|Repertoire/);
    expect(copy).not.toMatch(/memory-recall/);
    for (const name of NINE) expect(copy).not.toContain(name);
  });

  it('kind 0 is quiet and not an error', async () => {
    const root = tempRoot();
    try {
      const { payload, isError } = await dispatchTool('look', { kind: '0' }, root);
      expect(isError).toBe(false);
      expect(payload).toMatchObject({ ok: true, quiet: true, mode: 'kind0', content: '' });
      expect(readFileSync(join(root, '.xray', 'state', 'LENS.md'), 'utf8')).toBe('quiet (match)\n');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
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

  it('triage routing keeps the hole notes and the organ entry', async () => {
    const organ = lookCards(['triage', 'routing'])[0];
    const { payload } = await dispatchTool('look', { outer: 'triage', plane: 'routing' }, tempRoot());
    const card = payload.content;
    expect(card.entry).toBe(organ.entry);
    expect(card.notes.join('\n')).toContain('Empty: skills, setup, teardown');
    expect(card.notes.join('\n')).toContain('Holds.');
    expect(card.notes.join('\n')).not.toContain('entry');
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
    const { payload, isError } = await dispatchTool('look', { plane: 'routing' }, tempRoot());
    expect(isError).toBe(false);
    expect(payload.mode).toBe('card');
    expect(payload.content.plane).toBe('routing');
    expect(payload.content.files).toEqual(['src/nucleus/thin-dispatch.ts']);
  });

  it('the whole set is name one plane', async () => {
    const { payload, isError } = await dispatchTool('look', { outer: 'outer' }, tempRoot());
    expect(isError).toBe(true);
    expect(payload.error.code).toBe('name_one');
    expect(payload.error.reason).toBe('Name one plane.');
  });

  it('kind 0 with a scope stays quiet', async () => {
    const root = tempRoot();
    try {
      const { payload, isError } = await dispatchTool('look', { kind: '0', scope: 'part' }, root);
      expect(isError).toBe(false);
      expect(payload).toMatchObject({ ok: true, quiet: true, mode: 'kind0', content: '' });
      expect(existsSync(join(root, '.xray', 'state', 'LENS.md'))).toBe(false);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('status_lens says worn, and quiet is not drift', async () => {
    const root = tempRoot();
    try {
      const missing = await dispatchTool('status_lens', {}, root);
      expect(missing.isError).toBe(false);
      expect(missing.payload.organ).toBe('worn');
      expect(missing.payload.kind0).toBe('none');
      expect(missing.payload.kind0Text).toBe('');
      expect(missing.payload.stamps).toBeUndefined();
      expect(missing.payload.lensPath).toBe('.xray/state/LENS.md');
      expect(JSON.stringify(missing.payload)).not.toContain('nine');
      expect(JSON.stringify(missing.payload)).not.toContain('memory-recall');

      mkdirSync(join(root, '.xray', 'state'), { recursive: true });
      writeFileSync(join(root, '.xray', 'state', 'LENS.md'), 'quiet (match)\n');
      const quiet = await dispatchTool('status_lens', {}, root);
      expect(quiet.payload.kind0).toBe('quiet');
      expect(quiet.payload.kind0Text).toBe('');

      writeFileSync(join(root, '.xray', 'state', 'LENS.md'), 'Actuality. Drift: worn is not the map.\n');
      const drift = await dispatchTool('status_lens', {}, root);
      expect(drift.payload.kind0).toBe('drift');
      expect(drift.payload.organ).toBe('worn');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('a tampered map is drift of the six, and a missing organ is not that drift', async () => {
    const root = tempRoot();
    const planes = join(root, 'planes.json');
    try {
      writeFileSync(planes, `${JSON.stringify({ planes: ['ground'] })}\n`);
      process.env.GOGGLES_PLANES_PATH = planes;
      const drifted = await dispatchTool('status_lens', {}, root);
      expect(drifted.payload.organ).toBe('worn');
      expect(drifted.payload.kind0).toBe('drift');
      expect(drifted.payload.kind0Text).toBe('Actuality. Drift: worn is not the map.');
      expect(drifted.payload.kind0Text).not.toContain('ground');
      expect(drifted.payload.kind0Text).not.toContain('nine');

      delete process.env.GOGGLES_PLANES_PATH;
      process.env.GOGGLES_ORGAN_PATH = join(root, 'missing.mjs');
      const gone = await dispatchTool('status_lens', {}, root);
      expect(gone.payload.organ).toBe('not_found');
      expect(gone.payload.kind0).toBe('none');
      expect(gone.payload.kind0Text).not.toContain('Drift');
    } finally {
      delete process.env.GOGGLES_PLANES_PATH;
      delete process.env.GOGGLES_ORGAN_PATH;
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
});

function stdioTools(script: string, cwd: string): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const proc = spawn(process.execPath, [script], {
      cwd,
      env: { ...process.env, GOGGLES_ROOT: cwd, GOGGLES_PLANES_PATH: '' },
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    let out = '';
    let asked = false;
    const timer = setTimeout(() => {
      proc.kill();
      reject(new Error(`stdio timeout: ${out.slice(0, 400)}`));
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
      clearTimeout(timer);
      proc.kill();
      try {
        const message = JSON.parse(listed);
        resolve(message.result.tools.map((tool: { name: string }) => tool.name));
      } catch (err) {
        reject(err);
      }
    });
    proc.on('exit', () => {
      clearTimeout(timer);
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
