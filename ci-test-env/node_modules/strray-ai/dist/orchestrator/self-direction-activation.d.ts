/**
 * Self-Direction Activation System (Simplified)
 *
 * Commercial version with autonomous self-direction capabilities.
 * Activates the framework's dormant self-evolution systems for continuous improvement.
 * This version works without advanced-features dependencies for initial deployment.
 *
 * @version 2.0.0
 * @since 2026-01-24
 */
export interface SelfDirectionConfig {
    monitoringInterval: number;
    analyticsInterval: number;
    learningCycleInterval: number;
    autonomousReporting: boolean;
    predictiveOptimization: boolean;
    scalingAutonomy: boolean;
    evolutionSafety: boolean;
}
export interface SelfAssessmentReport {
    timestamp: number;
    healthScore: number;
    criticalIssues: CriticalIssue[];
    improvementOpportunities: ImprovementOpportunity[];
    predictions: SystemPrediction[];
    recommendations: string[];
}
export interface CriticalIssue {
    id: string;
    severity: "low" | "medium" | "high" | "critical";
    component: string;
    description: string;
    impact: string;
    recommendedAction: string;
}
export interface ImprovementOpportunity {
    id: string;
    type: "performance" | "reliability" | "efficiency" | "capability";
    description: string;
    potentialBenefit: string;
    implementationComplexity: "low" | "medium" | "high";
    confidence: number;
}
export interface SystemPrediction {
    type: "scaling" | "performance" | "reliability" | "resource";
    prediction: string;
    confidence: number;
    timeHorizon: number;
    recommendedAction?: string;
}
/**
 * Simplified Self-Direction Activation System
 *
 * Provides basic self-direction capabilities without advanced-features dependencies
 * for initial deployment and testing.
 */
export declare class SelfDirectionSystem {
    private config;
    private activeMonitoring;
    private activeLearning;
    private monitoringIntervalId;
    private learningIntervalId;
    constructor(config?: Partial<SelfDirectionConfig>);
    /**
     * Phase 1: Activate Self-Monitoring Foundation
     */
    activateSelfMonitoring(): Promise<void>;
    /**
     * Setup autonomous critical issue reporting
     */
    private setupAutonomousReporting;
    /**
     * Start continuous self-assessment cycle
     */
    private startContinuousSelfAssessment;
    /**
     * Phase 2: Activate Self-Evolution Learning
     */
    activateSelfEvolution(): Promise<void>;
    /**
     * Start learning cycles
     */
    private startLearningCycles;
    /**
     * Core self-assessment method
     */
    performSelfAssessment(): Promise<SelfAssessmentReport>;
    /**
     * Process self-assessment results
     */
    private processSelfAssessmentResults;
    /**
     * Get current self-direction status
     */
    getStatus(): {
        activeMonitoring: boolean;
        activeLearning: boolean;
        config: SelfDirectionConfig;
        componentsHealth: Record<string, boolean>;
    };
    /**
     * Shutdown self-direction system
     */
    shutdown(): Promise<void>;
}
/**
 * Export singleton instance
 */
export declare const selfDirectionSystem: SelfDirectionSystem;
//# sourceMappingURL=self-direction-activation.d.ts.map