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

import { frameworkLogger } from "../core/framework-logger.js";
import type { RuleViolationEntry } from "./processor-types.js";
import type { RuleValidationContext } from "../enforcement/types.js";

interface AgentSkillMapping {
  agent: string;
  skill: string;
}

const RULE_AGENT_MAPPINGS: Record<string, AgentSkillMapping> = {
  "tests-required": { agent: "testing-lead", skill: "testing-strategy" },
  "no-duplicate-code": {
    agent: "refactorer",
    skill: "refactoring-strategies",
  },
  "no-over-engineering": {
    agent: "architect",
    skill: "architecture-patterns",
  },
  "resolve-all-errors": {
    agent: "bug-triage-specialist",
    skill: "code-review",
  },
  "prevent-infinite-loops": {
    agent: "bug-triage-specialist",
    skill: "code-review",
  },
  "state-management-patterns": {
    agent: "architect",
    skill: "architecture-patterns",
  },
  "import-consistency": {
    agent: "refactorer",
    skill: "refactoring-strategies",
  },
  "documentation-required": {
    agent: "researcher",
    skill: "project-analysis",
  },
  "clean-debug-logs": {
    agent: "refactorer",
    skill: "refactoring-strategies",
  },
};

export function getAgentForRule(
  ruleId: string,
): AgentSkillMapping | null {
  return RULE_AGENT_MAPPINGS[ruleId] || null;
}

export async function attemptRuleViolationFixes(
  violations: RuleViolationEntry[],
  context: RuleValidationContext,
): Promise<void> {
  for (const violation of violations) {
    try {
      await frameworkLogger.log(
        "processor-manager",
        "-attempting-to-fix-rule-violation-violation-rule-",
        "info",
        { message: `Attempting to fix rule violation: ${violation.rule}` },
      );

      const agentSkill = getAgentForRule(violation.rule);
      if (!agentSkill) {
        await frameworkLogger.log(
          "processor-manager",
          "-no-agent-skill-mapping-found-for-rule-violation-r",
          "error",
          {
            message: `No agent/skill mapping found for rule: ${violation.rule}`,
          },
        );
        continue;
      }

      const { agent, skill } = agentSkill;

      const { mcpClientManager } = await import("../mcps/mcp-client");
      await mcpClientManager.callServerTool(
        "skill-invocation",
        "invoke-skill",
        {
          skillName: skill,
          toolName: "analyze_code_quality",
          args: {
            code: context.files || [],
            language: "typescript",
            context: {
              rule: violation.rule,
              message: violation.message,
              files: context.files,
              newCode: context.newCode,
            },
          },
        },
      );

      await frameworkLogger.log(
        "processor-manager",
        "-agent-agent-attempted-fix-for-rule-violation-rule",
        "success",
        {
          message: `Agent ${agent} attempted fix for rule: ${violation.rule}`,
        },
      );
    } catch (error) {
      await frameworkLogger.log(
        "processor-manager",
        "-failed-to-call-agent-for-rule-violation-rule-erro",
        "error",
        {
          message: `Failed to call agent for rule ${violation.rule}: ${error instanceof Error ? error.message : String(error)}`,
        },
      );
    }
  }
}