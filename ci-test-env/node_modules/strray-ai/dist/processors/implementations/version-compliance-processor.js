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
import { frameworkLogger } from "../../core/framework-logger.js";
export class VersionComplianceProcessor extends PreProcessor {
    name = "versionCompliance";
    priority = 25;
    async run(context) {
        const ctx = context;
        const operation = ctx.operation || "unknown";
        const filePath = ctx.filePath;
        await frameworkLogger.log("version-compliance-processor", "validating", "info", { operation, filePath: filePath?.slice(0, 100) });
        try {
            // Lazy load the existing VersionComplianceProcessor to avoid circular dependencies
            const { VersionComplianceProcessor: VCP } = await import("../../processors/version-compliance-processor.js");
            const processor = new VCP(process.cwd());
            const result = await processor.validateVersionCompliance();
            if (!result.compliant) {
                const errors = result.errors.join("; ");
                throw new Error(`Version compliance failed: ${errors}`);
            }
            return {
                compliant: true,
                npmVersion: result.npmVersion,
                uvmVersion: result.uvmVersion,
                pkgVersion: result.pkgVersion,
                warnings: result.warnings.length,
                checkedAt: new Date().toISOString(),
            };
        }
        catch (error) {
            await frameworkLogger.log("version-compliance-processor", "validation-error", "error", {
                operation,
                error: error instanceof Error ? error.message : String(error),
            });
            throw error;
        }
    }
}
//# sourceMappingURL=version-compliance-processor.js.map