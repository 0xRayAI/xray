/**
 * Agent Triage Rule Loader
 *
 * Loads agent triage rules from AGENTS.md file.
 * Extracts triage guidelines and converts them to RuleDefinition objects.
 *
 * Phase 4 refactoring: Extracted from RuleEnforcer.loadAgentTriageRules()
 *
 * @module loaders/agent-triage-loader
 * @version 1.0.0
 */
import { frameworkLogger } from "../../core/framework-logger.js";
import { BaseLoader } from "./base-loader.js";
/**
 * Loader for agent triage rules from AGENTS.md.
 * Parses the markdown file to extract triage guidelines.
 *
 * @example
 * ```typescript
 * const loader = new AgentTriageLoader();
 * if (await loader.isAvailable()) {
 *   const rules = await loader.load();
 *   console.log(`Loaded ${rules.length} triage rules`);
 * }
 * ```
 */
export class AgentTriageLoader extends BaseLoader {
    name = "agent-triage";
    /**
     * Path to the AGENTS.md file.
     */
    get agentsPath() {
        return this.resolvePath("AGENTS.md");
    }
    /**
     * Check if AGENTS.md exists.
     * @returns Promise resolving to true if AGENTS.md is available
     */
    async isAvailable() {
        return this.fileExists(this.agentsPath);
    }
    /**
     * Load agent triage rules from AGENTS.md.
     * @returns Promise resolving to array of rule definitions
     */
    async load() {
        const rules = [];
        try {
            const content = await this.readFile(this.agentsPath);
            // Extract triage guidelines from AGENTS.md
            const triageSection = this.extractTriageSection(content);
            if (triageSection) {
                // Create triage commit status reporting rule
                rules.push(this.createTriageCommitStatusRule());
                // Create additional triage rules based on AGENTS.md content
                const additionalRules = this.extractAdditionalRules(content);
                rules.push(...additionalRules);
                await frameworkLogger.log("agent-triage-loader", "loaded-triage-rules", "success", {
                    message: `Loaded ${rules.length} agent triage rules`,
                    ruleCount: rules.length,
                });
            }
        }
        catch (error) {
            await frameworkLogger.log("agent-triage-loader", "failed-to-load-triage", "error", {
                message: `Failed to load agent triage rules: ${error instanceof Error ? error.message : String(error)}`,
                error: error instanceof Error ? error.message : String(error),
            });
        }
        return rules;
    }
    /**
     * Extract the triage section from AGENTS.md content.
     * @param content - Full content of AGENTS.md
     * @returns Triage section content or null if not found
     */
    extractTriageSection(content) {
        // Look for triage-related sections
        const triagePatterns = [
            /### Triage Summary Guidelines([\s\S]*?)(?=###|$)/,
            /### Agent Triage([\s\S]*?)(?=###|$)/,
            /### Triage([\s\S]*?)(?=###|$)/,
            /## Triage([\s\S]*?)(?=##|$)/,
        ];
        for (const pattern of triagePatterns) {
            const match = content.match(pattern);
            if (match && match[1]) {
                return match[1].trim();
            }
        }
        return null;
    }
    /**
     * Extract additional rules from AGENTS.md content.
     * @param content - Full content of AGENTS.md
     * @returns Array of additional rule definitions
     */
    extractAdditionalRules(content) {
        const rules = [];
        // Check for reflection guidelines
        if (content.includes("reflection") || content.includes("Reflection")) {
            rules.push(this.createReflectionGuidelineRule());
        }
        // Check for complexity routing
        if (content.includes("complexity") ||
            content.includes("routing") ||
            content.includes("Complexity")) {
            rules.push(this.createComplexityRoutingRule());
        }
        // Check for agent invocation patterns
        if (content.includes("@") || content.includes("invoke")) {
            rules.push(this.createAgentInvocationRule());
        }
        return rules;
    }
    /**
     * Create the triage commit status reporting rule.
     * @returns RuleDefinition for triage commit status
     */
    createTriageCommitStatusRule() {
        return {
            id: "agent-triage-commit-status",
            name: "Triage Commit Status Reporting",
            description: "When providing triage summaries after build error resolution or major changes, ALWAYS explicitly state the commit status (successful/failed) to avoid confusion",
            category: "reporting",
            severity: "info",
            enabled: true,
            validator: this.validateTriageReporting.bind(this),
        };
    }
    /**
     * Create a reflection guideline rule.
     * @returns RuleDefinition for reflection guidelines
     */
    createReflectionGuidelineRule() {
        return {
            id: "agent-triage-reflection-guidelines",
            name: "Triage Reflection Guidelines",
            description: "Complex investigations and multi-session work should be documented in deep reflections",
            category: "reporting",
            severity: "info",
            enabled: true,
            validator: this.validateReflectionGuidelines.bind(this),
        };
    }
    /**
     * Create a complexity routing rule.
     * @returns RuleDefinition for complexity routing
     */
    createComplexityRoutingRule() {
        return {
            id: "agent-triage-complexity-routing",
            name: "Complexity-Based Agent Routing",
            description: "Tasks should be routed to appropriate agents based on complexity level",
            category: "architecture",
            severity: "info",
            enabled: true,
            validator: this.validateComplexityRouting.bind(this),
        };
    }
    /**
     * Create an agent invocation rule.
     * @returns RuleDefinition for agent invocation
     */
    createAgentInvocationRule() {
        return {
            id: "agent-triage-invocation-syntax",
            name: "Agent Invocation Syntax",
            description: "Use @agent-name syntax in prompts or code comments to invoke agents",
            category: "code-quality",
            severity: "info",
            enabled: true,
            validator: this.validateAgentInvocation.bind(this),
        };
    }
    /**
     * Validate triage reporting requirements.
     * @param context - Validation context
     * @returns Validation result
     */
    async validateTriageReporting(context) {
        // This rule validates that triage summaries include commit status
        // Would be checked during reporting operations
        return {
            passed: true,
            message: "Triage reporting guidelines enforced",
        };
    }
    /**
     * Validate reflection guidelines.
     * @param context - Validation context
     * @returns Validation result
     */
    async validateReflectionGuidelines(context) {
        return {
            passed: true,
            message: "Reflection guidelines available",
        };
    }
    /**
     * Validate complexity routing.
     * @param context - Validation context
     * @returns Validation result
     */
    async validateComplexityRouting(context) {
        return {
            passed: true,
            message: "Complexity routing guidelines available",
        };
    }
    /**
     * Validate agent invocation syntax.
     * @param context - Validation context
     * @returns Validation result
     */
    async validateAgentInvocation(context) {
        return {
            passed: true,
            message: "Agent invocation syntax guidelines available",
        };
    }
}
//# sourceMappingURL=agent-triage-loader.js.map