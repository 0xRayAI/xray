/**
 * AGENTS.md Validation Processor
 *
 * Pre-processor that validates AGENTS.md exists and is up-to-date before
 * allowing commits. Integrates with 0xRay's processor pipeline.
 *
 * @processor_type pre
 * @priority 90 (high - runs early)
 * @blocking true (blocks commit if AGENTS.md is invalid)
 *
 * @version 1.0.0
 * @framework 0xRay 1.3.5
 */
import * as fs from "fs";
import * as path from "path";
import { frameworkLogger } from "../core/framework-logger.js";
export class AgentsMdValidationProcessor {
    projectRoot;
    agentsPath;
    // Required sections that must exist in AGENTS.md (v1.7+ format)
    REQUIRED_SECTIONS = [
        "## Available Agents",
        "## Available Skills",
    ];
    REQUIRED_AGENTS = [
        "@enforcer",
        "@orchestrator",
        "@architect",
        "@security-auditor",
        "@code-reviewer",
        "@refactorer",
        "@testing-lead",
        "@bug-triage-specialist",
        "@researcher",
    ];
    // Recommended sections that should exist
    RECOMMENDED_SECTIONS = [
        "## Codex",
        "## CLI Commands",
        "## Skills Registry",
    ];
    constructor(projectRoot = process.cwd()) {
        this.projectRoot = projectRoot;
        this.agentsPath = path.join(projectRoot, "AGENTS.md");
    }
    /**
     * Main execution method - called by ProcessorManager
     */
    async execute(context) {
        try {
            // Only validate on write/edit operations
            if (!["write", "edit", "multiedit"].includes(context.tool)) {
                return {
                    success: true,
                    blocked: false,
                    message: "AGENTS.md validation skipped (not a file modification)",
                };
            }
            // Check if we're modifying AGENTS.md or any agent-related files
            const isAgentRelated = this.isAgentRelatedChange(context);
            // Validate AGENTS.md
            const validation = await this.validateAgentsMd();
            if (!validation.valid) {
                await frameworkLogger.log("agents-md-validation-processor", "-agents-md-validation-failed-", "error", {
                    errors: validation.errors,
                    warnings: validation.warnings,
                    filePath: this.agentsPath,
                });
                return {
                    success: false,
                    blocked: true,
                    message: `AGENTS.md validation failed: ${validation.errors.join(", ")}`,
                    result: validation,
                };
            }
            // Log success
            await frameworkLogger.log("agents-md-validation-processor", "-agents-md-validation-passed-", "info", {
                warnings: validation.warnings,
                isAgentRelated,
            });
            return {
                success: true,
                blocked: false,
                message: validation.warnings.length > 0
                    ? `AGENTS.md valid with ${validation.warnings.length} warnings`
                    : "AGENTS.md validation passed",
                result: validation,
            };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            await frameworkLogger.log("agents-md-validation-processor", "-validation-error-", "error", { message: errorMessage });
            return {
                success: false,
                blocked: true,
                message: `AGENTS.md validation error: ${errorMessage}`,
            };
        }
    }
    /**
     * Determine if the change is agent-related
     */
    isAgentRelatedChange(context) {
        const filePath = context.args?.filePath || "";
        const agentPatterns = [
            "AGENTS.md",
            "opencode.json",
            ".opencode/agent",
            "src/agents",
            "docs/agent",
        ];
        return agentPatterns.some((pattern) => filePath.includes(pattern));
    }
    /**
     * Validate AGENTS.md file
     */
    async validateAgentsMd() {
        const result = {
            valid: true,
            errors: [],
            warnings: [],
            fixes: [],
        };
        // Check 1: File exists
        if (!fs.existsSync(this.agentsPath)) {
            result.valid = false;
            result.errors.push("AGENTS.md not found in project root");
            result.fixes = result.fixes || [];
            result.fixes.push("Create AGENTS.md using template from docs/AGENTS_TEMPLATE.md");
            return result;
        }
        const content = fs.readFileSync(this.agentsPath, "utf-8");
        // Check 2: Not empty/minimal
        if (content.length < 500) {
            result.valid = false;
            result.errors.push("AGENTS.md is too short (likely incomplete)");
        }
        // Check 3: Required sections
        const missingSections = this.REQUIRED_SECTIONS.filter((section) => !content.includes(section));
        if (missingSections.length > 0) {
            result.valid = false;
            result.errors.push(`Missing required sections: ${missingSections.join(", ")}`);
        }
        // Check 4: Required agents
        const missingAgents = this.REQUIRED_AGENTS.filter((agent) => !content.includes(agent));
        if (missingAgents.length > 0) {
            result.valid = false;
            result.errors.push(`Missing agent definitions: ${missingAgents.join(", ")}`);
        }
        // Check 5: Version header
        const versionMatch = content.match(/\*\*Version\*\*:\s*(\d+\.\d+\.\d+)/);
        if (!versionMatch) {
            result.warnings.push("No version header found in AGENTS.md");
        }
        // Check 6: Date freshness
        const dateMatch = content.match(/\*\*Updated\*\*:\s*(\d{4}-\d{2}-\d{2})/);
        if (dateMatch && dateMatch[1]) {
            const daysOld = this.calculateDaysOld(dateMatch[1]);
            if (daysOld > 30) {
                result.warnings.push(`AGENTS.md is ${daysOld} days old - consider review`);
            }
        }
        else {
            result.warnings.push("No date stamp found in AGENTS.md");
        }
        // Check 7: Agent count (should have active autonomous agents)
        const agentCount = (content.match(/@\[?[a-z-]+\]?/gi) || []).length;
        if (agentCount < 5) {
            result.warnings.push(`Only ${agentCount} agents found - verify agents table is complete`);
        }
        return result;
    }
    /**
     * Calculate days since date
     */
    calculateDaysOld(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        return Math.ceil((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    }
    /**
     * Auto-generate AGENTS.md from template
     */
    async autoGenerate() {
        try {
            const templatePath = path.join(this.projectRoot, "docs", "AGENTS_TEMPLATE.md");
            if (!fs.existsSync(templatePath)) {
                return {
                    success: false,
                    message: "AGENTS_TEMPLATE.md not found in docs/",
                };
            }
            let template = fs.readFileSync(templatePath, "utf-8");
            // Update date and version
            const now = new Date().toISOString().split("T")[0];
            template = template
                .replace(/\*\*Updated\*\*:\s*\d{4}-\d{2}-\d{2}/, `**Updated**: ${now}`)
                .replace(/\*\*Version\*\*:\s*\d+\.\d+\.\d+/, `**Version**: 1.22.35`);
            fs.writeFileSync(this.agentsPath, template, "utf-8");
            await frameworkLogger.log("agents-md-validation-processor", "-agents-md-auto-generated-", "info", { path: this.agentsPath });
            return {
                success: true,
                message: "AGENTS.md auto-generated successfully",
                path: this.agentsPath,
            };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            return {
                success: false,
                message: `Auto-generation failed: ${errorMessage}`,
            };
        }
    }
}
// Export singleton for processor registration
export const agentsMdValidationProcessor = new AgentsMdValidationProcessor();
//# sourceMappingURL=agents-md-validation-processor.js.map