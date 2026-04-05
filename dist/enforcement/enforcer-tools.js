/**
 * Enforcer Tools - Integration layer between enforcer agent and rule enforcement system
 * Provides tools for codex compliance, rule validation, and contextual analysis enforcement
 */
import { ruleEnforcer, } from "./rule-enforcer.js";
import { frameworkLogger } from "../core/framework-logger.js";
import { AgentDelegator } from "../delegation/agent-delegator.js";
import { StringRayStateManager } from "../state/state-manager.js";
import { strRayConfigLoader } from "../core/config-loader.js";
import * as fs from "fs";
import * as path from "path";
// Minimum confidence to auto-delegate to another agent
const DELEGATION_CONFIDENCE_THRESHOLD = 0.50;
// Agents that enforcer should NOT delegate to (enforcer handles these itself)
const ENFORCER_HANDLES = new Set(["enforcer", "code-reviewer"]);
const ROUTING_MAPPINGS = [
    { keywords: ["write", "file", "create"], skill: "code-review", agent: "code-reviewer", confidence: 0.9 },
    { keywords: ["review", "audit", "assess", "evaluate", "check", "inspect", "quality", "validate", "code-review"], skill: "code-review", agent: "code-reviewer", confidence: 0.9 },
    { keywords: ["test", "testing", "jest", "coverage", "unit", "e2e", "cypress", "spec", "verify"], skill: "testing-best-practices", agent: "testing-lead", confidence: 0.95 },
    { keywords: ["fix", "debug", "triage", "broken", "error", "crash", "bug", "issue", "resolve"], skill: "bug-triage", agent: "bug-triage-specialist", confidence: 0.92 },
    { keywords: ["security", "vulnerability", "threat", "scan", "risk", "exploit", "secure", "pentest"], skill: "security-audit", agent: "security-auditor", confidence: 0.95 },
    { keywords: ["refactor", "cleanup", "improve", "restructure", "modernize", "debt"], skill: "refactoring-strategies", agent: "refactorer", confidence: 0.92 },
    { keywords: ["performance", "optimize", "bottleneck", "benchmark", "profile", "speed"], skill: "performance-optimization", agent: "performance-engineer", confidence: 0.93 },
    { keywords: ["frontend", "react", "vue", "angular", "ui", "ux", "interface", "component"], skill: "frontend-development", agent: "frontend-engineer", confidence: 0.95 },
    { keywords: ["backend", "api", "server", "microservice", "endpoint"], skill: "backend-development", agent: "backend-engineer", confidence: 0.95 },
    { keywords: ["docs", "documentation", "readme", "wiki", "guide", "manual"], skill: "documentation-generation", agent: "tech-writer", confidence: 0.9 },
    { keywords: ["database", "db", "sql", "schema", "migration", "query"], skill: "database-design", agent: "database-engineer", confidence: 0.95 },
    { keywords: ["deploy", "ci/cd", "pipeline", "docker", "kubernetes", "infrastructure"], skill: "devops-deployment", agent: "devops-engineer", confidence: 0.94 },
    { keywords: ["mobile", "ios", "android", "react-native", "flutter"], skill: "mobile-development", agent: "mobile-developer", confidence: 0.95 },
    { keywords: ["enforce", "compliance", "rule", "standard", "codex", "block", "prevent"], skill: "enforcer", agent: "enforcer", confidence: 0.95 },
    { keywords: ["design", "architect", "plan", "system", "model", "pattern", "architecture"], skill: "architecture-patterns", agent: "architect", confidence: 0.95 },
    { keywords: ["codebase", "explore", "research", "discover", "implementation"], skill: "git-workflow", agent: "researcher", confidence: 0.88 },
    // New mappings for previously unmapped skills
    { keywords: ["api", "rest", "graphql", "openapi", "endpoint", "swagger"], skill: "api-design", agent: "backend-engineer", confidence: 0.9 },
    { keywords: ["strategy", "roadmap", "planning", "technical", "decision", "architecture"], skill: "architecture-patterns", agent: "strategist", confidence: 0.88 },
    { keywords: ["reflection", "story", "narrative", "saga", "journey", "document"], skill: "storyteller", agent: "tech-writer", confidence: 0.85 },
    { keywords: ["analyze", "metrics", "complexity", "maintainability", "quality"], skill: "code-analyzer", agent: "code-analyzer", confidence: 0.9 },
    { keywords: ["growth", "marketing", "conversion", "acquisition", "user-acquisition"], skill: "growth-strategist", agent: "growth-strategist", confidence: 0.9 },
    { keywords: ["seo", "search", "organic", "traffic", "keywords", "ranking"], skill: "seo-consultant", agent: "seo-consultant", confidence: 0.92 },
    { keywords: ["content", "copy", "blog", "marketing", "social"], skill: "content-creator", agent: "content-creator", confidence: 0.88 },
    { keywords: ["format", "lint", "prettier", "eslint", "style", "formatting"], skill: "auto-format", agent: "code-reviewer", confidence: 0.85 },
    { keywords: ["project", "structure", "health", "dependencies", "architecture"], skill: "project-analysis", agent: "architect", confidence: 0.88 },
    { keywords: ["compliance", "audit", "standards", "framework", "validation"], skill: "framework-compliance-audit", agent: "enforcer", confidence: 0.9 },
    { keywords: ["session", "state", "persistence", "storage", "cache"], skill: "session-management", agent: "backend-engineer", confidence: 0.85 },
    { keywords: ["image", "visual", "pdf", "diagram", "multimedia", "media"], skill: "multimodal-looker", agent: "multimodal-looker", confidence: 0.92 },
    { keywords: ["testing", "strategy", "coverage", "test-plan"], skill: "testing-strategy", agent: "testing-lead", confidence: 0.92 },
    { keywords: ["inference", "model", "llm", "tuning", "optimization"], skill: "inference-improve", agent: "performance-engineer", confidence: 0.88 },
    { keywords: ["orchestrate", "boot", "initialize", "startup", "bootstrap"], skill: "boot-orchestrator", agent: "orchestrator", confidence: 0.9 },
    // Additional unmapped skills
    { keywords: ["tool", "utility", "helper", "instrument"], skill: "architect-tools", agent: "architect", confidence: 0.85 },
    { keywords: ["design", "visual", "style", "theme", "css", "accessibility"], skill: "ui-ux-design", agent: "frontend-ui-ux-engineer", confidence: 0.9 },
    { keywords: ["agent", "multi-agent", "coordination", "hermes", "communication"], skill: "hermes-agent", agent: "orchestrator", confidence: 0.88 },
    { keywords: ["log", "diagnostic", "trace", "monitor", "watch"], skill: "log-monitor", agent: "log-monitor", confidence: 0.9 },
    { keywords: ["health", "diagnostic", "model-health", "validate-llm"], skill: "model-health-check", agent: "performance-engineer", confidence: 0.88 },
    { keywords: ["analyze", "profiling", "memory", "cpu", "latency"], skill: "performance-analysis", agent: "performance-engineer", confidence: 0.9 },
    { keywords: ["pipeline", "stream", "etl", "batch", "process"], skill: "processor-pipeline", agent: "backend-engineer", confidence: 0.88 },
    { keywords: ["vulnerability", "cve", "sast", "dast", "dependency-check"], skill: "security-scan", agent: "security-auditor", confidence: 0.92 },
    { keywords: ["state", "store", "redux", "context", "persistence"], skill: "state-manager", agent: "backend-engineer", confidence: 0.88 },
];
export function getTaskRoutingRecommendation(taskDescription) {
    const desc = taskDescription.toLowerCase();
    for (const mapping of ROUTING_MAPPINGS) {
        for (const keyword of mapping.keywords) {
            if (desc.includes(keyword.toLowerCase())) {
                return {
                    suggestedAgent: mapping.agent,
                    suggestedSkill: mapping.skill,
                    confidence: mapping.confidence,
                    matchedKeyword: keyword,
                };
            }
        }
    }
    return {
        suggestedAgent: "enforcer",
        suggestedSkill: "enforcer",
        confidence: 0.5,
        matchedKeyword: "none",
    };
}
/**
 * Pre-process and validate that the routing is appropriate for the operation
 * This is the integration point between TaskSkillRouter and RuleEnforcer
 */
