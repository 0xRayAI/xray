import { mkdirSync, mkdtempSync, readFileSync, rmSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { readSuitPulse } from '../../cli/suit-pulse.js';

const NOW = 1_800_000_012_000;

function writeJson(file: string, value: unknown): void {
  mkdirSync(join(file, '..'), { recursive: true });
  writeFileSync(file, `${JSON.stringify(value)}\n`);
}

describe('suit pulse', () => {
  it('prints the WORN line from a temp fixture', () => {
    const root = mkdtempSync(join(tmpdir(), 'xray-pulse-worn-'));
    try {
      writeJson(join(root, 'node_modules', '0xray', 'package.json'), {
        name: '0xray',
        version: '4.0.36',
      });
      writeJson(join(root, 'node_modules', '@0xray', 'repertoire', 'package.json'), {
        name: '@0xray/repertoire',
        version: '0.2.8',
      });
      const reader = join(root, 'node_modules', '@0xray', 'repertoire', 'dist', 'index.js');
      mkdirSync(join(reader, '..'), { recursive: true });
      writeFileSync(
        reader,
        [
          "import { writeFileSync } from 'node:fs';",
          "import { dirname, join } from 'node:path';",
          'export class InferenceStateManager {',
          '  constructor(filePath = "") { this.filePath = filePath; }',
          '  load() {',
          "    writeFileSync(join(dirname(this.filePath), 'reader-called'), this.filePath);",
          '    return { processedCommentIds: [], processedSessionIds: [], processedPostIds: [], lastRun: null };',
          '  }',
          '}',
          '',
        ].join('\n'),
      );
      const inference = join(root, '.xray', 'state', 'repertoire', 'inference-state.json');
      const inferenceBody = `${JSON.stringify({
        processedCommentIds: [],
        processedSessionIds: [],
        processedPostIds: [],
        lastRun: null,
      })}\n`;
      writeJson(join(root, '.xray', 'state', 'repertoire', 'inference-state.json'), {
        processedCommentIds: [],
        processedSessionIds: [],
        processedPostIds: [],
        lastRun: null,
      });
      utimesSync(inference, (NOW - 12_000) / 1000, (NOW - 12_000) / 1000);
      writeJson(join(root, '.xray', 'state', 'goggles-lens-pass.json'), {
        read: true,
        spent: false,
      });
      const log = join(root, 'logs', 'framework', 'activity.log');
      mkdirSync(join(root, 'logs', 'framework'), { recursive: true });
      writeFileSync(
        log,
        '2026-10-02T13:41:30.305Z [hook-1] [grok-pre-tool-use] allow - INFO | {"tool":"grep","gate":null,"livePath":true}\n',
      );

      const pulse = readSuitPulse(root, { now: NOW });

      expect(readFileSync(inference, 'utf8')).toBe(inferenceBody);
      expect(readFileSync(join(inference, '..', 'reader-called'), 'utf8')).toBe(inference);
      expect(pulse.line).toBe(
        'WORN 4.0.36 repertoire 0.2.8 inference 12s activity allow:grep lens armed plant yes',
      );
      expect(pulse.worn).toEqual({
        version: '4.0.36',
        directory: join(root, 'node_modules', '0xray'),
      });
      expect(pulse.activity).toEqual({ gate: null, decision: 'allow', tool: 'grep' });
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('prints the BARE line when the suit is missing', () => {
    const root = mkdtempSync(join(tmpdir(), 'xray-pulse-bare-'));
    try {
      const pulse = readSuitPulse(root, { now: NOW });
      expect(pulse.line).toBe(
        'BARE repertoire missing inference none activity none lens none plant no',
      );
      expect(pulse.worn).toBeNull();
      expect(pulse.repertoire).toBeNull();
      expect(pulse.inferenceSeconds).toBeNull();
      expect(pulse.activity).toBeNull();
      expect(pulse.lens).toBe('none');
      expect(pulse.plant).toBe(false);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('reads the worn CLI from the hook file, not the plant package', () => {
    const root = mkdtempSync(join(tmpdir(), 'xray-pulse-hook-'));
    const worn = mkdtempSync(join(tmpdir(), 'xray-pulse-cli-'));
    try {
      writeJson(join(worn, 'package.json'), { name: '0xray', version: '9.9.9' });
      writeJson(join(root, '.grok', 'plugins', '0xray', 'hooks', 'hooks.json'), {
        hooks: {
          PreToolUse: [
            {
              hooks: [
                {
                  type: 'command',
                  command: 'node',
                  args: [join(worn, 'dist', 'cli', 'index.js')],
                  env: { XRAY_AI_PATH: worn },
                },
              ],
            },
          ],
        },
      });
      const pulse = readSuitPulse(root, { now: NOW });
      expect(pulse.line).toBe(
        'WORN 9.9.9 repertoire missing inference none activity none lens none plant no',
      );
      expect(pulse.plant).toBe(false);
    } finally {
      rmSync(root, { recursive: true, force: true });
      rmSync(worn, { recursive: true, force: true });
    }
  });
});
