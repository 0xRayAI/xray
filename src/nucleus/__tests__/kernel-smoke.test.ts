import { describe, it, expect, vi } from 'vitest';
import { handleGovernRequest, governSingle, getGovernanceService, NUCLEUS_VERSION } from '../index.js';

vi.mock('../../core/framework-logger.js', () => ({
  frameworkLogger: { log: vi.fn().mockResolvedValue(undefined) },
}));

vi.mock('../../governance/governance-service.js', () => ({
  getGovernanceService: vi.fn(),
}));

describe('nucleus barrel export (smoke)', () => {
  it('exports handleGovernRequest as a function', () => {
    expect(typeof handleGovernRequest).toBe('function');
  });

  it('exports governSingle as a function', () => {
    expect(typeof governSingle).toBe('function');
  });

  it('exports getGovernanceService as a function', () => {
    expect(typeof getGovernanceService).toBe('function');
  });

  it('exports NUCLEUS_VERSION as a string', () => {
    expect(typeof NUCLEUS_VERSION).toBe('string');
    expect(NUCLEUS_VERSION.length).toBeGreaterThan(0);
  });
});