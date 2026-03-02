/**
 * StringRay Plugin for OpenCode
 *
 * Enterprise AI orchestration with systematic error prevention.
 * This plugin provides intelligent agent coordination and codex-based code quality enforcement.
 *
 * @version 1.1.2
 * @author StringRay Framework Team
 */

import { frameworkLogger, generateJobId } from "../core/framework-logger.js";

import { TokenManager } from "../utils/token-manager.js";

const tokenManager = new TokenManager();

const pluginHooks = {
  config: (input: {
    client?: string;
    directory?: string;
    worktree?: string;
  }) => {
    const jobId = generateJobId("codex-injector-init");
    frameworkLogger.log(
      "codex-injector",
      "plugin initialized",
      "info",
      {},
      undefined,
      jobId,
    );
  },

  "experimental.chat.system.transform": (messages: any[], context: any) => {
    const jobId = generateJobId("codex-injector-transform");
    frameworkLogger.log(
      "codex-injector",
      "chat.system.transform hook called",
      "info",
      { messageCount: messages?.length },
      undefined,
      jobId,
    );

    // Inject codex context into system messages for agent guidance
    try {
      const fullContent = `## StringRay Framework Codex v1.2.25

Welcome to StringRay AI! This session includes systematic error prevention and production-ready development guidelines.

### 🚀 Available Framework Capabilities

**Agent Commands (use @agent-name):**
- **@orchestrator** - Multi-agent workflow coordination (accesses all internal agents)
- **@enforcer** - Codex compliance & error prevention

**Internal Agent System:**
All 8 specialized agents (architect, bug-triage-specialist, code-reviewer, security-auditor, refactorer, testing-lead, researcher) are available internally through orchestrator coordination and framework operations.

**Skills System (23 lazy-loaded capabilities):**
- project-analysis, testing-strategy, code-review, security-audit, performance-optimization
- refactoring-strategies, ui-ux-design, documentation-generation, and more

**Framework Tools:**
- **framework-reporting-system** - Generate comprehensive activity reports
- **complexity-analyzer** - Analyze code complexity and delegation decisions
- **codex-injector** - Apply development standards automatically

**Help & Discovery:**
To discover all available capabilities, use the framework-help system:
- Get capabilities overview and command examples
- Access detailed explanations of any framework feature
- Available through MCP server: framework-help

### Core Principles:
- **Progressive Prod-Ready Code**: All code must be production-ready from the first commit
- **No Patches/Boiler/Stubs**: Prohibit temporary patches and incomplete implementations
- **Surgical Fixes**: Apply precise, targeted fixes with root cause resolution
- **Type Safety First**: Leverage TypeScript's type system fully
- **Single Source of Truth**: Maintain authoritative sources for all information

### Development Guidelines:
- **YAGNI**: Don't implement features not currently needed
- **DRY**: Don't repeat yourself - extract reusable logic
- **Separation of Concerns**: Keep UI, business logic, and data layers distinct
- **Test Coverage >85%**: Maintain comprehensive behavioral test coverage
- **Performance Budget**: Bundle size <2MB (gzipped <700KB)

For complete codex documentation, see: .opencode/strray/codex.json

### 🔒 Critical Spawn Governance (All Agents)

**MANDATORY: All agents must follow these spawn governance rules:**

- **Maximum 2 subagents total** across all operations within a single agent session
- **No nested subagent spawning** - subagents cannot spawn their own subagents
- **Solo agents (researcher)** can spawn 0 subagents - they are terminal agents
- **Always check spawn authorization** before creating new agents via agentSpawnGovernor
- **Report spawn attempts** to monitoring system before execution
- **Terminate gracefully** if spawn limits exceeded - do not attempt workarounds
- **Single level only** - coordinator agents can spawn workers, but workers cannot spawn more agents

**Violation of these rules will result in immediate system shutdown to prevent infinite loops.**`;

      const limitCheck = tokenManager.checkLimits(fullContent);
      let finalContent = fullContent;

      if (!limitCheck.withinLimit) {
        const jobId = generateJobId("codex-injector-token-exceed");
        frameworkLogger.log(
          "codex-injector",
          "Codex content exceeds token limits, pruning context",
          "error",
          {
            currentTokens: limitCheck.currentTokens,
            maxTokens: limitCheck.maxTokens,
          },
          undefined,
          jobId,
        );
        finalContent = tokenManager.pruneContext(fullContent);
      } else if (limitCheck.warning) {
        const jobId = generateJobId("codex-injector-token-warning");
        frameworkLogger.log(
          "codex-injector",
          "Codex content approaching token limits",
          "info",
          {
            currentTokens: limitCheck.currentTokens,
            maxTokens: limitCheck.maxTokens,
          },
          undefined,
          jobId,
        );
      }

      // CRITICAL: DO NOT add complexity analysis here
      // Complexity analysis belongs in the delegation system, not context injection
      // This plugin should ONLY handle codex context injection

      const codexMessage = {
        role: "system",
        content: finalContent,
      };

      // Modify context.system array to include codex message
      if (context && context.system && Array.isArray(context.system)) {
        context.system.unshift(codexMessage);
      }

      // Return the original messages (the hook modifies context in place)
      return messages;
    } catch (error) {
      console.error("❌ StringRay: Error injecting codex context:", error);
      // Return original messages if injection fails
      return messages;
    }
  },

  "tool.execute.before": (tool: string, args: any) => {
    const jobId = generateJobId("codex-injector-tool-before");
    frameworkLogger.log(
      "codex-injector",
      "tool.execute.before hook called",
      "info",
      { tool },
      undefined,
      jobId,
    );
  },

  "tool.execute.after": (tool: string, args: any, result: any) => {
    const jobId = generateJobId("codex-injector-tool-after");
    frameworkLogger.log(
      "codex-injector",
      "tool.execute.after hook called",
      "success",
      { tool },
      undefined,
      jobId,
    );
  },
};

// Lightweight bypass for simple interactions
function isSimpleInteraction(input: any): boolean {
  if (!input || typeof input !== "object") return false;

  // Check messages for simple greetings/chats
  if (input.messages && Array.isArray(input.messages)) {
    const lastMessage = input.messages[input.messages.length - 1];
    if (lastMessage && lastMessage.content) {
      const content = String(lastMessage.content).toLowerCase().trim();
      // Detect basic greetings and chat
      if (
        content.match(
          /^(hi|hello|hey|sup|yo|howdy|greeting|chat|how are you|what'?s up)$/i,
        )
      ) {
        return true;
      }
    }
  }

  return false;
}

// Export a function that returns the plugin hooks object
export function stringrayPlugin(input: any) {
  // Fast path for simple interactions - skip full framework activation
  if (isSimpleInteraction(input)) {
    return {
      config: () => {}, // No-op for simple interactions
      "experimental.chat.system.transform": (messages: any[], context: any) => {
        // Insert minimal welcome message for simple interactions
        const lightMessage = {
          role: "system",
          content:
            "Hello! I'm the StrRay Agentic Framework. Ready to help with development tasks.",
        };
        if (context && context.system && Array.isArray(context.system)) {
          context.system.unshift(lightMessage);
        }
        return messages;
      },
      "tool.execute.before": () => {},
      "tool.execute.after": () => {},
    };
  }

  // Full framework activation for complex requests
  return pluginHooks;
}

// Default export for compatibility
export default stringrayPlugin;
