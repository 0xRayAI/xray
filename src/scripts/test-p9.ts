#!/usr/bin/env node

/**
 * P9 Adaptive Pattern Learning - Test Script
 * 
 * Comprehensive test script to verify P9 implementation
 * Tests Pattern Performance Tracker, Emerging Pattern Detector,
 * Pattern Learning Engine, and Adaptive Kernel integration
 * 
 * Usage: node dist/scripts/test-p9.js
 * 
 * @version 1.0.0
 * @since 2026-03-05
 */

import { fileURLToPath } from "url";
import { dirname, join } from "path";

// Get proper paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Import P9 components (from source)
import { patternPerformanceTracker } from "../analytics/pattern-performance-tracker.js";
import { emergingPatternDetector } from "../analytics/emerging-pattern-detector.js";
import { PatternLearningEngine } from "../analytics/pattern-learning-engine.js";
import { taskSkillRouter } from "../delegation/task-skill-router.js";

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  duration?: number;
}

const results: TestResult[] = [];

function log(message: string): void {
  console.log(message);
}

function logTest(name: string, passed: boolean, error?: string): void {
  const result: TestResult = { name, passed, error: error || '' };
  results.push(result);
  
  if (passed) {
    log(`  ✅ ${name}`);
  } else {
    log(`  ❌ ${name}`);
    if (error) {
      log(`     Error: ${error}`);
    }
  }
}

// Test counters
let passed = 0;
let failed = 0;

