#!/usr/bin/env node

/**
 * Dependency Vulnerability Scanner
 *
 * Scans dependencies for known vulnerabilities and suggests fixes.
 */

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

class DependencyScanner {
  constructor() {
    this.projectRoot = path.resolve(".");
  }

  scan() {
    console.log("🔍 Scanning dependencies for vulnerabilities...\n");

    try {
      // Check for package-lock.json
      const lockfilePath = path.join(this.projectRoot, "package-lock.json");
      if (!fs.existsSync(lockfilePath)) {
        console.error("❌ Missing package-lock.json - run npm install first");
        process.exit(1);
      }

      // Run npm audit
      console.log("📊 Running npm audit...");
      let auditOutput;
      try {
        auditOutput = execSync("npm audit --audit-level=moderate --json", {
          encoding: "utf-8",
          cwd: this.projectRoot,
          stdio: ["pipe", "pipe", "pipe"],
        });
      } catch (error) {
        // npm audit exits with non-zero when vulnerabilities found
        if (error.stdout) {
          auditOutput = error.stdout;
        } else if (error.stderr) {
          // Try to parse stderr as JSON
          try {
            const stderrResult = JSON.parse(error.stderr);
            if (stderrResult.vulnerabilities) {
              // Even with errors, we got valid JSON output
              auditOutput = error.stderr;
            } else {
              throw new Error(`npm audit error: ${error.stderr}`);
            }
          } catch (parseError) {
            console.error("❌ npm audit stderr:", error.stderr);
            throw new Error(`npm audit failed: ${error.message}`);
          }
        } else {
          throw new Error(`npm audit failed: ${error.message}`);
        }
      }

      const auditResult = JSON.parse(auditOutput);

      if (auditResult.metadata && auditResult.metadata.vulnerabilities) {
        const vuln = auditResult.metadata.vulnerabilities;
        console.log(`📈 Audit Results:`);
        console.log(
          `   Total Dependencies: ${auditResult.metadata.totalDependencies || "Unknown"}`,
        );
        console.log(`   Vulnerabilities: ${vuln.total || 0}`);
        console.log(`   - Critical: ${vuln.critical || 0}`);
        console.log(`   - High: ${vuln.high || 0}`);
        console.log(`   - Moderate: ${vuln.moderate || 0}`);
        console.log(`   - Low: ${vuln.low || 0}\n`);

        if ((vuln.critical || 0) > 0 || (vuln.high || 0) > 0) {
          console.log(
            "🚨 HIGH PRIORITY: Critical or High severity vulnerabilities found!",
          );
          console.log("💡 Run: npm audit fix");
          console.log("💡 Or manually update vulnerable packages\n");
        }

        // Show actionable advice
        if (auditResult.actions && auditResult.actions.length > 0) {
          console.log("🔧 Recommended Actions:");
          auditResult.actions.forEach((action, index) => {
            console.log(`   ${index + 1}. ${action.message}`);
            if (action.resolves && action.resolves.length > 0) {
              action.resolves.forEach((resolve) => {
                console.log(
                  `      - ${resolve.path} (${resolve.dev ? "dev" : "prod"})`,
                );
              });
            }
            console.log("");
          });
        }
      }

      // Check for outdated packages
      console.log("📅 Checking for outdated packages...");
      try {
        const outdatedOutput = execSync("npm outdated --json", {
          encoding: "utf-8",
          cwd: this.projectRoot,
        });

        const outdated = JSON.parse(outdatedOutput);
        const outdatedCount = Object.keys(outdated).length;

        if (outdatedCount > 0) {
          console.log(`⚠️  ${outdatedCount} packages are outdated:`);
          Object.entries(outdated).forEach(([pkg, info]) => {
            console.log(`   - ${pkg}: ${info.current} → ${info.latest}`);
          });
          console.log(
            "\n💡 Run: npm update (or npm update <package> for specific packages)",
          );
        } else {
          console.log("✅ All dependencies are up to date");
        }
      } catch (error) {
        // npm outdated exits with code 1 when there are outdated packages
        if (error.status === 1) {
          const outdated = JSON.parse(error.stdout);
          const outdatedCount = Object.keys(outdated).length;
          console.log(`⚠️  ${outdatedCount} packages are outdated:`);
          Object.entries(outdated).forEach(([pkg, info]) => {
            console.log(`   - ${pkg}: ${info.current} → ${info.latest}`);
          });
          console.log(
            "\n💡 Run: npm update (or npm update <package> for specific packages)",
          );
        }
      }
    } catch (error) {
      console.error("❌ Error running dependency scan:", error.message);
      process.exit(1);
    }
  }
}

// Run the scanner
const scanner = new DependencyScanner();
scanner.scan();
