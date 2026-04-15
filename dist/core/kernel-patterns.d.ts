/**
 * 0xRay Kernel Pattern Definitions
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
export interface KernelInferenceResult {
    pattern?: KernelPattern;
    actionRequired?: string;
    confidence: number;
    fatalAssumptions?: FatalAssumption[];
    cascadePatterns?: BugCascade[];
    level?: 'L1' | 'L2' | 'L3' | 'L4' | 'L5';
    recommendations?: string[];
}
export interface KernelConfig {
    enabled: boolean;
    confidenceThreshold: number;
    maxPatternsPerAnalysis: number;
    enableLearning: boolean;
    autoPrevention: boolean;
}
export interface EmergentPattern {
    id: string;
    pattern: string;
    trigger: string[];
    action: string;
    confidence: number;
    category: 'FATAL' | 'CASCADE' | 'PREVENTION' | 'DECISION';
    frequency: number;
    lastDetected: Date;
    effectiveness: number;
    firstSeen?: Date;
    lastSeen?: Date;
    suggestedAction?: string;
    userRequest?: string;
    generatedPrompt?: string;
    templatePrompt?: string;
    evidence?: Record<string, unknown>[] | undefined;
    stringEvidence?: string[] | undefined;
}
export interface PatternUpdate {
    patternId: string;
    type: 'CONFIDENCE' | 'FREQUENCY' | 'TRIGGER' | 'ACTION';
    oldValue: number | string | string[];
    newValue: number | string | string[];
    timestamp: Date;
    reason: string;
    updateType?: string;
    confidence?: number;
    validated?: boolean;
    changes?: Record<string, unknown>[];
}
export interface PatternDriftInfo {
    patternId: string;
    driftDetected: boolean;
    severity: 'low' | 'medium' | 'high';
    metrics: {
        confidenceDrift: number;
        frequencyChange: number;
        effectivenessDecline: number;
    };
}
export interface AdaptiveThresholds {
    confidenceMin: number;
    confidenceMax: number;
    frequencyMin: number;
    frequencyMax: number;
    effectivenessMin: number;
    effectivenessMax: number;
    learningRate: number;
    adaptationWindow: number;
    perAgent?: Record<string, {
        confidenceMin: number;
        confidenceMax: number;
        frequencyMin: number;
        frequencyMax: number;
        effectivenessMin: number;
        effectivenessMax: number;
    }>;
    overall?: {
        confidenceMin: number;
        confidenceMax: number;
        frequencyMin: number;
        frequencyMax: number;
    };
}
export declare class KernelAnalyzer {
    private config;
    private patterns;
    private assumptions;
    private cascades;
    constructor(config?: Partial<KernelConfig>);
    private initializePatterns;
    analyze(observation: string): KernelInferenceResult;
    process(task: string): KernelInferenceResult;
    learn(outcome: {
        success: boolean;
        patternUsed: string;
        feedback?: string;
    }): void;
    getConfig(): KernelConfig;
    updateConfig(updates: Partial<KernelConfig>): void;
}
export declare function getKernel(): KernelAnalyzer;
export declare function resetKernel(): void;
//# sourceMappingURL=kernel-patterns.d.ts.map