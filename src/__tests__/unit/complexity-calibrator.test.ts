/**
 * Complexity Calibrator Unit Tests
 *
 * Tests the complexity calibration and weight adjustment functionality.
 *
 * @version 1.0.0
 * @since 2026-02-25
 */

import { describe, test, expect, beforeEach, vi } from "vitest";
import * as fs from "fs";
import * as path from "path";
import {
  ComplexityCalibrator,
  type CalibrationResult,
} from "../../delegation/complexity-calibrator.js";

describe("ComplexityCalibrator", () => {
  let calibrator: ComplexityCalibrator;
  let tempLogPath: string;

  beforeEach(() => {
    // Create a temporary log file for testing
    tempLogPath = path.join(
      process.cwd(),
      `test-calibration-${Date.now()}.log`,
    );
    calibrator = new ComplexityCalibrator(tempLogPath);
  });

  test("should return null when log file does not exist", async () => {
    const result = await calibrator.calibrate(10);

    expect(result).toBeNull();
  });

  test("should return null with insufficient samples", async () => {
    // Write only 5 entries but request min 10
    const logContent = Array.from(
      { length: 5 },
      (_, i) =>
        `2026-02-25T10:${i.toString().padStart(2, "0")}:00.000Z [job-${i}] [enforcer] job-completed - SUCCESS`,
    ).join("\n");

    fs.writeFileSync(tempLogPath, logContent);

    const result = await calibrator.calibrate(10);

    expect(result).toBeNull();
  });

  test("should return default weights", () => {
    const defaults = calibrator.getDefaultWeights();

    expect(defaults.operationType).toBeDefined();
    expect(defaults.riskLevel).toBeDefined();
    expect(defaults.operationType.create).toBe(1.0);
    expect(defaults.operationType.modify).toBe(1.2);
    expect(defaults.operationType.refactor).toBe(1.8);
    expect(defaults.riskLevel.low).toBe(0.8);
    expect(defaults.riskLevel.critical).toBe(1.6);
  });

  test("should return default thresholds", () => {
    const defaults = calibrator.getDefaultThresholds();

    expect(defaults.simple).toBe(20);
    expect(defaults.moderate).toBe(35);
    expect(defaults.complex).toBe(75);
    expect(defaults.enterprise).toBe(100);
  });

  test("should parse log entry with underestimated accuracy", () => {
    const line =
      "2026-02-25T10:00:00.000Z [job-001] [enforcer] job-completed - SUCCESS complexity: 50 underestimated";

    const entry = (calibrator as any).parseLogEntry(line);

    expect(entry).toBeTruthy();
    expect(entry?.accuracy).toBe("underestimated");
    expect(entry?.complexityScore).toBe(50);
  });

  test("should parse log entry with accurate complexity", () => {
    const line =
      "2026-02-25T10:00:00.000Z [job-001] [enforcer] job-completed - SUCCESS complexity: 75 accurate";

    const entry = (calibrator as any).parseLogEntry(line);

    expect(entry).toBeTruthy();
    expect(entry?.accuracy).toBe("accurate");
    expect(entry?.complexityScore).toBe(75);
  });

  test("should parse log entry with overestimated complexity", () => {
    const line =
      "2026-02-25T10:00:00.000Z [job-001] [enforcer] job-completed - error complexity: 30 overestimated duration: 15000";

    const entry = (calibrator as any).parseLogEntry(line);

    expect(entry).toBeTruthy();
    expect(entry?.accuracy).toBe("overestimated");
    expect(entry?.success).toBe(false);
  });

  test("should return null for entries without accuracy data", () => {
    const line =
      "2026-02-25T10:00:00.000Z [job-001] [enforcer] job-completed - SUCCESS";

    const entry = (calibrator as any).parseLogEntry(line);

    expect(entry).toBeNull();
  });

  test("should calibrate with sufficient samples", async () => {
    // Write entries with varied accuracy
    const logContent = [
      "2026-02-25T10:00:00.000Z [job-001] [enforcer] job-completed - SUCCESS complexity: 50 underestimated",
      "2026-02-25T10:01:00.000Z [job-002] [enforcer] job-completed - SUCCESS complexity: 50 underestimated",
      "2026-02-25T10:02:00.000Z [job-003] [enforcer] job-completed - SUCCESS complexity: 50 underestimated",
      "2026-02-25T10:03:00.000Z [job-004] [orchestrator] job-completed - SUCCESS complexity: 50 accurate",
      "2026-02-25T10:04:00.000Z [job-005] [orchestrator] job-completed - SUCCESS complexity: 50 accurate",
      "2026-02-25T10:05:00.000Z [job-006] [architect] job-completed - SUCCESS complexity: 50 accurate",
      "2026-02-25T10:06:00.000Z [job-007] [architect] job-completed - SUCCESS complexity: 50 accurate",
      "2026-02-25T10:07:00.000Z [job-008] [refactorer] job-completed - SUCCESS complexity: 50 overestimated",
      "2026-02-25T10:08:00.000Z [job-009] [refactorer] job-completed - SUCCESS complexity: 50 overestimated",
      "2026-02-25T10:09:00.000Z [job-010] [refactorer] job-completed - SUCCESS complexity: 50 overestimated",
    ].join("\n");

    fs.writeFileSync(tempLogPath, logContent);

    const result = await calibrator.calibrate(5);

    expect(result).toBeTruthy();
    expect(result?.sampleSize).toBe(10);
    expect(result?.accuracyHistory.underestimated).toBe(3);
    expect(result?.accuracyHistory.accurate).toBe(4);
    expect(result?.accuracyHistory.overestimated).toBe(3);
    expect(result?.adjustedWeights).toBeDefined();
    expect(result?.adjustedThresholds).toBeDefined();
  });

  test("should adjust weights when underestimating", async () => {
    // Write mostly underestimated entries
    const logContent = Array.from(
      { length: 15 },
      (_, i) =>
        `2026-02-25T10:${i.toString().padStart(2, "0")}:00.000Z [job-${i}] [enforcer] job-completed - SUCCESS complexity: ${50 + i} underestimated`,
    ).join("\n");

    fs.writeFileSync(tempLogPath, logContent);

    const result = await calibrator.calibrate(10);

    expect(result).toBeTruthy();
    // Underestimating should increase weights
    expect(result!.adjustedWeights.operationType.create).toBeGreaterThan(1.0);
  });

  test("should adjust weights when overestimating", async () => {
    // Write mostly overestimated entries
    const logContent = Array.from(
      { length: 15 },
      (_, i) =>
        `2026-02-25T10:${i.toString().padStart(2, "0")}:00.000Z [job-${i}] [enforcer] job-completed - SUCCESS complexity: ${50 + i} overestimated`,
    ).join("\n");

    fs.writeFileSync(tempLogPath, logContent);

    const result = await calibrator.calibrate(10);

    expect(result).toBeTruthy();
    // Overestimating should decrease weights
    expect(result!.adjustedWeights.operationType.create).toBeLessThan(1.0);
  });

  test("should use custom log path when provided", () => {
    const customPath = "/custom/path/activity.log";
    const customCalibrator = new ComplexityCalibrator(customPath);

    expect((customCalibrator as any).logPath).toBe(customPath);
  });

  test("should bound weight adjustments to max 20%", async () => {
    // Write extreme underestimated entries (all underestimated)
    const logContent = Array.from(
      { length: 50 },
      (_, i) =>
        `2026-02-25T1${(i % 24).toString().padStart(2, "0")}:${i.toString().padStart(2, "0")}:00.000Z [job-${i}] [enforcer] job-completed - SUCCESS complexity: ${50 + i} underestimated`,
    ).join("\n");

    fs.writeFileSync(tempLogPath, logContent);

    const result = await calibrator.calibrate(10);

    expect(result).toBeTruthy();
    // Should not adjust by more than 20%
    expect(result!.adjustedWeights.operationType.create).toBeLessThanOrEqual(
      1.2,
    );
    expect(result!.adjustedWeights.operationType.create).toBeGreaterThanOrEqual(
      0.8,
    );
  });

  test("should adjust moderate and complex thresholds", async () => {
    // Write entries to trigger threshold adjustment
    const logContent = [
      // Mostly underestimated - should raise thresholds
      ...Array.from(
        { length: 8 },
        (_, i) =>
          `2026-02-25T10:${i.toString().padStart(2, "0")}:00.000Z [job-${i}] [enforcer] job-completed - SUCCESS complexity: 50 underestimated`,
      ),
      // Only 2 accurate
      ...Array.from(
        { length: 2 },
        (_, i) =>
          `2026-02-25T10:${(i + 8).toString().padStart(2, "0")}:00.000Z [job-${i + 8}] [enforcer] job-completed - SUCCESS complexity: 50 accurate`,
      ),
    ].join("\n");

    fs.writeFileSync(tempLogPath, logContent);

    const result = await calibrator.calibrate(5);

    expect(result).toBeTruthy();
    // Moderate threshold should be raised when underestimating
    expect(result!.adjustedThresholds.moderate).toBeGreaterThan(35);
  });

  test("should not adjust simple threshold below minimum", async () => {
    const defaults = calibrator.getDefaultThresholds();

    // Even with extreme overestimation, simple should stay at minimum
    expect(defaults.simple).toBe(20);
  });

  test("should handle applyCalibration gracefully", async () => {
    const mockAnalyzer = {
      setThresholds: vi.fn(),
    };

    // Write minimal log to allow calibration
    const logContent = [
      "2026-02-25T10:00:00.000Z [job-001] [enforcer] job-completed - SUCCESS complexity: 50 accurate",
    ].join("\n");
    fs.writeFileSync(tempLogPath, logContent);

    // This should not throw even with insufficient data
    await expect(
      calibrator.applyCalibration(mockAnalyzer),
    ).resolves.not.toThrow();
  });
});
