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
import crypto from 'crypto';
import { PostProcessor } from '../PostProcessor.js';
import { PostProcessorContext } from '../types.js';
import { frameworkLogger } from '../../core/framework-logger.js';

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

export class WebhookTrigger {
  private initialized = false;
  private app: express.Application;
  private config: WebhookConfig;

  constructor(
    private postProcessor: PostProcessor,
    config?: WebhookConfig  // Make config optional
  ) {
    this.config = {
      verifySignature: true,
      path: '/webhooks/' + (config?.provider || 'github'),
      events: config?.events || ['push', 'pull_request'],
      ...config
    };
    this.app = express();
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    // Setup webhook endpoint
    this.setupWebhookEndpoint();

    this.initialized = true;
    frameworkLogger.log(
      'webhook-trigger',
      'initialized',
      'info',
      {
        provider: this.config.provider,
        path: this.config.path,
        events: this.config.events,
        signatureVerification: this.config.verifySignature
      }
    );
  }

  private setupWebhookEndpoint(): void {
    const webhookPath = this.config.path || ('/webhooks/' + this.config.provider);

    // Raw body parser for signature verification
    this.app.use(express.raw({ type: 'application/json', limit: '10mb' }));

    // Webhook endpoint
    this.app.post(webhookPath as string, async (req, res) => {
      try {
        // Verify signature if configured
        if (this.config.verifySignature && this.config.secret) {
          const signature = req.headers['x-hub-signature'] ||
                          req.headers['x-gitlab-token'] ||
                          req.headers['x-hub-signature-256'] ||
                          req.headers['stripe-signature'];

          // CRITICAL FIX: Require signature header when verification is enabled
          if (!signature) {
            frameworkLogger.log(
              'webhook-trigger',
              'signature-verification-failed',
              'info',
              { provider: this.config.provider, reason: 'no-signature-header' }
            );
            return res.status(401).json({ error: 'Signature required' });
          }

          if (!this.verifySignature(req.body as Buffer, signature as string)) {
            frameworkLogger.log(
              'webhook-trigger',
              'signature-verification-failed',
              'info',
              { provider: this.config.provider || 'unknown', signature }
            );
            return res.status(401).json({ error: 'Invalid signature' });
          }
        }

        // Parse event type
        const eventHeader = req.headers['x-github-event'] ||
                           req.headers['x-gitlab-event'] ||
                           req.headers['stripe-event'];
        const event = eventHeader ? String(eventHeader) : 'unknown';

        // Check if event is in allowed list
        if (this.config.events && this.config.events.length > 0 && !this.config.events.includes(event)) {
          frameworkLogger.log(
            'webhook-trigger',
            'event-not-allowed',
            'info',
            { provider: this.config.provider, event, allowed: this.config.events }
          );
          return res.status(200).json({ received: true, ignored: true });
        }

        // Parse payload
        const payloadStr = req.body.toString('utf-8');
        const payload = JSON.parse(payloadStr);

        frameworkLogger.log(
          'webhook-trigger',
          'webhook-received',
          'info',
          { provider: this.config.provider, event, payloadKeys: Object.keys(payload) }
        );

        // Create PostProcessor context
        const context: PostProcessorContext = {
          trigger: 'webhook',
          tool: this.config.provider || 'unknown',
          operation: `${this.config.provider || 'unknown'}:${event}`,
          commitSha: (payload as any).after || '',
          repository: (payload as any).repository?.full_name || '',
          branch: (payload as any).ref?.replace('refs/heads/', '') || '',
          author: (payload as any).sender?.login || '',
          files: this.extractFilesFromPayload(payload, event)
        };

        // Trigger PostProcessor
        await this.triggerPostProcessor(context);

        res.json({ received: true, event });
        return;
      } catch (error) {
        frameworkLogger.log(
          'webhook-trigger',
          'webhook-error',
          'error',
          { provider: this.config.provider, error: error instanceof Error ? error.message : String(error) }
        );
        res.status(500).json({ error: 'Webhook processing failed' });
        return;
      }
    });
  }

  private verifySignature(payload: Buffer, signature: string): boolean {
    if (!this.config.secret) return true;

    const { provider, secret } = this.config;

    try {
      switch (provider) {
        case 'github':
          // GitHub HMAC signature: sha1=<hex> or sha256=<hex>
          const [algo, ghSignature] = signature.split('=');
          if (algo !== 'sha1' && algo !== 'sha256') return false;

          const githubHmac = crypto.createHmac(algo, secret);
          githubHmac.update(payload);
          const githubComputed = `${algo}=${githubHmac.digest('hex')}`;

           // SECURITY FIX: Use timingSafeEqual to prevent timing attacks
          try {
            const ghSigBuffer = Buffer.from(ghSignature || '');
            const ghComputedBuffer = Buffer.from(githubComputed);
            return crypto.timingSafeEqual(ghComputedBuffer, ghSigBuffer);
          } catch {
            return false;
          }

        case 'gitlab':
          // GitLab X-Gitlab-Token: just a token compare
          const token = signature;

          // SECURITY FIX: Use timingSafeEqual to prevent timing attacks
          try {
            const secretBuffer = Buffer.from(secret);
            const tokenBuffer = Buffer.from(token || '');
            return crypto.timingSafeEqual(secretBuffer, tokenBuffer);
          } catch {
            return false;
          }

        case 'stripe':
          // Stripe signature: timestamp.payload, signature (HMAC-SHA256)
          const parts = signature.split('.');
          if (parts.length !== 2) return false;

          const [timestamp, stripeSignature] = parts;
          const signedPayload = `${timestamp}.${payload.toString('utf-8')}`;

          const stripeHmac = crypto.createHmac('sha256', secret);
          stripeHmac.update(signedPayload);
          const stripeComputed = stripeHmac.digest('hex');

          // SECURITY FIX: Use timingSafeEqual to prevent timing attacks
          try {
            const stripeSigBuffer = Buffer.from(stripeSignature || '');
            const stripeComputedBuffer = Buffer.from(stripeComputed);
            return crypto.timingSafeEqual(stripeComputedBuffer, stripeSigBuffer);
          } catch {
            return false;
          }

        default:
          return true;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      frameworkLogger.log(
        'webhook-trigger',
        'signature-verification-error',
         'error',
         { provider, error: errorMessage }
       );
       return false;
     }
   }

  /**
   * Extract files from webhook payload
   * 
   * Different webhook providers have different payload structures.
   * This method extracts files in a unified way.
   */
  private extractFilesFromPayload(payload: any, event: string): string[] {
    try {
      // GitHub push event
      if (payload.commits && Array.isArray(payload.commits)) {
        const files = new Set<string>();
        for (const commit of payload.commits) {
          if (commit.added && Array.isArray(commit.added)) {
            commit.added.forEach((f: string) => files.add(f));
          }
          if (commit.modified && Array.isArray(commit.modified)) {
            commit.modified.forEach((f: string) => files.add(f));
          }
        }
        return Array.from(files);
      }
      
      // GitHub pull_request event
      if (payload.pull_request && payload.pull_request.files) {
        return payload.pull_request.files.map((f: any) => f.filename);
      }
      
      return [];
    } catch (error) {
      frameworkLogger.log(
        'webhook-trigger',
        'file-extraction-failed',
        'info',
        { provider: this.config.provider, error: error instanceof Error ? error.message : String(error) }
      );
      return [];
    }
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