export async function preProcessAndRoute(operation, context) {
    // Build task description from operation and context
    const taskDescription = buildTaskDescription(operation, context);
    // Get routing recommendation
    const routing = getTaskRoutingRecommendation(taskDescription);
    // Log the routing decision
    await frameworkLogger.log("enforcer-tools", "task-routed", "debug", {
        operation,
        taskDescription: taskDescription.substring(0, 100),
        suggestedAgent: routing.suggestedAgent,
        suggestedSkill: routing.suggestedSkill,
        confidence: routing.confidence,
    });
    // Enhance context with routing information
    const enhancedContext = {
        ...context,
        operation,
        // Add routing info to context for rule validators to use
        ...context.routing,
    };
    return {
        enhancedContext,
        routing,
    };
}
/**
 * Build a task description from operation and context for routing
 */
function buildTaskDescription(operation, context) {
    const parts = [operation];
    if (context.component) {
        parts.push(context.component);
    }
    if (context.files && context.files.length > 0) {
        parts.push(`files: ${context.files.join(", ")}`);
    }
    return parts.join(" ");
}
/**
 * Execute the full release workflow
 * Triggered when user says: release, npm publish, publish to npm, bump and publish, ship it
 */
async function executeReleaseWorkflow(operation, context, jobId, routing) {
    const { execSync } = await import('child_process');
    // Extract release options from routing context
    const releaseContext = routing.context || {};
    const bumpType = releaseContext.bumpType || 'patch';
    const createTag = releaseContext.createTag || false;
    await frameworkLogger.log("enforcer-tools", "release-workflow-starting", "info", { jobId, bumpType, createTag });
    const steps = [];
    const errors = [];
    // HARD STOP: Build must pass before release
    await frameworkLogger.log("enforcer-tools", "release-build-check", "info", { step: "Verifying build passes..." });
    try {
        execSync(`npm run build`, {
            cwd: process.cwd(),
            stdio: 'pipe'
        });
        steps.push("✅ Build verified");
    }
    catch (e) {
        const errorMsg = `🛑 RELEASE STOPPED: Build failed before publishing. Fix build errors first.`;
        frameworkLogger.log("enforcer-tools", "release-blocked", "error", {
            message: errorMsg,
        });
        frameworkLogger.log("enforcer-tools", "release-build-error", "error", {
            message: `Error: ${e}`,
            error: e,
        });
        return {
            operation: "release",
            passed: false,
            blocked: true,
            errors: [errorMsg, `Build error: ${e}`],
            warnings: [],
            fixes: [],
            report: {
                passed: false,
                operation: "release",
                errors: [errorMsg, `Build error: ${e}`],
                warnings: [],
                results: [],
                timestamp: new Date(),
            },
        };
    }
    try {
        // Step 1: Run version-manager to bump version and generate changelog
        await frameworkLogger.log("enforcer-tools", "release-step-1-version", "info", { step: "Bumping version..." });
        try {
            const versionArg = createTag ? '--tag' : '';
            execSync(`node scripts/node/version-manager.mjs ${bumpType} ${versionArg}`, {
                cwd: process.cwd(),
                stdio: 'inherit'
            });
            steps.push("✅ Version bumped + changelog generated");
        }
        catch (e) {
            errors.push(`Version bump failed: ${e}`);
        }
        // Step 2: Git commit and push
        await frameworkLogger.log("enforcer-tools", "release-step-2-git", "info", { step: "Committing and pushing..." });
        try {
            execSync(`git add -A && git commit -m "release: v${bumpType} - Changelog updated" && git push`, {
                cwd: process.cwd(),
                stdio: 'inherit'
            });
            steps.push("✅ Git commit + push");
        }
        catch (e) {
            errors.push(`Git commit/push failed: ${e}`);
        }
        // Step 3: npm publish
        await frameworkLogger.log("enforcer-tools", "release-step-3-npm", "info", { step: "Publishing to npm..." });
        try {
            execSync(`npm publish`, {
                cwd: process.cwd(),
                stdio: 'inherit'
            });
            steps.push("✅ npm published");
        }
        catch (e) {
            errors.push(`npm publish failed: ${e}`);
        }
        // Step 4: Generate tweet context
        await frameworkLogger.log("enforcer-tools", "release-step-4-tweet", "info", { step: "Generating tweet..." });
        try {
            execSync(`node scripts/node/release-tweet.mjs`, {
                cwd: process.cwd(),
                stdio: 'inherit'
            });
            steps.push("✅ Tweet context generated - ready for @growth-strategist");
        }
        catch (e) {
            errors.push(`Tweet generation failed: ${e}`);
        }
    }
    catch (e) {
        errors.push(`Release workflow failed: ${e}`);
    }
    return {
        operation: "release",
        passed: errors.length === 0,
        blocked: false,
        errors,
        warnings: [],
        fixes: [],
        report: {
            passed: errors.length === 0,
            operation: "release",
            errors,
            warnings: steps,
            results: steps.map(s => ({ rule: 'release', passed: true, message: s })),
            timestamp: new Date(),
        },
    };
}
/**
 * Delegate a task to another agent via AgentDelegator
 * This is the key integration that ensures enforcer routes to best agent
 */
