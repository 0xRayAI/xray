/**
 * API Trigger for Post-Processor
 *
 * Provides a REST API endpoint to manually trigger PostProcessor
 * operations. Useful for CI/CD pipelines, manual test triggers,
 * and retry mechanisms.
 *
 * @since 2026-03-08
 */

import express from 'express';
import { PostProcessor } from '../PostProcessor.js';
import { PostProcessorContext } from '../types.js';
import { frameworkLogger } from '../../core/framework-logger.js';

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

export class APITrigger {
  private initialized = false;
  private app: express.Application;
  private config: APIConfig;

  constructor(private postProcessor: PostProcessor, config: APIConfig) {
    this.config = {
      enabled: true,
      path: '/api/post-process',
      ...config
    };
    this.app = express();
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    // Setup API endpoints
    this.setupAPIEndpoints();

    this.initialized = true;
    frameworkLogger.log(
      'api-trigger',
      'initialized',
      'info',
      {
        path: this.config.path,
        apiKeyRequired: this.config.apiKey
      }
    );
  }

  private setupAPIEndpoints(): void {
    const { path: apiPath, apiKey } = this.config;
    const endpointPath = apiPath || '/api/post-process';

    // Rate limiting
    this.app.use(express.json({ limit: '10mb' }));

    // Middleware: API key authentication (if configured)
    if (apiKey) {
      this.app.use((req, res, next): void => {
        const providedKey = req.headers['x-api-key'] as string;
        if (!providedKey) {
          res.status(401).json({ error: 'API key required' });
          return;
        }
        if (providedKey !== apiKey) {
          res.status(403).json({ error: 'Invalid API key' });
          return;
        }
        next();
      });
    }

    // POST endpoint to trigger PostProcessor
    this.app.post(endpointPath, async (req, res): Promise<void> => {
      try {
        const body = req.body as APIRequest;

        frameworkLogger.log(
          'api-trigger',
          'trigger-request',
          'info',
          {
            tool: body.tool,
            operation: body.operation,
            reason: body.reason
          }
        );

        // Create PostProcessor context
        const context: PostProcessorContext = {
          trigger: 'api',
          tool: body.tool || 'api',
          operation: body.operation || 'manual',
          commitSha: '',
          repository: '',
          branch: '',
          author: '',
          files: []
        };

        // Trigger PostProcessor
        await this.triggerPostProcessor(context);

        res.json({
          success: true,
          message: 'PostProcessor triggered successfully',
          triggeredAt: new Date().toISOString()
        });
      } catch (error) {
        frameworkLogger.log(
          'api-trigger',
          'trigger-error',
          'error',
          {
            error: error instanceof Error ? error.message : String(error)
          }
        );
        res.status(500).json({
          error: 'PostProcessor trigger failed',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    // GET endpoint for status
    this.app.get(endpointPath + '/status', (req, res): void => {
      res.json({
        status: 'operational',
        triggerType: 'api',
        configured: this.config.enabled,
        timestamp: new Date().toISOString()
      });
    });
  }

  async triggerPostProcessor(context: PostProcessorContext): Promise<void> {
    await this.postProcessor.executePostProcessorLoop(context);
  }

  getApp(): express.Application {
    return this.app;
  }

  shutdown(): void {
    this.initialized = false;
  }
}
