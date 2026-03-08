/**
 * StringRay Kernel Pattern Definitions
 * 
 * Pattern definitions from v1.1.0 → v2.0 kernel update
 * Includes 35+ patterns from 80+ reflections
 * 
 * @version 2.0.0-SECURITY-ENHANCED
 */

export interface KernelPattern {
  id: string;
  trigger: string[];
  action: string;
  confidence: number;
  level: 'L1' | 'L2' | 'L3' | 'L4' | 'L5';
  category: 'FATAL' | 'CASCADE' | 'PREVENTION' | 'DECISION';
}

export interface FatalAssumption {
  id: string;
  trigger: string[];
  action: string;
  reason: string;
  level: number;
}

export interface BugCascade {
  id: string;
  pattern: string;
  detection: string;
  fix: string;
  priority: number;
}

// P9: ADAPTIVE_PATTERN_LEARNING interfaces
export interface PatternDriftInfo {
  detected: boolean;
  patternId: string;
  driftMagnitude: number;
  driftDirection: 'increasing' | 'decreasing' | 'unstable';
  timeRange: { start: Date; end: Date };
  recommendedAction: string;
}

export interface EmergentPattern {
  pattern: string;
  confidence: number;
  frequency: number;
  firstSeen: Date;
  lastSeen: Date;
  evidence: string[];
  suggestedAction: string;
}

export interface AdaptiveThresholds {
  perAgent: Map<string, number>;
  perSkill: Map<string, number>;
  overall: number;
  calibrationDate: Date;
}

export interface PatternUpdate {
  updateType: 'add' | 'remove' | 'modify';
  patternId: string;
  changes: Record<string, unknown>;
  reason: string;
  confidence: number;
  validated: boolean;
}

export interface KernelInferenceResult {
  pattern?: KernelPattern;
  actionRequired?: string;
  confidence: number;
  fatalAssumptions?: FatalAssumption[];
  cascadePatterns?: BugCascade[];
  level?: 'L1' | 'L2' | 'L3' | 'L4' | 'L5';
  recommendations?: string[];
  
  // P9: ADAPTIVE_PATTERN_LEARNING fields
  adapted?: boolean;
  patternDrift?: PatternDriftInfo;
  emergentPatterns?: EmergentPattern[];
  adaptiveThresholds?: AdaptiveThresholds;
  suggestedUpdates?: PatternUpdate[];
}

export interface KernelConfig {
  enabled: boolean;
  confidenceThreshold: number;
  maxPatternsPerAnalysis: number;
  enableLearning: boolean;
  autoPrevention: boolean;
}

export class KernelAnalyzer {
  private config: KernelConfig;
  private patterns: Map<string, KernelPattern> = new Map();
  private assumptions: Map<string, FatalAssumption> = new Map();
  private cascades: Map<string, BugCascade> = new Map();

  constructor(config?: Partial<KernelConfig>) {
    this.config = {
      enabled: config?.enabled ?? true,
      confidenceThreshold: config?.confidenceThreshold ?? 0.75,
      maxPatternsPerAnalysis: config?.maxPatternsPerAnalysis ?? 10,
      enableLearning: config?.enableLearning ?? true,
      autoPrevention: config?.autoPrevention ?? true,
    };

    this.initializePatterns();
  }

