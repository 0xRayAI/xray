/**
 * xray Nucleus — the callable governance kernel (Phase 1.1 facade)
 *
 * This is the primary, stable import surface for the v3 nucleus.
 *
 * Consumers (bridges, custom tools, the MCP governance server, future self-proposal
 * engines, CLI, etc.) should import from here rather than reaching into
 * governance-service.ts, govern-http.ts, or postprocessor internals directly.
 *
 * Goals:
 * - Single place to import the core "govern" capability + supporting types.
 * - Zero risk to the 41-server federation or existing bridges.
 * - Easy to tree-shake / split later (e.g. "nucleus/core", "nucleus/http").
 * - Documents the public kernel contract.
 *
 * Current surface (Phase 1.1):
 * - handleGovernRequest: the pure semantic convenience handler (direct JSON in/out)
 * - getGovernanceService: the underlying singleton (for advanced / in-process use)
 * - Governance types
 * - MetamorphosisEngine interface (for PostProcessor lifecycle integration)
 *
 * MCP remains the canonical standard surface (see governance.server.ts).
 * The direct HTTP adapter (govern-http.ts) is a convenience on top of this kernel.
 *
 * Anti-goals (for this file):
 * - No new business logic
 * - No side effects on import
 * - Does not pull in the full 25 knowledge-skill servers or thinDispatch yet
 */

import type {
  GovernOptions,
  GovernanceContext,
  GovernanceRequest,
  GovernanceResponse,
} from '../governance/governance-types.js';

import { handleGovernRequest } from './govern-http.js';

// Re-export the pure handler (the main "call the nucleus" entry point)
export { handleGovernRequest };
export type { GovernHTTPConfig } from './govern-http.js';

// Re-export the canonical way to obtain the service (used by MCP, internal code, and advanced callers)
export { getGovernanceService } from '../governance/governance-service.js';

// Core governance types — the contract between callers and the kernel
export type {
  GovernanceRequest,
  GovernanceResponse,
  GovernanceProposal,
  GovernanceVote,
  GovernanceResult,
  GovernanceContext,
  GovernOptions,
  ProposalType,
} from '../governance/governance-types.js';

// Metamorphosis integration points (Phase 0.5 / 2.x)
export type {
  MetamorphosisEngine,
  MetamorphosisProposal,
} from '../postprocessor/metamorphosis/MetamorphosisEngine.js';

// Convenience re-export of the HTTP adapter for anyone who wants the tiny Express wrapper
// (still considered "convenience", not core kernel)
export { GovernHTTPAdapter } from './govern-http.js';

/**
 * High-level kernel description for introspection / docs.
 */
export const NUCLEUS_VERSION = '0.1.0'; // Phase 1 facade version

export const NUCLEUS_DESCRIPTION =
  'xray governance kernel — external Dynamo signal + 3-agent deliberation exposed as a callable library. ' +
  'MCP is the standard surface; direct handleGovernRequest + HTTP adapter are convenience paths.';

/**
 * Quick helper for the common case: govern a single proposal and get the overall decision.
 * (Thin wrapper — real power users should use handleGovernRequest directly for batch + full response.)
 */
export async function governSingle(
  proposal: Omit<GovernanceRequest['proposals'][0], 'id'> & { id?: string },
  context?: GovernanceContext,
  options?: GovernOptions
): Promise<GovernanceResponse> {
  const fullRequest: GovernanceRequest = {
    proposals: [
      {
        id: proposal.id || `prop-${Date.now()}`,
        ...proposal,
      },
    ],
    context,
    ...(options ? { options } : {}),
  } as GovernanceRequest;

  return handleGovernRequest(fullRequest);
}
