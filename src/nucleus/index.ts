/**
 * xray Nucleus — barrel export
 *
 * Import from here for the stable nucleus surface:
 *   import { handleGovernRequest, governSingle } from './nucleus/index.js';
 */
export {
  handleGovernRequest,
  governSingle,
  getGovernanceService,
  GovernHTTPAdapter,
  NUCLEUS_VERSION,
  NUCLEUS_DESCRIPTION,
} from './kernel.js';

export type { GovernHTTPConfig } from './govern-http.js';

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

export {
  pluginRegistry,
} from './plugin-registry.js';

export type {
  SkillPlugin,
  SkillToolPlugin,
  SkillProposalArgs,
  SkillPluginResult,
  ToolDefinition,
} from './plugin-registry.js';

export { NucleusOrchestrator } from './orchestrator.js';

export type {
  ComponentInitResult,
  BootResults,
  ComponentStatus,
  OverallBootStatus,
  DependencyValidationResult,
  ShutdownResult,
  InitOptions,
} from './orchestrator.js';

export { scoreComplexity, routeToAgent, scoreAndRoute } from './thin-dispatch.js';

export type {
  ComplexityMetrics,
  ComplexityScore,
  ComplexityLevel,
  ComplexityThresholds,
} from './thin-dispatch.js';

export { NUCLEUS_THIN_DISPATCH_VERSION } from './thin-dispatch.js';

export { registerDefaultPlugins } from './default-plugins.js';

export type { DefaultPluginsResult } from './default-plugins.js';