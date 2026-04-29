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
import { frameworkLogger } from "../../core/framework-logger.js";
import { DocWriteGuard } from "../doc-write-guard.js";
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
    getPackageVersion() {
        try {
            const pkgPath = path.join(this.projectRoot, "package.json");
            const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
            return pkg.version || "0.0.0";
        }
        catch {
            return "0.0.0";
        }
    }
    getSectionTemplate(section) {
        const version = this.getPackageVersion();
        const now = new Date().toISOString().split("T")[0];
        const templates = {
            "## Available Agents": [
                "",
                "## Available Agents",
                "",
                "| Agent | Purpose | Invoke |",
                "|-------|---------|--------|",
                "| `@enforcer` | Codex compliance & error prevention | `@enforcer analyze this code` |",
                "| `@orchestrator` | Complex multi-step task coordination | `@orchestrator implement feature` |",
                "| `@architect` | System design & technical decisions | `@architect design API` |",
                "| `@security-auditor` | Vulnerability detection | `@security-auditor scan` |",
                "| `@code-reviewer` | Quality assessment | `@code-reviewer review PR` |",
                "| `@refactorer` | Technical debt elimination | `@refactorer optimize code` |",
                "| `@testing-lead` | Testing strategy | `@testing-lead plan tests` |",
                "| `@bug-triage-specialist` | Error investigation | `@bug-triage-specialist debug error` |",
                "| `@researcher` | Codebase exploration | `@researcher find implementation` |",
                "",
            ].join("\n"),
            "## Available Skills": [
                "",
                "## Available Skills",
                "",
                "StringRay ships with 30 framework skills and provides a registry of 10 curated community sources.",
                "",
                "```bash",
                "npx strray-ai skill:install              # Show starter packs + available sources",
                "npx strray-ai skill:install <name>       # Install from registry",
                "npx strray-ai skill:registry list        # Show all registry sources",
                "```",
                "",
            ].join("\n"),
            "## Codex": [
                "",
                "## Codex",
                "",
                `StringRay enforces Universal Development Codex (60 terms) for systematic error prevention.`,
                "",
            ].join("\n"),
            "## CLI Commands": [
                "",
                "## CLI Commands",
                "",
                "```bash",
                "npx strray-ai install       # Install and configure",
                "npx strray-ai status       # Check configuration",
                "npx strray-ai health        # Health check",
                "npx strray-ai validate      # Validate installation",
                "```",
                "",
            ].join("\n"),
        };
        return templates[section] || `\n\n${section}\n\n*(Section added by agents-md-validation-processor — ${now})*\n`;
    }
    async appendMissing() {
        try {
            if (!fs.existsSync(this.agentsPath)) {
                return {
                    success: false,
                    message: "AGENTS.md not found — cannot append to nonexistent file",
                    added: [],
                };
            }
            const content = fs.readFileSync(this.agentsPath, "utf-8");
            const missingSections = this.REQUIRED_SECTIONS.filter((s) => !content.includes(s));
            if (missingSections.length === 0) {
                return {
                    success: true,
                    message: "All required sections present",
                    added: [],
                };
            }
            const additions = missingSections
                .map((section) => this.getSectionTemplate(section))
                .join("\n");
            DocWriteGuard.append(this.agentsPath, additions);
            await frameworkLogger.log("agents-md-validation-processor", "-agents-md-sections-appended-", "info", { added: missingSections, path: this.agentsPath });
            return {
                success: true,
                message: `Appended ${missingSections.length} missing sections: ${missingSections.join(", ")}`,
                added: missingSections,
            };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            return {
                success: false,
                message: `Append failed: ${errorMessage}`,
                added: [],
            };
        }
    }
}
// Export singleton for processor registration
export const agentsMdValidationProcessor = new AgentsMdValidationProcessor();
//# sourceMappingURL=agents-md-validation-processor.js.map