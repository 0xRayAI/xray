/**
 * Consent Manager for 0xRay Central Analytics
 *
 * Manages user consent for analytics data submission with granular
 * control over what categories can be shared.
 *
 * @version 1.0.0
 * @since 2026-03-06
 */
export interface ConsentConfiguration {
    analyticsEnabled: boolean;
    consentDate: Date;
    consentVersion: string;
    lastOptOut: Date | undefined;
    categories: {
        reflections: boolean;
        logs: boolean;
        metrics: boolean;
        patterns: boolean;
    };
    projectId: string;
}
export interface ConsentCategory {
    name: string;
    description: string;
    enabled: boolean;
}
export declare class ConsentManager {
    private configPath;
    private config;
    private submissionQueue;
    constructor(configPath?: string | undefined);
    /**
     * Initialize consent manager - load existing config or create default
     */
    initialize(): Promise<ConsentConfiguration>;
    /**
     * Enable analytics (opt-in)
     */
    enableConsent(categories?: string[]): Promise<void>;
    /**
     * Disable analytics (opt-out)
     */
    disableConsent(): Promise<void>;
    /**
     * Check if submission is allowed for a category
     */
    canSubmit(category: string): boolean;
    /**
     * Get current consent status
     */
    getStatus(): Promise<ConsentConfiguration>;
    /**
     * Enable specific category
     */
    enableCategory(category: string): Promise<void>;
    /**
     * Disable specific category
     */
    disableCategory(category: string): Promise<void>;
    /**
     * Get all categories with their status
     */
    getCategories(): ConsentCategory[];
    /**
     * Generate anonymous project ID
     */
    private generateProjectId;
    /**
     * Create default disabled configuration
     */
    private createDefaultConfig;
    /**
     * Load configuration from file
     */
    private loadConfig;
    /**
     * Save configuration to file
     */
    private saveConfig;
    /**
     * Clear submission queue
     */
    private clearSubmissionQueue;
    /**
     * Add item to submission queue
     */
    queueSubmission(data: unknown): Promise<void>;
    /**
     * Save submission queue to file
     */
    private saveSubmissionQueue;
}
//# sourceMappingURL=consent-manager.d.ts.map