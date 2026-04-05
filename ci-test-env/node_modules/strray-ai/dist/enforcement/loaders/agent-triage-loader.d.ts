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
import { BaseLoader } from "./base-loader.js";
import { RuleDefinition } from "../types.js";
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
export declare class AgentTriageLoader extends BaseLoader {
    readonly name = "agent-triage";
    /**
     * Path to the AGENTS.md file.
     */
    private get agentsPath();
    /**
     * Check if AGENTS.md exists.
     * @returns Promise resolving to true if AGENTS.md is available
     */
    isAvailable(): Promise<boolean>;
    /**
     * Load agent triage rules from AGENTS.md.
     * @returns Promise resolving to array of rule definitions
     */
    load(): Promise<RuleDefinition[]>;
    /**
     * Extract the triage section from AGENTS.md content.
     * @param content - Full content of AGENTS.md
     * @returns Triage section content or null if not found
     */
    private extractTriageSection;
    /**
     * Extract additional rules from AGENTS.md content.
     * @param content - Full content of AGENTS.md
     * @returns Array of additional rule definitions
     */
    private extractAdditionalRules;
    /**
     * Create the triage commit status reporting rule.
     * @returns RuleDefinition for triage commit status
     */
    private createTriageCommitStatusRule;
    /**
     * Create a reflection guideline rule.
     * @returns RuleDefinition for reflection guidelines
     */
    private createReflectionGuidelineRule;
    /**
     * Create a complexity routing rule.
     * @returns RuleDefinition for complexity routing
     */
    private createComplexityRoutingRule;
    /**
     * Create an agent invocation rule.
     * @returns RuleDefinition for agent invocation
     */
    private createAgentInvocationRule;
    /**
     * Validate triage reporting requirements.
     * @param context - Validation context
     * @returns Validation result
     */
    private validateTriageReporting;
    /**
     * Validate reflection guidelines.
     * @param context - Validation context
     * @returns Validation result
     */
    private validateReflectionGuidelines;
    /**
     * Validate complexity routing.
     * @param context - Validation context
     * @returns Validation result
     */
    private validateComplexityRouting;
    /**
     * Validate agent invocation syntax.
     * @param context - Validation context
     * @returns Validation result
     */
    private validateAgentInvocation;
}
//# sourceMappingURL=agent-triage-loader.d.ts.map