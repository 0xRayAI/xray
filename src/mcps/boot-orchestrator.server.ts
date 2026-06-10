/**
 * 0xRay Boot Orchestrator MCP Server
 *
 * Thin MCP surface over NucleusOrchestrator.
 * All orchestration logic lives in src/nucleus/orchestrator.ts.
 */

import { frameworkLogger } from "../core/framework-logger.js";
import { XrayKnowledgeSkillBase } from "./shared/knowledge-skill-base.js";
import {
  NucleusOrchestrator,
  type BootResults,
  type ComponentStatus,
  type OverallBootStatus,
} from "../nucleus/orchestrator.js";

interface ExecuteBootSequenceArgs {
  config?: Record<string, unknown>;
  skipHealthChecks?: boolean;
  parallelInit?: boolean;
}

interface GetBootStatusArgs {
  detailed?: boolean;
  component?: string;
}

interface InitializeComponentArgs {
  component: string;
  force?: boolean;
}

interface ValidateBootDependenciesArgs {
  fix?: boolean;
  verbose?: boolean;
}

interface ShutdownFrameworkArgs {
  force?: boolean;
  saveState?: boolean;
}

class XrayBootOrchestratorServer extends XrayKnowledgeSkillBase {
  private orchestrator: NucleusOrchestrator;

  constructor() {
    super("boot-orchestrator", "2.0.1");

    this.orchestrator = new NucleusOrchestrator();

    this.tools = [
      {
        name: "execute-boot-sequence",
        description:
          "Execute the complete 0xRay boot sequence with dependency resolution",
        inputSchema: {
          type: "object",
          properties: {
            config: { type: "object" },
            skipHealthChecks: { type: "boolean", default: false },
            parallelInit: { type: "boolean", default: true },
          },
        },
      },
      {
        name: "get-boot-status",
        description:
          "Get comprehensive boot orchestrator status and health",
        inputSchema: {
          type: "object",
          properties: {
            detailed: { type: "boolean", default: false },
            component: { type: "string" },
          },
        },
      },
      {
        name: "initialize-component",
        description: "Initialize a specific framework component",
        inputSchema: {
          type: "object",
          properties: {
            component: {
              type: "string",
              enum: this.orchestrator.bootSequence,
            },
            force: { type: "boolean", default: false },
          },
        },
      },
      {
        name: "validate-boot-dependencies",
        description: "Validate all boot dependencies and prerequisites",
        inputSchema: {
          type: "object",
          properties: {
            fix: { type: "boolean", default: false },
            verbose: { type: "boolean", default: false },
          },
        },
      },
      {
        name: "shutdown-framework",
        description: "Gracefully shutdown framework components",
        inputSchema: {
          type: "object",
          properties: {
            force: { type: "boolean", default: false },
            saveState: { type: "boolean", default: true },
          },
        },
      },
    ];

    this.handlers = {
      "execute-boot-sequence": async (args) => this.handleExecuteBootSequence(args as unknown as ExecuteBootSequenceArgs),
      "get-boot-status": async (args) => this.handleGetBootStatus(args as unknown as GetBootStatusArgs),
      "initialize-component": async (args) => this.handleInitializeComponent(args as unknown as InitializeComponentArgs),
      "validate-boot-dependencies": async (args) => this.handleValidateBootDependencies(args as unknown as ValidateBootDependenciesArgs),
      "shutdown-framework": async (args) => this.handleShutdownFramework(args as unknown as ShutdownFrameworkArgs),
    };

    this.setupToolHandlers();
    void frameworkLogger.log("mcps/boot-orchestrator", "initialize", "info");
  }

