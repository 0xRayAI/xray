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
export declare function securityAuditCommand(args?: string[]): Promise<void>;
export default securityAuditCommand;
//# sourceMappingURL=security-audit.d.ts.map