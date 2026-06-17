/**
 * 0xRay Integration Layer
 *
 * Provides generic connectors for integrating 0xRay's PostProcessor
 * with external applications and frameworks.
 *
 * This is framework-agnostic - works with Express, Fastify, Koa, etc.
 *
 * @version 1.0.0
 * @since 2026-03-08
 */

import express from "express";
import { PostProcessor } from './PostProcessor.js';
import type { PostProcessorContext } from './types.js';

import type { WebhookConfig, WebhookEvent } from './triggers/WebhookTrigger.js';
import type { APIConfig, APIRequest } from './triggers/APITrigger.js';

import { WebhookTrigger } from './triggers/WebhookTrigger.js';
export { WebhookTrigger } from './triggers/WebhookTrigger.js';
import { APITrigger } from './triggers/APITrigger.js';
export { APITrigger } from './triggers/APITrigger.js';

export type { WebhookConfig, WebhookEvent } from './triggers/WebhookTrigger.js';
export type { APIConfig, APIRequest } from './triggers/APITrigger.js';

/**
 * Generic 0xRay integration for any external application
 * 
 * Provides:
 * - Webhook receivers (GitHub, GitLab, Bitbucket, Stripe)
 * - REST API triggers (manual trigger, retry, status)
 * - Framework-agnostic (works with Express, Fastify, Koa, etc.)
 *
 * @example
 * ```typescript
 * import { createXrayIntegration } from '0xray/integration';
 * 
 * const postProcessor = new PostProcessor(stateManager);
 * const integration = createXrayIntegration(postProcessor);
 * 
 * // Get Express app for mounting
 * app.use('/webhooks', integration.getWebhookApp());
 * app.use('/api/post-process', integration.getAPIApp());
 * 
 * // Or get raw routers for Fastify/Koa
 * const webhookRouter = integration.getWebhookRouter();
 * const apiRouter = integration.getAPIRouter();
 * ```
 */
export class XrayIntegration {
  private webhookTrigger: WebhookTrigger | null = null;
  private apiTrigger: APITrigger | null = null;

  constructor(private postProcessor: PostProcessor) {}

  /**
   * Initialize all triggers with default configuration
   * 
   * @param config - Optional configuration for triggers
   */
  async initialize(config?: {
    webhook?: Partial<WebhookConfig>;
    api?: Partial<APIConfig>;
  }): Promise<void> {
    const { WebhookTrigger } = await import('./triggers/WebhookTrigger.js');
    const { APITrigger } = await import('./triggers/APITrigger.js');
    
    // Initialize webhook trigger with default GitHub config
    this.webhookTrigger = new WebhookTrigger(this.postProcessor, {
      provider: 'github',
      events: ['push', 'pull_request'],
      path: '/webhooks/github',
      verifySignature: true,
      ...config?.webhook
    });
    await this.webhookTrigger.initialize();

    // Initialize API trigger with default config
    this.apiTrigger = new APITrigger(this.postProcessor, {
      enabled: true,
      path: '/api/post-process',
      ...config?.api
    });
    await this.apiTrigger.initialize();
  }

  /**
   * Get webhook app for framework-specific mounting
   * 
   * Returns an Express Application. For other frameworks,
   * use getWebhookRouter() to get the router instance.
   * 
   * @example
   * ```typescript
   * // Express
   * app.use('/webhooks', integration.getWebhookApp());
   * 
   * // Fastify
   * await fastify.register(integration.getWebhookRouter(), { prefix: '/webhooks' });
   * 
   * // Koa
   * app.use(integration.getWebhookRouter().routes());
   * ```
   */
  getWebhookApp(): express.Application | null {
    return this.webhookTrigger?.getApp() ?? null;
  }

  /**
   * Get webhook router (raw Express router)
   * 
   * Useful for frameworks that need the router instance directly
   * rather than the full Express app.
   */
  getWebhookRouter(): express.Router | null {
    return this.webhookTrigger?.getApp() ?? null;
  }

  /**
   * Get API trigger app for framework-specific mounting
   * 
   * @example
   * ```typescript
   * // Express
   * app.use('/api/post-process', integration.getAPIApp());
   * 
   * // Fastify
   * await fastify.register(integration.getAPIRouter(), { prefix: '/api/post-process' });
   * ```
   */
  getAPIApp(): express.Application | null {
    return this.apiTrigger?.getApp() ?? null;
  }

  /**
   * Get API trigger router (raw Express router)
   * 
   * Useful for frameworks that need the router instance directly.
   */
  getAPIRouter(): express.Router | null {
    return this.apiTrigger?.getApp() ?? null;
  }

  /**
   * Manually trigger PostProcessor via API
   * 
   * Convenience method for programmatic triggering without
   * going through the HTTP endpoint.
   * 
   * @example
   * ```typescript
   * await integration.trigger({
   *   tool: 'test',
   *   operation: 'run',
   *   reason: 'Manual test trigger'
   * });
   * ```
   */
  async trigger(options: {
    tool: string;
    operation: string;
    filePath?: string;
    directory?: string;
    reason?: string;
  }): Promise<void> {
    const context: PostProcessorContext = {
      commitSha: `manual-${Date.now()}`,
      repository: '',
      branch: '',
      author: 'manual',
      files: [],
      trigger: 'manual',
      tool: options.tool,
      operation: options.operation,
      ...(options.filePath !== undefined ? { filePath: options.filePath } : {}),
      ...(options.directory !== undefined ? { directory: options.directory } : {}),
    };
    
    await this.postProcessor.executePostProcessorLoop(context);
  }

  /**
   * Shutdown all triggers
   */
  async shutdown(): Promise<void> {
    if (this.webhookTrigger) {
      this.webhookTrigger.shutdown();
    }
    if (this.apiTrigger) {
      this.apiTrigger.shutdown();
    }
  }
}

/**
 * Factory function for easy integration setup
 * 
 * @example
 * ```typescript
 * import { createXrayIntegration } from '0xray/integration';
 * 
 * // With default configuration
 * const integration = createXrayIntegration(postProcessor);
 * await integration.initialize();
 * 
 * // With custom configuration
 * const integration = createXrayIntegration(postProcessor);
 * await integration.initialize({
 *   webhook: {
 *     provider: 'gitlab',
 *     secret: process.env.GITLAB_WEBHOOK_SECRET,
 *     events: ['push', 'merge_request'],
 *     path: '/webhooks/gitlab'
 *   },
 *   api: {
 *     path: '/api/stray-trigger',
 *     apiKey: process.env.API_KEY
 *   }
 * });
 * ```
 */
export function createXrayIntegration(
  postProcessor: PostProcessor
): XrayIntegration {
  return new XrayIntegration(postProcessor);
}

// Backward compat aliases

