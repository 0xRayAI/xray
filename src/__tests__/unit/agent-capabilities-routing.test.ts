import { describe, it, expect, beforeEach } from 'vitest';
import {
  getAgentCapabilitiesManager,
  resetAgentCapabilitiesManager,
} from '../../mcps/orchestrator/config/agent-capabilities.js';

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
});