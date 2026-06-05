import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mockReadFile = vi.hoisted(() => vi.fn());
const mockExistsSync = vi.hoisted(() => vi.fn());
const mockResolveCodexPath = vi.hoisted(() => vi.fn());
const mockLogger = vi.hoisted(() => ({ log: vi.fn() }));

vi.mock('../../core/framework-logger.js', () => ({
  frameworkLogger: mockLogger,
}));

vi.mock('../../core/config-paths.js', () => ({
  resolveCodexPath: mockResolveCodexPath,
}));

vi.mock('fs', () => ({
  existsSync: mockExistsSync,
}));

vi.mock('fs/promises', () => ({
  default: { readFile: mockReadFile },
  readFile: mockReadFile,
}));

import { CodexPolicyService, getCodexPolicyService } from '../../governance/codex-policy.service.js';

const SAMPLE_CODEX = {
  version: '1.2.20',
  lastUpdated: '2026-01-06',
  errorPreventionTarget: 0.996,
  terms: {
    '1': { number: 1, title: 'Progressive Prod-Ready Code', description: 'desc', category: 'core', zeroTolerance: false, enforcementLevel: 'high' },
    '2': { number: 2, title: 'No Patches/Boiler/Stubs', description: 'desc', category: 'core', zeroTolerance: false, enforcementLevel: 'high' },
    '7': { number: 7, title: 'Resolve All Errors', description: 'desc', category: 'core', zeroTolerance: true, enforcementLevel: 'blocking' },
  },
};

describe('CodexPolicyService', () => {
  let service: CodexPolicyService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockResolveCodexPath.mockReturnValue(['/fake/codex.json']);
    mockExistsSync.mockReturnValue(true);
    mockReadFile.mockResolvedValue(JSON.stringify(SAMPLE_CODEX));
    service = new CodexPolicyService();
  });

  afterEach(() => { vi.restoreAllMocks(); });

  describe('getTermCount()', () => {
    it('returns correct term count from loaded codex', async () => {
      const count = await service.getTermCount();
      expect(count).toBe(3);
    });

    it('returns 60 fallback when codex has empty terms', async () => {
      mockReadFile.mockResolvedValue(JSON.stringify({ version: '1', terms: {} }));
      const count = await service.getTermCount();
      expect(count).toBe(60);
    });

    it('returns 60 fallback when codex file is missing', async () => {
      mockExistsSync.mockReturnValue(false);
      const count = await service.getTermCount();
      expect(count).toBe(60);
    });

    it('returns 60 fallback when readFile throws', async () => {
      mockReadFile.mockRejectedValue(new Error('ENOENT'));
      const count = await service.getTermCount();
      expect(count).toBe(60);
    });

    it('handles terms as array format', async () => {
      mockReadFile.mockResolvedValue(JSON.stringify({
        version: '1',
        terms: [{ number: 1, title: 'T1' }, { number: 2, title: 'T2' }],
      }));
      const count = await service.getTermCount();
      expect(count).toBe(2);
    });

    it('handles codex_terms as array format', async () => {
      mockReadFile.mockResolvedValue(JSON.stringify({
        version: '1',
        codex_terms: [{ number: 1, title: 'T1' }],
      }));
      const count = await service.getTermCount();
      expect(count).toBe(1);
    });
  });

  describe('getCurrentCodex()', () => {
    it('returns snapshot with correct fields', async () => {
      const snapshot = await service.getCurrentCodex();
      expect(snapshot.source).toBe('/fake/codex.json');
      expect(snapshot.term_count).toBe(3);
      expect(snapshot.governance_ssot).toBe(true);
      expect(snapshot.is_fallback).toBe(false);
      expect(snapshot.dynamo_required).toBe(true);
      expect(snapshot.version).toBe('1.2.20');
      expect(snapshot.last_updated).toBe('2026-01-06');
    });

    it('includes raw codex when includeRaw is true', async () => {
      const snapshot = await service.getCurrentCodex(true);
      expect(snapshot.codex).toBeDefined();
      expect(snapshot.codex.version).toBe('1.2.20');
    });

    it('marks as fallback when file does not exist', async () => {
      mockExistsSync.mockReturnValue(false);
      const snapshot = await service.getCurrentCodex();
      expect(snapshot.is_fallback).toBe(true);
      expect(snapshot.governance_ssot).toBe(false);
      expect(snapshot.note).toContain('builtin fallback');
    });

    it('marks as fallback when readFile fails', async () => {
      mockReadFile.mockRejectedValue(new Error('parse error'));
      const snapshot = await service.getCurrentCodex();
      expect(snapshot.is_fallback).toBe(true);
    });
  });

  describe('file loading and resolution', () => {
    it('uses first existing path from resolveCodexPath', async () => {
      mockResolveCodexPath.mockReturnValue(['/missing.json', '/exists.json', '/also-exists.json']);
      mockExistsSync.mockImplementation((p: string) => p === '/exists.json');

      await service.getTermCount();
      expect(mockReadFile).toHaveBeenCalledWith('/exists.json', 'utf-8');
    });

    it('falls back when no candidates exist', async () => {
      mockResolveCodexPath.mockReturnValue(['/no.json', '/neither.json']);
      mockExistsSync.mockReturnValue(false);

      const snapshot = await service.getCurrentCodex();
      expect(snapshot.is_fallback).toBe(true);
    });
  });

  describe('malformed JSON handling', () => {
    it('falls back on malformed JSON', async () => {
      mockReadFile.mockResolvedValue('not json at all');
      const count = await service.getTermCount();
      expect(count).toBe(60);
    });
  });

  describe('getCodexPolicyService singleton', () => {
    it('returns the same instance', () => {
      const a = getCodexPolicyService();
      const b = getCodexPolicyService();
      expect(a).toBe(b);
    });
  });
});