  private async handleExecuteBootSequence(args: ExecuteBootSequenceArgs) {
    const skipHealthChecks = args.skipHealthChecks || false;
    const parallelInit = args.parallelInit !== false;

    frameworkLogger.log("mcp-boot-orchestrator", "execute-boot-sequence", "info", {
      skipHealthChecks,
      parallelInit,
    });

    try {
      const results = await this.orchestrator.executeBootSequence({
        skipHealthChecks,
        parallelInit,
      });
      return this.formatBootResults(results);
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `❌ Boot sequence failed: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
      };
    }
  }

  private async handleGetBootStatus(args: GetBootStatusArgs) {
    const detailed = args.detailed || false;
    const component = args.component;

    frameworkLogger.log("mcp-boot-orchestrator", "get-boot-status", "info", { detailed, component });

    try {
      if (component) {
        const status = await this.orchestrator.getComponentStatus(component);
        return {
          content: [
            {
              type: "text",
              text: `📊 Component Status: ${component}\n${this.formatComponentStatus(component, status, detailed)}`,
            },
          ],
        };
      } else {
        const status = this.orchestrator.getOverallBootStatus();
        return {
          content: [
            {
              type: "text",
              text: `📊 Framework Boot Status\n${this.formatOverallStatus(status, detailed)}`,
            },
          ],
        };
      }
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `❌ Status check failed: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
      };
    }
  }

  private async handleInitializeComponent(args: InitializeComponentArgs) {
    const component = args.component;
    const force = args.force || false;

    frameworkLogger.log("mcp-boot-orchestrator", "initialize-component", "info", { component, force });

    try {
      if (!this.orchestrator.bootSequence.includes(component)) {
        return {
          content: [
            {
              type: "text",
              text: `❌ Unknown component: ${component}\nAvailable: ${this.orchestrator.bootSequence.join(", ")}`,
            },
          ],
        };
      }

      const existing = this.orchestrator.getComponentResult(component);
      if (existing && !force) {
        return {
          content: [
            {
              type: "text",
              text: `⚠️ Component already initialized: ${component}\nUse force=true to re-initialize`,
            },
          ],
        };
      }

      const result = await this.orchestrator.initializeSingleComponent(component, force);

      return {
        content: [
          {
            type: "text",
            text: `🔧 Component Initialized: ${component}\n**Status:** ${result.success ? "✅ SUCCESS" : "❌ FAILED"}\n**Duration:** ${result.duration}ms\n${result.message || ""}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `❌ Component initialization failed: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
      };
    }
  }

  private async handleValidateBootDependencies(args: ValidateBootDependenciesArgs) {
    const fix = args.fix || false;
    const verbose = args.verbose || false;

    frameworkLogger.log("mcp-boot-orchestrator", "validate-boot-dependencies", "info", { fix, verbose });

    try {
      const results = await this.orchestrator.validateAllDependencies(fix, verbose);

      const response = `🔍 Dependency Validation Results

**Total Components:** ${results.total}
**Valid Dependencies:** ${results.valid}
**Missing Dependencies:** ${results.missing}
**Circular Dependencies:** ${results.circular}

${results.issues.length > 0 ? `**Issues Found:**\n${results.issues.map((issue: string) => `• ${issue}`).join("\n")}\n` : ""}
${results.fixes.length > 0 ? `**Fixes Applied:**\n${results.fixes.map((fix: string) => `• ${fix}`).join("\n")}\n` : ""}

**Status:** ${results.valid === results.total ? "✅ ALL VALID" : "❌ ISSUES DETECTED"}`;

      return {
        content: [{ type: "text", text: response }],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `❌ Dependency validation failed: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
      };
    }
  }

  private async handleShutdownFramework(args: ShutdownFrameworkArgs) {
    const force = args.force || false;
    const saveState = args.saveState !== false;

    frameworkLogger.log("mcps/boot-orchestrator", "shutdown", "info", { force, saveState });

    try {
      const results = await this.orchestrator.shutdown(force, saveState);

      return {
        content: [
          {
            type: "text",
            text: `🛑 Framework Shutdown Complete

**Components Shut Down:** ${results.shutDown}
**State Saved:** ${results.stateSaved}
**Errors:** ${results.errors.length}
**Duration:** ${results.duration}ms

${results.errors.length > 0 ? `**Errors:**\n${results.errors.map((e: string) => `• ${e}`).join("\n")}` : ""}

**Status:** ${results.success ? "✅ SHUTDOWN COMPLETE" : "❌ SHUTDOWN ISSUES"}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `❌ Shutdown failed: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
      };
    }
  }

  private formatBootResults(results: BootResults) {
    const response = `🚀 Boot Sequence Results

**Success:** ${results.success ? "✅ COMPLETE" : "❌ FAILED"}
**Duration:** ${results.duration}ms
**Components Initialized:** ${results.initializedComponents.length}/${this.orchestrator.bootSequence.length}
**Components Failed:** ${results.failedComponents.length}

**Initialized Components:**
${results.initializedComponents.map((c: string) => `• ✅ ${c}`).join("\n")}

${results.failedComponents.length > 0 ? `**Failed Components:**\n${results.failedComponents.map((c: string) => `• ❌ ${c}`).join("\n")}\n` : ""}
${results.errors.length > 0 ? `**Errors:**\n${results.errors.map((e: string) => `• 💥 ${e}`).join("\n")}\n` : ""}
${results.warnings.length > 0 ? `**Warnings:**\n${results.warnings.map((w: string) => `• ⚠️ ${w}`).join("\n")}\n` : ""}

**Framework Status:** ${results.success ? "🟢 OPERATIONAL" : "🔴 INITIALIZATION FAILED"}`;

    return {
      content: [{ type: "text", text: response }],
    };
  }

  private formatComponentStatus(
    component: string,
    status: ComponentStatus,
    detailed: boolean,
  ): string {
    let response = `**Component:** ${component}
**Initialized:** ${status.initialized ? "✅ Yes" : "❌ No"}
**Healthy:** ${status.healthy ? "✅ Yes" : "❌ No"}
**Dependencies:** ${status.dependencies.join(", ") || "None"}`;

    if (detailed && status.info) {
      response += `\n**Info:** ${JSON.stringify(status.info, null, 2)}`;
    }

    return response;
  }

  private formatOverallStatus(status: OverallBootStatus, detailed: boolean): string {
    let response = `**Initialized:** ${status.initialized ? "✅ Yes" : "❌ No"}
**Uptime:** ${Math.round(status.uptime / 1000)}s
**Components:** ${status.initializedComponents}/${status.totalComponents} initialized
**Healthy:** ${status.healthyComponents}/${status.initializedComponents} healthy
**Failed:** ${status.failedComponents} failed`;

    if (detailed) {
      response += `\n\n**Component Details:**`;
      for (const component of this.orchestrator.bootSequence) {
        const compHealth = this.orchestrator.getComponentHealth(component);
        response += `\n• ${component}: ${compHealth ? "✅" : "❌"}`;
      }
    }

    return response;
  }
}

// Start the server if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const server = new XrayBootOrchestratorServer();
  server.run("boot-orchestrator").catch((error) => frameworkLogger.log("mcps/boot-orchestrator", "run", "error", { error: String(error) }));
}

export { XrayBootOrchestratorServer };