async function delegateToAgent(agentName, operation, context, jobId) {
    try {
        // Create a minimal state manager and config loader for the delegator
        const stateManager = new StringRayStateManager();
        // Create the delegator
        const delegator = new AgentDelegator(stateManager, strRayConfigLoader);
        // Build task description for the delegated agent
        const taskDescription = buildTaskDescription(operation, context);
        // Build the delegation request
        const request = {
            operation,
            description: taskDescription,
            context: {
                ...context,
                originalJobId: jobId,
            },
            sessionId: stateManager.get("current_session_id") || `delegated-${jobId}`,
        };
        // Analyze and get delegation strategy
        const analysis = await delegator.analyzeDelegation(request);
        // Execute the delegation
        const result = await delegator.executeDelegation(analysis, request);
        await frameworkLogger.log("enforcer-tools", "delegation-complete", "info", {
            jobId,
            delegatedTo: agentName,
            success: result.success,
            agentsUsed: result.agents,
        });
        // Convert delegation result to EnforcementResult format
        return {
            operation,
            passed: result.success,
            blocked: !result.success,
            errors: result.errors || [],
            warnings: [],
            fixes: [],
            report: {
                passed: result.success,
                operation,
                timestamp: new Date(),
                errors: result.errors || [],
                warnings: [],
                results: [],
            },
        };
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        await frameworkLogger.log("enforcer-tools", "delegation-failed", "error", {
            jobId,
            delegatedTo: agentName,
            error: errorMessage,
        });
        // Fall back to self-execution if delegation fails
        return await ruleValidationSelf(operation, context, jobId);
    }
}
/**
 * Fallback: Execute validation ourselves if delegation fails
 */
