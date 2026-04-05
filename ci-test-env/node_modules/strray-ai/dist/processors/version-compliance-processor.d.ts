/**
 * Version Compliance Processor
 *
 * Pre-processor that enforces version compliance rules before allowing
 * commits or publishes. Integrates with StringRay's processor pipeline.
 *
 * Rules Enforced:
 * 1. Universal Version Manager MUST be 1 ahead of NPM published version
 * 2. package.json SHOULD match UVM (warning if not)
 * 3. Source files MUST be synchronized to UVM version
 * 4. README SHOULD reference current version
 *
 * @processor_type pre
 * @priority 25 (high - runs early, after preValidate, before errorBoundary)
 * @blocking true (blocks on violations)
 *
 * @version 1.0.0
 * @framework StringRay 1.3.5
 */
export interface VersionComplianceResult {
    compliant: boolean;
    npmVersion: string;
    uvmVersion: string;
    pkgVersion: string;
    errors: string[];
    warnings: string[];
    fixes?: VersionFix[];
}
export interface VersionFix {
    type: "update-uvm" | "sync-source" | "update-readme";
    description: string;
    command: string;
    autoFixable: boolean;
}
export interface VersionInfo {
    major: number;
    minor: number;
    patch: number;
    raw: string;
}
export declare class VersionComplianceProcessor {
    private projectRoot;
    private errors;
    private warnings;
    private fixes;
    constructor(projectRoot?: string);
    /**
     * Main execution method - called by ProcessorManager
     */
    execute(context: {
        tool: string;
        args?: {
            filePath?: string;
            content?: string;
        };
        operation: string;
    }): Promise<{
        success: boolean;
        blocked: boolean;
        message: string;
        result?: VersionComplianceResult;
    }>;
    /**
     * Validate all version compliance rules
     */
    validateVersionCompliance(): Promise<VersionComplianceResult>;
    /**
     * Get NPM published version
     */
    private getNpmVersion;
    /**
     * Get Universal Version Manager version
     */
    private getUvmVersion;
    /**
     * Get package.json version
     */
    private getPackageVersion;
    /**
     * Get version from source files
     */
    private getSourceVersion;
    /**
     * Get version from README
     */
    private getReadmeVersion;
    /**
     * Parse version string into components
     */
    private parseVersion;
    /**
     * Format version components back to string
     */
    private formatVersion;
    /**
     * Increment patch version
     */
    private incrementPatch;
    /**
     * Auto-fix version compliance issues
     */
    autoFix(): Promise<{
        success: boolean;
        fixed: string[];
        failed: string[];
    }>;
    /**
     * Generate compliance report
     */
    generateReport(result: VersionComplianceResult): string;
}
export declare const versionComplianceProcessor: VersionComplianceProcessor;
//# sourceMappingURL=version-compliance-processor.d.ts.map