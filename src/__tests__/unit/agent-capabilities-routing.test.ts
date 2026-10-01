import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getAgentCapabilitiesManager,
  resetAgentCapabilitiesManager,
} from '../../mcps/orchestrator/config/agent-capabilities.js';
import { scoreAndRoute } from '../../nucleus/thin-dispatch.js';

describe('AgentCapabilitiesManager routeSubagent SSOT', () => {
  beforeEach(() => {
    resetAgentCapabilitiesManager();
  });

  it('selectAgentForTask returns backend-engineer for implement before capability scoring', () => {
    const mgr = getAgentCapabilitiesManager();
    const agent = mgr.selectAgentForTask(['implement'], 50, 'build api', 'implement');
    expect(agent).toBe('backend-engineer');
  });

  it('selectAgentForTask returns researcher for research type', () => {
    const mgr = getAgentCapabilitiesManager();
    const agent = mgr.selectAgentForTask(['research'], 20, 'explore codebase', 'research');
    expect(agent).toBe('researcher');
  });

  it('selectAgentForTask follows the file when a plane is named', () => {
    const mgr = getAgentCapabilitiesManager();
    const routed = scoreAndRoute('open the boot plane', {});
    const agent = mgr.selectAgentForTask(['research'], 20, 'open the boot plane', 'research');
    expect(routed.file).toBe('src/core/boot-orchestrator.ts');
    expect(agent).toBe(routed.agent);
    expect(agent).not.toBe('researcher');
  });

  it('selectAgentForTask picks no agent when a look names no plane', () => {
    const mgr = getAgentCapabilitiesManager();
    expect(mgr.selectAgentForTask(['research'], 20, 'look', 'research')).toBeNull();
  });

  it('selectAgentForTask keeps the old route when two planes are named', () => {
    const mgr = getAgentCapabilitiesManager();
    const routed = scoreAndRoute('routing and governance', {});
    const agent = mgr.selectAgentForTask(['research'], 20, 'routing and governance', 'research');
    expect(routed.file).toBeUndefined();
    expect(routed.lens).toBeUndefined();
    expect(agent).toBe(routed.memoryRouting?.overridden ? routed.agent : 'researcher');
  });

  it('selectAgentForTask keeps the type route when a trap match does not change the agent', () => {
    const organ = resolve(process.cwd(), 'node_modules/@0xray/repertoire/dist/provider/memory-routing-provider.js');
    if (!existsSync(organ)) return;
    const mgr = getAgentCapabilitiesManager();
    const agent = mgr.selectAgentForTask(['implement'], 50, 'attestation-as-map', 'implement');
    expect(agent).toBe('backend-engineer');
  });

  it('selectAgentForTask follows the organ when a trap crosses the architect line', () => {
    const organ = resolve(process.cwd(), 'node_modules/@0xray/repertoire/dist/provider/memory-routing-provider.js');
    if (!existsSync(organ)) return;
    const mgr = getAgentCapabilitiesManager();
    const agent = mgr.selectAgentForTask(['implement'], 50, 'debug attestation-as-map', 'implement');
    expect(agent).toBe('architect');
  });

  it('selectAgentForTask returns the organ agent only when the route changes', async () => {
    const routing = await import('../../memory-routing/index.js');
    const override = vi.spyOn(routing, 'ensureMemoryRoutingProviderSync').mockReturnValue({
      id: 'test-override',
      resolveThinDispatch: () => ({
        agent: 'architect',
        adjustedScore: 30,
        context: {
          providerId: 'test-override',
          matchedSignals: ['attestation-as-map'],
          matchedTags: ['ontological-trap'],
          flags: {},
          synthesisAvailable: false,
        },
      }),
    } as unknown as ReturnType<typeof routing.ensureMemoryRoutingProviderSync>);
    try {
      resetAgentCapabilitiesManager();
      const mgr = getAgentCapabilitiesManager();
      expect(mgr.selectAgentForTask(['implement'], 50, 'build api', 'implement')).toBe('architect');
    } finally {
      override.mockRestore();
      resetAgentCapabilitiesManager();
    }

    const same = vi.spyOn(routing, 'ensureMemoryRoutingProviderSync').mockReturnValue({
      id: 'test-same',
      resolveThinDispatch: (agent: string) => ({
        agent,
        adjustedScore: 10,
        context: {
          providerId: 'test-same',
          matchedSignals: ['attestation-as-map'],
          matchedTags: [],
          flags: {},
          synthesisAvailable: false,
        },
      }),
    } as unknown as ReturnType<typeof routing.ensureMemoryRoutingProviderSync>);
    try {
      resetAgentCapabilitiesManager();
      const mgr = getAgentCapabilitiesManager();
      expect(mgr.selectAgentForTask(['implement'], 50, 'build api', 'implement')).toBe('backend-engineer');
    } finally {
      same.mockRestore();
      resetAgentCapabilitiesManager();
    }
  });
});