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
export interface TuningConfig {
    autoUpdateMappings: boolean;
    autoUpdateThresholds: boolean;
    minConfidenceThreshold: number;
    minSuccessRateForAutoAdd: number;
    learningIntervalMs: number;
    maxMappingsToAdd: number;
}
export declare class InferenceTuner {
    private config;
    private lastTuningTime;
    private tuningInProgress;
    private tuningInterval;
    constructor(config?: Partial<TuningConfig>);
    /**
     * Start autonomous tuning
     */
    start(): void;
    /**
     * Stop autonomous tuning
     */
    stop(): void;
    /**
     * Run a single tuning cycle
     */
    runTuningCycle(): Promise<void>;
    /**
     * Perform the actual tuning work
     */
    private performTuning;
    /**
     * Suggest new mappings based on patterns and outcomes
     */
    private suggestMappingsFromPatterns;
    /**
     * Resolve the path to the routing-mappings.json file.
     * Checks multiple known locations and returns the first one found.
     */
    private resolveMappingsPath;
    /**
     * Load current routing mappings from disk.
     */
    private loadMappings;
    /**
     * Save routing mappings to disk.
     */
    private saveMappings;
    /**
     * Add a keyword mapping to the routing-mappings.json file.
     *
     * Checks for conflicts (keyword already mapped to a different agent)
     * before adding. If the keyword already exists for the same agent,
     * updates the confidence if the new value is higher.
     */
    private addKeywordMapping;
    /**
     * Get tuning status
     */
    getStatus(): {
        running: boolean;
        lastTuningTime: number;
        config: TuningConfig;
    };
}
export declare const inferenceTuner: InferenceTuner;
//# sourceMappingURL=inference-tuner.d.ts.map