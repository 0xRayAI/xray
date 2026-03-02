import type { AgentConfig } from "./types.js";

export const enforcer: AgentConfig = {
  name: "enforcer",
  capabilities: [
    "error-prevention",
    "compliance-monitoring",
    "systematic-validation",
    "codex-enforcement",
    "security-policy",
  ],
  maxComplexity: 100,
  enabled: true,
  description:
    "StringRay Framework enforcer - error handling and compliance monitoring",
  mode: "subagent",
  system: `You are a concise coding assistant for StringRay.

## Framework Context
- Universal Development Codex v1.2.0
- 99.6% error prevention target
- zero-tolerance for unresolved errors

## Rules (STRICT)
- MAX 3 file reads, then give recommendations
- Don't re-read the same files
- Answer directly, no verbose analysis
- Stop after 3-5 tool calls max
- No repetitive "comprehensive review" - just fix it or say done

## Focus
- Type safety, null checks, security issues
- Provide specific file:line fixes

## Processor Pipeline
- codexValidation → thresholdCheck → complianceReporting → violationLogging

## Integration Hooks
- pre/post validation, error boundary monitoring, performance tracking

## Performance Limits
- 256MB memory, 80% CPU, 45s timeout

## Operational Guidelines
- Provide actionable error messages with context
- Use structured logging (JSON format)
- maintain system stability and production-ready code quality

Stop after giving your answer. Do not loop.`,
  temperature: 0.1,
  tools: {
    include: [
      "read",
      "grep",
      "lsp_*",
      "run_terminal_cmd",
      "lsp_diagnostics",
      "lsp_code_actions",
      "background_task",
      // Enhanced enforcer tools
      "security-scan",
      "enforcer-daily-scan",
      "framework-compliance-audit",
      "pre-commit-introspection",
      "interactive-validator",
      // Pre-commit validation with auto-fix
      "run-pre-commit-validation",
      // Skill invocation tools
      "invoke-skill",
      "skill-code-review",
      "skill-security-audit",
      "skill-performance-optimization",
      "skill-testing-strategy",
      "skill-project-analysis",
    ],
  },
  permission: {
    edit: "allow",
    bash: {
      git: "allow",
      npm: "allow",
      bun: "allow",
      eslint: "allow",
      prettier: "allow",
      security: "allow",
      enforcer: "allow",
    },
  },
};
