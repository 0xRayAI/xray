/**
 * Webhook Trigger for Post-Processor
 *
 * Provides a generic webhook server that receives events from external
 * services (GitHub, GitLab, Bitbucket, Stripe) and routes them
 * to the PostProcessor for execution.
 *
 * @version 2.0.0
 * @since 2026-03-08
 */
import express from 'express';
import { PostProcessor } from '../PostProcessor.js';
import { PostProcessorContext } from '../types.js';
export interface WebhookConfig {
    secret?: string;
    provider?: 'github' | 'gitlab' | 'bitbucket' | 'stripe';
    events?: string[];
    path?: string;
    verifySignature?: boolean;
}
export interface WebhookEvent {
    provider: string;
    event: string;
    payload: unknown;
    headers: Record<string, string>;
    signature?: string;
}
export declare class WebhookTrigger {
    private postProcessor;
    private initialized;
    private app;
    private config;
    constructor(postProcessor: PostProcessor, config?: WebhookConfig);
    initialize(): Promise<void>;
    private setupWebhookEndpoint;
    private verifySignature;
    /**
     * Extract files from webhook payload
     *
     * Different webhook providers have different payload structures.
     * This method extracts files in a unified way.
     */
    private extractFilesFromPayload;
    triggerPostProcessor(context: PostProcessorContext): Promise<void>;
    getApp(): express.Application;
    shutdown(): void;
}
//# sourceMappingURL=WebhookTrigger.d.ts.map