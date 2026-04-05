/**
 * Version Compliance Processor
 *
 * Pre-processor that validates version compliance across the project.
 * Ensures version consistency between NPM, UVM, package.json, source files, and README.
 *
 * @module processors/implementations
 * @version 1.0.0
 */
import { PreProcessor } from "../processor-interfaces.js";
export declare class VersionComplianceProcessor extends PreProcessor {
    readonly name = "versionCompliance";
    readonly priority = 25;
    protected run(context: unknown): Promise<unknown>;
}
//# sourceMappingURL=version-compliance-processor.d.ts.map