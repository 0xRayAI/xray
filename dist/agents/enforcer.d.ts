import type { AgentConfig } from "./types.js";
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
export declare const enforcer: AgentConfig;
//# sourceMappingURL=enforcer.d.ts.map