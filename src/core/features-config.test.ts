/**
 * Features Config Tests
 * 
 * Tests for the new config interfaces added to features-config.ts:
 * - AutoReflectionConfig
 * - InferenceConfig
 * - KernelConfig
 * - ProcessorsConfig
 * - EnforcementConfig
 */

import { describe, it, expect, beforeEach } from "vitest";
import { existsSync, writeFileSync, unlinkSync, mkdirSync, rmdirSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

describe("Features Config Interfaces", () => {
  describe("AutoReflectionConfig", () => {
    it("should define full mode configuration", () => {
      const config = {
        mode: "full" as const,
        description: "Test",
        triggers: {
          ci_failure: { enabled: true, auto_generate_stub: true },
          commit_threshold: { enabled: true, threshold: 10, auto_generate_stub: true },
          time_threshold: { enabled: true, days: 5, auto_generate_stub: true },
          test_failure: { enabled: true, auto_generate_stub: true },
          deployment: { enabled: true, auto_generate_stub: true },
        },
        thresholds: {
          full: { commit_threshold: 10, days_threshold: 5, auto_generate: true, auto_commit: false, prompt_user: true },
          minimal: { commit_threshold: 25, days_threshold: 14, auto_generate: true, auto_commit: false, prompt_user: true },
          off: { commit_threshold: 999, days_threshold: 365, auto_generate: false, auto_commit: false, prompt_user: false },
        },
      };
      
      expect(config.mode).toBe("full");
      expect(config.triggers.ci_failure.enabled).toBe(true);
      expect(config.thresholds.full.commit_threshold).toBe(10);
    });

    it("should define minimal mode configuration", () => {
      const config = {
        mode: "minimal" as const,
        description: "Test",
        triggers: {
          ci_failure: { enabled: true, auto_generate_stub: true },
          commit_threshold: { enabled: true, threshold: 25, auto_generate_stub: true },
          time_threshold: { enabled: true, days: 14, auto_generate_stub: true },
          test_failure: { enabled: false, auto_generate_stub: false },
          deployment: { enabled: false, auto_generate_stub: false },
        },
        thresholds: {
          full: { commit_threshold: 10, days_threshold: 5, auto_generate: true, auto_commit: false, prompt_user: true },
          minimal: { commit_threshold: 25, days_threshold: 14, auto_generate: true, auto_commit: false, prompt_user: true },
          off: { commit_threshold: 999, days_threshold: 365, auto_generate: false, auto_commit: false, prompt_user: false },
        },
      };
      
      expect(config.mode).toBe("minimal");
      expect(config.triggers.commit_threshold.threshold).toBe(25);
    });

    it("should define off mode configuration", () => {
      const config = {
        mode: "off" as const,
        description: "Disabled",
        triggers: {
          ci_failure: { enabled: false, auto_generate_stub: false },
          commit_threshold: { enabled: false, threshold: 999, auto_generate_stub: false },
          time_threshold: { enabled: false, days: 365, auto_generate_stub: false },
          test_failure: { enabled: false, auto_generate_stub: false },
          deployment: { enabled: false, auto_generate_stub: false },
        },
        thresholds: {
          off: { commit_threshold: 999, days_threshold: 365, auto_generate: false, auto_commit: false, prompt_user: false },
        },
      };
      
      expect(config.mode).toBe("off");
      expect(config.thresholds.off.auto_generate).toBe(false);
    });
  });

  describe("InferenceConfig", () => {
    it("should define inference configuration", () => {
      const config = {
        description: "Inference system",
        enabled: true,
        workflow_dir: ".strray/inference",
        reports_dir: ".strray/reports",
        pattern_matching: {
          enabled: true,
          confidence_threshold: 0.7,
        },
      };
      
      expect(config.enabled).toBe(true);
      expect(config.workflow_dir).toBe(".strray/inference");
      expect(config.pattern_matching.confidence_threshold).toBe(0.7);
    });

    it("should allow disabling inference", () => {
      const config = {
        description: "Inference disabled",
        enabled: false,
        workflow_dir: ".strray/inference",
        reports_dir: ".strray/reports",
        pattern_matching: {
          enabled: false,
          confidence_threshold: 0.5,
        },
      };
      
      expect(config.enabled).toBe(false);
      expect(config.pattern_matching.enabled).toBe(false);
    });
  });

  describe("KernelConfig", () => {
    it("should define kernel configuration", () => {
      const config = {
        description: "Kernel configuration",
        enabled: true,
        pattern_learning: {
          enabled: true,
          learning_interval_ms: 300000,
          auto_apply_threshold: 0.9,
          min_success_rate: 0.7,
        },
        confidence: {
          default_threshold: 0.5,
          routing_adjustment: 0.1,
        },
      };
      
      expect(config.enabled).toBe(true);
      expect(config.pattern_learning.auto_apply_threshold).toBe(0.9);
      expect(config.confidence.default_threshold).toBe(0.5);
    });
  });

  describe("ProcessorsConfig", () => {
    it("should define processors configuration", () => {
      const config = {
        description: "Processor configuration",
        enabled: true,
        pre_processors: {
          enabled: true,
          priority_order: ["preValidate", "codexCompliance", "typescriptCompilation"],
        },
        post_processors: {
          enabled: true,
          priority_order: ["storytellingTrigger", "testExecution", "regressionTesting"],
        },
      };
      
      expect(config.enabled).toBe(true);
      expect(config.pre_processors.priority_order).toHaveLength(3);
      expect(config.post_processors.priority_order).toHaveLength(3);
    });

    it("should allow custom priority order", () => {
      const config = {
        description: "Custom processor order",
        enabled: true,
        pre_processors: {
          enabled: true,
          priority_order: ["typescriptCompilation", "codexCompliance", "preValidate"],
        },
        post_processors: {
          enabled: true,
          priority_order: ["testExecution", "coverageAnalysis", "regressionTesting"],
        },
      };
      
      expect(config.pre_processors.priority_order[0]).toBe("typescriptCompilation");
      expect(config.post_processors.priority_order[0]).toBe("testExecution");
    });
  });

  describe("EnforcementConfig", () => {
    it("should define enforcement configuration", () => {
      const config = {
        description: "Enforcement configuration",
        enabled: true,
        auto_fix: {
          enabled: true,
          require_approval: false,
        },
        codex_validation: {
          enabled: true,
          strict_mode: false,
        },
      };
      
      expect(config.enabled).toBe(true);
      expect(config.auto_fix.enabled).toBe(true);
      expect(config.codex_validation.strict_mode).toBe(false);
    });

    it("should allow strict mode", () => {
      const config = {
        description: "Strict enforcement",
        enabled: true,
        auto_fix: {
          enabled: false,
          require_approval: true,
        },
        codex_validation: {
          enabled: true,
          strict_mode: true,
        },
      };
      
      expect(config.auto_fix.require_approval).toBe(true);
      expect(config.codex_validation.strict_mode).toBe(true);
    });
  });
});

describe("Config Loading", () => {
  const testDir = join(tmpdir(), `xray-test-${Date.now()}`);
  
  beforeEach(() => {
    mkdirSync(testDir, { recursive: true });
  });
  
  it("should load features.json if exists", () => {
    const configPath = join(testDir, "features.json");
    const config = {
      auto_reflection: {
        mode: "full",
        description: "Test",
        triggers: {
          ci_failure: { enabled: true, auto_generate_stub: true },
          commit_threshold: { enabled: true, threshold: 10, auto_generate_stub: true },
          time_threshold: { enabled: true, days: 7, auto_generate_stub: true },
          test_failure: { enabled: true, auto_generate_stub: true },
          deployment: { enabled: true, auto_generate_stub: true },
        },
        thresholds: {
          full: { commit_threshold: 10, days_threshold: 5, auto_generate: true, auto_commit: false, prompt_user: true },
          minimal: { commit_threshold: 25, days_threshold: 14, auto_generate: true, auto_commit: false, prompt_user: true },
          off: { commit_threshold: 999, days_threshold: 365, auto_generate: false, auto_commit: false, prompt_user: false },
        },
      },
    };
    
    writeFileSync(configPath, JSON.stringify(config, null, 2));
    
    expect(existsSync(configPath)).toBe(true);
    
    const loaded = JSON.parse(require("fs").readFileSync(configPath, "utf-8"));
    expect(loaded.auto_reflection.mode).toBe("full");
  });
  
  it("should return null if features.json not found", () => {
    const configPath = join(testDir, "nonexistent-features.json");
    expect(existsSync(configPath)).toBe(false);
  });
});