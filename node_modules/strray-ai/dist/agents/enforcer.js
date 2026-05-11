/**
 * Enforcer Agent - DEPRECATED
 *
 * ARCHITECTURE CHANGE (2026-04-17):
 *
 * Enforcement is now handled at the plugin/MCP level:
 * - preValidate processor runs before operations
 * - codex-injection plugin handles codex enforcement
 * - MCP servers (enforcer-tools.server.ts) handle skill execution
 * - RuleEnforcer in enforcement/rule-enforcer.ts handles rule execution
 *
 * This agent is kept for backwards compatibility but is not used.
 * The enforcement system handles compliance automatically.
 *
 * @deprecated Use preValidate processor and MCP servers for enforcement.
 */
export const enforcer = {
    name: "enforcer",
    capabilities: [
        "error-prevention",
        "compliance-monitoring",
        "systematic-validation",
        "codex-enforcement",
        "security-policy",
    ],
    maxComplexity: 0,
    enabled: false,
    description: "DEPRECATED - Enforcement is now plugin-level via preValidate processor and MCP servers.",
    mode: "subagent",
    system: `This agent is DEPRECATED.

Enforcement is handled automatically by the 0xRay plugin:
- preValidate processor runs before every operation
- codex-injection plugin handles codex compliance
- MCP servers (enforcer-tools.server.ts) handle skill execution
- RuleEnforcer handles rule execution

Do NOT use this agent. The enforcement system handles compliance.`,
    temperature: 0.1,
    tools: {
        include: [],
    },
    permission: {
        edit: "allow",
        bash: {},
    },
};
//# sourceMappingURL=enforcer.js.map