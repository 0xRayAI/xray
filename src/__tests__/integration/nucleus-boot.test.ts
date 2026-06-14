/**
 * Integration test: full NucleusOrchestrator boot against the real project tree.
 * Runs in the project root where src/agents, src/mcps, package.json exist.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../core/framework-logger.js', () => ({
  frameworkLogger: { log: vi.fn().mockResolvedValue(undefined) },
}));

describe('NucleusOrchestrator — full boot integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should executeSequentialBoot with all 12 components succeeding', async () => {
    const { NucleusOrchestrator } = await import('../../nucleus/orchestrator.js');
    const orch = new NucleusOrchestrator();

    const result = await orch.executeBootSequence({ parallelInit: false });
    expect(result.success).toBe(true);
    expect(result.initializedComponents).toHaveLength(12);
    expect(result.failedComponents).toHaveLength(0);
    expect(result.errors).toHaveLength(0);
  });

  it('should executeParallelBoot with all 12 components succeeding', async () => {
    const { NucleusOrchestrator } = await import('../../nucleus/orchestrator.js');
    const orch = new NucleusOrchestrator();

    const result = await orch.executeBootSequence({ parallelInit: true });
    expect(result.success).toBe(true);
    expect(result.initializedComponents).toHaveLength(12);
    expect(result.failedComponents).toHaveLength(0);
  });

  it('should record plugin-registration with 26 plugins', async () => {
    const { NucleusOrchestrator } = await import('../../nucleus/orchestrator.js');
    const orch = new NucleusOrchestrator();
    await orch.executeBootSequence({ parallelInit: false });

    const pluginResult = orch.getComponentResult('plugin-registration');
    expect(pluginResult).toBeDefined();
    expect(pluginResult!.success).toBe(true);
    expect(pluginResult!.message).toMatch(/26 registered/);
  });

  it('should set initialized=true after successful boot', async () => {
    const { NucleusOrchestrator } = await import('../../nucleus/orchestrator.js');
    const orch = new NucleusOrchestrator();

    expect(orch.isInitialized()).toBe(false);
    await orch.executeBootSequence({ parallelInit: false });
    expect(orch.isInitialized()).toBe(true);
  });

  it('getOverallBootStatus should reflect full init after boot', async () => {
    const { NucleusOrchestrator } = await import('../../nucleus/orchestrator.js');
    const orch = new NucleusOrchestrator();
    await orch.executeBootSequence({ parallelInit: false });

    const status = orch.getOverallBootStatus();
    expect(status.initialized).toBe(true);
    expect(status.initializedComponents).toBe(12);
    expect(status.healthyComponents).toBe(12);
    expect(status.totalComponents).toBe(12);
  });

  it('getComponentStatus should return healthy for all components after boot', async () => {
    const { NucleusOrchestrator } = await import('../../nucleus/orchestrator.js');
    const orch = new NucleusOrchestrator();
    await orch.executeBootSequence({ parallelInit: false });

    for (const component of orch.bootSequence) {
      const status = await orch.getComponentStatus(component);
      expect(status.initialized).toBe(true);
      expect(status.healthy).toBe(true);
    }
  });

  it('shutdown should succeed after boot', async () => {
    const { NucleusOrchestrator } = await import('../../nucleus/orchestrator.js');
    const orch = new NucleusOrchestrator();
    await orch.executeBootSequence({ parallelInit: false });

    const shutdownResult = await orch.shutdown(false, false);
    expect(shutdownResult.success).toBe(true);
    expect(shutdownResult.shutDown).toBe(12);
    expect(shutdownResult.stateSaved).toBe(false);
  });


});
