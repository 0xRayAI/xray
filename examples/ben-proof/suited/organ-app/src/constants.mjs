/** Distilled from repertoire CuratedSignalsManager and confidence-decay. */

export const MIN_CONFIDENCE_GATE = 0.55;
export const LESSON_TEXT_CAP = 400;
export const LESSON_LINE_CAP = 20;
export const FEEDBACK_SUCCESS_BOOST = 0.1;
export const FEEDBACK_FAILURE_PENALTY = 0.1;
export const DECAY_GRACE_DAYS = 14;
export const DECAY_HALF_LIFE_DAYS = 60;
export const TRAP_CAPABLE_AGENTS = ['architect', 'security-auditor', 'researcher'];

export const AGENTS = [
  'enforcer',
  'orchestrator',
  'architect',
  'security-auditor',
  'code-reviewer',
  'refactorer',
  'testing-lead',
  'bug-triage-specialist',
  'researcher',
];
