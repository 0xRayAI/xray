#!/usr/bin/env node

/**
 * xray CLI - Command Line Interface
 *
 * Provides commands for installing and managing xray framework
 */

import { Command } from "commander";
import { execSync, spawn } from "child_process";
import { join, resolve } from "path";

import { readFileSync, existsSync } from "fs";
import { getConfigDir } from "../core/config-paths.js";
import { frameworkLogger } from "../core/framework-logger.js";

// Get package root relative to this script location
const packageRoot = resolve(join(new URL(".", import.meta.url).pathname, "..", ".."));

// Read version dynamically from package.json
const packageJsonPath = join(packageRoot, "package.json");
const { version } = JSON.parse(readFileSync(packageJsonPath, "utf-8"));

/**
 * SECURITY: Validate script path to prevent command injection
 * Ensures the script is within the package root directory
 */
function validateScriptPath(scriptPath: string, scriptName: string): void {
  // Resolve to absolute path
  const resolvedPath = resolve(scriptPath);

  // Check if file exists
  if (!existsSync(resolvedPath)) {
    throw new Error(`${scriptName} not found: ${resolvedPath}`);
  }

  // Check if path is within package root (prevent directory traversal)
  const relativePath = resolve(packageRoot);
  if (!resolvedPath.startsWith(relativePath)) {
    throw new Error(`Security violation: ${scriptName} outside package root: ${resolvedPath}`);
  }

  // Check file extension (allow only .js, .cjs, .sh)
  const allowedExtensions = ['.js', '.cjs', '.sh'];
  const extension = resolve(resolvedPath).slice(-4);
  if (!allowedExtensions.some(ext => resolvedPath.endsWith(ext))) {
    throw new Error(`Security violation: ${scriptName} has disallowed extension: ${resolvedPath}`);
  }
}

const program = new Command();

program
  .name("0xray")
  .description(
    "xray: Bulletproof AI orchestration with systematic error prevention",
  )
  .version(version);

function runSetup() {
  const setupScript = join(packageRoot, "scripts", "node", "setup.cjs");
  validateScriptPath(setupScript, "setup script");
  execSync(`node "${setupScript}"`, { stdio: "inherit", cwd: process.cwd() });
}

