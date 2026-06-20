import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
  runGrokPostprocessorLight,
  recordRoutingOutcome,
} from '../../integrations/hooks/pipeline-hook-runtime.mjs';

describe('pipeline-hook-runtime', () => {
  let tmp: string;

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'xray-pipeline-hook-'));
    fs.mkdirSync(path.join(tmp, '.xray'), { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it('runGrokPostprocessorLight returns null when flag is off', () => {
    writeFeatures(tmp, { grok_postprocessor_light: false });
    expect(runGrokPostprocessorLight(tmp, { tool: 'Write', paths: ['a.ts'] })).toBeNull();
  });

  it('runGrokPostprocessorLight writes marker when flag is on', () => {
    writeFeatures(tmp, { grok_postprocessor_light: true });
    const marker = runGrokPostprocessorLight(tmp, { tool: 'Write', paths: ['src/a.ts'] });
    expect(marker).toBeTruthy();
    const payload = JSON.parse(
      fs.readFileSync(path.join(tmp, '.xray', 'inference', 'postprocessor-light-latest.json'), 'utf8'),
    );
    expect(payload.tool).toBe('Write');
    expect(payload.mode).toBe('grok-pre-tool-light');
  });

  it('recordRoutingOutcome appends routing-outcomes.json', () => {
    const count = recordRoutingOutcome(tmp, { tool: 'Task', agent: 'researcher', sessionId: 's1' });
    expect(count).toBe(1);
    const arr = JSON.parse(
      fs.readFileSync(path.join(tmp, 'logs', 'framework', 'routing-outcomes.json'), 'utf8'),
    );
    expect(arr[0].agent).toBe('researcher');
  });
});

function writeFeatures(root: string, extra: Record<string, unknown>): void {
  fs.writeFileSync(path.join(root, '.xray', 'features.json'), JSON.stringify(extra));
}