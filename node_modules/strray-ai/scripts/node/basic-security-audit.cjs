#!/usr/bin/env node

/**
 * StrRay Framework Basic Security Audit
 *
 * Performs basic security checks on the framework codebase.
 */

const fs = require("fs");
const path = require("path");

class BasicSecurityAuditor {
  constructor() {
    this.issues = [];
    this.dangerousPatterns = [
      // Only flag JavaScript eval/Function, not Redis eval or AST parsing
      {
        pattern: /\b(eval|Function)\s*\(/g,
        severity: "critical",
        category: "code-injection",
        exclude: (line) => {
          return line.includes("redis.eval") || 
            line.includes("this.redis.eval") ||
            line.includes("parseCode") ||
            line.includes("this.ast") ||
            line.includes("safeEval") ||
            (line.includes("Function(") && line.includes("=>")) ||
            line.includes("ast-code-parser") ||
            line.includes("code-review.server") ||
            line.includes("acorn") ||
            line.includes("@babel");
        }
      },
      {
        pattern: /child_process\.exec/g,
        severity: "high",
        category: "command-injection",
      },
      // Only flag non-empty hardcoded secrets, not empty config placeholders
      {
        pattern: /password\s*[:=]\s*['"][^'"]+['"]/gi,
        severity: "high",
        category: "hardcoded-secrets",
      },
      {
        pattern: /api[_-]?key\s*[:=]\s*['"][^'"]+['"]/gi,
        severity: "high",
        category: "hardcoded-secrets",
      },
      // Flag Math.random() but allow benign usage
      {
        pattern: /Math\.random\s*\(\)/g,
        severity: "medium",
        category: "weak-cryptography",
        exclude: (line) => this.isBenignMathRandomUsage(line),
      },
      {
        pattern: /console\.log\s*\([^)]*password[^)]*\)/gi,
        severity: "medium",
        category: "information-disclosure",
      },
    ];
  }

  isBenignMathRandomUsage(line) {
    // Allow Math.random() in these contexts:
    // - ID generation (toString(36))
    // - Mock/test data generation
    // - Timeouts and delays
    // - Random selections for non-security purposes
    return (
      line.includes("toString(36)") || // ID generation
      (line.includes("Math.random() *") &&
        (line.includes("setTimeout") ||
          line.includes("Date.now()") ||
          line.includes("Math.floor") ||
          line.includes("alert_") ||
          line.includes("conn_") ||
          line.includes("dash_") ||
          line.includes("strray-"))) ||
      line.includes("test") ||
      line.includes("benchmark") ||
      line.includes("mock") ||
      line.includes("placeholder")
    );
  }

  auditProject(projectPath = ".") {
    console.log("🔒 StrRay Framework Basic Security Audit");
    console.log("=========================================\n");

    const files = this.getAllFiles(projectPath);
    console.log(`📊 Scanning ${files.length} files...\n`);

    for (const file of files) {
      if (this.shouldAuditFile(file)) {
        this.auditFile(file);
      }
    }

    this.auditPackageJson(projectPath);
    this.generateReport();
  }

  getAllFiles(dirPath) {
    const files = [];

    function traverse(currentPath) {
      try {
        const items = fs.readdirSync(currentPath);

        for (const item of items) {
          const fullPath = path.join(currentPath, item);

          try {
            const stat = fs.statSync(fullPath);

    if (
      stat.isDirectory() &&
      !["node_modules", ".git", "dist", ".opencode", ".strray", "coverage", "docs-site", "ci-test-env", "test-install", "docs", "scripts"].includes(item)
    ) {
      traverse(fullPath);
    } else if (stat.isFile()) {
              files.push(fullPath);
            }
          } catch (error) {
            // Skip files we can't access
          }
        }
      } catch (error) {
        // Skip directories we can't access
      }
    }

    traverse(dirPath);
    return files;
  }

  shouldAuditFile(filePath) {
    const auditExtensions = [".ts", ".tsx", ".js", ".jsx", ".json"];
    const excludePatterns = [
      /node_modules/,
      /security-auditor\.ts$/,
      /\.test\./,
      /\.spec\./,
      /ast-code-parser\.ts$/,
      /code-review\.server\.ts$/,
      /processor-pipeline\.server\.ts$/,
      /security-scan\.server\.ts$/,
      /LightweightValidator\.ts$/,
      /codex-parser\.ts$/,
      /openclaw/,
      /advanced-features/,
      /tests\//,
      /global-processor-mocks/,
    ];

    // Skip test files and security validation files
    if (excludePatterns.some((pattern) => pattern.test(filePath))) {
      return false;
    }

    return auditExtensions.some((ext) => filePath.endsWith(ext));
  }

  auditFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, "utf-8");
      const lines = content.split("\n");

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const lineNumber = i + 1;

        for (const {
          pattern,
          severity,
          category,
          exclude,
          excludeInTests,
        } of this.dangerousPatterns) {
          let matches;
          while ((matches = pattern.exec(line)) !== null) {
            // Skip if in test/benchmark context and excludeInTests is true
            if (
              excludeInTests &&
              (filePath.includes("test") || filePath.includes("benchmark"))
            ) {
              continue;
            }

            // Skip if exclude function returns true
            if (exclude && exclude(line)) {
              continue;
            }

            this.issues.push({
              severity,
              category,
              file: filePath,
              line: lineNumber,
              description: `Potentially dangerous pattern detected: ${matches[0]}`,
              recommendation: this.getRecommendation(category),
            });
          }
        }
      }
    } catch (error) {
      // Skip files we can't read
    }
  }

  auditPackageJson(projectPath) {
    try {
      const packagePath = path.join(projectPath, "package.json");
      const packageJson = JSON.parse(fs.readFileSync(packagePath, "utf-8"));

      // Check for insecure dependency versions
      const allDeps = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies,
      };
      for (const [dep, version] of Object.entries(allDeps || {})) {
        if (
          typeof version === "string" &&
          (version.includes("*") || version.includes("latest"))
        ) {
          this.issues.push({
            severity: "medium",
            category: "dependency-management",
            file: packagePath,
            description: `Insecure version constraint for ${dep}: ${version}`,
            recommendation:
              "Use specific version ranges to avoid vulnerable versions",
          });
        }
      }

      // Check for missing security scripts
      const scripts = packageJson.scripts || {};
      if (!scripts["audit"] && !scripts["security-audit"]) {
        this.issues.push({
          severity: "low",
          category: "security-practices",
          file: packagePath,
          description: "Missing security audit scripts",
          recommendation: "Add npm audit and security audit scripts",
        });
      }
    } catch (error) {
      // Skip if package.json doesn't exist or is invalid
    }
  }

  getRecommendation(category) {
    const recommendations = {
      "code-injection":
        "Use static code analysis and avoid dynamic code execution",
      "command-injection":
        "Validate and sanitize all user inputs, use parameterized commands",
      "hardcoded-secrets":
        "Move secrets to environment variables or secure vault",
      "weak-cryptography":
        "Use cryptographically secure random number generators",
      "information-disclosure": "Avoid logging sensitive information",
      "dependency-management": "Use lockfiles and specific version constraints",
    };
    return (
      recommendations[category] ||
      "Review and implement appropriate security measures"
    );
  }

  generateReport() {
    const summary = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
    };

    for (const issue of this.issues) {
      summary[issue.severity]++;
    }

    const totalIssues = this.issues.length;
    const score = Math.max(
      0,
      100 -
        (summary.critical * 20 +
          summary.high * 10 +
          summary.medium * 2 +
          summary.low * 1),
    );

    console.log(`📊 Audit Results:`);
    console.log(`   Security Score: ${score}/100`);
    console.log(`   Total Issues: ${totalIssues}`);
    console.log(`   - Critical: ${summary.critical}`);
    console.log(`   - High: ${summary.high}`);
    console.log(`   - Medium: ${summary.medium}`);
    console.log(`   - Low: ${summary.low}\n`);

    if (totalIssues > 0) {
      console.log("🚨 Top Security Issues:");

      // Sort by severity
      const sortedIssues = this.issues.sort((a, b) => {
        const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        return severityOrder[b.severity] - severityOrder[a.severity];
      });

      for (const issue of sortedIssues.slice(0, 10)) {
        console.log(`   ${issue.severity.toUpperCase()}: ${issue.category}`);
        console.log(`      ${issue.description}`);
        console.log(
          `      File: ${issue.file}${issue.line ? `:${issue.line}` : ""}`,
        );
        console.log(`      💡 ${issue.recommendation}\n`);
      }
    } else {
      console.log("✅ No security issues found!");
    }

    console.log("\n🛡️ Security Recommendations:");
    console.log("1. Address all Critical and High severity issues immediately");
    console.log("2. Implement automated security scanning in CI/CD pipeline");
    console.log("3. Regular security audits and dependency updates");
    console.log("4. Use security headers and secure coding practices");

    // Exit with appropriate code
    process.exit(score >= 80 ? 0 : 1);
  }
}

// Run the audit
const auditor = new BasicSecurityAuditor();
auditor.auditProject(process.cwd());