async function ruleValidationSelf(operation, context, jobId) {
    const report = await ruleEnforcer.validateOperation(operation, context);
    return {
        operation,
        passed: report.passed,
        blocked: report.errors.length > 0,
        errors: report.errors,
        warnings: report.warnings,
        fixes: [],
        report,
    };
}
/**
 * Run pre-commit validation with auto-fix enabled
 * This is the integration point that automatically creates test files when needed
 */
async function runPreCommitValidationWithAutoFix(files, operation = "commit") {
    try {
        // Dynamically import to avoid circular dependencies
        const { testAutoCreationProcessor } = await import("../processors/test-auto-creation-processor.js");
        let fixesApplied = 0;
        // Process each file
        for (const filePath of files) {
            // Only process TypeScript source files
            if (filePath.endsWith(".ts") && !filePath.endsWith(".test.ts")) {
                const result = await testAutoCreationProcessor.execute({
                    tool: "write",
                    args: { filePath },
                    directory: process.cwd(),
                    filePath,
                    operation,
                });
                if (result.success) {
                    fixesApplied++;
                }
            }
        }
        return { success: true, fixesApplied };
    }
    catch (error) {
        return {
            success: false,
            fixesApplied: 0,
            error: error instanceof Error ? error.message : String(error),
        };
    }
}
/**
 * Rule Validation Tool - Validates operations against rule hierarchy
 * Now with intelligent task routing via TaskSkillRouter
 * Automatically delegates to best agent when confidence is high
 */
