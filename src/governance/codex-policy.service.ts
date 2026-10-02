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
 *   - Reuses one parsed codex while that file still wins and its mtime and size are unchanged.
 *   - No mutation of the cached codex; no enforcement.
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
 */

import { frameworkLogger } from '../core/framework-logger.js';
import { resolveCodexPath } from '../core/config-paths.js';
import { existsSync, statSync } from 'fs';
import * as fs from 'fs/promises';
import type { ActiveCodexSnapshot, ICodexPolicyProvider } from './governance-types.js';

type CodexRaw = { path: string | null; data: Record<string, unknown>; isFallback: boolean };

type CodexParseCache = {
  candidateKey: string;
  index: number;
  sourcePath: string;
  identity: string;
  raw: CodexRaw;
};

/**
 * Canonical implementation of the Governance Codex/Policy provider.
 * Single owner of the "first read" of any codex.json for the framework.
 */
export class CodexPolicyService implements ICodexPolicyProvider {
  private readonly component = 'codex-policy-service';

  /**
   * Winning parse. Invalid when a higher-priority path appears or mtime/size changes,
   * so the next check still parses the bytes a fresh load would have read.
   */
  private codexCache: CodexParseCache | null = null;

  private candidateKey(candidates: readonly string[]): string {
    return JSON.stringify(candidates);
  }

  private fileIdentity(sourcePath: string): string | null {
    try {
      const fileStat = statSync(sourcePath);
      if (!fileStat.isFile()) return null;
      return `${fileStat.mtimeMs}:${fileStat.size}`;
    } catch {
      return null;
    }
  }

  private cachedRaw(candidates: readonly string[]): CodexRaw | null {
    const cached = this.codexCache;
    if (!cached || cached.candidateKey !== this.candidateKey(candidates)) return null;
    for (let i = 0; i < cached.index; i++) {
      const higher = candidates[i];
      if (higher && existsSync(higher)) return null;
    }
    const identity = this.fileIdentity(cached.sourcePath);
    if (!identity || identity !== cached.identity) return null;
    return cached.raw;
  }

  /**
   * Internal loader: resolves candidates, picks first existing, reads + parses.
   * Repeat calls skip the read and JSON.parse while the winning file is unchanged.
   * Logs via frameworkLogger on load, error, and fallback (not on a cache hit).
   */
  private async loadRaw(): Promise<CodexRaw> {
    const resolved = resolveCodexPath();
    const candidates = Array.isArray(resolved)
      ? resolved
      : resolved
        ? [resolved as string]
        : [];

    const hit = this.cachedRaw(candidates);
    if (hit) return hit;

    const index = candidates.findIndex((candidate) => existsSync(candidate));
    const indexed = index >= 0 ? candidates[index] : undefined;
    const sourcePath = indexed ?? candidates[0] ?? null;

    if (index < 0 || !sourcePath) {
      this.codexCache = null;
      await frameworkLogger.log(this.component, 'codex-not-found', 'warning', {
        candidates,
        resolvedPath: sourcePath,
        message: 'No codex.json found in standard locations; using fallback behavior',
      });
      return { path: sourcePath, data: this.getBuiltinFallback(), isFallback: true };
    }

    try {
      const content = await fs.readFile(sourcePath, 'utf-8');
      const data = JSON.parse(content) as Record<string, unknown>;
      const termCount = this.computeTermCount(data);
      const raw: CodexRaw = { path: sourcePath, data, isFallback: false };
      const identity = this.fileIdentity(sourcePath);
      if (identity) {
        this.codexCache = {
          candidateKey: this.candidateKey(candidates),
          index,
          sourcePath,
          identity,
          raw,
        };
      } else {
        this.codexCache = null;
      }

      await frameworkLogger.log(this.component, 'codex-loaded', 'success', {
        source: sourcePath,
        version: data?.version || 'unknown',
        termCount,
        lastUpdated: data?.lastUpdated,
      });

      return raw;
    } catch (error) {
      this.codexCache = null;
      const msg = error instanceof Error ? error.message : String(error);
      await frameworkLogger.log(this.component, 'codex-load-error', 'error', {
        source: sourcePath,
        error: msg,
      });
      // Safe fallback (never break callers)
      return { path: sourcePath, data: this.getBuiltinFallback(), isFallback: true };
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
      ...(includeRaw ? { codex: structuredClone(data) } : {}),
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
