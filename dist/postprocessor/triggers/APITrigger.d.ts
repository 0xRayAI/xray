/**
 * API Trigger for Post-Processor
 *
 * Provides a REST API endpoint to manually trigger PostProcessor
 * operations. Useful for CI/CD pipelines, manual test triggers,
 * and retry mechanisms.
 *
 * @version 2.0.0
 * @since 2026-03-08
 */
import express from 'express';
import { PostProcessor } from '../PostProcessor.js';
import { PostProcessorContext } from '../types.js';
export interface APIConfig {
    path?: string;
    apiKey?: string;
    enabled?: boolean;
}
export interface APIRequest {
    tool?: string;
    operation?: string;
    reason?: string;
}
export declare class APITrigger {
    private postProcessor;
    private initialized;
    private app;
    private config;
    constructor(postProcessor: PostProcessor, config: APIConfig);
    initialize(): Promise<void>;
    private setupAPIEndpoints;
    triggerPostProcessor(context: PostProcessorContext): Promise<void>;
    getApp(): express.Application;
    shutdown(): void;
}
//# sourceMappingURL=APITrigger.d.ts.map