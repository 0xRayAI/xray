/**
 * Inference Tuner - Autonomous Learning Service
 *
 * Implements the autonomous inference improvement loop:
 * 1. Collects routing outcomes and pattern metrics
 * 2. Analyzes performance and detects drift
 * 3. Generates refinement reports
 * 4. Updates configuration automatically
 *
 * @module services
 * @version 1.0.0
 */


import * as fs from "fs";
import * as path from "path";
import { routingOutcomeTracker } from "../delegation/analytics/outcome-tracker.js";
import { patternPerformanceTracker } from "../analytics/pattern-performance-tracker.js";
import { routingPerformanceAnalyzer } from "../analytics/routing-performance-analyzer.js";
import { promptPatternAnalyzer } from "../analytics/prompt-pattern-analyzer.js";
import { routingRefiner } from "../analytics/routing-refiner.js";
import { getAdaptiveKernel } from "../core/adaptive-kernel.js";
import { frameworkLogger } from "../core/framework-logger.js";

export interface TuningConfig {
  autoUpdateMappings: boolean;
  autoUpdateThresholds: boolean;
  minConfidenceThreshold: number;
  minSuccessRateForAutoAdd: number;
  learningIntervalMs: number;
  maxMappingsToAdd: number;
}

const DEFAULT_CONFIG: TuningConfig = {
  autoUpdateMappings: true,
  autoUpdateThresholds: true,
  minConfidenceThreshold: 0.7,
  minSuccessRateForAutoAdd: 0.8,
  learningIntervalMs: 60000,
  maxMappingsToAdd: 5,
};

export class InferenceTuner {
  private config: TuningConfig;
  private lastTuningTime: number = 0;
  private tuningInProgress: boolean = false;
  private tuningInterval: NodeJS.Timeout | null = null;

