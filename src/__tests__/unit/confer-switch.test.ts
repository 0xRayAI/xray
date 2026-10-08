import { describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const script = path.join(repoRoot, 'scripts/node/confer-switch.cjs');

function run(cwd: string, state: string) {
  return spawnSync(process.execPath, [script, state], { cwd, encoding: 'utf8' });
}

function writeFeatures(dir: string, data: unknown): string {
  const features = path.join(dir, '.xray', 'features.json');
  mkdirSync(path.dirname(features), { recursive: true });
  writeFileSync(features, `${JSON.stringify(data, null, 2)}\n`);
  return features;
}

describe('confer switch', () => {
  it('refuses to invent features.json', () => {
    const project = mkdtempSync(path.join(tmpdir(), 'xray-confer-missing-'));
    try {
      const ran = run(project, 'on');
      expect(ran.status).toBe(1);
      expect(ran.stderr).toBe('confer: .xray/features.json is missing. Run npx 0xray wear first.\n');
      expect(existsSync(path.join(project, '.xray', 'features.json'))).toBe(false);
    } finally {
      rmSync(project, { recursive: true, force: true });
    }
  });

  it('turns confer on without turning synthesis on', () => {
    const project = mkdtempSync(path.join(tmpdir(), 'xray-confer-on-'));
    try {
      writeFeatures(project, {
        marker: 'stay',
        synthesis: { enabled: false, every_n_gates: 12, every_n_turns: 0, every_n_todos_completed: 0 },
        multi_agent_orchestration: { lead_dev_mode: true, phased_plan_threshold: 25 },
      });
      const ran = run(project, 'on');
      expect(ran.status).toBe(0);
      expect(ran.stdout).toBe('confer: on\n');
      const data = JSON.parse(readFileSync(path.join(project, '.xray', 'features.json'), 'utf8'));
      expect(data.marker).toBe('stay');
      expect(data.synthesis.enabled).toBe(false);
      expect(data.multi_agent_orchestration.lead_dev_mode).toBe(true);
      expect(data.multi_agent_orchestration.confer).toEqual({ enabled: true, on_synthesis: true });
      expect(data.multi_agent_orchestration.confer_on_synthesis).toBeUndefined();
    } finally {
      rmSync(project, { recursive: true, force: true });
    }
  });

  it('keeps an explicit on_synthesis false', () => {
    const project = mkdtempSync(path.join(tmpdir(), 'xray-confer-nested-'));
    try {
      writeFeatures(project, {
        multi_agent_orchestration: { confer: { enabled: false, on_synthesis: false } },
      });
      const ran = run(project, 'on');
      expect(ran.status).toBe(0);
      const data = JSON.parse(readFileSync(path.join(project, '.xray', 'features.json'), 'utf8'));
      expect(data.multi_agent_orchestration.confer).toEqual({ enabled: true, on_synthesis: false });
    } finally {
      rmSync(project, { recursive: true, force: true });
    }
  });

  it('turns confer off including the flat opt-in', () => {
    const project = mkdtempSync(path.join(tmpdir(), 'xray-confer-off-'));
    try {
      writeFeatures(project, {
        synthesis: { enabled: false },
        multi_agent_orchestration: {
          confer: { enabled: true, on_synthesis: true },
          confer_on_synthesis: true,
        },
      });
      const ran = run(project, 'off');
      expect(ran.status).toBe(0);
      expect(ran.stdout).toBe('confer: off\n');
      const data = JSON.parse(readFileSync(path.join(project, '.xray', 'features.json'), 'utf8'));
      expect(data.synthesis.enabled).toBe(false);
      expect(data.multi_agent_orchestration.confer).toEqual({ enabled: false, on_synthesis: false });
      expect(data.multi_agent_orchestration.confer_on_synthesis).toBe(false);
    } finally {
      rmSync(project, { recursive: true, force: true });
    }
  });

  it('rejects any other word', () => {
    const project = mkdtempSync(path.join(tmpdir(), 'xray-confer-word-'));
    try {
      writeFeatures(project, { multi_agent_orchestration: {} });
      const ran = run(project, 'maybe');
      expect(ran.status).toBe(1);
      expect(ran.stderr).toBe('confer: say on or off\n');
    } finally {
      rmSync(project, { recursive: true, force: true });
    }
  });
});
