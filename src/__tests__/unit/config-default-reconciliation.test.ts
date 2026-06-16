/**
 * Phase 0: Default Reconciliation Test
 *
 * Asserts that XrayConfigLoader defaults match FeaturesConfigLoader defaults
 * for all overlapping keys, ensuring FeaturesConfigLoader is the SSOT.
 */
import { describe, it, expect } from "vitest";
import { XrayConfigLoader } from "../../core/config-loader.js";
import { FeaturesConfigLoader } from "../../core/features-config.js";

describe("Config default reconciliation", () => {
  const xrayDefaults = new XrayConfigLoader().loadConfig();
  const featuresDefaults = new FeaturesConfigLoader().getDefaultConfig();

  describe("multi_agent_orchestration", () => {
    it("enabled defaults should match", () => {
      expect(xrayDefaults.multi_agent_orchestration.enabled).toBe(
        featuresDefaults.multi_agent_orchestration.enabled,
      );
    });

    it("coordination_model defaults should match", () => {
      expect(xrayDefaults.multi_agent_orchestration.coordination_model).toBe(
        featuresDefaults.multi_agent_orchestration.coordination_model,
      );
    });

    it("max_concurrent_agents defaults should match", () => {
      expect(xrayDefaults.multi_agent_orchestration.max_concurrent_agents).toBe(
        featuresDefaults.multi_agent_orchestration.max_concurrent_agents,
      );
    });

    it("task_distribution_strategy defaults should match", () => {
      expect(xrayDefaults.multi_agent_orchestration.task_distribution_strategy).toBe(
        featuresDefaults.multi_agent_orchestration.task_distribution_strategy,
      );
    });

    it("conflict_resolution defaults should match", () => {
      expect(xrayDefaults.multi_agent_orchestration.conflict_resolution).toBe(
        featuresDefaults.multi_agent_orchestration.conflict_resolution,
      );
    });

    it("progress_tracking defaults should match", () => {
      expect(xrayDefaults.multi_agent_orchestration.progress_tracking).toBe(
        featuresDefaults.multi_agent_orchestration.progress_tracking,
      );
    });

    it("session_persistence defaults should match", () => {
      expect(xrayDefaults.multi_agent_orchestration.session_persistence).toBe(
        featuresDefaults.multi_agent_orchestration.session_persistence,
      );
    });
  });

  describe("autonomous_reporting", () => {
    it("enabled defaults should match", () => {
      expect(xrayDefaults.autonomous_reporting.enabled).toBe(
        featuresDefaults.autonomous_reporting.enabled,
      );
    });

    it("interval_minutes defaults should match", () => {
      expect(xrayDefaults.autonomous_reporting.interval_minutes).toBe(
        featuresDefaults.autonomous_reporting.interval_minutes,
      );
    });

    it("auto_schedule defaults should match", () => {
      expect(xrayDefaults.autonomous_reporting.auto_schedule).toBe(
        featuresDefaults.autonomous_reporting.auto_schedule,
      );
    });

    it("include_health_assessment defaults should match", () => {
      expect(xrayDefaults.autonomous_reporting.include_health_assessment).toBe(
        featuresDefaults.autonomous_reporting.include_health_assessment,
      );
    });

    it("include_agent_activities defaults should match", () => {
      expect(xrayDefaults.autonomous_reporting.include_agent_activities).toBe(
        featuresDefaults.autonomous_reporting.include_agent_activities,
      );
    });

    it("include_pipeline_operations defaults should match", () => {
      expect(xrayDefaults.autonomous_reporting.include_pipeline_operations).toBe(
        featuresDefaults.autonomous_reporting.include_pipeline_operations,
      );
    });

    it("include_critical_issues defaults should match", () => {
      expect(xrayDefaults.autonomous_reporting.include_critical_issues).toBe(
        featuresDefaults.autonomous_reporting.include_critical_issues,
      );
    });

    it("include_recommendations defaults should match", () => {
      expect(xrayDefaults.autonomous_reporting.include_recommendations).toBe(
        featuresDefaults.autonomous_reporting.include_recommendations,
      );
    });

    it("report_retention_days defaults should match", () => {
      expect(xrayDefaults.autonomous_reporting.report_retention_days).toBe(
        featuresDefaults.autonomous_reporting.report_retention_days,
      );
    });

    it("notification_channels defaults should match", () => {
      expect(xrayDefaults.autonomous_reporting.notification_channels).toEqual(
        featuresDefaults.autonomous_reporting.notification_channels,
      );
    });
  });

  describe("disabled_agents", () => {
    it("should both default to empty array", () => {
      expect(xrayDefaults.disabled_agents).toEqual(
        featuresDefaults.agent_management.disabled_agents,
      );
    });
  });

  describe("parse-time fallback defaults", () => {
    it("autonomous_reporting.enabled fallback should match FeaturesConfigLoader default", () => {
      const loader = new XrayConfigLoader();
      const parsed = (loader as any).parseAutonomousReportingConfig({});
      expect(parsed.enabled).toBe(featuresDefaults.autonomous_reporting.enabled);
    });

    it("autonomous_reporting.auto_schedule fallback should match FeaturesConfigLoader default", () => {
      const loader = new XrayConfigLoader();
      const parsed = (loader as any).parseAutonomousReportingConfig({});
      expect(parsed.auto_schedule).toBe(featuresDefaults.autonomous_reporting.auto_schedule);
    });
  });

  describe("getXrayConfig()", () => {
    it("returns XrayConfig-shaped slice from FeaturesConfigLoader", () => {
      const loader = new FeaturesConfigLoader();
      const xrayConfig = loader.getXrayConfig();

      expect(xrayConfig).toHaveProperty("multi_agent_orchestration");
      expect(xrayConfig).toHaveProperty("autonomous_reporting");
      expect(xrayConfig).toHaveProperty("disabled_agents");

      expect(typeof xrayConfig.multi_agent_orchestration.enabled).toBe("boolean");
      expect(typeof xrayConfig.autonomous_reporting.enabled).toBe("boolean");
      expect(Array.isArray(xrayConfig.disabled_agents)).toBe(true);
    });

    it("matches XrayConfigLoader defaults", () => {
      const xrayDefaults = new XrayConfigLoader().loadConfig();
      const featuresXray = new FeaturesConfigLoader().getXrayConfig();

      expect(featuresXray.multi_agent_orchestration.enabled).toBe(xrayDefaults.multi_agent_orchestration.enabled);
      expect(featuresXray.multi_agent_orchestration.coordination_model).toBe(xrayDefaults.multi_agent_orchestration.coordination_model);
      expect(featuresXray.multi_agent_orchestration.max_concurrent_agents).toBe(xrayDefaults.multi_agent_orchestration.max_concurrent_agents);
      expect(featuresXray.autonomous_reporting.enabled).toBe(xrayDefaults.autonomous_reporting.enabled);
      expect(featuresXray.autonomous_reporting.auto_schedule).toBe(xrayDefaults.autonomous_reporting.auto_schedule);
      expect(featuresXray.disabled_agents).toEqual(xrayDefaults.disabled_agents);
    });

    it("disabled_agents falls back to empty array when agent_management is missing", () => {
      const loader = new FeaturesConfigLoader();
      const config = loader.getXrayConfig();
      expect(Array.isArray(config.disabled_agents)).toBe(true);
    });
  });
});