  constructor(config: Partial<TuningConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Start autonomous tuning
   */
  start(): void {
    if (this.tuningInterval) {
      return;
    }

    frameworkLogger.log(
      "inference-tuner",
      "starting",
      "info",
      { config: this.config }
    );

    this.tuningInterval = setInterval(() => {
      this.runTuningCycle().catch((err) => {
        frameworkLogger.log(
          "inference-tuner",
          "tuning-error",
          "error",
          { error: String(err) }
        );
      });
    }, this.config.learningIntervalMs);

    this.runTuningCycle().catch((e) => frameworkLogger.log("inference-tuner", "initial-tuning-error", "error", { error: e }));
  }

  /**
   * Stop autonomous tuning
   */
  stop(): void {
    if (this.tuningInterval) {
      clearInterval(this.tuningInterval);
      this.tuningInterval = null;
      frameworkLogger.log("inference-tuner", "stopped", "info", {});
    }
  }

  /**
   * Run a single tuning cycle
   */
  async runTuningCycle(): Promise<void> {
    if (this.tuningInProgress) {
      return;
    }

    this.tuningInProgress = true;

    try {
      routingOutcomeTracker.reloadFromDisk();
      patternPerformanceTracker.loadFromDisk();

      const outcomes = routingOutcomeTracker.getOutcomes();
      const patterns = patternPerformanceTracker.getAllPatternMetrics();

      if (outcomes.length < 5 && patterns.length < 3) {
        frameworkLogger.log(
          "inference-tuner",
          "skipping-insufficient-data",
          "debug",
          { outcomes: outcomes.length, patterns: patterns.length }
        );
        return;
      }

      frameworkLogger.log(
        "inference-tuner",
        "tuning-cycle-start",
        "info",
        { outcomes: outcomes.length, patterns: patterns.length }
      );

      const results = await this.performTuning(outcomes, patterns);

      if (results.mappingsUpdated) {
        frameworkLogger.log(
          "inference-tuner",
          "tuning-cycle-complete",
          "info",
          { mappingsAdded: results.mappingsAdded }
        );
      }

      this.lastTuningTime = Date.now();
    } finally {
      this.tuningInProgress = false;
    }
  }

  /**
   * Perform the actual tuning work
   */
  private async performTuning(
    outcomes: Array<{
      taskId: string;
      taskDescription: string;
      routedAgent: string;
      routedSkill: string;
      confidence: number;
      success?: boolean;
      complexity?: number;
    }>,
    patterns: Array<{
      patternId: string;
      totalUsages: number;
      successRate: number;
      avgConfidence: number;
    }>
  ): Promise<{
    mappingsAdded: number;
    mappingsModified: number;
    thresholdsUpdated: boolean;
    mappingsUpdated: boolean;
  }> {
    const result = {
      mappingsAdded: 0,
      mappingsModified: 0,
      thresholdsUpdated: false,
      mappingsUpdated: false,
    };

    try {
      const perfReport = routingPerformanceAnalyzer.generatePerformanceReport();
      const promptAnalysis = promptPatternAnalyzer.analyzePromptPatterns();
      
      const kernel = getAdaptiveKernel();
      kernel.triggerLearning(outcomes.map(o => ({
        taskId: o.taskId,
        taskDescription: o.taskDescription,
        routedAgent: o.routedAgent,
        routedSkill: o.routedSkill,
        confidence: o.confidence,
        success: o.success ?? true
      })), []);

      if (this.config.autoUpdateMappings) {
        const newMappings = this.suggestMappingsFromPatterns(patterns, outcomes);
        for (const mapping of newMappings.slice(0, this.config.maxMappingsToAdd)) {
          const added = this.addKeywordMapping(
            mapping.keyword,
            mapping.agent,
            mapping.skill,
            mapping.confidence
          );
          if (added) {
            result.mappingsAdded++;
          }
        }
        result.mappingsUpdated = result.mappingsAdded > 0;
      }

      // Apply routing refiner suggestions
      try {
        const refinerReport = routingRefiner.generateRefinementReport();
        const configUpdate = refinerReport.configurationUpdate;
        if (configUpdate.newMappings.length > 0) {
          for (const suggestion of configUpdate.newMappings.slice(0, this.config.maxMappingsToAdd)) {
            const added = this.addKeywordMapping(
              suggestion.keyword,
              suggestion.targetAgent,
              suggestion.targetSkill,
              suggestion.suggestedConfidence
            );
            if (added) {
              result.mappingsAdded++;
            }
          }
          result.mappingsUpdated = result.mappingsUpdated || result.mappingsAdded > 0;
        }
      } catch (refinerError) {
        frameworkLogger.log(
          "inference-tuner",
          "refiner-error",
          "warning",
          { error: String(refinerError) }
        );
      }
    } catch (error) {
      frameworkLogger.log(
        "inference-tuner",
        "tuning-error",
        "error",
        { error: String(error) }
      );
    }

    return result;
  }

  /**
   * Suggest new mappings based on patterns and outcomes
   */
  private suggestMappingsFromPatterns(
    patterns: Array<{ patternId: string; totalUsages: number; successRate: number; avgConfidence: number }>,
    outcomes: Array<{ taskDescription: string; routedAgent: string; routedSkill: string; success?: boolean }>
  ): Array<{ keyword: string; agent: string; skill: string; confidence: number }> {
    const suggestions: Array<{ keyword: string; agent: string; skill: string; confidence: number }> = [];
    
    for (const pattern of patterns) {
      if (pattern.totalUsages >= 3 && pattern.successRate >= this.config.minSuccessRateForAutoAdd) {
        const parts = pattern.patternId.split(":");
        const agent = parts[0] ?? "";
        const skill = parts.length > 1 ? (parts[1] ?? parts[0] ?? "") : "";
        
        if (!agent || !skill) continue;
        
        const matchingOutcome = outcomes.find(o => o.routedAgent === agent);
        
        if (matchingOutcome) {
          const words = matchingOutcome.taskDescription.toLowerCase().split(/\s+/);
          const significantWords = words.filter(w => w.length > 4 && !["the", "this", "that", "with", "from"].includes(w));
          
          if (significantWords.length > 0) {
            const keyword = significantWords[0] ?? "";
            if (keyword) {
              suggestions.push({
                keyword,
                agent,
                skill,
                confidence: Math.min(pattern.avgConfidence, 0.9),
              });
            }
          }
        }
      }
    }
    
    return suggestions;
  }

  /**
   * Resolve the path to the routing-mappings.json file.
   * Checks multiple known locations and returns the first one found.
   */
  private resolveMappingsPath(): string | null {
    const candidates = [
      path.resolve(process.cwd(), ".xray/routing-mappings.json"),
      path.resolve(process.cwd(), "xray/routing-mappings.json"),
      path.resolve(process.cwd(), ".opencode/xray/routing-mappings.json"),
      path.resolve(process.cwd(), "routing-mappings.json"),
    ];
    for (const p of candidates) {
      if (fs.existsSync(p)) return p;
    }
    return candidates[0] ?? null; // Default to primary location even if it doesn't exist yet
  }

  /**
   * Load current routing mappings from disk.
   */
  private loadMappings(): Array<{
    keywords: string[];
    skill: string;
    agent: string;
    confidence: number;
  }> {
    const mappingsPath = this.resolveMappingsPath();
    try {
      if (mappingsPath && fs.existsSync(mappingsPath)) {
        const data = fs.readFileSync(mappingsPath, "utf-8");
        return JSON.parse(data);
      }
    } catch {
      // Fall through to empty array
    }
    return [];
  }

  /**
   * Save routing mappings to disk.
   */
  private saveMappings(mappings: Array<{
    keywords: string[];
    skill: string;
    agent: string;
    confidence: number;
  }>): boolean {
    const mappingsPath = this.resolveMappingsPath();
    if (!mappingsPath) return false;

    try {
      const dir = path.dirname(mappingsPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(mappingsPath, JSON.stringify(mappings, null, 2));
      return true;
    } catch (error) {
      frameworkLogger.log(
        "inference-tuner",
        "mappings-save-error",
        "error",
        { error: String(error), path: mappingsPath }
      );
      return false;
    }
  }

  /**
   * Add a keyword mapping to the routing-mappings.json file.
   *
   * Checks for conflicts (keyword already mapped to a different agent)
   * before adding. If the keyword already exists for the same agent,
   * updates the confidence if the new value is higher.
   */
  private addKeywordMapping(
    keyword: string,
    agent: string,
    skill: string,
    confidence: number
  ): boolean {
    if (!keyword || keyword.length < 3) return false;
    if (!agent || !skill) return false;
    if (confidence < this.config.minConfidenceThreshold) return false;

    const mappings = this.loadMappings();
    const normalizedKeyword = keyword.toLowerCase();

    // Check if this keyword is already mapped to a DIFFERENT agent (conflict)
    for (const mapping of mappings) {
      if (mapping.keywords.some(k => k === normalizedKeyword)) {
        if (mapping.agent !== agent) {
          // Conflict: keyword already belongs to another agent. Skip.
          frameworkLogger.log(
            "inference-tuner",
            "mapping-conflict",
            "debug",
            { keyword: normalizedKeyword, existingAgent: mapping.agent, newAgent: agent }
          );
          return false;
        }
        // Same agent — boost confidence if higher
        if (confidence > mapping.confidence) {
          mapping.confidence = confidence;
          const saved = this.saveMappings(mappings);
          frameworkLogger.log(
            "inference-tuner",
            "mapping-confidence-updated",
            "info",
            { keyword: normalizedKeyword, agent, oldConfidence: mapping.confidence, newConfidence: confidence }
          );
          return saved;
        }
        return false; // Already exists with >= confidence
      }
    }

    // Find existing mapping for this agent/skill combo to add keyword to
    const existingMapping = mappings.find(m => m.agent === agent && m.skill === skill);
    if (existingMapping) {
      if (!existingMapping.keywords.includes(normalizedKeyword)) {
        existingMapping.keywords.push(normalizedKeyword);
        const saved = this.saveMappings(mappings);
        frameworkLogger.log(
          "inference-tuner",
          "keyword-added-to-mapping",
          "info",
          { keyword: normalizedKeyword, agent, skill }
        );
        return saved;
      }
      return false;
    }

    // Create a new mapping entry
    mappings.push({
      keywords: [normalizedKeyword],
      skill,
      agent,
      confidence,
    });

    const saved = this.saveMappings(mappings);
    if (saved) {
      frameworkLogger.log(
        "inference-tuner",
        "new-mapping-created",
        "info",
        { keyword: normalizedKeyword, agent, skill, confidence }
      );
    }
    return saved;
  }

  /**
   * Get tuning status
   */
  getStatus(): {
    running: boolean;
    lastTuningTime: number;
    config: TuningConfig;
  } {
    return {
      running: this.tuningInterval !== null,
      lastTuningTime: this.lastTuningTime,
      config: this.config,
    };
  }
}

// Singleton instance
export const inferenceTuner = new InferenceTuner();
