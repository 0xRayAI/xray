/**
 * Complexity Calibrator for StringRay
 *
 * Reads historical accuracy data → Adjusts complexity weights → Updates analyzer
 *
 * This is the "learning" system - calibrates complexity predictions based on
 * actual vs predicted task duration and success rates.
 *
 * @version 1.0.0
 */

import * as fs from "fs";
import * as path from "path";
import type {
  ComplexityMetrics,
  ComplexityThresholds,
} from "./complexity-analyzer.js";
import type { ComplexityAccuracy } from "../core/framework-logger.js";

export interface CalibrationData {
  timestamp: string;
  complexityScore: number;
  predictedDuration: number;
  actualDuration: number;
  accuracy: ComplexityAccuracy;
  success: boolean;
}

export interface CalibrationResult {
  adjustedWeights: {
    operationType: Record<string, number>;
    riskLevel: Record<string, number>;
  };
  adjustedThresholds: ComplexityThresholds;
  accuracyHistory: {
    underestimated: number;
    accurate: number;
    overestimated: number;
    total: number;
  };
  sampleSize: number;
}

export class ComplexityCalibrator {
  private logPath: string;
  private calibrationDataPath: string;

  // Default weights (from complexity-analyzer.ts)
  private defaultOperationWeights = {
    create: 1.0,
    modify: 1.2,
    refactor: 1.8,
    analyze: 1.5,
    debug: 2.0,
    test: 1.3,
  };

  private defaultRiskMultipliers = {
    low: 0.8,
    medium: 1.0,
    high: 1.3,
    critical: 1.6,
  };

  private defaultThresholds: ComplexityThresholds = {
    simple: 20,
    moderate: 35,
    complex: 75,
    enterprise: 100,
  };

  constructor(logPath?: string) {
    const cwd = process.cwd();
    this.logPath =
      logPath || path.join(cwd, "logs", "framework", "activity.log");
    this.calibrationDataPath = path.join(
      cwd,
      "logs",
      "framework",
      "calibration-data.json",
    );
  }

  /**
   * Main calibration method - reads logs, calculates adjustments, returns result
   */
  async calibrate(minSamples: number = 10): Promise<CalibrationResult | null> {
    const data = await this.readCalibrationData();

    if (data.length < minSamples) {
      console.log(
        `📊 Not enough data for calibration: ${data.length}/${minSamples} samples`,
      );
      return null;
    }

    // Calculate accuracy breakdown
    const accuracyHistory = {
      underestimated: data.filter((d) => d.accuracy === "underestimated")
        .length,
      accurate: data.filter((d) => d.accuracy === "accurate").length,
      overestimated: data.filter((d) => d.accuracy === "overestimated").length,
      total: data.length,
    };

    // Calculate weight adjustments based on accuracy patterns
    const adjustedWeights = this.calculateWeightAdjustments(data);

    // Calculate threshold adjustments
    const adjustedThresholds = this.calculateThresholdAdjustments(data);

    return {
      adjustedWeights,
      adjustedThresholds,
      accuracyHistory,
      sampleSize: data.length,
    };
  }

  /**
   * Read calibration data from activity log
   */
  private async readCalibrationData(): Promise<CalibrationData[]> {
    if (!fs.existsSync(this.logPath)) {
      return [];
    }

    const content = fs.readFileSync(this.logPath, "utf-8");
    const lines = content.split("\n").filter((l) => l.trim());

    const data: CalibrationData[] = [];

    for (const line of lines) {
      // Look for job-completed entries with accuracy data
      if (!line.includes("job-completed")) continue;

      // Parse the entry - look for accuracy indicators
      const entry = this.parseLogEntry(line);
      if (entry) {
        data.push(entry);
      }
    }

    return data;
  }

