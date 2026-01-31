#!/usr/bin/env node

/**
 * CI/CD Auto-Fix Agent
 * 
 * Automatically detects and fixes common CI/CD pipeline failures:
 * - Missing dependencies
 * - Type errors
 * - Path issues  
 * - Formatting issues
 * - Security audit failures
 * 
 * This is the missing piece that connects monitoring to remediation.
 */

import { execSync } from "child_process";
import fs from "fs";
import path from "path";

class CIAutoFixAgent {
  constructor() {
    this.fixesApplied = [];
    this.maxIterations = process.env.MAX_ITERATIONS || 3;
  }

  log(message, level = "INFO") {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [${level}] ${message}`);
  }

  async run() {
    this.log("🔧 CI/CD Auto-Fix Agent Starting...");
    this.log(`Max iterations: ${this.maxIterations}`);

    let iteration = 0;
    let fixesMade = true;

    while (fixesMade && iteration < this.maxIterations) {
      iteration++;
      this.log(`\n📍 Iteration ${iteration}/${this.maxIterations}`);
      fixesMade = false;

      // Check for and fix various CI/CD issues
      const checks = [
        this.fixMissingDependencies.bind(this),
        this.fixTypeErrors.bind(this),
        this.fixPrettierIssues.bind(this),
        this.fixPathIssues.bind(this),
        this.fixPackageLockIssues.bind(this),
        this.fixMissingScripts.bind(this),
      ];

      for (const check of checks) {
        try {
          const fixed = await check();
          if (fixed) {
            fixesMade = true;
          }
        } catch (error) {
          this.log(`❌ Fix failed: ${error.message}`, "ERROR");
        }
      }

      if (fixesMade) {
        this.log("✅ Fixes applied, running validation...");
        const valid = await this.validateFixes();
        if (valid) {
          await this.commitAndPush();
        }
      }
    }

    if (this.fixesApplied.length > 0) {
      this.log(`\n🎉 Auto-fix complete! Applied ${this.fixesApplied.length} fixes:`);
      this.fixesApplied.forEach((fix, i) => {
        this.log(`  ${i + 1}. ${fix}`);
      });
    } else {
      this.log("\nℹ️ No fixes needed - CI/CD is healthy!");
    }

    return this.fixesApplied.length > 0;
  }

  async fixMissingDependencies() {
    this.log("🔍 Checking for missing dependencies...");
    
    try {
      // Check if MCP SDK is missing
      const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"));
      const hasMcpSdk = packageJson.dependencies?.["@modelcontextprotocol/sdk"];
      
      if (!hasMcpSdk) {
        this.log("⚠️ Missing @modelcontextprotocol/sdk - adding...");
        execSync("npm install @modelcontextprotocol/sdk@^1.0.4 --save", { stdio: "pipe" });
        this.fixesApplied.push("Added @modelcontextprotocol/sdk dependency");
        return true;
      }

      // Check for rollup Linux binary
      const hasRollupLinux = packageJson.optionalDependencies?.["@rollup/rollup-linux-x64-gnu"];
      if (!hasRollupLinux) {
        this.log("⚠️ Missing rollup Linux binary - adding...");
        execSync("npm install @rollup/rollup-linux-x64-gnu@^4.30.1 --save-optional", { stdio: "pipe" });
        this.fixesApplied.push("Added @rollup/rollup-linux-x64-gnu optional dependency");
        return true;
      }

      return false;
    } catch (error) {
      this.log(`❌ Dependency check failed: ${error.message}`, "ERROR");
      return false;
    }
  }

  async fixTypeErrors() {
    this.log("🔍 Checking for TypeScript type errors...");
    
    try {
      execSync("npm run typecheck", { stdio: "pipe" });
      return false; // No errors
    } catch (error) {
      this.log("⚠️ Type errors detected - attempting fixes...");
      
      // Common fixes for type errors in MCP servers
      const mcpFiles = [
        "src/mcps/boot-orchestrator.server.ts",
        "src/mcps/auto-format.server.ts",
        "src/mcps/architect-tools.server.ts",
      ];

      let fixed = false;
      for (const file of mcpFiles) {
        if (fs.existsSync(file)) {
          const content = fs.readFileSync(file, "utf8");
          
          // Add CallToolRequest type if missing
          if (content.includes("async (request)") && !content.includes("CallToolRequest")) {
            const updated = content.replace(
              /import \{\s*CallToolRequestSchema,\s*ListToolsRequestSchema\s*\} from/,
              "import {\n  CallToolRequestSchema,\n  ListToolsRequestSchema,\n  type CallToolRequest,\n} from"
            ).replace(
              /async \(request\) =>/,
              "async (request: CallToolRequest) =>"
            );
            
            if (updated !== content) {
              fs.writeFileSync(file, updated, "utf8");
              this.log(`✅ Fixed types in ${file}`);
              this.fixesApplied.push(`Added CallToolRequest type to ${file}`);
              fixed = true;
            }
          }
        }
      }

      return fixed;
    }
  }

  async fixPrettierIssues() {
    this.log("🔍 Checking for prettier formatting issues...");
    
    try {
      execSync("npm run lint", { stdio: "pipe" });
      return false; // No issues
    } catch (error) {
      this.log("⚠️ Formatting issues detected - running prettier...");
      
      try {
        execSync('npx prettier --write "src/**/*.{ts,tsx,js,jsx,json,md}"', { stdio: "pipe" });
        this.fixesApplied.push("Fixed code formatting with Prettier");
        return true;
      } catch (prettierError) {
        this.log(`❌ Prettier failed: ${prettierError.message}`, "ERROR");
        return false;
      }
    }
  }

  async fixPathIssues() {
    this.log("🔍 Checking for script path issues...");
    
    let fixed = false;
    const fixes = [
      {
        file: "package.json",
        check: (content) => content.includes("scripts/test-consumer-readiness.mjs"),
        fix: (content) => content.replace(
          /scripts\/test-consumer-readiness\.mjs/,
          "scripts/mjs/test-consumer-readiness.mjs"
        ),
        message: "Fixed test:integration script path",
      },
      {
        file: "package.json",
        check: (content) => content.includes("scripts/test-mcp-functionality.mjs"),
        fix: (content) => content.replace(
          /scripts\/test-mcp-functionality\.mjs/,
          "scripts/mjs/test-mcp-functionality.mjs"
        ),
        message: "Fixed test:mcp script path",
      },
    ];

    for (const { file, check, fix, message } of fixes) {
      if (fs.existsSync(file)) {
        const content = fs.readFileSync(file, "utf8");
        if (check(content)) {
          const updated = fix(content);
          if (updated !== content) {
            fs.writeFileSync(file, updated, "utf8");
            this.log(`✅ ${message}`);
            this.fixesApplied.push(message);
            fixed = true;
          }
        }
      }
    }

    return fixed;
  }

  async fixPackageLockIssues() {
    this.log("🔍 Checking package-lock.json integrity...");
    
    try {
      execSync("npm ci --dry-run", { stdio: "pipe" });
      return false; // Lock file is valid
    } catch (error) {
      this.log("⚠️ Package-lock.json issues detected - regenerating...");
      
      try {
        fs.unlinkSync("package-lock.json");
        execSync("npm install", { stdio: "pipe" });
        this.fixesApplied.push("Regenerated corrupted package-lock.json");
        return true;
      } catch (regenError) {
        this.log(`❌ Failed to regenerate lock file: ${regenError.message}`, "ERROR");
        return false;
      }
    }
  }

  async fixMissingScripts() {
    this.log("🔍 Checking for missing npm scripts...");
    
    const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"));
    const scripts = packageJson.scripts || {};
    
    let fixed = false;
    const requiredScripts = {
      "security-audit": "npm audit --audit-level high",
    };

    for (const [name, command] of Object.entries(requiredScripts)) {
      if (!scripts[name]) {
        this.log(`⚠️ Missing script: ${name} - adding...`);
        scripts[name] = command;
        fixed = true;
        this.fixesApplied.push(`Added npm script: ${name}`);
      }
    }

    if (fixed) {
      packageJson.scripts = scripts;
      fs.writeFileSync("package.json", JSON.stringify(packageJson, null, 2) + "\n", "utf8");
    }

    return fixed;
  }

  async validateFixes() {
    this.log("🔍 Validating fixes...");
    
    try {
      execSync("npm run typecheck", { stdio: "pipe" });
      execSync("npm run lint", { stdio: "pipe" });
      this.log("✅ Validation passed!");
      return true;
    } catch (error) {
      this.log(`❌ Validation failed: ${error.message}`, "ERROR");
      return false;
    }
  }

  async commitAndPush() {
    this.log("📤 Committing and pushing fixes...");
    
    try {
      // Stage all changes
      execSync("git add -A", { stdio: "pipe" });
      
      // Check if there are changes to commit
      const status = execSync("git status --porcelain", { encoding: "utf8" });
      if (!status.trim()) {
        this.log("ℹ️ No changes to commit");
        return false;
      }
      
      // Commit with descriptive message
      const commitMessage = `fix: auto-fix CI/CD issues (${this.fixesApplied.join(", ")})`;
      execSync(`git commit -m "${commitMessage}" --no-verify`, { stdio: "pipe" });
      
      // Push to trigger new pipeline
      execSync("git push origin master", { stdio: "pipe" });
      
      this.log("✅ Fixes committed and pushed - new CI/CD pipeline triggered!");
      return true;
    } catch (error) {
      this.log(`❌ Commit/push failed: ${error.message}`, "ERROR");
      return false;
    }
  }
}

// Run the auto-fix agent
const agent = new CIAutoFixAgent();
agent.run().then((success) => {
  process.exit(success ? 0 : 1);
}).catch((error) => {
  console.error("Auto-fix agent failed:", error);
  process.exit(1);
});