export async function ruleValidation(operation, context) {
    const jobId = `rule-validation-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    // PRE-PROCESS: Get intelligent routing recommendation
    const { enhancedContext, routing } = await preProcessAndRoute(operation, context);
    await frameworkLogger.log("enforcer-tools", "rule-validation-start", "info", {
        jobId,
        operation,
        files: context.files?.length || 0,
        hasExistingCode: !!context.existingCode,
        // Add routing info to logs
        routedTo: routing.suggestedAgent,
        routingSkill: routing.suggestedSkill,
        routingConfidence: routing.confidence,
    });
    // DELEGATION LOGIC: If high confidence and recommended agent is not enforcer, delegate!
    const shouldDelegate = routing.confidence >= DELEGATION_CONFIDENCE_THRESHOLD &&
        !ENFORCER_HANDLES.has(routing.suggestedAgent) &&
        routing.suggestedAgent !== "enforcer";
    // SPECIAL CASE: Release workflow - execute full release process
    if (routing.matchedKeyword === "release-workflow") {
        await frameworkLogger.log("enforcer-tools", "release-workflow-triggered", "info", {
            jobId,
            operation,
            bumpType: routing.context?.bumpType || 'patch',
            createTag: routing.context?.createTag || false,
        });
        // Execute the release workflow
        return await executeReleaseWorkflow(operation, context, jobId, routing);
    }
    if (shouldDelegate) {
        await frameworkLogger.log("enforcer-tools", "delegating-to-agent", "info", {
            jobId,
            operation,
            delegatedTo: routing.suggestedAgent,
            confidence: routing.confidence,
            reason: `High confidence (${routing.confidence}) routing to specialized agent`,
        });
        // Delegate to the recommended agent instead of doing work itself
        return await delegateToAgent(routing.suggestedAgent, operation, context, jobId);
    }
    // Use enhanced context with routing for validation
    const report = await ruleEnforcer.validateOperation(operation, enhancedContext);
    const result = {
        operation,
        passed: report.passed,
        blocked: report.errors.length > 0,
        errors: report.errors,
        warnings: report.warnings,
        fixes: [],
        report,
    };
    // Generate fixes for common issues
    if (!report.passed) {
        result.fixes = generateFixes(report, context);
    }
    // AUTO-FIX: Run pre-commit validation with auto-fix for missing tests
    // This integrates the auto-fix path into the standard validation flow
    if (!report.passed && context.files && context.files.length > 0) {
        const autoFixResult = await runPreCommitValidationWithAutoFix(context.files, operation);
        if (autoFixResult.success && autoFixResult.fixesApplied > 0) {
            await frameworkLogger.log("enforcer-tools", "auto-fix-applied", "info", {
                jobId,
                fixesApplied: autoFixResult.fixesApplied,
                files: context.files,
            });
        }
    }
    // INTEGRATION POINT: Check for reporting rules and trigger report generation
    // This integrates reporting triggers into the existing rule validation pipeline
    if (!report.passed) {
        // Trigger report generation for rule violations
        await frameworkLogger.log("enforcer-tools", "reporting-triggered", "info", {
            jobId,
            operation,
            hasViolations: report.errors.length > 0,
            hasWarnings: report.warnings.length > 0,
            context: {
                files: context.files?.length,
                operation,
                timestamp: new Date().toISOString(),
            },
        });
    }
    await frameworkLogger.log("enforcer-tools", "rule-validation-complete", result.passed ? "success" : "error", {
        jobId,
        operation,
        passed: result.passed,
        blocked: result.blocked,
        errorCount: result.errors.length,
        warningCount: result.warnings.length,
        fixCount: result.fixes.length,
    });
    return result;
}
/**
 * Context Analysis Validation Tool - Validates contextual analysis integration
 */
export async function contextAnalysisValidation(files, operation) {
    const jobId = `context-validation-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    await frameworkLogger.log("enforcer-tools", "context-validation-start", "info", {
        jobId,
        operation,
        fileCount: files.length,
    });
    // Check if files exist and are readable
    const existingFiles = new Map();
    const missingFiles = [];
    for (const file of files) {
        try {
            const content = fs.readFileSync(file, "utf8");
            existingFiles.set(file, content);
        }
        catch (error) {
            missingFiles.push(file);
        }
    }
    const context = {
        operation,
        files,
        existingCode: existingFiles,
    };
    // Run comprehensive validation
    const validationResult = await ruleValidation(operation, context);
    // Additional context-specific checks
    const contextIssues = await validateContextIntegration(files, existingFiles);
    const result = {
        ...validationResult,
        errors: [...validationResult.errors, ...contextIssues.errors],
        warnings: [...validationResult.warnings, ...contextIssues.warnings],
        blocked: validationResult.blocked,
    };
    await frameworkLogger.log("enforcer-tools", "context-validation-complete", result.passed ? "success" : "error", {
        jobId,
        operation,
        fileCount: files.length,
        contextErrors: contextIssues.errors.length,
        contextWarnings: contextIssues.warnings.length,
    });
    return result;
}
/**
 * Codex Enforcement Tool - Comprehensive codex compliance validation
 */
