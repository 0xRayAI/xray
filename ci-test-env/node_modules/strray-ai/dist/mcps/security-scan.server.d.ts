/**
 * 0xRay Security Scan MCP Server
 *
 * Automated security vulnerability scanning with dependency and code analysis
 */
declare class StringRaySecurityScanServer {
    private server;
    constructor();
    private setupToolHandlers;
    private handleSecurityScan;
    private handleDependencyAudit;
    private detectPackageManager;
    private scanDependencies;
    private scanCodeSecurity;
    private findCodeFiles;
    private analyzeFileForSecurity;
    private generateSecuritySummary;
    run(): Promise<void>;
}
export { StringRaySecurityScanServer };
//# sourceMappingURL=security-scan.server.d.ts.map