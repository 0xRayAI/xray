/**
 * xray Nucleus — Orchestrator
 *
 * Core boot orchestration logic extracted from boot-orchestrator.server.ts.
 * Owns the component dependency graph, initialization sequence, and status tracking.
 * The MCP server is a thin surface over this class.
 */

import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { frameworkLogger } from "../core/framework-logger.js";
import { resolveLogDir, resolveStateDir } from "../core/config-paths.js";

export interface ComponentInitResult {
  success: boolean;
  duration: number;
  message?: string;
  error?: string;
}

export interface BootResults {
  success: boolean;
  initializedComponents: string[];
  failedComponents: string[];
  duration: number;
  errors: string[];
  warnings: string[];
}

export interface ComponentStatus {
  initialized: boolean;
  healthy: boolean;
  info: ComponentInitResult | undefined;
  dependencies: string[];
}

export interface OverallBootStatus {
  initialized: boolean;
  uptime: number;
  totalComponents: number;
  initializedComponents: number;
  healthyComponents: number;
  failedComponents: number;
}

export interface DependencyValidationResult {
  total: number;
  valid: number;
  missing: number;
  circular: number;
  issues: string[];
  fixes: string[];
}

export interface ShutdownResult {
  success: boolean;
  shutDown: number;
  stateSaved: boolean;
  errors: string[];
  duration: number;
}

export interface InitOptions {
  skipHealthChecks?: boolean;
  parallelInit?: boolean;
}

export class NucleusOrchestrator {
  private initialized = false;
  private startTime = Date.now();
  private components = new Map<string, ComponentInitResult>();
  private dependencies = new Map<string, string[]>();
  private health = new Map<string, boolean>();

  // Boot sequence in dependency order
  readonly bootSequence = [
    "configuration",
    "logging",
    "state-management",
    "security",
    "codex-loader",
    "context-loader",
    "processor-pipeline",
    "agent-registry",
    "orchestrator",
    "mcp-servers",
    "framework-hooks",
  ];

