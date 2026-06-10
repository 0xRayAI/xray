import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NucleusOrchestrator } from '../../nucleus/orchestrator.js';

vi.mock('../../core/framework-logger.js', () => ({
  frameworkLogger: { log: vi.fn().mockResolvedValue(undefined) },
}));

vi.mock('../../nucleus/default-plugins.js', () => ({
  registerDefaultPlugins: vi.fn(() => ({ registered: 25, failed: [] })),
}));

vi.mock('../../core/config-paths.js', () => ({
  resolveLogDir: vi.fn(() => '/tmp/test-logs'),
  resolveStateDir: vi.fn(() => '/tmp/test-state'),
}));

vi.mock('child_process', () => ({
  execSync: vi.fn(() => ({ toString: () => 'v20.0.0' })),
}));

describe('NucleusOrchestrator', () => {
  let orchestrator: NucleusOrchestrator;

  beforeEach(() => {
    vi.clearAllMocks();
    orchestrator = new NucleusOrchestrator();
  });

  describe('construction and boot sequence', () => {
    it('should have 12 boot steps including plugin-registration', () => {
      expect(orchestrator.bootSequence).toHaveLength(12);
      expect(orchestrator.bootSequence).toContain('plugin-registration');
      expect(orchestrator.bootSequence.indexOf('plugin-registration')).toBe(
        orchestrator.bootSequence.indexOf('logging') + 1,
      );
    });

    it('should start uninitialized', () => {
      expect(orchestrator.isInitialized()).toBe(false);
    });
  });

  describe('initializeSingleComponent', () => {
    it('should initialize a known component', async () => {
      const result = await orchestrator.initializeSingleComponent('configuration');
      expect(result.success).toBe(true);
      expect(result.message).toBe('Configuration initialized');
    });

    it('should return already-initialized when called twice', async () => {
      await orchestrator.initializeSingleComponent('configuration');
      const result = await orchestrator.initializeSingleComponent('configuration');
      expect(result.success).toBe(true);
      expect(result.message).toMatch(/already initialized/);
    });

    it('should re-initialize when force=true', async () => {
      await orchestrator.initializeSingleComponent('configuration');
      const result = await orchestrator.initializeSingleComponent('configuration', true);
      expect(result.success).toBe(true);
      expect(result.message).toBe('Configuration initialized');
    });

    it('should fail when dependencies are not met', async () => {
      const result = await orchestrator.initializeSingleComponent('logging');
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/Dependency not met/);
    });

    it('should fail for unknown component', async () => {
      const result = await orchestrator.initializeSingleComponent('nonexistent');
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/Unknown component/);
    });
  });

  describe('getComponentResult', () => {
    it('should return undefined for uninitialized component', () => {
      expect(orchestrator.getComponentResult('configuration')).toBeUndefined();
    });

    it('should return result after initialization', async () => {
      await orchestrator.initializeSingleComponent('configuration');
      const result = orchestrator.getComponentResult('configuration');
      expect(result).toBeDefined();
      expect(result!.success).toBe(true);
    });
  });

  describe('getComponentHealth', () => {
    it('should return undefined before init', () => {
      expect(orchestrator.getComponentHealth('configuration')).toBeUndefined();
    });

    it('should return health after init', async () => {
      await orchestrator.initializeSingleComponent('configuration');
      expect(orchestrator.getComponentHealth('configuration')).toBe(true);
    });
  });

  describe('getComponentDependencies', () => {
    it('should return empty array for leaf component', () => {
      expect(orchestrator.getComponentDependencies('configuration')).toEqual([]);
    });

    it('should return dependencies for derived component', () => {
      const deps = orchestrator.getComponentDependencies('logging');
      expect(deps).toContain('configuration');
    });
  });

  describe('getComponentStatus', () => {
    it('should return uninitialized status before boot', async () => {
      const status = await orchestrator.getComponentStatus('configuration');
      expect(status.initialized).toBe(false);
      expect(status.healthy).toBe(false);
      expect(status.dependencies).toEqual([]);
    });

    it('should return initialized status after boot', async () => {
      await orchestrator.initializeSingleComponent('configuration');
      const status = await orchestrator.getComponentStatus('configuration');
      expect(status.initialized).toBe(true);
      expect(status.healthy).toBe(true);
    });
  });

  describe('getOverallBootStatus', () => {
    it('should report zero components before init', () => {
      const status = orchestrator.getOverallBootStatus();
      expect(status.initialized).toBe(false);
      expect(status.totalComponents).toBe(12);
      expect(status.initializedComponents).toBe(0);
    });

    it('should reflect partial init', async () => {
      await orchestrator.initializeSingleComponent('configuration');
      await orchestrator.initializeSingleComponent('logging');
      const status = orchestrator.getOverallBootStatus();
      expect(status.initialized).toBe(false);
      expect(status.initializedComponents).toBe(2);
    });
  });

  describe('validateAllDependencies', () => {
    it('should validate all components have their deps in bootSequence', async () => {
      const result = await orchestrator.validateAllDependencies();
      expect(result.total).toBe(12);
      expect(result.circular).toBe(0);
    });
  });

  describe('executeBootSequence — sequential mode', () => {
    it('should boot all components successfully in sequential mode', async () => {
      const result = await orchestrator.executeBootSequence({ parallelInit: false });
      expect(result.success).toBe(true);
      expect(result.initializedComponents).toHaveLength(12);
      expect(result.failedComponents).toHaveLength(0);
      expect(result.errors).toHaveLength(0);
    });

    it('should set initialized=true after successful boot', async () => {
      await orchestrator.executeBootSequence({ parallelInit: false });
      expect(orchestrator.isInitialized()).toBe(true);
    });

    it('should record plugin-registration result', async () => {
      await orchestrator.executeBootSequence({ parallelInit: false });
      const pluginResult = orchestrator.getComponentResult('plugin-registration');
      expect(pluginResult).toBeDefined();
      expect(pluginResult!.message).toMatch(/25 registered/);
    });
  });

  describe('executeBootSequence — parallel mode', () => {
    it('should boot all components successfully in parallel mode', async () => {
      const result = await orchestrator.executeBootSequence({ parallelInit: true });
      expect(result.success).toBe(true);
      expect(result.initializedComponents).toHaveLength(12);
      expect(result.failedComponents).toHaveLength(0);
    });

    it('should set initialized=true after parallel boot', async () => {
      await orchestrator.executeBootSequence({ parallelInit: true });
      expect(orchestrator.isInitialized()).toBe(true);
    });
  });

  describe('executeBootSequence — precondition failure', () => {
    it('should fail when validatePrerequisites fails', async () => {
      const { execSync } = await import('child_process');
      vi.mocked(execSync).mockImplementationOnce(() => {
        throw new Error('node not found');
      });
      const result = await orchestrator.executeBootSequence();
      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toMatch(/Cannot determine Node.js version/);
    });
  });

  describe('shutdown', () => {
    it('should shut down all components in reverse order', async () => {
      await orchestrator.executeBootSequence({ parallelInit: false });
      const result = await orchestrator.shutdown(false, false);
      expect(result.success).toBe(true);
      expect(result.shutDown).toBe(12);
      expect(result.stateSaved).toBe(false);
    });

    it('should return partial shutdown on error when force=false', async () => {
      const result = await orchestrator.shutdown(false, false);
      expect(result.success).toBe(true);
      expect(result.stateSaved).toBe(false);
    });
  });
});

describe('NucleusOrchestrator — export from nucleus/index', () => {
  it('should export NucleusOrchestrator class', async () => {
    const mod = await import('../../nucleus/index.js');
    expect(mod.NucleusOrchestrator).toBeDefined();
    const instance = new mod.NucleusOrchestrator();
    expect(instance.bootSequence).toHaveLength(12);
  });
});
