import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  buildSessionBootPayload,
  resolveSiblingWorkspaceRoots,
} from '../../integrations/grok/hooks/grok-hook-utils.js';

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
  });
});