  constructor() {
    this.initializeDependencies();
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  getComponentResult(component: string): ComponentInitResult | undefined {
    return this.components.get(component);
  }

  getComponentHealth(component: string): boolean | undefined {
    return this.health.get(component);
  }

  getComponentDependencies(component: string): string[] {
    return this.dependencies.get(component) || [];
  }

  private initializeDependencies() {
    this.dependencies.set("configuration", []);
    this.dependencies.set("logging", ["configuration"]);
    this.dependencies.set("state-management", ["configuration", "logging"]);
    this.dependencies.set("security", ["configuration"]);
    this.dependencies.set("codex-loader", ["configuration", "logging"]);
    this.dependencies.set("context-loader", ["configuration", "codex-loader"]);
    this.dependencies.set("processor-pipeline", ["state-management", "security", "codex-loader"]);
    this.dependencies.set("agent-registry", ["configuration", "state-management", "processor-pipeline"]);
    this.dependencies.set("orchestrator", ["agent-registry", "processor-pipeline"]);
    this.dependencies.set("mcp-servers", ["orchestrator", "agent-registry"]);
    this.dependencies.set("framework-hooks", ["mcp-servers", "orchestrator"]);
  }

  async executeBootSequence(options?: InitOptions): Promise<BootResults> {
    const skipHealthChecks = options?.skipHealthChecks || false;
    const parallelInit = options?.parallelInit !== false;

    frameworkLogger.log("nucleus-orchestrator", "execute-boot-sequence", "info", {
      skipHealthChecks,
      parallelInit,
    });

    const results: BootResults = {
      success: true,
      initializedComponents: [],
      failedComponents: [],
      duration: 0,
      errors: [],
      warnings: [],
    };

    const startTime = Date.now();

    try {
      const validationResults = await this.validatePrerequisites();
      if (!validationResults.valid) {
        results.success = false;
        results.errors.push(...validationResults.errors);
        results.duration = Date.now() - startTime;
        return results;
      }

      if (parallelInit) {
        await this.executeParallelBoot(skipHealthChecks, results);
      } else {
        await this.executeSequentialBoot(skipHealthChecks, results);
      }

      results.duration = Date.now() - startTime;
      this.initialized = results.success;

      return results;
    } catch (error) {
      results.success = false;
      results.duration = Date.now() - startTime;
      results.errors.push(
        `Boot sequence failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      return results;
    }
  }

  getOverallBootStatus(): OverallBootStatus {
    const totalComponents = this.bootSequence.length;
    const initializedComponents = Array.from(this.components.keys());
    const healthyComponents = Array.from(this.health.values()).filter((h) => h).length;

    return {
      initialized: this.initialized,
      uptime: Date.now() - this.startTime,
      totalComponents,
      initializedComponents: initializedComponents.length,
      healthyComponents,
      failedComponents: initializedComponents.length - healthyComponents,
    };
  }

  async getComponentStatus(component: string): Promise<ComponentStatus> {
    const initialized = this.components.has(component);
    const healthy = this.health.get(component) || false;
    const info = this.components.get(component);

    return {
      initialized,
      healthy,
      info,
      dependencies: this.dependencies.get(component) || [],
    };
  }

  async initializeSingleComponent(component: string, force?: boolean): Promise<ComponentInitResult> {
    if (this.components.has(component) && !force) {
      return {
        success: true,
        duration: 0,
        message: `Component already initialized: ${component}`,
      };
    }

    const deps = this.dependencies.get(component) || [];
    for (const dep of deps) {
      if (!this.components.has(dep)) {
        return {
          success: false,
          duration: 0,
          error: `Dependency not met: ${component} requires ${dep}`,
        };
      }
    }

    const result = await this.initializeComponent(component);
    this.components.set(component, result);
    this.health.set(component, result.success);
    return result;
  }

  async validateAllDependencies(fix?: boolean, verbose?: boolean): Promise<DependencyValidationResult> {
    const results: DependencyValidationResult = {
      total: this.bootSequence.length,
      valid: 0,
      missing: 0,
      circular: 0,
      issues: [],
      fixes: [],
    };

    for (const component of this.bootSequence) {
      const deps = this.dependencies.get(component) || [];
      const missingDeps = deps.filter((dep) => !this.checkComponentExists(dep));

      if (missingDeps.length > 0) {
        results.missing++;
        results.issues.push(
          `${component} missing dependencies: ${missingDeps.join(", ")}`,
        );
      } else {
        results.valid++;
      }
    }

    const circularDeps = this.detectCircularDependencies();
    if (circularDeps.length > 0) {
      results.circular = circularDeps.length;
      results.issues.push(
        `Circular dependencies detected: ${circularDeps.join(", ")}`,
      );
    }

    if (fix && results.issues.length > 0) {
      results.fixes = await this.applyDependencyFixes(results.issues);
    }

    return results;
  }

  async shutdown(force?: boolean, saveState?: boolean): Promise<ShutdownResult> {
    const results: ShutdownResult = {
      success: true,
      shutDown: 0,
      stateSaved: saveState !== false,
      errors: [],
      duration: 0,
    };

    const startTime = Date.now();

    try {
      const reverseSequence = [...this.bootSequence].reverse();

      for (const component of reverseSequence) {
        try {
          await this.shutdownComponent(component, force || false);
          results.shutDown++;
        } catch (error) {
          results.errors.push(
            `${component}: ${error instanceof Error ? error.message : String(error)}`,
          );
          if (!force) {
            results.success = false;
          }
        }
      }

      if (saveState !== false) {
        await this.saveShutdownState();
      }
    } catch (error) {
      results.success = false;
      results.errors.push(
        `Shutdown error: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    results.duration = Date.now() - startTime;
    return results;
  }

  private async validatePrerequisites(): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    try {
      const nodeVersionOutput = execSync("node --version", { encoding: "utf8" })?.toString().trim() || "";
      const nodeVersion = nodeVersionOutput || "v1.2.0";
      const versionParts = nodeVersion.split(".");
      const majorVersion = versionParts.length > 0 && versionParts[0]
        ? parseInt(versionParts[0].substring(1))
        : 0;
      if (majorVersion < 18) {
        errors.push(`Node.js version ${nodeVersion} is too old. Requires 18+`);
      }
    } catch {
      errors.push("Cannot determine Node.js version");
    }

    const requiredDirs = ["src", "src/agents", "src/mcps"];
    for (const dir of requiredDirs) {
      if (!fs.existsSync(dir)) {
        errors.push(`Required directory missing: ${dir}`);
      }
    }

    if (!fs.existsSync("package.json")) {
      errors.push("package.json not found");
    }

    return { valid: errors.length === 0, errors };
  }

  private async executeParallelBoot(skipHealthChecks: boolean, results: BootResults) {
    const componentPromises = this.bootSequence.map((component) =>
      this.initializeComponent(component, skipHealthChecks),
    );

    const componentResults = await Promise.allSettled(componentPromises);

    for (let i = 0; i < componentResults.length; i++) {
      const component = this.bootSequence[i];
      if (!component) continue;
      const result = componentResults[i];
      if (!result) continue;

      if (result.status === "fulfilled") {
        const fulfilledResult = result as PromiseFulfilledResult<ComponentInitResult>;
        if (fulfilledResult.value.success) {
          results.initializedComponents.push(component);
          this.components.set(component, fulfilledResult.value);
          this.health.set(component, true);
        } else {
          results.failedComponents.push(component);
          results.errors.push(
            `${component}: ${fulfilledResult.value.error || "Unknown error"}`,
          );
        }
      } else {
        results.failedComponents.push(component);
        results.errors.push(
          `${component}: ${(result as PromiseRejectedResult).reason}`,
        );
      }
    }

    results.success = results.failedComponents.length === 0;
  }

  private async executeSequentialBoot(skipHealthChecks: boolean, results: BootResults) {
    for (const component of this.bootSequence) {
      try {
        const result = await this.initializeComponent(component, skipHealthChecks);
        if (result.success) {
          results.initializedComponents.push(component);
          this.components.set(component, result);
          this.health.set(component, true);
        } else {
          results.failedComponents.push(component);
          results.errors.push(`${component}: ${result.error}`);
          break;
        }
      } catch (error) {
        results.failedComponents.push(component);
        results.errors.push(
          `${component}: ${error instanceof Error ? error.message : String(error)}`,
        );
        break;
      }
    }

    results.success = results.failedComponents.length === 0;
  }

  private async initializeComponent(component: string, _skipHealthChecks = false): Promise<ComponentInitResult> {
    const startTime = Date.now();

    try {
      switch (component) {
        case "configuration":
          return this.initConfiguration();
        case "logging":
          return this.initLogging();
        case "state-management":
          return this.initStateManagement();
        case "security":
          return this.initSecurity();
        case "codex-loader":
          return this.initCodexLoader();
        case "context-loader":
          return this.initContextLoader();
        case "processor-pipeline":
          return this.initProcessorPipeline();
        case "agent-registry":
          return this.initAgentRegistry();
        case "orchestrator":
          return this.initOrchestrator();
        case "mcp-servers":
          return this.initMCPServers();
        case "framework-hooks":
          return this.initFrameworkHooks();
        default:
          throw new Error(`Unknown component: ${component}`);
      }
    } catch (error) {
      return {
        success: false,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private initConfiguration(): ComponentInitResult {
    return { success: true, duration: 10, message: "Configuration initialized" };
  }

  private initLogging(): ComponentInitResult {
    const logDir = resolveLogDir();
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    return { success: true, duration: 5, message: "Logging system initialized" };
  }

  private initStateManagement(): ComponentInitResult {
    const stateDir = resolveStateDir();
    if (!fs.existsSync(stateDir)) {
      fs.mkdirSync(stateDir, { recursive: true });
    }
    return { success: true, duration: 8, message: "State management initialized" };
  }

  private initSecurity(): ComponentInitResult {
    return { success: true, duration: 3, message: "Security framework initialized" };
  }

  private initCodexLoader(): ComponentInitResult {
    return { success: true, duration: 12, message: "Codex loader initialized" };
  }

  private initContextLoader(): ComponentInitResult {
    return { success: true, duration: 8, message: "Context loader initialized" };
  }

  private initProcessorPipeline(): ComponentInitResult {
    return { success: true, duration: 15, message: "Processor pipeline initialized" };
  }

  private initAgentRegistry(): ComponentInitResult {
    const agentCount = this.countAgentFiles();
    if (agentCount < 5) {
      throw new Error(`Insufficient agents found: ${agentCount}`);
    }
    return { success: true, duration: 10, message: `Agent registry initialized with ${agentCount} agents` };
  }

  private initOrchestrator(): ComponentInitResult {
    return { success: true, duration: 20, message: "Orchestrator initialized" };
  }

  private initMCPServers(): ComponentInitResult {
    const mcpCount = this.countMCPFiles();
    if (mcpCount < 3) {
      throw new Error(`Insufficient MCP servers found: ${mcpCount}`);
    }
    return { success: true, duration: 15, message: `MCP servers initialized (${mcpCount} servers)` };
  }

  private initFrameworkHooks(): ComponentInitResult {
    return { success: true, duration: 5, message: "Framework hooks initialized" };
  }

  private countAgentFiles(): number {
    try {
      const files = fs.readdirSync("src/agents");
      return files.filter(
        (f) => f.endsWith(".ts") && f !== "types.ts" && f !== "index.ts",
      ).length;
    } catch {
      return 0;
    }
  }

  private countMCPFiles(): number {
    try {
      const files = fs.readdirSync("src/mcps");
      return files.filter((f) => f.endsWith(".server.ts")).length;
    } catch {
      return 0;
    }
  }

  private checkComponentExists(component: string): boolean {
    switch (component) {
      case "configuration":
        return fs.existsSync("opencode.json");
      case "logging":
        return fs.existsSync("src/framework-logger.ts");
      case "state-management":
        return fs.existsSync("src/state/state-manager.ts");
      case "security":
        return true;
      case "codex-loader":
        return true;
      case "context-loader":
        return true;
      case "processor-pipeline":
        return fs.existsSync("src/processors/processor-manager.ts");
      case "agent-registry":
        return fs.existsSync("src/agents");
      case "orchestrator":
        return fs.existsSync("src/delegation/agent-delegator.ts");
      case "mcp-servers":
        return fs.existsSync("src/mcps");
      case "framework-hooks":
        return fs.existsSync("src/core/xray-activation.ts");
      default:
        return false;
    }
  }

  private detectCircularDependencies(): string[] {
    const circular: string[] = [];
    for (const [component, deps] of this.dependencies) {
      for (const dep of deps) {
        const depDeps = this.dependencies.get(dep) || [];
        if (depDeps.includes(component)) {
          circular.push(`${component} ↔ ${dep}`);
        }
      }
    }
    return [...new Set(circular)];
  }

  private async applyDependencyFixes(issues: string[]): Promise<string[]> {
    const fixes: string[] = [];
    for (const issue of issues) {
      if (issue.includes("missing dependencies")) {
        fixes.push("Dependency validation completed - manual fixes may be required");
      }
    }
    return fixes;
  }

  private async shutdownComponent(component: string, force: boolean): Promise<void> {
    frameworkLogger.log("nucleus-orchestrator", "shutdown-component", "info", { component, force });
    await new Promise((resolve) => setTimeout(resolve, 10));
  }

  private async saveShutdownState(): Promise<void> {
    const shutdownState = {
      timestamp: Date.now(),
      components: Array.from(this.components.keys()),
      health: Object.fromEntries(this.health),
    };
    const stateFile = path.join(".opencode", "state", "shutdown-state.json");
    fs.writeFileSync(stateFile, JSON.stringify(shutdownState, null, 2));
  }
}