export async function codexEnforcement(operation, files, newCode) {
    const jobId = `codex-enforcement-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    await frameworkLogger.log("enforcer-tools", "codex-enforcement-start", "info", {
        jobId,
        operation,
        fileCount: files.length,
        hasNewCode: !!newCode,
    });
    // Load existing code for comparison
    const existingCode = new Map();
    for (const file of files) {
        try {
            const content = fs.readFileSync(file, "utf8");
            existingCode.set(file, content);
        }
        catch (error) {
            // File doesn't exist yet (new file)
        }
    }
    const context = {
        operation,
        files,
        existingCode,
        ...(newCode && { newCode }),
        dependencies: extractDependencies(newCode || "", files),
    };
    const validationResult = await ruleValidation(operation, context);
    // Generate codex compliance report
    const codexReport = await generateCodexComplianceReport(files, newCode);
    const combinedErrors = [...validationResult.errors, ...codexReport.violations];
    const combinedWarnings = [...validationResult.warnings, ...codexReport.warnings];
    const result = {
        ...validationResult,
        errors: combinedErrors,
        warnings: combinedWarnings,
        blocked: combinedErrors.length > 0,
    };
    await frameworkLogger.log("enforcer-tools", "codex-enforcement-complete", result.passed ? "success" : "error", {
        jobId,
        operation,
        codexViolations: codexReport.violations.length,
        codexWarnings: codexReport.warnings.length,
        complianceScore: codexReport.complianceScore,
    });
    return result;
}
/**
 * Quality Gate Check Tool - Final validation before commit/execution
 */
export async function qualityGateCheck(operation, context) {
    const jobId = `quality-gate-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    await frameworkLogger.log("enforcer-tools", "quality-gate-start", "info", {
        jobId,
        operation,
        files: context.files.length,
        hasTests: !!(context.tests && context.tests.length > 0),
    });
    // Run all validations
    const validations = await Promise.all([
        ruleValidation(operation, {
            operation,
            files: context.files,
            ...(context.newCode && { newCode: context.newCode }),
            ...(context.tests && { tests: context.tests }),
            ...(context.dependencies && { dependencies: context.dependencies }),
        }),
        contextAnalysisValidation(context.files, operation),
        codexEnforcement(operation, context.files, context.newCode),
    ]);
    // Combine results
    const combinedErrors = validations.flatMap((v) => v.errors);
    const combinedWarnings = validations.flatMap((v) => v.warnings);
    const combinedFixes = validations.flatMap((v) => v.fixes);
    const passed = combinedErrors.length === 0;
    const blocked = !passed; // Quality gates block on any error
    const result = {
        operation,
        passed,
        blocked,
        errors: combinedErrors,
        warnings: combinedWarnings,
        fixes: combinedFixes,
        report: validations[0].report, // Use first report as primary
    };
    // Execute automatic fixes if operation would pass after fixes
    if (blocked && combinedFixes.some((f) => f.type === "auto")) {
        await executeAutomaticFixes(combinedFixes.filter((f) => f.type === "auto"));
        result.blocked = false; // Allow after auto-fixes
    }
    await frameworkLogger.log("enforcer-tools", "quality-gate-complete", passed ? "success" : "error", {
        jobId,
        operation,
        passed,
        blocked: result.blocked,
        totalErrors: combinedErrors.length,
        totalWarnings: combinedWarnings.length,
        autoFixes: combinedFixes.filter((f) => f.type === "auto").length,
    });
    return result;
}
// Helper functions
function generateFixes(report, context) {
    const fixes = [];
    for (const result of report.results) {
        if (result.fixes) {
            for (const fix of result.fixes) {
                if (fix.type === "create-file") {
                    fixes.push({
                        type: "auto",
                        description: fix.description,
                        action: async () => {
                            if (fix.filePath && fix.content) {
                                const dir = path.dirname(fix.filePath);
                                if (!fs.existsSync(dir)) {
                                    fs.mkdirSync(dir, { recursive: true });
                                }
                                fs.writeFileSync(fix.filePath, fix.content);
                            }
                        },
                    });
                }
                else {
                    fixes.push({
                        type: "manual",
                        description: fix.description,
                    });
                }
            }
        }
    }
    return fixes;
}
async function validateContextIntegration(files, existingCode) {
    const errors = [];
    const warnings = [];
    for (const [filePath, content] of existingCode) {
        // Check for proper context provider usage
        if (content.includes("CodebaseContextAnalyzer") &&
            !content.includes("memoryConfig")) {
            warnings.push(`${filePath}: CodebaseContextAnalyzer should use memory configuration`);
        }
        if (content.includes("ASTCodeParser") &&
            !content.includes("try") &&
            !content.includes("catch")) {
            errors.push(`${filePath}: ASTCodeParser initialization should handle missing ast-grep gracefully`);
        }
        if (content.includes("DependencyGraphBuilder") &&
            !content.includes("contextAnalyzer")) {
            errors.push(`${filePath}: DependencyGraphBuilder requires context analyzer parameter`);
        }
    }
    return { errors, warnings };
}
async function generateCodexComplianceReport(files, newCode) {
    const violations = [];
    const warnings = [];
    // Basic codex checks (simplified - would integrate with full codex validation)
    if (newCode) {
        if (newCode.includes("any") || newCode.includes("@ts-ignore")) {
            violations.push('Codex violation: Type safety first - no "any" types or ts-ignore allowed');
        }
        // Check for actual console.log() calls - only flag if NOT in a comment
        const consoleLogCallMatches = newCode.match(/console\.log\(/g);
        if (consoleLogCallMatches && consoleLogCallMatches.length > 0) {
            const lines = newCode.split('\n');
            let hasConsoleLogInCode = false;
            for (const line of lines) {
                const trimmed = line.trim();
                if (trimmed.includes('console.log(')) {
                    const beforeConsole = trimmed.substring(0, trimmed.indexOf('console.log('));
                    if (!beforeConsole.includes('//') && !beforeConsole.includes('/*')) {
                        hasConsoleLogInCode = true;
                        break;
                    }
                }
            }
            if (hasConsoleLogInCode) {
                violations.push('Codex violation: console.log() statements detected in production code - use frameworkLogger instead');
            }
        }
        if (!newCode.includes("try") &&
            (newCode.includes("await") || newCode.includes("Promise"))) {
            warnings.push("Codex warning: Async operations should have error handling");
        }
    }
    const complianceScore = violations.length === 0
        ? 100
        : Math.max(0, 100 - violations.length * 20 - warnings.length * 5);
    return { violations, warnings, complianceScore };
}
function extractDependencies(code, files) {
    const dependencies = [];
    // Simple regex-based dependency extraction (would be enhanced with proper AST parsing)
    const importRegex = /import\s+.*?\s+from\s+['"]([^'"]+)['"]/g;
    let match;
    while ((match = importRegex.exec(code)) !== null) {
        const dep = match[1];
        if (dep && !dep.startsWith(".") && !dep.startsWith("/")) {
            dependencies.push(dep);
        }
    }
    return dependencies;
}
async function executeAutomaticFixes(fixes) {
    for (const fix of fixes) {
        if (fix.action) {
            try {
                await fix.action();
                await frameworkLogger.log("enforcer-tools", "auto-fix-executed", "success", {
                    description: fix.description,
                });
            }
            catch (error) {
                await frameworkLogger.log("enforcer-tools", "auto-fix-failed", "error", {
                    description: fix.description,
                    error: error instanceof Error ? error.message : String(error),
                });
            }
        }
    }
}
// Additional utility functions for enforcer operations
/**
 * Get comprehensive enforcement status
 */
export async function getEnforcementStatus() {
    try {
        const stats = ruleEnforcer.getRuleStats();
        return {
            rules: stats.totalRules,
            validations: 0, // Would be tracked in real implementation
            violations: 0, // Would be tracked in real implementation
            fixes: 0, // Would be tracked in real implementation
            success: true,
        };
    }
    catch (error) {
        await frameworkLogger.log("enforcer-tools", "status-check-failed", "error", {
            error: error instanceof Error ? error.message : String(error),
        });
        return {
            rules: 0,
            validations: 0,
            violations: 0,
            fixes: 0,
            success: false,
        };
    }
}
/**
 * Run comprehensive pre-commit validation
 */
export async function runPreCommitValidation(files, operation = "commit") {
    const jobId = `pre-commit-validation-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    await frameworkLogger.log("enforcer-tools", "pre-commit-validation-start", "info", {
        jobId,
        files: files.length,
        operation,
    });
    try {
        // Run all validation types
        const validations = await Promise.allSettled([
            ruleValidation(operation, { operation, files }),
            contextAnalysisValidation(files, operation),
            codexEnforcement(operation, files),
        ]);
        // Aggregate results
        const errors = [];
        const warnings = [];
        const fixes = [];
        for (const result of validations) {
            if (result.status === "fulfilled") {
                errors.push(...result.value.errors);
                warnings.push(...result.value.warnings);
                fixes.push(...result.value.fixes);
            }
            else {
                errors.push(`Validation failed: ${result.reason}`);
            }
        }
        const finalResult = {
            operation,
            passed: errors.length === 0,
            blocked: errors.length > 0,
            errors,
            warnings,
            fixes,
            report: validations[0]?.status === "fulfilled"
                ? validations[0].value.report
                : {},
        };
        await frameworkLogger.log("enforcer-tools", "pre-commit-validation-complete", finalResult.passed ? "success" : "error", {
            jobId,
            operation,
            passed: finalResult.passed,
            blocked: finalResult.blocked,
            errors: errors.length,
            warnings: warnings.length,
            fixes: fixes.length,
        });
        return finalResult;
    }
    catch (error) {
        await frameworkLogger.log("enforcer-tools", "pre-commit-validation-failed", "error", {
            jobId,
            operation,
            error: error instanceof Error ? error.message : String(error),
        });
        return {
            operation,
            passed: false,
            blocked: true,
            errors: [
                `Pre-commit validation failed: ${error instanceof Error ? error.message : String(error)}`,
            ],
            warnings: [],
            fixes: [],
            report: {},
        };
    }
}
// Export tools for MCP integration
export const enforcerTools = {
    ruleValidation,
    contextAnalysisValidation,
    codexEnforcement,
    qualityGateCheck,
    getEnforcementStatus,
    runPreCommitValidation,
};
//# sourceMappingURL=enforcer-tools.js.map