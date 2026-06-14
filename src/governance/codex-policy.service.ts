/**
 * CodexPolicyService
 *
 * The initial Governance-owned Single Source of Truth (SSOT) for Codex / policy loading.
 * This is the V2-P1-S02-REAL first concrete migration slice.
 *
 * Role (per 3-subsystem architecture + researcher mapping):
 *   - External Governance (Decision Layer & SSOT) owns "what the policy is".
 *   - All consumers (enforcement CodexLoader, injectors, formatters, MCP surfaces, plugins)
 *     will eventually ask here instead of performing direct fs reads.
 *
 * Current scope (minimal safe skeleton):
 *   - Read-only query surface.
 *   - Uses canonical resolveCodexPath + async file load (no duplication of resolution logic).
 *   - Returns ActiveCodexSnapshot compatible with the existing get_active_codex MCP tool.
 *   - Provides getTermCount() with safe 60-term fallback (preserves prior behavior of bypasses).
 *   - Full frameworkLogger discipline on every load/decision/error.
 *   - No caching in v1 skeleton (additive later); no mutation; no enforcement.
 *
 * First wired consumer: src/mcps/enforcer-tools.server.ts (getCodexTermCount bypass removed;
 * now delegates through this service).
 *
 * Next recommended slices (documented in researcher mapping append):
 *   - Wire governance.server.ts handleGetActiveCodex to delegate (remove its direct read).
 *   - S02b/S02c follow-ups: update codex-injector, context-loader, codex-formatter, plugin.
 *   - Make CodexLoader delegate its raw data load here, then re-export from governance.
 *
 * @module governance/codex-policy.service
 * @version 2.0.0-s02-real
 */

import { frameworkLogger } from '../core/framework-logger.js';
import { resolveCodexPath } from '../core/config-paths.js';
import { existsSync } from 'fs';
import * as fs from 'fs/promises';
import type { ActiveCodexSnapshot, ICodexPolicyProvider } from './governance-types.js';

/**
 * Canonical implementation of the Governance Codex/Policy provider.
 * Single owner of the "first read" of any codex.json for the framework.
 */
export class CodexPolicyService implements ICodexPolicyProvider {
  private readonly component = 'codex-policy-service';

  /**
   * Internal loader: resolves candidates, picks first existing, reads + parses.
   * Always logs via frameworkLogger (success, error, fallback).
   */
  private async loadRaw(): Promise<{ path: string | null; data: Record<string, unknown>; isFallback: boolean }> {
    const candidates = resolveCodexPath();
    const resolvedPath = Array.isArray(candidates)
      ? candidates.find((p) => existsSync(p)) || candidates[0] || null
      : (candidates as string) || null;

    if (!resolvedPath || !existsSync(resolvedPath)) {
      await frameworkLogger.log(this.component, 'codex-not-found', 'warning', {
        candidates,
        resolvedPath,
        message: 'No codex.json found in standard locations; using fallback behavior',
      });
      return { path: resolvedPath, data: this.getBuiltinFallback(), isFallback: true };
    }

    try {
      const content = await fs.readFile(resolvedPath, 'utf-8');
      const data = JSON.parse(content);

      const termCount = this.computeTermCount(data);

      await frameworkLogger.log(this.component, 'codex-loaded', 'success', {
        source: resolvedPath,
        version: data?.version || 'unknown',
        termCount,
        lastUpdated: data?.lastUpdated,
      });

      return { path: resolvedPath, data, isFallback: false };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      await frameworkLogger.log(this.component, 'codex-load-error', 'error', {
        source: resolvedPath,
        error: msg,
      });
      // Safe fallback (never break callers)
      return { path: resolvedPath, data: this.getBuiltinFallback(), isFallback: true };
    }
  }

  private computeTermCount(data: Record<string, unknown>): number {
    if (!data) return 0;
    const terms = data.terms;
    if (Array.isArray(terms)) return terms.length;
    if (terms && typeof terms === 'object') return Object.keys(terms).length;
    if (Array.isArray(data.codex_terms)) return data.codex_terms.length;
    return 0;
  }

  private getBuiltinFallback(): Record<string, unknown> {
    // Minimal structural fallback matching historical default (60 terms expectation)
    // In real usage this should rarely be hit; the canonical files always exist in dev.
    return {
      version: 'builtin-fallback',
      lastUpdated: new Date().toISOString(),
      errorPreventionTarget: 0.99,
      terms: {}, // empty; termCount will be 0 but callers fall back to 60 at getTermCount level
    };
  }

  /**
   * Primary SSOT query: returns the ActiveCodexSnapshot.
   * Matches (and is the intended backing impl for) the get_active_codex MCP response.
   */
  async getCurrentCodex(includeRaw = false): Promise<ActiveCodexSnapshot> {
    const { path, data, isFallback } = await this.loadRaw();

    const termCount = this.computeTermCount(data);
    const versionRaw = data?.version ?? data?.codex_version;
    const version = typeof versionRaw === 'string' ? versionRaw : 'unknown';
    const lastUpdatedRaw = data?.lastUpdated ?? data?.last_updated;
    const lastUpdated = typeof lastUpdatedRaw === 'string' ? lastUpdatedRaw : '';

    const snapshot: ActiveCodexSnapshot = {
      source: path,
      loaded_at: new Date().toISOString(),
      term_count: termCount,
      version,
      last_updated: lastUpdated,
      governance_ssot: !isFallback,
      is_fallback: isFallback,
      note: isFallback
        ? 'Governance CodexPolicyService — builtin fallback (no external codex.json resolved)'
        : 'Returned via Governance CodexPolicyService — V2 Single Source of Truth (S02-REAL)',
      dynamo_required: true,
      ...(includeRaw ? { codex: data } : {}),
    };

    await frameworkLogger.log(this.component, 'get-current-codex', 'info', {
      source: path,
      termCount: snapshot.term_count,
      version: snapshot.version,
      isFallback,
      includeRaw,
    });

    return snapshot;
  }

  /**
   * Convenience: just the term count.
   * Preserves historical caller behavior (hard 60 fallback when everything fails).
   */
  async getTermCount(): Promise<number> {
    try {
      const snapshot = await this.getCurrentCodex(false);
      if (snapshot.term_count > 0) {
        return snapshot.term_count;
      }
      // If loaded but 0 terms (e.g. empty or fallback shape), honor historical default
      return 60;
    } catch (error) {
      await frameworkLogger.log(this.component, 'get-term-count-fallback', 'warning', {
        error: error instanceof Error ? error.message : String(error),
        fallback: 60,
      });
      return 60;
    }
  }
}

// Singleton (matches pattern used by GovernanceService)
let codexPolicyServiceInstance: CodexPolicyService | null = null;

export function getCodexPolicyService(): CodexPolicyService {
  if (!codexPolicyServiceInstance) {
    codexPolicyServiceInstance = new CodexPolicyService();
  }
  return codexPolicyServiceInstance;
}

// Also export the class for direct construction in tests / advanced wiring
export { CodexPolicyService as default };
