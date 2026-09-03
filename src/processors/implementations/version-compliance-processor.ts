/**
 * Version Compliance Processor
 *
 * Pre-processor that enforces version compliance rules before allowing
 * commits or publishes. Integrates with 0xRay's processor pipeline.
 *
 * Rules Enforced:
 * 1. package.json version is the SSOT (semver)
 * 2. universal-version-manager.js is frozen — do not treat it as SSOT
 * 3. Do not bump or publish from this processor (foundry mill ships)
 *
 * @processor_type pre
 * @priority 25 (high - runs early, after preValidate, before errorBoundary)
 * @blocking true (blocks on violations)
 *
 * @framework 0xRay 1.3.5
 */

import * as fs from "fs";
import * as path from "path";
import { exec as execSync } from "child_process";
import { promisify } from "util";
import { frameworkLogger } from "../../core/framework-logger.js";

const exec = promisify(execSync);

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

export class VersionComplianceProcessor {
  private projectRoot: string;
  private errors: string[] = [];
  private warnings: string[] = [];
  private fixes: VersionFix[] = [];

  constructor(projectRoot: string = process.cwd()) {
    this.projectRoot = projectRoot;
  }

  /**
   * Main execution method - called by ProcessorManager
   */
  async execute(context: {
    tool: string;
    args?: { filePath?: string; content?: string };
    operation: string;
  }): Promise<{
    success: boolean;
    blocked: boolean;
    message: string;
    result?: VersionComplianceResult;
  }> {
    try {
      // Only validate on relevant operations
      const relevantOperations = [
        "write",
        "edit",
        "multiedit",
        "version",
        "publish",
      ];
      if (
        !relevantOperations.includes(context.tool) &&
        !context.operation.includes("version")
      ) {
        return {
          success: true,
          blocked: false,
          message:
            "Version compliance skipped (not a version-related operation)",
        };
      }

      const result = await this.validateVersionCompliance();

      if (!result.compliant) {
        await frameworkLogger.log(
          "version-compliance-processor",
          "-version-compliance-failed-",
          "error",
          {
            errors: result.errors,
            warnings: result.warnings,
            npmVersion: result.npmVersion,
            uvmVersion: result.uvmVersion,
            pkgVersion: result.pkgVersion,
          },
        );

        return {
          success: false,
          blocked: true,
          message: `Version compliance failed: ${result.errors.join(", ")}`,
          result,
        };
      }

      // Log success
      await frameworkLogger.log(
        "version-compliance-processor",
        "-version-compliance-passed-",
        "info",
        {
          npmVersion: result.npmVersion,
          uvmVersion: result.uvmVersion,
          pkgVersion: result.pkgVersion,
          warnings: result.warnings,
        },
      );

      return {
        success: true,
        blocked: false,
        message:
          result.warnings.length > 0
            ? `Version compliance passed with ${result.warnings.length} warnings`
            : "Version compliance passed",
        result,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      await frameworkLogger.log(
        "version-compliance-processor",
        "-validation-error-",
        "error",
        { message: errorMessage },
      );

      return {
        success: false,
        blocked: true,
        message: `Version compliance error: ${errorMessage}`,
      };
    }
  }

  /**
   * Validate all version compliance rules
   */
  async validateVersionCompliance(): Promise<VersionComplianceResult> {
    this.errors = [];
    this.warnings = [];
    this.fixes = [];

    const npmVersion = await this.getNpmVersion();
    const pkgVersion = this.getPackageVersion();
    const uvmVersion = "FROZEN";

    if (!/^\d+\.\d+\.\d+/.test(pkgVersion)) {
      this.errors.push(`package.json version is not semver (${pkgVersion})`);
    }

    this.warnings.push(
      "universal-version-manager.js is frozen. SSOT is package.json via reconcile-version.mjs",
    );

    return {
      compliant: this.errors.length === 0,
      npmVersion,
      uvmVersion,
      pkgVersion,
      errors: this.errors,
      warnings: this.warnings,
      fixes: this.fixes,
    };
  }

  /**
   * Get NPM published version
   */
  private async getNpmVersion(): Promise<string> {
    try {
      const { stdout } = await exec(
        'npm view 0xray@latest version 2>/dev/null || echo "NOT_PUBLISHED"',
        {
          cwd: this.projectRoot,
          timeout: 10000,
        },
      );
      return stdout?.trim() || "NOT_PUBLISHED";
    } catch {
      return "NOT_PUBLISHED";
    }
  }

  /**
   * Get package.json version
   */
  private getPackageVersion(): string {
    try {
      const pkgPath = path.join(this.projectRoot, "package.json");
      if (!fs.existsSync(pkgPath)) {
        return "NOT_FOUND";
      }

      const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
      return pkg?.version || "NOT_FOUND";
    } catch {
      return "ERROR";
    }
  }

  /**
   * Auto-fix version compliance issues
   */
  async autoFix(): Promise<{
    success: boolean;
    fixed: string[];
    failed: string[];
  }> {
    const result = await this.validateVersionCompliance();
    const fixed: string[] = [];
    const failed: string[] = [];

    for (const fix of result.fixes || []) {
      if (fix.autoFixable) {
        try {
          const { stdout, stderr } = await exec(fix.command, {
            cwd: this.projectRoot,
            timeout: 30000,
          });

          if (stderr) {
            failed.push(`${fix.type}: ${stderr}`);
          } else {
            fixed.push(fix.type);
          }
        } catch (error) {
          failed.push(
            `${fix.type}: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      } else {
        failed.push(`${fix.type}: Manual fix required`);
      }
    }

    return {
      success: failed.length === 0,
      fixed,
      failed,
    };
  }

  /**
   * Generate compliance report
   */
  generateReport(result: VersionComplianceResult): string {
    const lines: string[] = [
      "🔍 Version Compliance Report",
      "============================",
      "",
      `NPM Published: ${result.npmVersion}`,
      `UVM: ${result.uvmVersion}`,
      `package.json: ${result.pkgVersion}`,
      "",
      result.compliant ? "✅ COMPLIANT" : "❌ NON-COMPLIANT",
      "",
    ];

    if (result.errors.length > 0) {
      lines.push("Errors:");
      result.errors.forEach((e) => lines.push(`  ❌ ${e}`));
      lines.push("");
    }

    if (result.warnings.length > 0) {
      lines.push("Warnings:");
      result.warnings.forEach((w) => lines.push(`  ⚠️  ${w}`));
      lines.push("");
    }

    if (result.fixes && result.fixes.length > 0) {
      lines.push("Suggested Fixes:");
      result.fixes.forEach((f) => {
        lines.push(`  🔧 ${f.description}`);
        lines.push(`     Command: ${f.command}`);
        lines.push(`     Auto-fixable: ${f.autoFixable ? "Yes" : "No"}`);
      });
    }

    return lines.join("\n");
  }
}

// Export singleton for processor registration
export const versionComplianceProcessor = new VersionComplianceProcessor();
