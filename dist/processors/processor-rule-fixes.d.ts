/**
 * Processor Rule Fixes
 *
 * Extracted from ProcessorManager to handle rule violation remediation:
 * - Attempting to fix rule violations by delegating to agents/skills
 * - Mapping rule IDs to appropriate agents
 *
 * @version 1.0.0
 * @since 2026-04-14
 */
import type { RuleViolationEntry } from "./processor-types.js";
import type { RuleValidationContext } from "../enforcement/types.js";
interface AgentSkillMapping {
    agent: string;
    skill: string;
}
export declare function getAgentForRule(ruleId: string): AgentSkillMapping | null;
export declare function attemptRuleViolationFixes(violations: RuleViolationEntry[], context: RuleValidationContext): Promise<void>;
export {};
//# sourceMappingURL=processor-rule-fixes.d.ts.map