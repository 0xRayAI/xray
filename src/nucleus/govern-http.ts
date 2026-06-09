/**
 * Nucleus HTTP Adapter — semantic convenience surface (Phase 0)
 *
 * IMPORTANT: MCP is the new standard (just as Dynamo is the established standard
 * for the external governance signal). The canonical way for agents to call the
 * nucleus is the first-class MCP tools (`govern_proposals`, `govern_reflection`)
 * exposed by the governance MCP server (which already supports stdio + Streamable
 * HTTP transport on /mcp and already delegates to the same GovernanceService).
 *
 * This module provides the *direct semantic convenience adapter*:
 * - Pure `handleGovernRequest(body)` → returns the raw GovernanceResponse object.
 * - Optional tiny Express app with `POST /govern` (and /health).
 * - No full MCP JSON-RPC protocol overhead — ideal for curl, CI, simple bridges,
 *   or anything that just wants the decision without speaking MCP.
 *
 * It reuses the exact same kernel (getGovernanceService + types) as the MCP path.
 * Zero impact on the federation or existing MCP surfaces.
 *
 * Design goals:
 * - Framework-agnostic pure handler (usable by Express, Fastify, raw http, tests, or in-process).
 * - Only frameworkLogger.
 * - Follows the thin-wrapper style of APITrigger.
 *
 * Usage (embeddable / in-process):
 *   import { handleGovernRequest } from './nucleus/govern-http.js';
 *   const result = await handleGovernRequest(req.body);
 *
 * Usage (standalone):
 *   NUCLEUS_PORT=8787 node dist/nucleus/govern-http.js
 */

import express from 'express';
import { getGovernanceService } from '../governance/governance-service.js';
import type {
  GovernOptions,
  GovernanceRequest,
  GovernanceResponse,
} from '../governance/governance-types.js';
import { frameworkLogger } from '../core/framework-logger.js';

export interface GovernHTTPConfig {
  path?: string;
  apiKey?: string;
  enabled?: boolean;
  port?: number;
}

const DEFAULT_PATH = '/govern';

/**
 * Pure handler. Can be used by any HTTP server (Express, Fastify, raw http, etc.)
 * or called directly in tests / in-process.
 */
export async function handleGovernRequest(
  body: unknown,
  options?: { requireExternalDynamo?: boolean }
): Promise<GovernanceResponse> {
  const request = body as GovernanceRequest;

  if (!request || !Array.isArray(request.proposals)) {
    throw new Error('Invalid governance request: "proposals" array is required');
  }

  const svc = getGovernanceService();

  // Merge caller options into the request options (prototype only — keeps surface tiny)
  const mergedOptions: GovernOptions = {};
  if (request.options?.requireExternalDynamo !== undefined) {
    mergedOptions.requireExternalDynamo = request.options.requireExternalDynamo;
  }
  if (options?.requireExternalDynamo !== undefined) {
    mergedOptions.requireExternalDynamo = options.requireExternalDynamo;
  }
  const mergedRequest: GovernanceRequest = {
    ...request,
    options: mergedOptions,
  };

  await frameworkLogger.log('nucleus-http', 'govern-request-received', 'info', {
    proposalCount: mergedRequest.proposals.length,
    hasContext: !!mergedRequest.context,
    path: DEFAULT_PATH,
  });

  const response = await svc.govern(mergedRequest);

  await frameworkLogger.log('nucleus-http', 'govern-response', 'success', {
    overallDecision: response.overallDecision,
    total: response.summary.total,
    approved: response.summary.approved,
    rejected: response.summary.rejected,
  });

  return response;
}

/**
 * Minimal Express app (prototype only).
 * Mirrors the shape and logging discipline of APITrigger.
 */
export class GovernHTTPAdapter {
  private app: express.Application;
  private config: Required<GovernHTTPConfig>;
  private initialized = false;

  constructor(config: GovernHTTPConfig = {}) {
    this.config = {
      enabled: true,
      path: DEFAULT_PATH,
      apiKey: '',
      port: 8787,
      ...config,
    } as Required<GovernHTTPConfig>;

    this.app = express();
  }

  async initialize(): Promise<void> {
    if (this.initialized || !this.config.enabled) return;

    this.app.use(express.json({ limit: '5mb' }));

    // Optional API key (same pattern as APITrigger for early internal use)
    if (this.config.apiKey) {
      this.app.use((req, res, next) => {
        const key = req.headers['x-api-key'] as string;
        if (!key || key !== this.config.apiKey) {
          res.status(403).json({ error: 'Invalid or missing API key' });
          return;
        }
        next();
      });
    }

    const governPath = this.config.path;

    // The direct semantic /govern endpoint (convenience, not the MCP standard surface).
    // Agents that speak MCP should use the governance MCP server's tools (or its /mcp endpoint).
    this.app.post(governPath, async (req, res) => {
      try {
        const result = await handleGovernRequest(req.body);
        res.status(200).json(result);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        await frameworkLogger.log('nucleus-http', 'govern-error', 'error', { message });

        res.status(400).json({
          error: 'Governance request failed',
          message,
          overallDecision: 'reject',
        });
      }
    });

    // Tiny health surface (useful for the verification loop later)
    this.app.get(governPath + '/health', (_req, res) => {
      res.json({
        status: 'ok',
        surface: 'nucleus-http',
        version: 'v3-prototype',
        endpoint: governPath,
        timestamp: new Date().toISOString(),
      });
    });

    this.initialized = true;

    await frameworkLogger.log('nucleus-http', 'adapter-initialized', 'success', {
      path: governPath,
      port: this.config.port,
      apiKeyProtected: !!this.config.apiKey,
    });
  }

  getApp(): express.Application {
    return this.app;
  }

  async listen(): Promise<void> {
    await this.initialize();
    const port = this.config.port;
    this.app.listen(port, () => {
      // We intentionally use frameworkLogger here too; the listen callback is the one place
      // a startup banner is acceptable if we ever add a structured one. For now the log above suffices.
      void frameworkLogger.log('nucleus-http', 'listening', 'success', { port, path: this.config.path });
    });
  }

  shutdown(): void {
    this.initialized = false;
  }
}

// Allow direct execution for the absolute smallest validation loop:
//   node --loader ts-node/esm src/nucleus/govern-http.ts
// (or after build: node dist/nucleus/govern-http.js)
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('govern-http.ts')) {
  const adapter = new GovernHTTPAdapter({
    port: Number(process.env.NUCLEUS_PORT || 8787),
    path: process.env.NUCLEUS_PATH || DEFAULT_PATH,
  });

  // Fire and forget — the listen method logs via frameworkLogger
  void adapter.listen().catch(async (err) => {
    await frameworkLogger.log('nucleus-http', 'listen-failed', 'error', {
      error: err instanceof Error ? err.message : String(err),
    });
    process.exit(1);
  });
}