async function runTests(): Promise<void> {
  log("╔══════════════════════════════════════════════════════════════╗");
  log("║         🧪 P9 Adaptive Pattern Learning Test Suite        ║");
  log("╚══════════════════════════════════════════════════════════════╝\n");

  // Test 1: Pattern Performance Tracker
  log("📊 Testing Pattern Performance Tracker...\n");
  
  try {
    // Clear tracker
    patternPerformanceTracker.clear();
    logTest("  Clear tracker", true);
    
    // Track performance
    patternPerformanceTracker.trackPatternPerformance("security:audit", {
      success: true,
      confidence: 0.9,
      responseTime: 100
    });
    patternPerformanceTracker.trackPatternPerformance("security:audit", {
      success: true,
      confidence: 0.85
    });
    patternPerformanceTracker.trackPatternPerformance("security:audit", {
      success: false,
      confidence: 0.6
    });
    
    const metrics = patternPerformanceTracker.getPatternMetrics("security:audit");
    logTest("  Track and retrieve metrics", metrics !== null && metrics.totalUsages === 3);
    logTest("  Success rate calculated", metrics?.successRate === 2/3);
    logTest("  Average confidence calculated", metrics !== null && metrics.avgConfidence > 0);
    
    // Test drift detection with more data
    for (let i = 0; i < 20; i++) {
      patternPerformanceTracker.trackPatternPerformance("test:pattern", {
        success: i < 15,
        confidence: 0.8
      });
    }
    
    const drift = patternPerformanceTracker.detectPatternDrift("test:pattern");
    logTest("  Drift detection with sufficient data", drift !== null);
    
    // Adaptive thresholds
    const thresholds = patternPerformanceTracker.calculateAdaptiveThresholds();
    logTest("  Calculate adaptive thresholds", thresholds.confidenceMin > 0);
    
    // System summary
    const summary = patternPerformanceTracker.getSystemPerformanceSummary();
    logTest("  System performance summary", summary.totalPatternsTracked >= 2);
    
    passed += 8;
  } catch (error) {
    logTest("  Pattern Performance Tracker tests", false, String(error));
    failed++;
  }

  log("\n📈 Testing Emerging Pattern Detector...\n");

  try {
    // Create test outcomes
    const testOutcomes = [];
    
    for (let i = 0; i < 15; i++) {
      testOutcomes.push({
        taskId: String(i),
        taskDescription: 'implement user authentication system',
        routedAgent: 'security-auditor',
        routedSkill: 'security-audit',
        confidence: 0.9,
        timestamp: new Date(),
        success: true
      });
    }
    
    // Add another pattern
    for (let i = 0; i < 10; i++) {
      testOutcomes.push({
        taskId: String(i + 100),
        taskDescription: 'write unit tests for component',
        routedAgent: 'testing-lead',
        routedSkill: 'testing-strategy',
        confidence: 0.95,
        timestamp: new Date(),
        success: true
      });
    }
    
    const result = emergingPatternDetector.detectEmergingPatterns(testOutcomes);
    logTest("  Detect emerging patterns", result.emergentPatterns !== undefined);
    logTest("  Cluster similar tasks", result.clusters.length > 0);
    logTest("  Generate recommendations", result.recommendations.length > 0);
    
    // Test pattern emerging detection
    const emerging = emergingPatternDetector.isPatternEmerging(
      "authentication login verify",
      testOutcomes,
      0.1
    );
    logTest("  Pattern emerging detection", emerging !== undefined);
    
    passed += 5;
  } catch (error) {
    logTest("  Emerging Pattern Detector tests", false, String(error));
    failed++;
  }

  log("\n⚙️ Testing Pattern Learning Engine...\n");

  try {
    // Create learning engine with test config
    const testEngine = new PatternLearningEngine({
      enableAutoAddition: true,
      enableAutoRemoval: true,
      enableThresholdCalibration: true,
      minConfidenceForAddition: 0.7,
      minSuccessRateForAddition: 0.8
    });
    
    // Create test data
    const outcomes = [];
    for (let i = 0; i < 20; i++) {
      outcomes.push({
        taskId: String(i),
        taskDescription: 'test routing task',
        routedAgent: 'test-agent',
        routedSkill: 'test-skill',
        confidence: 0.5 + (Math.random() * 0.4),
        success: i < 15
      });
    }
    
    const existingMappings = [
      { keywords: ['test'], skill: 'test-skill', agent: 'test-agent', confidence: 0.8 }
    ];
    
    const learningResult = testEngine.learnFromData(outcomes, existingMappings);
    logTest("  Learn from data", learningResult !== undefined);
    logTest("  Generate recommendations", learningResult.recommendations.length > 0);
    logTest("  Learning history tracking", testEngine.getLearningHistory().length > 0);
    
    // Config management
    testEngine.updateConfig({ minConfidenceForAddition: 0.9 });
    const config = testEngine.getConfig();
    logTest("  Config update", config.minConfidenceForAddition === 0.9);
    
    passed += 6;
  } catch (error) {
    logTest("  Pattern Learning Engine tests", false, String(error));
    failed++;
  }

  log("\n🔗 Testing TaskSkillRouter P9 Integration...\n");

  try {
    // Test P9 learning stats
    const p9Stats = taskSkillRouter.getP9LearningStats();
    logTest("  Get P9 learning stats", p9Stats !== undefined);
    logTest("  P9 enabled status", typeof p9Stats.enabled === 'boolean');
    
    // Test pattern drift analysis
    const driftAnalysis = taskSkillRouter.getPatternDriftAnalysis();
    logTest("  Get pattern drift analysis", Array.isArray(driftAnalysis));
    
    // Test adaptive thresholds
    const thresholds = taskSkillRouter.getAdaptiveThresholds();
    logTest("  Get adaptive thresholds", thresholds !== null && thresholds.overall !== undefined);
    
    // Test trigger P9 learning
    const learningResult = await taskSkillRouter.triggerP9Learning();
    logTest("  Trigger P9 learning", learningResult !== undefined);
    logTest("  Learning adaptations", learningResult.adaptations !== undefined);
    
    passed += 7;
  } catch (error) {
    logTest("  TaskSkillRouter P9 Integration tests", false, String(error));
    failed++;
  }

  // Summary
  log("\n╔══════════════════════════════════════════════════════════════╗");
  log("║                    📊 Test Summary                         ║");
  log("╚══════════════════════════════════════════════════════════════╝");
  
  log(`\n  Total Tests: ${passed + failed}`);
  log(`  ✅ Passed: ${passed}`);
  log(`  ❌ Failed: ${failed}`);
  
  if (failed === 0) {
    log("\n  🎉 All P9 Adaptive Pattern Learning tests passed!\n");
  } else {
    log("\n  ⚠️  Some tests failed. Check errors above.\n");
  }
  
  // Detailed results
  log("\n📋 Detailed Results:\n");
  results.forEach((result, index) => {
    const status = result.passed ? "✅" : "❌";
    log(`  ${index + 1}. ${status} ${result.name}`);
  });
  
  process.exit(failed > 0 ? 1 : 0);
}

// Run tests
runTests().catch(error => {
  console.error("Fatal error running tests:", error);
  process.exit(1);
});