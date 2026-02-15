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

import * as fs from "fs";
import * as path from "path";
import { spawn } from "child_process";
import { promisify } from "util";
import { frameworkLogger } from "../core/framework-logger.js";

const exec = promisify(require("child_process").exec);

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

    // Get all versions
    const npmVersion = await this.getNpmVersion();
    const uvmVersion = this.getUvmVersion();
    const pkgVersion = this.getPackageVersion();

    // Rule 1: UVM MUST be 1 ahead of NPM
    if (npmVersion !== "NOT_PUBLISHED" && npmVersion !== "ERROR") {
      const npmParsed = this.parseVersion(npmVersion);
      const uvmParsed = this.parseVersion(uvmVersion);

      const expectedUvm = this.incrementPatch(npmParsed);

      if (uvmVersion !== this.formatVersion(expectedUvm)) {
        this.errors.push(
          `Version manager not 1 ahead of npm (NPM: ${npmVersion}, UVM: ${uvmVersion}, Expected: ${this.formatVersion(expectedUvm)})`,
        );
        this.fixes.push({
          type: "update-uvm",
          description: `Update UVM to ${this.formatVersion(expectedUvm)}`,
          command: "node scripts/node/universal-version-manager.js",
          autoFixable: false, // Requires manual edit
        });
      }
    }

    // Rule 2: package.json SHOULD match UVM
    if (pkgVersion !== uvmVersion) {
      this.warnings.push(
        `package.json version (${pkgVersion}) doesn't match UVM (${uvmVersion}) - run "npm version [patch|minor|major]" to sync`,
      );
    }

    // Rule 3: Source files MUST be synchronized
    const sourceVersion = this.getSourceVersion();
    if (sourceVersion && sourceVersion !== uvmVersion) {
      this.errors.push(
        `Source files not synchronized to UVM version (${sourceVersion} vs ${uvmVersion})`,
      );
      this.fixes.push({
        type: "sync-source",
        description: "Synchronize source files to UVM version",
        command: "node scripts/node/universal-version-manager.js",
        autoFixable: true,
      });
    }

    // Rule 4: README SHOULD reference current version
    const readmeVersion = this.getReadmeVersion();
    if (
      readmeVersion &&
      readmeVersion !== uvmVersion &&
      readmeVersion !== pkgVersion
    ) {
      this.warnings.push(
        `README version (${readmeVersion}) may be outdated (UVM: ${uvmVersion}, package: ${pkgVersion})`,
      );
      this.fixes.push({
        type: "update-readme",
        description: "Update README version references",
        command: "node scripts/node/universal-version-manager.js",
        autoFixable: true,
      });
    }

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
        'npm view strray-ai@latest version 2>/dev/null || echo "NOT_PUBLISHED"',
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
   * Get Universal Version Manager version
   */
  private getUvmVersion(): string {
    try {
      const uvmPath = path.join(
        this.projectRoot,
        "scripts",
        "node",
        "universal-version-manager.js",
      );
      if (!fs.existsSync(uvmPath)) {
        return "NOT_FOUND";
      }

      const content = fs.readFileSync(uvmPath, "utf-8");

      // Match version in OFFICIAL_VERSIONS.framework.version format
      const match = content.match(
        /OFFICIAL_VERSIONS\s*=\s*\{[\s\S]*?framework:\s*\{[\s\S]*?version:\s*["']([^"']+)["']/,
      );
      if (match && match[1]) {
        return match[1];
      }

      // Fallback: grep for version pattern
      const fallbackMatch = content.match(/version:\s*["'](\d+\.\d+\.\d+)["']/);
      return fallbackMatch && fallbackMatch[1] ? fallbackMatch[1] : "NOT_FOUND";
    } catch {
      return "ERROR";
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
   * Get version from source files
   */
  private getSourceVersion(): string | null {
    try {
      const cliPath = path.join(this.projectRoot, "src", "cli", "index.ts");
      if (!fs.existsSync(cliPath)) {
        return null;
      }

      const content = fs.readFileSync(cliPath, "utf-8");
      const match = content.match(/\.version\(["']([^"']+)["']\)/);
      return match && match[1] ? match[1] : null;
    } catch {
      return null;
    }
  }

  /**
   * Get version from README
   */
  private getReadmeVersion(): string | null {
    try {
      const readmePath = path.join(this.projectRoot, "README.md");
      if (!fs.existsSync(readmePath)) {
        return null;
      }

      const content = fs.readFileSync(readmePath, "utf-8");

      // Match vX.Y.Z or X.Y.Z patterns
      const match = content.match(/v?(\d+\.\d+\.\d+)/);
      return match && match[1] ? match[1] : null;
    } catch {
      return null;
    }
  }

  /**
   * Parse version string into components
   */
  private parseVersion(version: string): VersionInfo {
    const parts = version.split(".");
    return {
      major: parseInt(parts[0] || "0", 10),
      minor: parseInt(parts[1] || "0", 10),
      patch: parseInt(parts[2] || "0", 10),
      raw: version,
    };
  }

  /**
   * Format version components back to string
   */
  private formatVersion(version: VersionInfo): string {
    return `${version.major}.${version.minor}.${version.patch}`;
  }

  /**
   * Increment patch version
   */
  private incrementPatch(version: VersionInfo): VersionInfo {
    return {
      ...version,
      patch: version.patch + 1,
    };
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
      `Version Manager: ${result.uvmVersion}`,
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
