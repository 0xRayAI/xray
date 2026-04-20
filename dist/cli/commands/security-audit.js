/**
 * Security Audit CLI Command
 *
 * Comprehensive security audit with vulnerability scanning,
 * compliance checking, and weighted voting for architectural decisions.
 *
 * Usage:
 *   npx strray-ai security-audit           # Quick audit
 *   npx strray-ai security-audit --deep    # Deep audit with all standards
 *   npx strray-ai security-audit --output ./reports/security.md
 *   npx strray-ai security-audit --no-remediation
 *   npx strray-ai security-audit --no-voting
 *
 * Options:
 *   --deep           Deep scan with all compliance standards (OWASP, CWE, NIST, ISO, PCI)
 *   --output <path>  Output report to file (JSON or Markdown)
 *   --format <fmt>   Output format: json, markdown (default: markdown)
 *   --no-remediation Skip automated remediation analysis
 *   --no-voting      Disable weighted voting for architectural decisions
 *   --project <path> Project path to audit (default: current directory)
 */
import { join } from "path";
import { writeFileSync, existsSync, mkdirSync } from "fs";
import { frameworkLogger } from "../../core/framework-logger.js";
import { createSecurityAuditSystem, runQuickSecurityAudit, runDeepSecurityAudit, } from "../../security/comprehensive-security-audit.js";
function parseArgs(args) {
    const options = {
        deep: false,
        output: null,
        format: "markdown",
        enableRemediation: true,
        enableVoting: true,
        projectPath: null,
    };
    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        switch (arg) {
            case "--deep":
                options.deep = true;
                break;
            case "--output":
            case "-o":
                options.output = args[++i] || null;
                break;
            case "--format":
            case "-f":
                const format = args[++i]?.toLowerCase();
                if (format === "json" || format === "markdown") {
                    options.format = format;
                }
                break;
            case "--no-remediation":
                options.enableRemediation = false;
                break;
            case "--no-voting":
                options.enableVoting = false;
                break;
            case "--project":
            case "-p":
                options.projectPath = args[++i] || null;
                break;
            case "--help":
            case "-h":
                printHelp();
                process.exit(0);
                break;
        }
    }
    return options;
}
function printHelp() {
    console.log(`
0xRay Security Audit Command

Comprehensive security audit with vulnerability scanning, compliance checking,
and weighted voting for architectural decisions.

Usage:
  npx strray-ai security-audit [options]

Options:
  --deep              Deep scan with all compliance standards
  --output, -o       Output report to file
  --format, -f       Output format: json, markdown (default: markdown)
  --no-remediation   Skip automated remediation analysis
  --no-voting        Disable weighted voting for architectural decisions
  --project, -p      Project path to audit
  --help, -h         Show this help message

Examples:
  npx strray-ai security-audit
  npx strray-ai security-audit --deep
  npx strray-ai security-audit --output ./security-report.md
  npx strray-ai security-audit --format json --output ./report.json
  `);
}
async function runSecurityAudit(options) {
    const projectPath = options.projectPath || process.cwd();
    const config = {
        projectPath,
        scanDepth: options.deep ? "deep" : "shallow",
        includeDependencies: true,
        complianceStandards: options.deep
            ? ["owasp-top-10", "cwe", "nist", "iso-27001", "pci-dss"]
            : ["owasp-top-10", "cwe"],
        enableAutoRemediation: options.enableRemediation,
        enableWeightedVoting: options.enableVoting,
    };
    await frameworkLogger.log("security-audit-cli", "audit-started", "info", {
        projectPath,
        deep: options.deep,
        format: options.format,
    });
    if (options.deep) {
        return runDeepSecurityAudit(projectPath, options.output || undefined);
    }
    return runQuickSecurityAudit(projectPath);
}
function formatReport(report, format) {
    if (format === "json") {
        return JSON.stringify(report, null, 2);
    }
    const system = createSecurityAuditSystem({
        projectPath: report.metadata.projectPath,
        enableWeightedVoting: false,
    });
    return system.generateMarkdownReport(report);
}
function printSummary(report) {
    const scoreEmoji = report.summary.securityScore >= 90
        ? "🟢"
        : report.summary.securityScore >= 70
            ? "🟡"
            : report.summary.securityScore >= 50
                ? "🟠"
                : "🔴";
    console.log("");
    console.log("╔══════════════════════════════════════════════════════════╗");
    console.log("║         0xRay Security Audit Report                 ║");
    console.log("╚══════════════════════════════════════════════════════════╝");
    console.log("");
    console.log(`  📊 Security Score: ${scoreEmoji} ${report.summary.securityScore}/100`);
    console.log(`  📁 Files Scanned: ${report.metadata.totalFilesScanned}`);
    console.log(`  ⏱️  Duration: ${report.metadata.duration}ms`);
    console.log("");
    console.log("  Vulnerability Summary:");
    console.log(`    🚨 Critical: ${report.summary.bySeverity.critical}`);
    console.log(`    🔴 High:     ${report.summary.bySeverity.high}`);
    console.log(`    🟡 Medium:   ${report.summary.bySeverity.medium}`);
    console.log(`    🟢 Low:      ${report.summary.bySeverity.low}`);
    console.log(`    ℹ️  Info:    ${report.summary.bySeverity.info}`);
    console.log("");
    if (report.compliance.length > 0) {
        console.log("  Compliance Results:");
        for (const result of report.compliance) {
            const status = result.passed ? "✅" : "❌";
            console.log(`    ${status} ${result.standard}: ${result.score}/100`);
        }
        console.log("");
    }
    if (report.remediation.totalIssues > 0) {
        console.log("  Remediation Plan:");
        console.log(`    Total Issues: ${report.remediation.totalIssues}`);
        console.log(`    Automatable:  ${report.remediation.automatable}`);
        console.log(`    Manual Fix:   ${report.remediation.manualRequired}`);
        console.log(`    Est. Time:    ${report.remediation.estimatedFixTime}`);
        console.log("");
    }
    if (report.agentConsensus) {
        console.log("  Agent Consensus:");
        console.log(`    Agreement: ${report.agentConsensus.averageAgreement}%`);
        console.log(`    Agents: ${report.agentConsensus.participatingAgents.join(", ")}`);
        console.log("");
    }
    console.log(`  Audit ID: ${report.metadata.auditId}`);
    console.log(`  Generated: ${report.metadata.timestamp.toISOString()}`);
    console.log("");
}
function saveReport(content, outputPath) {
    const dir = join(outputPath, "..");
    if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
    }
    writeFileSync(outputPath, content, "utf-8");
}
export async function securityAuditCommand(args = process.argv.slice(2)) {
    try {
        const options = parseArgs(args);
        const report = await runSecurityAudit(options);
        printSummary(report);
        if (options.output) {
            const content = formatReport(report, options.format);
            saveReport(content, options.output);
            console.log(`  📄 Report saved to: ${options.output}`);
            console.log("");
        }
        await frameworkLogger.log("security-audit-cli", "audit-completed", "info", {
            auditId: report.metadata.auditId,
            vulnerabilities: report.summary.totalVulnerabilities,
            securityScore: report.summary.securityScore,
            output: options.output,
        });
        process.exit(report.summary.bySeverity.critical > 0 ? 2 : 0);
    }
    catch (error) {
        await frameworkLogger.log("security-audit-cli", "audit-failed", "error", {
            error: String(error),
        });
        console.error("");
        console.error("  ❌ Security audit failed:");
        console.error(`     ${error}`);
        console.error("");
        process.exit(1);
    }
}
export default securityAuditCommand;
if (import.meta.url === `file://${process.argv[1]}`) {
    securityAuditCommand();
}
//# sourceMappingURL=security-audit.js.map