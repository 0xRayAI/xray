/**
 * Estimation Validator
 *
 * Tracks estimates vs. actuals and provides calibrated estimates
 * Prevents the "always estimate high" syndrome by learning from history
 */
/**
 * Estimation Validator
 * Tracks estimates and learns from actuals to improve future predictions
 */
export declare class EstimationValidator {
    private estimations;
    private calibrations;
    private readonly STORAGE_KEY;
    constructor();
    /**
     * Start tracking an estimate
     */
    startEstimate(taskId: string, description: string, category: string, estimatedMinutes: number, confidence?: 'high' | 'medium' | 'low'): void;
    /**
     * Complete tracking and record actual time
     */
    completeEstimate(taskId: string): void;
    /**
     * Get calibrated estimate based on historical data
     */
    getCalibratedEstimate(category: string, baseEstimate: number, confidence?: 'high' | 'medium' | 'low'): {
        calibratedEstimate: number;
        calibrationFactor: number;
        confidence: number;
    };
    /**
     * Check if an estimate needs adjustment
     */
    validateEstimate(category: string, estimate: number): {
        isReasonable: boolean;
        suggestedEstimate: number;
        warning?: string;
    };
    /**
     * Get estimation accuracy report
     */
    getAccuracyReport(): {
        overallAccuracy: number;
        categoryBreakdown: Array<{
            category: string;
            sampleSize: number;
            avgRatio: number;
            trend: 'over' | 'under' | 'accurate';
        }>;
        recommendations: string[];
    };
    private updateCalibration;
    private loadFromStorage;
    private saveToStorage;
}
export declare function getEstimationValidator(): EstimationValidator;
/**
 * Decorator for async functions to track estimates
 */
export declare function trackEstimate(taskId: string, description: string, category: string, estimatedMinutes: number): (_target: unknown, _propertyKey: string, descriptor: PropertyDescriptor) => PropertyDescriptor;
//# sourceMappingURL=estimation-validator.d.ts.map