program
  .command("install")
  .description("Install xray framework in the current project")
  .action(async () => {
    frameworkLogger.log('cli', 'install-start', 'info', { message: 'Installing xray framework...' });
    try {
      const postinstallScript = join(packageRoot, "scripts", "node", "postinstall.cjs");
      validateScriptPath(postinstallScript, "postinstall script");
      execSync(`node "${postinstallScript}"`, { stdio: "inherit", cwd: process.cwd() });
      frameworkLogger.log('cli', 'install-success', 'info', { message: 'xray framework installed' });
      // UX banner kept for user visibility post-install (non-removable per exception)
      console.log("✅ xray framework installed!");
      console.log("💡 Run 'npx xray setup' for full configuration (hooks, Hermes, symlinks)");
    } catch (error) {
      frameworkLogger.log('cli', 'install-error', 'error', { error: error instanceof Error ? error.message : String(error) });
      console.error("❌ Installation failed:", error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

program
  .command("setup")
  .description("Full framework setup: hooks, Hermes integration, symlinks, MCP paths")
  .action(runSetup);

program
  .command("init")
  .description("Initialize xray configuration in the current project")
  .action(async () => {
    console.log("🚀 xray CLI: Initializing configuration...");
    try {
      const postinstallScript = join(packageRoot, "scripts", "node", "postinstall.cjs");
      validateScriptPath(postinstallScript, "postinstall script");
      execSync(`node "${postinstallScript}"`, { stdio: "inherit", cwd: process.cwd() });
      runSetup();

      console.log("✅ xray configuration initialized!");
    } catch (error) {
      console.error(
        "❌ Initialization failed:",
        error instanceof Error ? error.message : String(error),
      );
      process.exit(1);
    }
  });

program
  .command("status")
  .description("Show comprehensive xray framework status")
  .action(async () => {
    const { statusCommand } = await import("./commands/status.js");
    await statusCommand();
  });

program
  .command("validate")
  .description("Validate xray framework installation")
  .action(async () => {
    console.log("🔬 xray CLI: Validating installation...");

    try {
      // Run the init.sh script to validate
      const initScript = join(packageRoot, ".opencode", "init.sh");
      const fs = await import("fs");

      if (!fs.existsSync(initScript)) {
        console.error(
          "❌ Validation failed: init script not found:",
          initScript,
        );
        process.exit(1);
      }

      // SECURITY: Validate script path before execution
      validateScriptPath(initScript, "init script");

      execSync(`bash "${initScript}"`, {
        stdio: "inherit",
        cwd: process.cwd(),
      });
    } catch (error) {
      console.error(
        "❌ Validation failed:",
        error instanceof Error ? error.message : String(error),
      );
      process.exit(1);
    }
  });

program
  .command("debug")
  .description("Debug command")
  .action(async () => {
    console.log("📍 xray CLI Debug Info");
    console.log("   packageRoot:", packageRoot);
    console.log("   cwd:", process.cwd());
  });

program
  .command("capabilities")
  .alias("caps")
  .description("Show all available xray framework capabilities")
  .action(async () => {
    console.log("🚀 xray Framework Capabilities");
    console.log("=====================================");
    console.log("");

    console.log("🤖 Available Agent Commands:");
    console.log("  @security-auditor   - Codex compliance & error prevention");
    console.log("  @architect          - System design & delegation decisions");
    console.log(
      "  @bug-triage-specialist - Error investigation & surgical fixes",
    );
    console.log(
      "  @code-reviewer      - Quality assessment & standards validation",
    );
    console.log("  @security-auditor   - Vulnerability detection & compliance");
    console.log(
      "  @refactorer         - Technical debt elimination & code consolidation",
    );
    console.log(
      "  @testing-lead     - Testing strategy & coverage optimization",
    );
    console.log("  @researcher          - Codebase exploration & documentation");
    console.log("");

    console.log("🛠️ Framework Tools:");
    console.log(
      "  framework-reporting-system - Generate comprehensive activity reports",
    );
    console.log(
      "  complexity-analyzer       - Analyze code complexity & delegation decisions",
    );
    console.log(
      "  codex-injector           - Apply development standards automatically",
    );
    console.log("");

    console.log("🎯 Skills System (23 lazy-loaded capabilities):");
    console.log("  project-analysis      - Codebase metrics and analysis");
    console.log("  testing-strategy      - Test planning and execution");
    console.log("  code-review          - Quality assessment");
    console.log("  security-audit       - Vulnerability scanning");
    console.log("  performance-optimization - Performance tuning");
    console.log("  refactoring-strategies   - Code improvement techniques");
    console.log("  ui-ux-design         - User interface design");
    console.log("  documentation-generation - Technical documentation");
    console.log("  ... and 15 more specialized skills");
    console.log("");

    console.log("📚 Help & Discovery:");
    console.log(
      "  Use the framework-help MCP server for detailed information:",
    );
    console.log("  - xray_get_capabilities: Complete capabilities overview");
    console.log("  - xray_get_commands: Command usage examples");
    console.log("  - xray_explain_capability: Detailed feature explanations");
    console.log("");

    console.log("📊 Core Features:");
    console.log("  • 99.6% error prevention through codex compliance");
    console.log("  • 90% resource reduction (0 baseline processes)");
    console.log("  • Multi-agent orchestration with intelligent delegation");
    console.log("  • Systematic code quality enforcement");
    console.log("  • Real-time activity monitoring and reporting");
    console.log("");

    console.log("🎯 Getting Started:");
    console.log("  1. Use @security-auditor for code quality validation");
    console.log("  2. Use @architect for complex development tasks");
    console.log("  3. Access skills for specialized capabilities");
    console.log("  4. Check framework-reporting-system for activity reports");
    console.log(
      '  5. Run "npx xray capabilities" anytime for this overview',
    );
  });

program
  .command("health")
  .alias("check")
  .description("Check framework health and system status")
  .action(async () => {
    console.log("🏥 xray Framework Health Check");
    console.log("====================================");
    console.log("");

    try {
      const fs = await import("fs");
      const path = await import("path");

      // Check core components
      const checks = [
        {
          name: "Package Installation",
          check: () => fs.existsSync(path.join(packageRoot, "package.json")),
          success: "✅ Framework package found",
          error: "❌ Framework package missing",
        },
        {
          name: "Configuration Files",
          check: () =>
            fs.existsSync(path.join(process.cwd(), "opencode.json")) ||
            fs.existsSync(path.join(process.cwd(), ".opencode", "enforcer-config.json")),
          success: "✅ opencode configuration found",
          error: "⚠️ opencode config optional for consumers",
        },
        {
          name: "Agent System",
          check: () => fs.existsSync(path.join(packageRoot, "dist", "agents")),
          success: "✅ Agent system available",
          error: "❌ Agent system not built",
        },
        {
          name: "MCP Servers",
          check: () => fs.existsSync(path.join(packageRoot, "dist", "mcps")),
          success: "✅ MCP servers available",
          error: "❌ MCP servers not built",
        },
      ];

      let allHealthy = true;

      for (const check of checks) {
        try {
          if (check.check()) {
            console.log(check.success);
          } else {
            console.log(check.error);
            allHealthy = false;
          }
        } catch (error) {
          console.log(`${check.name}: ❌ Error during check`);
          allHealthy = false;
        }
      }

      console.log("");

      if (allHealthy) {
        console.log("🎉 Framework is healthy and ready to use!");
        console.log("");
        console.log("💡 Quick commands:");
console.log("  • @security-auditor scan this project");
    console.log("  • @architect analyze this project");
        console.log("  • framework-reporting-system");
      } else {
        console.log(
          '⚠️ Some components need attention. Run "npx xray install" to fix.',
        );
      }
    } catch (error) {
      console.error(
        "❌ Health check failed:",
        error instanceof Error ? error.message : String(error),
      );
      process.exit(1);
    }
  });

program
  .command("report")
  .description("Generate framework activity and health reports")
  .option(
    "-t, --type <type>",
    "Report type (full-analysis, agent-usage, performance, orchestration, context-awareness)",
    "full-analysis",
  )
  .option("-o, --output <file>", "Output file path")
  .option("--daily", "Daily report (full-analysis for last 24 hours)")
  .option("--performance", "Performance report")
  .option("--compliance", "Compliance report (codex violations)")
  .option("--session", "Current session report")
  .option("--ci", "CI-friendly JSON output for pipelines")
  .action(async (options) => {
    // Resolve convenience flags to report type
    const typeMap: Record<string, string> = {
      daily: "full-analysis",
      performance: "performance",
      compliance: "full-analysis",
      session: "full-analysis",
      ci: "full-analysis",
    };

    let reportType = options.type;
    let outputFormat: "json" | "markdown" = "json";

    // Convenience flags override --type
    for (const [flag, mappedType] of Object.entries(typeMap)) {
      if (options[flag]) {
        reportType = mappedType;
        break;
      }
    }

    // CI mode always outputs JSON
    if (options.ci) {
      outputFormat = "json";
    }

    const label = options.ci
      ? "ci"
      : options.daily
        ? "daily"
        : options.performance
          ? "performance"
          : options.compliance
            ? "compliance"
            : options.session
              ? "session"
              : reportType;

    console.log(`📊 xray Framework Report: ${label}`);
    console.log("==========================================");
    console.log("");

    try {
      // Import and run the reporting system directly
      const { FrameworkReportingSystem } = await import("../reporting/framework-reporting-system.js");

      const reportingSystem = new FrameworkReportingSystem();

      const report = await reportingSystem.generateReport({
        type: reportType as any,
        outputFormat,
      });

      if (options.output) {
        const fs = await import("fs");
        fs.writeFileSync(options.output, report);
        console.log(`✅ Report saved to: ${options.output}`);
      } else {
        console.log(report);
      }
    } catch (error) {
      console.error(
        "❌ Report generation failed:",
        error instanceof Error ? error.message : String(error),
      );
      console.log("");
      console.log("💡 Troubleshooting:");
      console.log("  • Make sure OpenCode is running");
      console.log("  • Check framework installation: npx xray status");
      console.log(
        "  • Try manual report: framework-reporting-system generate-report",
      );
      process.exit(1);
    }
  });

program
  .command("fix")
  .description(
    "Automatically fix common framework issues by running the postinstall setup",
  )
  .action(async () => {
    console.log("🔧 xray Framework Fix");
    console.log("===========================");
    console.log("");

    try {
      console.log("Running postinstall setup to restore configuration...");

      // Run the postinstaller script (same as install command)
      const postinstallScript = join(
        packageRoot,
        "scripts",
        "node",
        "postinstall.cjs",
      );

      // SECURITY: Validate script path before execution
      validateScriptPath(postinstallScript, "postinstall script");

      execSync(`node "${postinstallScript}"`, {
        stdio: "inherit",
        cwd: process.cwd(),
      });

      console.log("");
      console.log("🎉 Framework configuration restored successfully!");
      console.log("");
      console.log("💡 Next steps:");
      console.log("  • Restart OpenCode to load the restored configuration");
      console.log("  • Run: npx xray health (to verify everything works)");
      console.log("  • Try: @security-auditor scan this project");
    } catch (error) {
      console.error(
        "❌ Fix command failed:",
        error instanceof Error ? error.message : String(error),
      );
      console.log("");
      console.log("💡 Manual fix options:");
      console.log("  • Delete .opencode/ and .xray/ directories");
      console.log("  • Run: npx xray install");
      console.log("  • Or manually restore missing configuration files");
      process.exit(1);
    }
  });

program
  .command("doctor")
  .description("Diagnose framework issues (does not fix them)")
  .action(async () => {
    console.log("🩺 xray Framework Doctor");
    console.log("===============================");
    console.log("");

    try {
      const fs = await import("fs");
      const path = await import("path");

      const issues = [];
      const fixes = [];

      // Check Node.js version
      const nodeVersion = process.version;
      const versionParts = nodeVersion.slice(1).split(".");
      const majorVersion = parseInt(versionParts[0] || "0");
      if (majorVersion < 18) {
        issues.push("Node.js version too old");
        fixes.push("Upgrade to Node.js 18+");
      } else {
        console.log("✅ Node.js version:", nodeVersion);
      }

      // Check package installation
      const packageExists = fs.existsSync(
        path.join(process.cwd(), "node_modules", "0xray"),
      );
      if (!packageExists) {
        issues.push("xray package not installed");
        fixes.push("Run: npm install xray");
      } else {
        console.log("✅ xray package installed");
      }

      // Check configuration - check for opencode.json or .xray/ (min compat .xray/ fallback for prior StringRay consumer runtime per Scope Rule; plain xray primary)
      const cwd = process.cwd();
      const opencodeConfigPath = path.join(cwd, "opencode.json");
      const xrayDir = getConfigDir(cwd);
      const opencodeExists = fs.existsSync(opencodeConfigPath);
      const xrayDirExists = fs.existsSync(xrayDir);
      if (opencodeExists) {
        console.log("✅ opencode configuration found");
      } else if (xrayDirExists) {
        console.log(`✅ Configuration directory found: ${xrayDir}`);
      } else {
        console.log("ℹ️  No opencode.json or config directory found (run: npx xray fix to create)");
      }

      // Check for common issues
      const mcpConfigExists = fs.existsSync(
        path.join(process.cwd(), ".mcp.json"),
      );
      if (mcpConfigExists) {
        console.log("ℹ️ Found .mcp.json - may conflict with framework");
        fixes.push(
          "Consider removing .mcp.json or excluding framework servers",
        );
      }

      console.log("");

      if (issues.length === 0) {
        console.log("🎉 No issues found! Framework is healthy.");
        console.log("");
        console.log("💡 Pro tips:");
        console.log("  • Use @security-auditor for code quality checks");
        console.log("  • Run reports regularly: npx xray report");
        console.log("  • Check health anytime: npx xray health");
      } else {
        console.log("⚠️ Issues found:");
        issues.forEach((issue, i) => {
          console.log(`  ${i + 1}. ${issue}`);
        });

        console.log("");
        console.log(
          '🔧 Run "npx xray fix" to automatically fix these issues',
        );
      }
    } catch (error) {
      console.error(
        "❌ Doctor check failed:",
        error instanceof Error ? error.message : String(error),
      );
      process.exit(1);
    }
  });

// Inference improvement command
program
  .command('inference:improve')
  .description('Run autonomous inference improvement cycle')
  .option('--dry-run', 'Show what would change without applying')
  .option('-v, --verbose', 'Verbose output')
  .action(async (options) => {
    console.log('🚀 xray Inference Improvement');
    console.log('=================================');
    console.log('');

    try {
      const { LearningEngine } = await import('../delegation/analytics/learning-engine.js');
      const { routingOutcomeTracker } = await import('../delegation/analytics/outcome-tracker.js');
      const { patternPerformanceTracker } = await import('../analytics/pattern-performance-tracker.js');
      const { getAdaptiveKernel } = await import('../core/adaptive-kernel.js');

      // Reload fresh data
      routingOutcomeTracker.reloadFromDisk();
      patternPerformanceTracker.loadFromDisk();
      
      const outcomes = routingOutcomeTracker.getOutcomes();
      console.log(`📊 Loaded ${outcomes.length} routing outcomes`);
      
      // Generate performance report
      const perfMetrics = patternPerformanceTracker.getAllPatternMetrics();
      console.log(`   Patterns tracked: ${perfMetrics.length}`);
      
      const successOutcomes = outcomes.filter(o => o.success);
      const successRate = outcomes.length > 0 ? (successOutcomes.length / outcomes.length * 100).toFixed(1) : '100.0';
      console.log(`   Overall success rate: ${successRate}%`);
      console.log('');
      
      // Trigger learning
      const engine = new LearningEngine(true);
      const learningResult = await engine.triggerLearning();
      console.log(`🧠 Learning Results:`);
      console.log(`   Patterns analyzed: ${learningResult.patternsAnalyzed}`);
      console.log(`   Adaptations: ${learningResult.adaptations}`);
      
      // Get drift analysis
      const driftAnalysis = engine.getPatternDriftAnalysis();
      console.log(`\n📈 Pattern Drift:`);
      console.log(`   Drift detected: ${driftAnalysis.driftDetected}`);
      console.log(`   Severity: ${driftAnalysis.severity}`);
      if (driftAnalysis.affectedPatterns.length > 0) {
        console.log(`   Affected: ${driftAnalysis.affectedPatterns.slice(0, 5).join(', ')}`);
      }
      
      // Get adaptive kernel stats
      const kernel = getAdaptiveKernel();
      const kernelStats = kernel.getLearningStats();
      console.log(`\n⚙️ Kernel Stats:`);
      console.log(`   Patterns tracked: ${kernelStats.patternsTracked}`);
      console.log(`   Thresholds calibrated: ${kernelStats.thresholdsCalibrated}`);
      
      // Get suggestions
      if (!options.dryRun) {
        const suggestions = engine.suggestImprovements();
        if (suggestions.length > 0) {
          console.log(`\n💡 Suggestions:`);
          suggestions.slice(0, 5).forEach((s, i) => {
            console.log(`   ${i + 1}. [${s.type}] ${s.description} (${s.impact} impact)`);
          });
        }
        
        console.log(`\n✅ Inference improvement cycle complete`);
      } else {
        console.log(`\n💡 Dry run - no changes applied`);
      }

      console.log('');
    } catch (error) {
      console.error('❌ Inference improvement failed:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

// Inference tuner command
program
  .command('inference:tuner')
  .description('Start/stop the autonomous inference tuner service')
  .option('-s, --start', 'Start the tuner service')
  .option('-t, --stop', 'Stop the tuner service')
  .option('-r, --run-once', 'Run a single tuning cycle')
  .option('-S, --status', 'Show tuner status')
  .action(async (options) => {
    const { inferenceTuner } = await import('../services/inference-tuner.js');
    
    if (options.status) {
      const status = inferenceTuner.getStatus();
      console.log('🎛️  Inference Tuner Status');
      console.log('=========================');
      console.log(`   Running: ${status.running ? '✅ Yes' : '❌ No'}`);
      console.log(`   Last tuning: ${status.lastTuningTime ? new Date(status.lastTuningTime).toISOString() : 'Never'}`);
      console.log(`   Auto-update mappings: ${status.config.autoUpdateMappings}`);
      console.log(`   Auto-update thresholds: ${status.config.autoUpdateThresholds}`);
      console.log(`   Learning interval: ${status.config.learningIntervalMs}ms`);
      return;
    }
    
    if (options.start) {
      inferenceTuner.start();
      console.log('✅ Inference tuner started');
      console.log(`   Interval: ${inferenceTuner.getStatus().config.learningIntervalMs}ms`);
      console.log('   Press Ctrl+C to stop');
      return;
    }
    
    if (options.stop) {
      inferenceTuner.stop();
      console.log('✅ Inference tuner stopped');
      return;
    }
    
    if (options.runOnce) {
      console.log('🎛️  Running single tuning cycle...');
      await inferenceTuner.runTuningCycle();
      console.log('✅ Tuning cycle complete');
      return;
    }
    
    console.log('Usage: npx xray inference:tuner [options]');
    console.log('  --start     Start the tuner service');
    console.log('  --stop      Stop the tuner service');
    console.log('  --run-once  Run a single tuning cycle');
    console.log('  --status    Show tuner status');
  });

// Inference cycle run command
program
  .command('inference:run')
  .description('Run a self-improvement inference cycle: collect → propose → govern → verify')
  .option('-f, --force', 'Force cycle even if threshold not met')
  .option('--no-verify', 'Skip deploy verification step')
  .option('--no-apply', 'Skip applying approved proposals (create PRs)')
  .option('--no-researcher-review', 'Skip downstream researcher review of PRs')
  .option('--json', 'Output raw JSON result')
   .action(async (options) => {
     const { InferenceCycle } = await import('../inference/inference-cycle.js');
     const { shouldTriggerCycle } = await import('../inference/inference-accumulator.js');
     const { accumulateCorpus } = await import('../inference/inference-accumulator.js');
      const { featuresConfigLoader } = await import('../core/features-config.js');
      const { initializeGovernanceIntegration, shutdownGovernanceIntegration } = await import('../integrations/governance/index.js');

      // Guard: inference:run is internal to xray development only
     const isxrayRepo = (() => {
       try {
         const pkg = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf-8'));
         return pkg.name === '0xray' && process.env.NODE_ENV !== 'consumer';
       } catch {
         return false;
       }
     })();

     if (!isxrayRepo) {
       if (options.json) {
         console.log(JSON.stringify({ triggered: false, reason: 'inference:run is for xray development only (internal tool)' }));
       } else {
         console.log('The inference:run command is for xray framework development only.');
         console.log('It is not intended for consumer projects.');
       }
       return;
     }

     const features = featuresConfigLoader.loadConfig();
     const inferenceConfig = (features as any)?.inference;
    if (!inferenceConfig?.enabled) {
      if (options.json) {
        console.log(JSON.stringify({ triggered: false, reason: 'Inference feature disabled in features.json' }));
      } else {
        console.log('Inference feature is disabled in features.json.');
        console.log('Enable it by setting inference.enabled = true in .opencode/plugins/features.json (min compat .xray/ fallback for prior StringRay consumer runtime per Scope Rule)');
      }
      return;
    }

    const projectRoot = process.cwd();
    const inferenceDir = `${projectRoot}/docs/inference`;
    const stateDir = `${projectRoot}/.xray/inference`;
    const stateFile = `${stateDir}/inference-state.json`;

    if (!options.json) {
      console.log('xray Inference Cycle');
      console.log('====================');
    }

    if (!options.force) {
      const threshold = shouldTriggerCycle(inferenceDir, stateFile);
      if (!threshold.trigger) {
        if (options.json) {
          console.log(JSON.stringify({ triggered: false, reason: threshold.reason }));
        } else {
          console.log(`Not triggered: ${threshold.reason}`);
          console.log('Use --force to override.');
        }
        return;
      }
      if (!options.json) {
        console.log(`Triggered: ${threshold.reason}`);
      }
    } else if (!options.json) {
      console.log('Force mode — skipping threshold check');
    }

    if (!options.json) {
      const corpus = accumulateCorpus(inferenceDir);
      console.log(`\nCorpus: ${corpus.sessions.length} sessions, ${corpus.totalCommits} commits`);
      console.log(`  Recurring problems: ${corpus.recurringProblems.length}`);
      console.log(`  Recurring patterns: ${corpus.recurringPatterns.length}`);
    }

    // Initialize external governance integration for two-oscillator governance
    const govConfig = (features as any)?.inference_governance;
    if (govConfig?.enabled) {
      await shutdownGovernanceIntegration();
      await initializeGovernanceIntegration();
    }

    const cycle = InferenceCycle.getInstance(projectRoot, { skipDeployVerify: options.noVerify ?? true, skipApply: options.noApply ?? false, skipResearcherReview: options.noResearcherReview ?? false, force: options.force ?? false });
    const result = await cycle.maybeRunCycle();

    if (options.json) {
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    console.log(`\nCycle: ${result.cycleId}`);
    console.log(`Phase: ${result.phase}`);
    console.log(`Duration: ${(result.duration / 1000).toFixed(1)}s`);

    if (result.proposals.length > 0) {
      console.log(`\nProposals (${result.proposals.length}):`);
      for (const p of result.proposals) {
        const icon = p.status === 'approved' || p.status === 'applied' ? 'APPROVED' : p.status === 'rejected' ? 'REJECTED' : p.status === 'failed' ? 'FAILED' : 'PENDING';
        console.log(`  [${icon}] ${p.type}: ${p.title} (${(p.confidence * 100).toFixed(0)}%)`);
      }
    } else {
      console.log('\nNo proposals generated.');
    }

    if (result.votes.length > 0) {
      console.log(`\nGovernance votes (${result.votes.length}):`);
      for (const v of result.votes) {
        console.log(`  ${v.proposalId}: ${v.decision} (${(v.confidence * 100).toFixed(0)}%)`);
        for (const d of v.details) {
          console.log(`    ${d}`);
        }
      }
    }

    if (result.deployVerification) {
      console.log(`\nDeploy verification: ${result.deployVerification.success ? 'PASSED' : 'FAILED'}`);
      const failedChecks = result.deployVerification.checks.filter((c: any) => !c.passed);
      if (failedChecks.length > 0) {
        for (const c of failedChecks) {
          console.log(`  Failed: ${c.name} — ${c.output?.substring(0, 200)}`);
        }
      }
    }
  });

// Skill registry command
program
  .command('skill:registry [action]')
  .description('List, add, or remove skills registry sources')
  .option('--name <name>', 'Source name')
  .option('--url <url>', 'Repository URL')
  .option('--desc <desc>', 'Description')
  .option('--license <license>', 'License type')
  .action(async (action, options) => {
    const { skillRegistryCommand } = await import('./commands/skill-install.js');
    await skillRegistryCommand(action, options);
  });

// Skill install command
program
  .command('skill:install [source]')
  .description('Install skills from the registry or any git repo')
  .option('--path <dir>', 'Subdirectory in repo containing skills')
  .option('--force', 'Reinstall even if already installed')
  .action(async (sourceArg, options) => {
    const { skillInstallCommand } = await import('./commands/skill-install.js');
    await skillInstallCommand(sourceArg, options);
  });

// MCP server subprocess launchers (used by Grok plugin .mcp.json via npx)
program
  .command('mcp')
  .description('Run an MCP server subprocess (used by Grok/OpenCode .mcp.json)')
  .argument('<server>', 'Server name: governance or skills')
  .action(async (server: string) => {
    const serverMap: Record<string, string> = {
      governance: 'dist/mcps/governance.server.js',
      skills: 'dist/mcps/knowledge-skills/skill-invocation.server.js',
    };
    const relPath = serverMap[server];
    if (!relPath) {
      console.error(`Unknown MCP server: ${server}. Use: governance, skills`);
      process.exit(1);
    }
    const serverPath = resolve(join(packageRoot, relPath));
    if (!existsSync(serverPath)) {
      console.error(`MCP server not found at ${serverPath}. Is xray installed correctly?`);
      process.exit(1);
    }
    const env: Record<string, string> = { ...process.env as Record<string, string> };
    const child = spawn(process.execPath, [serverPath], { stdio: 'inherit', env });
    child.on('exit', (code) => process.exit(code ?? 0));
  });

// Grok CLI integration
const grokCmd = program.command('grok').description('Grok CLI integration commands');
const { registerGrokCommands } = await import('./commands/grok-install.js');
registerGrokCommands(grokCmd);

// Hermes Agent integration
const hermesCmd = program.command('hermes').description('Hermes Agent integration commands');
const { registerHermesCommands } = await import('./commands/hermes-install.js');
registerHermesCommands(hermesCmd);

// OpenClaw integration
const openclawCmd = program.command('openclaw').description('OpenClaw integration commands');
const { registerOpenClawCommands } = await import('./commands/openclaw-install.js');
registerOpenClawCommands(openclawCmd);

// OpenCode integration
const opencodeCmd = program.command('opencode').description('OpenCode integration commands');
const { registerOpencodeCommands } = await import('./commands/opencode-install.js');
registerOpencodeCommands(opencodeCmd);

// Security audit command
program
  .command("security-audit")
  .description("Run comprehensive security audit with vulnerability scanning, compliance checking, and architectural decisions")
  .action(async () => {
    const { securityAuditCommand } = await import("./commands/security-audit.js");
    await securityAuditCommand();
  });

// v3 nucleus: primary governance command
program
  .command("govern")
  .description("Run the xray governance kernel")
  .option("--status", "Show framework status")
  .option("--audit", "Run security audit")
  .option("--mcp <server>", "Run an MCP server subprocess (governance, skills)")
  .option("--plugin-install <name>", "Install a plugin")
  .option("--proposals <json>", "Run governance on JSON proposals")
  .option("--skill-install [source]", "Install skills from registry")
  .option("--skill-registry [action]", "Manage skill registry sources")
  .option("--storyteller <type>", "Write a story (reflection|saga|journey|narrative)")
  .option("--mcp-list", "List available MCP servers")
  .option("--mcp-status", "Show installed MCP servers")
  .option("--mcp-install <name>", "Install an MCP server")
  .option("--mcp-remove <name>", "Remove an MCP server")
  .option("--publish-agent", "Publish an agent to AgentStore")
  .option("--archive-logs", "Archive log files")
  .option("--credible-init [name]", "Initialize Credible Pod")
  .option("--antigravity-status", "Show installed skills status")
  .action(async (options) => {
    const { governCommand } = await import("./commands/govern.js");
    await governCommand(options);
  });

// Add help text
program.addHelpText(
  "after",
  `

Examples:
    $ npx 0xray install       # Install xray in current project
    $ npx 0xray init          # Initialize configuration
    $ npx 0xray status        # Check installation status
    $ npx 0xray validate      # Validate framework setup
    $ npx 0xray capabilities  # Show all available capabilities
    $ npx 0xray health        # Check framework health and status
    $ npx 0xray report        # Generate activity and health reports
    $ npx 0xray fix           # Automatically restore missing config files
    $ npx 0xray doctor        # Diagnose issues (does not fix them)
    $ npx 0xray inference:improve  # Run autonomous inference improvement
    $ npx 0xray security-audit --deep  # Run deep security audit
    $ npx 0xray govern                  # Run the governance kernel
    $ npx 0xray govern --status        # Show status (v3 nucleus)
    $ npx 0xray govern --proposals '[{"type":"fix","title":"Test","description":"A test"}]'

Quick Start:
   1. Install: npx 0xray install
   2. Check health: npx 0xray health
   3. Use agents: @security-auditor scan
   4. Generate reports: npx 0xray report
   5. Fix issues: npx 0xray fix
   6. Add skills: npx 0xray skill:install agency-agents

For more information, visit: https://github.com/0xRayAI/xray
`,
);

// Parse command line arguments
program.exitOverride();
try {
  program.parse();
} catch (err: unknown) {
  if (err instanceof Error && 'code' in err && (err as { code: string }).code === 'commander.help') {
    process.exit(0);
  }
  throw err;
}
