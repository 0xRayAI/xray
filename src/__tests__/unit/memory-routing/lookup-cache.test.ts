import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadMemoryRoutingProvider } from '../../../memory-routing/index.js';
import {
  organFileCacheStats,
  resetOrganFileCacheStats,
} from '../../../memory-routing/lookup-cache.js';
import type { MemoryAgentCapability } from '../../../memory-routing/types.js';

vi.mock('../../../core/framework-logger.js', () => ({
  frameworkLogger: { log: vi.fn().mockResolvedValue(undefined) },
}));

const MODULE_PATH = resolve(
  process.cwd(),
  'vendor/@0xray/repertoire/dist/provider/memory-routing-provider.js',
);

function signalFile(confidence: number): string {
  return JSON.stringify({
    schema_version: '1',
    signals: [
      {
        name: 'seam-lookup-marker',
        definition: 'A lookup marker used only by the seam cache test.',
        tags: ['ontological-trap'],
        priority: 'high',
        status: 'validated',
        evaluation_criteria: 'The task names seam-lookup-marker.',
        note: confidence >= 0.55 ? 'above-gate' : 'dropped-below-gate',
        observation_stats: {
          observation_count: 4,
          avg_confidence: confidence,
          max_confidence: 1,
          last_seen: '2026-10-02T12:00:00.000Z',
          evidence_count: 4,
        },
      },
    ],
  });
}

describe('organ file cache', () => {
  let tempDir = '';

  afterEach(() => {
    if (tempDir) rmSync(tempDir, { recursive: true, force: true });
    tempDir = '';
  });

  it('repeats the same confidence and agent, then sees a changed file', async () => {
    tempDir = mkdtempSync(join(tmpdir(), 'xray-lookup-cache-'));
    const signalsFile = join(tempDir, 'curated_signals.json');
    const stateFile = join(tempDir, 'inference-state.json');
    writeFileSync(signalsFile, signalFile(0.9));
    writeFileSync(stateFile, JSON.stringify({
      processedCommentIds: [],
      processedSessionIds: ['seam-session'],
      processedPostIds: [],
      lastRun: null,
    }));

    const provider = await loadMemoryRoutingProvider({
      enabled: true,
      provider: 'repertoire',
      module_path: MODULE_PATH,
      config: {
        projectRoot: tempDir,
        signalsPath: signalsFile,
        statePath: stateFile,
        dataDir: tempDir,
        logDir: join(tempDir, 'logs'),
        feedbackDir: join(tempDir, 'feedback'),
      },
    }, tempDir);

    expect(provider.id).toBe('repertoire');
    const task = {
      id: 'seam-task',
      description: 'route seam-lookup-marker',
      type: 'routing' as const,
    };
    const caps = new Map<string, MemoryAgentCapability>([
      ['code-reviewer', { capabilities: ['routing'], complexityThreshold: 100, concurrentTasks: 1 }],
      ['architect', { capabilities: ['routing'], complexityThreshold: 100, concurrentTasks: 1 }],
    ]);
    const readSessions = (): string[] => {
      const manager = (provider as {
        service?: { stateManager?: { load?: () => { processedSessionIds?: string[] } } };
      }).service?.stateManager;
      return manager?.load?.().processedSessionIds ?? [];
    };

    resetOrganFileCacheStats();
    const first = provider.getTaskConfidence?.(task);
    const firstAgent = provider.selectAgent(caps, ['routing'], 10, task.description);
    expect(first?.matchedSignals).toContain('seam-lookup-marker');
    expect(first?.recommendedAgent).toBe('architect');
    expect(firstAgent).toBe('architect');
    const warmed = organFileCacheStats();
    expect(warmed.hits).toBeGreaterThan(0);

    const second = provider.getTaskConfidence?.(task);
    const secondAgent = provider.selectAgent(caps, ['routing'], 10, task.description);
    expect(second).toEqual(first);
    expect(secondAgent).toBe(firstAgent);
    const repeated = organFileCacheStats();
    expect(repeated.misses).toBe(warmed.misses);
    expect(repeated.hits).toBeGreaterThan(warmed.hits);

    expect(readSessions()).toEqual(['seam-session']);
    writeFileSync(stateFile, JSON.stringify({
      processedCommentIds: [],
      processedSessionIds: ['seam-session-next'],
      processedPostIds: [],
      lastRun: '2026-10-02T12:01:00.000Z',
    }));
    expect(readSessions()).toEqual(['seam-session-next']);
    expect(provider.getTaskConfidence?.(task)).toEqual(first);
    expect(provider.selectAgent(caps, ['routing'], 10, task.description)).toBe(firstAgent);

    writeFileSync(signalsFile, signalFile(0.2));
    const third = provider.getTaskConfidence?.(task);
    const thirdAgent = provider.selectAgent(caps, ['routing'], 10, task.description);
    expect(third?.matchedSignals).not.toContain('seam-lookup-marker');
    expect(third?.recommendedAgent).toBeNull();
    expect(thirdAgent).toBe('code-reviewer');
    expect(organFileCacheStats().misses).toBeGreaterThan(repeated.misses);
  });
});