  private initializePatterns(): void {
    // FATAL ASSUMPTIONS (A1-A9)
    this.assumptions.set('A1', {
      id: 'A1',
      trigger: ['works in dev', 'works locally', 'works on my machine'],
      action: 'TEST WHERE IT RUNS',
      reason: 'Works in dev assumption',
      level: 1
    });

    this.assumptions.set('A2', {
      id: 'A2',
      trigger: ['test pass', 'tests pass', 'all tests pass'],
      action: 'TESTS VALIDATE TESTS, NOT BUGS',
      reason: 'Test pass assumption',
      level: 1
    });

    this.assumptions.set('A3', {
      id: 'A3',
      trigger: ['code defined', 'function defined', 'code exist', 'function exist'],
      action: 'VERIFY EXECUTION NOT DEFINITION',
      reason: 'Code written assumption',
      level: 1
    });

    this.assumptions.set('A4', {
      id: 'A4',
      trigger: ['I understand', 'understand the framework'],
      action: 'FRAMEWORK SHAPES YOUR THINKING',
      reason: 'Understanding assumption',
      level: 3
    });

    this.assumptions.set('A5', {
      id: 'A5',
      trigger: ['manual process', 'manually', 'forgot to run', 'remember to'],
      action: 'AUTOMATE OR IT FAILS',
      reason: 'Manual process assumption',
      level: 1
    });

    this.assumptions.set('A6', {
      id: 'A6',
      trigger: ['more test', 'higher coverage', 'coverage increase'],
      action: 'SKIPPED TESTS = ARCHITECTURAL DEBT',
      reason: 'More tests assumption',
      level: 1
    });

    this.assumptions.set('A7', {
      id: 'A7',
      trigger: ['optimize', 'optimization', 'perfect'],
      action: '75% THRESHOLD - BEYOND COSTS MORE',
      reason: 'Optimization assumption',
      level: 2
    });

    // NEW v2.0 ASSUMPTIONS
    this.assumptions.set('A8', {
      id: 'A8',
      trigger: ['security later', 'optional security', 'after feature', 'not now security'],
      action: 'SECURITY_IS_FOUNDATION',
      reason: 'Security cannot be optional foundation',
      level: 1
    });

    this.assumptions.set('A9', {
      id: 'A9',
      trigger: ['works locally', 'localhost secure', 'tested locally'],
      action: 'PRODUCTION_ENVIRONMENT_TESTING',
      reason: 'Local ≠ production security',
      level: 2
    });

    // A10-A15: AI Degradation & Pre-Processor Requirements
    // CRITICAL: Prevent AI from making destructive changes without understanding
    
    this.assumptions.set('A10', {
      id: 'A10',
      trigger: ['change code', 'modify file', 'update production', 'edit system files'],
      action: 'UNDERSTAND_BEFORE_CHANGING',
      reason: 'AI must read and understand current code state before making any changes',
      level: 1  // FATAL - immediate blocking required
    });

    this.assumptions.set('A11', {
      id: 'A11',
      trigger: ['stuck', 'trying again', 'same operation', 'loop', 'degraded state'],
      action: 'OPERATION_LIMIT_EXCEEDED',
      reason: 'AI exceeded operation limits and must switch approach or request conference',
      level: 1  // FATAL - immediate blocking required
    });

    this.assumptions.set('A12', {
      id: 'A12',
      trigger: ['read file', 'check file', 'analyze code'],
      action: 'READ_OPERATION_LIMIT',
      reason: 'Maximum 3 read attempts per file exceeded - cannot read again',
      level: 1  // FATAL - immediate blocking required
    });

    this.assumptions.set('A13', {
      id: 'A13',
      trigger: ['comprehensive change', 'refactor', 'major modification'],
      action: 'SURGICAL_CHANGE_REQUIRED',
      reason: 'Large changes require explicit "comprehensive" keyword and multi-agent conference',
      level: 2  // HIGH PRIORITY
    });

    this.assumptions.set('A14', {
      id: 'A14',
      trigger: ['ai degradation', 'quality decline', 'regression', 'introducing bugs'],
      action: 'QUALITY_DECLINE_PREVENTION',
      reason: 'AI is making changes that degrade code quality - immediate stop and analysis required',
      level: 1  // FATAL - immediate blocking required
    });

    this.assumptions.set('A15', {
      id: 'A15',
      trigger: ['complex issue', 'major problem', 'architectural decision'],
      action: 'MULTI_AGENT_CONFERENCE_REQUIRED',
      reason: 'Complex issues require conference of 3+ agents before making changes',
      level: 2  // HIGH PRIORITY
    });

    // BUG CASCADE PATTERNS (P1-P8)
    this.cascades.set('P1', {
      id: 'P1',
      pattern: 'AI_DEGRADATION_LOOP',
      detection: 'activity_log | spawn_governor | file_read_loop | change_attempt_loop | stuck_operation',
      fix: 'PRE_PROCESSOR_ENFORCEMENT + OPERATION_LIMITS + MULTI_AGENT_CONFERENCE',
      priority: 1
    });

    this.cascades.set('P2', {
      id: 'P2',
      pattern: 'IMPLEMENTATION_DRIFT',
      detection: 'test_health | review_cycles',
      fix: 'regular test review cycles',
      priority: 2
    });

    this.cascades.set('P3', {
      id: 'P3',
      pattern: 'CONSUMER_PATH_TRAP',
      detection: 'fresh_test | consumer_default',
      fix: 'use consumer paths as default',
      priority: 1
    });

    this.cascades.set('P4', {
      id: 'P4',
      pattern: 'MCP_PROTOCOL_GAP',
      detection: 'timeout_despite_running | handshake',
      fix: 'add initialize request before tool calls',
      priority: 1
    });

    this.cascades.set('P5', {
      id: 'P5',
      pattern: 'VERSION_CHAOS',
      detection: 'auto_compliance | 3layer_enforce',
      fix: 'automated version enforcement system',
      priority: 2
    });

    // NEW v2.0 PATTERNS
    this.cascades.set('P6', {
      id: 'P6',
      pattern: 'SECURITY_VULNERABILITY',
      detection: 'security_audit | oauth2+api_key',
      fix: 'complete security re-architecture',
      priority: 1
    });

    this.cascades.set('P7', {
      id: 'P7',
      pattern: 'RELEASE_READINESS',
      detection: 'precommit_fails | comprehensive_validation',
      fix: '100% validation system',
      priority: 1
    });

    this.cascades.set('P8', {
      id: 'P8',
      pattern: 'FILE_READ_LOOP',
      detection: 'file_read_attempt > 3',
      fix: 'BLOCK_READ_OPERATION + REQUIRE_CODE_UNDERSTANDING',
      priority: 1
    });

    this.cascades.set('P9', {
      id: 'P9',
      pattern: 'CHANGE_ATTEMPT_LOOP',
      detection: 'change_attempt > 3 | same_change_repeatedly',
      fix: 'BLOCK_CHANGES + REQUIRE_MULTI_AGENT_CONFERENCE',
      priority: 1
    });

    this.cascades.set('P10', {
      id: 'P10',
      pattern: 'SURGICAL_VS_COMPREHENSIVE_MISMATCH',
      detection: 'large_change_without_comprehensive_keyword | system_change_without_context',
      fix: 'REQUIRE_SURGICAL_SPECIFICATION + MULTI_AGENT_REVIEW',
      priority: 1
    });

    // ADAPTIVE PATTERN LEARNING (P9) - Self-modifying patterns
    this.cascades.set('P9', {
      id: 'P9',
      pattern: 'ADAPTIVE_PATTERN_LEARNING',
      detection: 'low_performance | pattern_drift | emergent_behavior',
      fix: 'pattern_update + threshold_calibration + rule_generation',
      priority: 1  // Highest priority - continuous improvement
    });
  }

