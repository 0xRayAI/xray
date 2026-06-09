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

export type {
  MetamorphosisEngine,
  MetamorphosisProposal,
} from '../postprocessor/metamorphosis/MetamorphosisEngine.js';

export {
  pluginRegistry,
} from './plugin-registry.js';

export type {
  SkillPlugin,
  SkillProposalArgs,
  SkillPluginResult,
} from './plugin-registry.js';