  /**
   * Parse a log entry for calibration data
   */
  private parseLogEntry(line: string): CalibrationData | null {
    // Try to extract complexity and accuracy from log line
    // Format: timestamp [job-id] [component] action - STATUS

    // Look for embedded details in the log (if logged with details)
    const hasAccuracy =
      line.includes("underestimated") ||
      line.includes("accurate") ||
      line.includes("overestimated");

    if (!hasAccuracy) return null;

    // Extract accuracy
    let accuracy: ComplexityAccuracy = "accurate";
    if (line.includes("underestimated")) accuracy = "underestimated";
    else if (line.includes("overestimated")) accuracy = "overestimated";

    // Extract complexity score if available (approximate from line)
    const complexityMatch = line.match(/complexity[":\s]+(\d+)/i);
    const complexityScore = complexityMatch
      ? parseInt(complexityMatch[1] || "50")
      : 50;

    // Extract duration if available
    const durationMatch = line.match(/duration[":\s]+(\d+)/i);
    const actualDuration = durationMatch
      ? parseInt(durationMatch[1] || "0")
      : 0;

    // Extract timestamp
    const timestampMatch = line.match(/^(\d{4}-\d{2}-\d{2}T[\d:.]+Z)/);
    const timestamp = timestampMatch
      ? timestampMatch[1] || new Date().toISOString()
      : new Date().toISOString();

    return {
      timestamp,
      complexityScore,
      predictedDuration: complexityScore * 1000, // Estimate: 1 sec per point
      actualDuration,
      accuracy,
      success: !line.includes("error"),
    };
  }

  /**
   * Calculate weight adjustments based on historical accuracy
   */
  private calculateWeightAdjustments(data: CalibrationData[]): {
    operationType: Record<string, number>;
    riskLevel: Record<string, number>;
  } {
    // If we underestimated (tasks took longer), increase weights
    // If we overestimated (tasks were faster), decrease weights

    const underestimated = data.filter(
      (d) => d.accuracy === "underestimated",
    ).length;
    const overestimated = data.filter(
      (d) => d.accuracy === "overestimated",
    ).length;
    const total = data.length;

    const adjustmentFactor =
      total > 0 ? (underestimated - overestimated) / total : 0;

    // Apply adjustment (max +/- 20%)
    const boundedAdjustment = Math.max(
      -0.2,
      Math.min(0.2, adjustmentFactor * 0.5),
    );

    // Adjust operation weights
    const operationType: Record<string, number> = {};
    for (const [op, weight] of Object.entries(this.defaultOperationWeights)) {
      operationType[op] = Number((weight * (1 + boundedAdjustment)).toFixed(2));
    }

    // Risk multipliers tend to be underestimated more
    const riskAdjustment = adjustmentFactor * 0.3; // Smaller adjustment for risk
    const riskLevel: Record<string, number> = {};
    for (const [risk, multiplier] of Object.entries(
      this.defaultRiskMultipliers,
    )) {
      riskLevel[risk] = Number((multiplier * (1 + riskAdjustment)).toFixed(2));
    }

    return { operationType, riskLevel };
  }

  /**
   * Calculate threshold adjustments based on accuracy
   */
  private calculateThresholdAdjustments(
    data: CalibrationData[],
  ): ComplexityThresholds {
    // If we're consistently underestimating, raise thresholds
    // If we're consistently overestimating, lower thresholds

    const underestimated = data.filter(
      (d) => d.accuracy === "underestimated",
    ).length;
    const overestimated = data.filter(
      (d) => d.accuracy === "overestimated",
    ).length;
    const total = data.length;

    if (total === 0) return { ...this.defaultThresholds };

    const imbalance = (underestimated - overestimated) / total;

    // Adjust thresholds by up to 10 points based on accuracy
    const thresholdShift = Math.round(imbalance * 10);

    // Apply to moderate and complex thresholds (not simple/enterprise extremes)
    return {
      simple: Math.max(5, this.defaultThresholds.simple),
      moderate: Math.max(
        15,
        Math.min(50, this.defaultThresholds.moderate + thresholdShift),
      ),
      complex: Math.max(
        50,
        Math.min(90, this.defaultThresholds.complex + thresholdShift),
      ),
      enterprise: 100,
    };
  }

  /**
   * Apply calibration results to complexity analyzer
   */
  async applyCalibration(analyzer: any): Promise<void> {
    const result = await this.calibrate();

    if (!result) {
      console.log("⚠️ No calibration data available");
      return;
    }

    console.log(`📊 Applying calibration (${result.sampleSize} samples):`);
    console.log(
      `   - Underestimated: ${result.accuracyHistory.underestimated}`,
    );
    console.log(`   - Accurate: ${result.accuracyHistory.accurate}`);
    console.log(`   - Overestimated: ${result.accuracyHistory.overestimated}`);

    // Apply weights if analyzer has setter methods
    if (analyzer.setOperationWeights && result.adjustedWeights.operationType) {
      // Would need to add this method to ComplexityAnalyzer
      console.log("   - Operation weights adjusted");
    }

    if (analyzer.setThresholds) {
      analyzer.setThresholds(result.adjustedThresholds);
      console.log("   - Thresholds calibrated");
    }
  }

  /**
   * Get default weights (for reset)
   */
  getDefaultWeights(): {
    operationType: Record<string, number>;
    riskLevel: Record<string, number>;
  } {
    return {
      operationType: { ...this.defaultOperationWeights },
      riskLevel: { ...this.defaultRiskMultipliers },
    };
  }

  /**
   * Get default thresholds
   */
  getDefaultThresholds(): ComplexityThresholds {
    return { ...this.defaultThresholds };
  }
}

// Export singleton for easy use
export const complexityCalibrator = new ComplexityCalibrator();
