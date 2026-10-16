/**
 * Governance types adapted from xray src/governance/governance-types.ts (plain JS).
 */

/** @typedef {"fix"|"refactor"|"guard"|"automate"|"codify"|"strategic"|"compliance"|"metamorphosis"} ProposalType */

/**
 * @typedef {object} GovernanceProposal
 * @property {string} id
 * @property {ProposalType} type
 * @property {string} title
 * @property {string} description
 * @property {string[]} [evidence]
 * @property {"inference"|"reflection"|"manual"|"ci"|"phase-planning"|"metamorphosis"} [source]
 * @property {number} [confidence]
 * @property {Record<string, unknown>} [metadata]
 * @property {string[]} [tags]
 */

/**
 * @typedef {object} GovernanceVote
 * @property {string} server
 * @property {"approve"|"reject"|"abstain"|"needs_revision"} decision
 * @property {number} confidence
 * @property {string} reasoning
 * @property {number} [weight]
 */

/**
 * @typedef {object} GovernanceResult
 * @property {string} proposalId
 * @property {"approve"|"reject"|"needs_revision"|"abstain"} finalDecision
 * @property {number} averageConfidence
 * @property {GovernanceVote[]} votes
 * @property {string} reasoningSummary
 */

/**
 * @typedef {object} LessonRecord
 * @property {string} lessonId
 * @property {string} benchToken
 * @property {string} summary
 * @property {GovernanceResult} governance
 * @property {string} createdAt
 */

export {};