  analyze(observation: string): KernelInferenceResult {
    if (!this.config.enabled) {
      return { confidence: 0, recommendations: ['Kernel is disabled'] };
    }

    const lowerObs = observation.toLowerCase();
    const result: KernelInferenceResult = {
      confidence: 0.5, // Base confidence - start with reasonable value
      recommendations: [],
      fatalAssumptions: [],
      cascadePatterns: []
    };

    // Check fatal assumptions
    let maxAssumptionConfidence = 0;
    for (const [id, assumption] of this.assumptions.entries()) {
      for (const trigger of assumption.trigger) {
        if (lowerObs.includes(trigger.toLowerCase())) {
          result.fatalAssumptions = result.fatalAssumptions || [];
          result.fatalAssumptions.push(assumption);
          maxAssumptionConfidence = Math.max(maxAssumptionConfidence, 0.8);
          result.actionRequired = assumption.action;
          result.recommendations = result.recommendations || [];
          result.recommendations.push(`Detected assumption ${id}: ${assumption.reason}`);
        }
      }
    }

    // Check cascade patterns
    let maxCascadeConfidence = 0;
    for (const [id, cascade] of this.cascades.entries()) {
      if (lowerObs.includes(cascade.pattern.toLowerCase()) ||
          lowerObs.includes(cascade.detection.toLowerCase()) ||
          lowerObs.includes(cascade.id.toLowerCase())) {
        result.cascadePatterns = result.cascadePatterns || [];
        result.cascadePatterns.push(cascade);
        maxCascadeConfidence = Math.max(maxCascadeConfidence, 0.9);
        result.actionRequired = cascade.fix;
        result.recommendations = result.recommendations || [];
        result.recommendations.push(`Detected cascade ${id}: ${cascade.pattern}`);
      }
    }

    // Combine confidences - use highest match
    result.confidence = Math.max(0.5, maxAssumptionConfidence, maxCascadeConfidence);

    // Apply confidence threshold
    if (result.confidence < this.config.confidenceThreshold) {
      result.recommendations = result.recommendations || [];
      if (result.confidence === 0.5) {
        result.recommendations.push('Standard routing - no specific patterns detected');
      } else {
        result.recommendations.push('Low confidence - investigate manually');
      }
    }

    // Determine inference level
    if (result.fatalAssumptions && result.fatalAssumptions.length > 0) {
      result.level = 'L3'; // Assumption surfacing
    } else if (result.cascadePatterns && result.cascadePatterns.length > 0) {
      result.level = 'L2'; // Causal mapping
    } else {
      result.level = 'L1'; // Pattern recognition
    }

    return result;
  }

  process(task: string): KernelInferenceResult {
    const analysis = this.analyze(task);
    
    // Add meta-inference capabilities
    if (analysis.level === 'L1') {
      analysis.recommendations?.push('Pattern matched - proceed with caution');
    } else if (analysis.level === 'L2') {
      analysis.recommendations?.push('Causal analysis detected - investigate root cause');
    } else if (analysis.level === 'L3') {
      analysis.recommendations?.push('Assumptions detected - question and verify');
    }

    return analysis;
  }

  learn(outcome: { success: boolean; patternUsed: string; feedback?: string }): void {
    if (!this.config.enableLearning) return;

    // Reinforce successful patterns
    if (outcome.success) {
      const pattern = this.patterns.get(outcome.patternUsed);
      if (pattern) {
        pattern.confidence = Math.min(pattern.confidence + 0.05, 1.0);
      }
    }

    // Decrease confidence for failed patterns
    if (!outcome.success) {
      const pattern = this.patterns.get(outcome.patternUsed);
      if (pattern) {
        pattern.confidence = Math.max(pattern.confidence - 0.1, 0.1);
      }
    }
  }

  getConfig(): KernelConfig {
    return { ...this.config };
  }

  updateConfig(updates: Partial<KernelConfig>): void {
    this.config = { ...this.config, ...updates };
  }
}

// Export singleton instance
let kernelInstance: KernelAnalyzer | null = null;

export function getKernel(): KernelAnalyzer {
  if (!kernelInstance) {
    kernelInstance = new KernelAnalyzer();
  }
  return kernelInstance;
}

export function resetKernel(): void {
  kernelInstance = null;
}