/**
 * Complexity analyzer — ported from xray/src/delegation/complexity-analyzer.ts slices.
 */

import {
  DEFAULT_THRESHOLDS,
  OPERATION_WEIGHTS,
  RISK_MULTIPLIERS,
  getLevelFromScore,
  getStrategyForLevel,
  getAgentCountForLevel,
  generateReasoning,
} from "./complexity-core.js";

export class ComplexityAnalyzer {
  static MAX_CALIBRATION_HISTORY = 1000;

  /** @type {import("./complexity-core.js").ComplexityThresholds} */
  thresholds = { ...DEFAULT_THRESHOLDS };

  operationWeights = { ...OPERATION_WEIGHTS };
  riskMultipliers = { ...RISK_MULTIPLIERS };

  /** @type {Array<{complexityScore:number,actualDuration:number,estimatedDuration:number,success:boolean,timestamp:number}>} */
  calibrationHistory = [];

  analyzeComplexity(operation, context) {
    return {
      fileCount: this.calculateFileCount(context),
      changeVolume: this.calculateChangeVolume(context),
      operationType: this.determineOperationType(operation),
      dependencies: this.calculateDependencies(context),
      riskLevel: this.assessRiskLevel(context),
      estimatedDuration: this.estimateDuration(context),
    };
  }

  calculateComplexityScore(metrics) {
    let score = 0;
    score += Math.min(metrics.fileCount * 4, 40);
    score += Math.min(metrics.changeVolume / 5, 50);
    score += Math.min(metrics.dependencies * 5, 25);
    score += Math.min(metrics.estimatedDuration / 10, 15);
    score *= this.operationWeights[metrics.operationType];
    score *= this.riskMultipliers[metrics.riskLevel];
    score = Math.min(Math.max(score, 0), 100);
    const level = getLevelFromScore(score, this.thresholds);
    return {
      score: Math.round(score),
      level,
      recommendedStrategy: getStrategyForLevel(level),
      estimatedAgents: getAgentCountForLevel(level),
      reasoning: generateReasoning(metrics, score, level),
    };
  }

  updateThresholds(performanceData) {
    if (!performanceData || typeof performanceData !== "object") return;
    const data = performanceData;
    if (data.complexityScore === undefined) return;
    this.calibrationHistory.push({
      complexityScore: data.complexityScore,
      actualDuration: data.actualDuration || 0,
      estimatedDuration: data.estimatedDuration || 30,
      success: data.success !== false,
      timestamp: data.timestamp || Date.now(),
    });
    if (this.calibrationHistory.length > ComplexityAnalyzer.MAX_CALIBRATION_HISTORY) {
      const removeCount =
        this.calibrationHistory.length - ComplexityAnalyzer.MAX_CALIBRATION_HISTORY + 100;
      this.calibrationHistory = this.calibrationHistory.slice(removeCount);
    }
    if (this.calibrationHistory.length < 10) return;
    const analysis = this.analyzeCalibrationData();
    this.applyCalibrationAnalysis(analysis);
  }

  analyzeCalibrationData() {
    let underestimated = 0;
    let overestimated = 0;
    let totalAdjustmentFactor = 0;
    for (const entry of this.calibrationHistory) {
      if (entry.actualDuration > entry.estimatedDuration * 1.5) {
        underestimated++;
        totalAdjustmentFactor += 0.05;
      } else if (entry.actualDuration < entry.estimatedDuration * 0.5) {
        overestimated++;
        totalAdjustmentFactor -= 0.05;
      }
    }
    return {
      underestimated: underestimated > this.calibrationHistory.length * 0.3,
      overestimated: overestimated > this.calibrationHistory.length * 0.3,
      adjustmentFactor: totalAdjustmentFactor / this.calibrationHistory.length,
    };
  }

  applyCalibrationAnalysis(analysis) {
    const maxAdjustment = 10;
    if (analysis.underestimated) {
      const adjustment = Math.min(maxAdjustment, Math.abs(analysis.adjustmentFactor) * 100);
      this.thresholds.simple = Math.max(10, this.thresholds.simple - adjustment);
      this.thresholds.moderate = Math.max(20, this.thresholds.moderate - adjustment);
      this.thresholds.complex = Math.max(40, this.thresholds.complex - adjustment);
    } else if (analysis.overestimated) {
      const adjustment = Math.min(maxAdjustment, Math.abs(analysis.adjustmentFactor) * 100);
      this.thresholds.simple = Math.min(40, this.thresholds.simple + adjustment);
      this.thresholds.moderate = Math.min(60, this.thresholds.moderate + adjustment);
      this.thresholds.complex = Math.min(90, this.thresholds.complex + adjustment);
    }
  }

  getCalibrationHistory() {
    return [...this.calibrationHistory];
  }

  resetCalibration() {
    this.calibrationHistory = [];
  }

  getThresholds() {
    return { ...this.thresholds };
  }

  setThresholds(thresholds) {
    this.thresholds = { ...this.thresholds, ...thresholds };
  }

  setOperationWeights(weights) {
    for (const [key, value] of Object.entries(weights)) {
      if (typeof value === "number") this.operationWeights[key] = value;
    }
  }

  setRiskMultipliers(multipliers) {
    for (const [key, value] of Object.entries(multipliers)) {
      if (typeof value === "number") this.riskMultipliers[key] = value;
    }
  }

  calibrate(settings) {
    if (settings.thresholds) this.setThresholds(settings.thresholds);
    if (settings.operationWeights) this.setOperationWeights(settings.operationWeights);
    if (settings.riskMultipliers) this.setRiskMultipliers(settings.riskMultipliers);
  }

  calculateFileCount(context) {
    return context?.files?.length || 1;
  }

  calculateChangeVolume(context) {
    if (context?.linesChanged !== undefined) return context.linesChanged;
    if (context?.changeVolume !== undefined) return context.changeVolume;
    const changes = context?.changes || {};
    return (changes.added || 0) + (changes.deleted || 0) + (changes.modified || 0);
  }

  determineOperationType(operation) {
    const op = operation.toLowerCase();
    if (op.includes("refactor")) return "refactor";
    if (op.includes("debug")) return "debug";
    if (op.includes("test")) return "test";
    if (op.includes("analyze")) return "analyze";
    if (op.includes("create")) return "create";
    return "modify";
  }

  calculateDependencies(context) {
    if (context?.dependencyCount !== undefined) return context.dependencyCount;
    return context?.dependencies?.length || 0;
  }

  assessRiskLevel(context) {
    if (context?.critical || context?.riskLevel === "critical") return "critical";
    if (context?.highRisk || context?.riskLevel === "high") return "high";
    if (context?.riskLevel === "medium") return "medium";
    return "low";
  }

  estimateDuration(context) {
    return context?.estimatedDuration || context?.estimatedTime || 30;
  }
}

let analyzerInstance = null;

export function getComplexityAnalyzer() {
  if (!analyzerInstance) analyzerInstance = new ComplexityAnalyzer();
  return analyzerInstance;
}

export const complexityAnalyzer = getComplexityAnalyzer();
