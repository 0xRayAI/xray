import { XrayKnowledgeSkillBase } from "../shared/knowledge-skill-base.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createMcpExpressApp } from "@modelcontextprotocol/sdk/server/express.js";
import {
  ErrorCode,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import * as path from "path";
import { fileURLToPath } from "url";
import { randomUUID } from "crypto";
import { mcpClientManager } from "../mcp-client.js";
import { frameworkLogger } from "../../core/framework-logger.js";
import { pluginRegistry } from "../../nucleus/plugin-registry.js";

interface ListSkillsArgs {
  category?: "all" | "core" | "registry" | "knowledge";
}

interface InvokeSkillArgs {
  skillName: string;
  toolName: string;
  args?: Record<string, unknown>;
}

interface CodeReviewArgs {
  code: string;
  language?: string;
  context?: Record<string, unknown>;
}

interface SecurityAuditArgs {
  files: string[];
  severity?: "low" | "medium" | "high" | "critical";
}

interface PerformanceOptimizationArgs {
  code: string;
  language?: string;
  metrics?: string[];
}

interface TestingStrategyArgs {
  code: string;
  existingTests?: string[];
  requirements?: Record<string, unknown>;
}

interface ProjectAnalysisArgs {
  scope?: "full" | "directory" | "file";
  analysis?: string[];
}

interface DatabaseDesignArgs {
  schema: string;
  databaseType?: "postgresql" | "mysql" | "mongodb" | "dynamodb";
}

interface DevopsDeploymentArgs {
  projectType: string;
  cloudProvider?: "aws" | "gcp" | "azure";
}

interface ApiDesignArgs {
  resources: string[];
  style?: "rest" | "graphql";
}

interface UiUxDesignArgs {
  component: string;
  framework?: "react" | "vue" | "angular" | "svelte";
}

interface DocumentationGenerationArgs {
  type: "api" | "readme" | "guide";
  code?: string;
}

interface StorytellerArgs {
  storyType: "reflection" | "saga" | "journey" | "narrative";
  title?: string;
  context?: Record<string, unknown>;
  framework?: "three_act_structure" | "hero_journey" | "spiral";
}

class SkillInvocationServer extends XrayKnowledgeSkillBase {

  constructor() {
    super("xray/skill-invocation", "2.0.1");
    this.tools = [
      {
        name: "list-skills",
        description: "List all available skills with descriptions",
        inputSchema: {
          type: "object",
          properties: {
            category: { type: "string", enum: ["all", "core", "registry", "knowledge"], description: "Filter by category" },
          },
        },
      },
      {
        name: "invoke-skill",
        description: "Generic skill invocation tool for calling any MCP skill server",
        inputSchema: {
          type: "object",
          properties: {
            skillName: { type: "string", description: "Name of the skill to invoke (use list-skills to see available)" },
            toolName: { type: "string", description: "Name of the tool within the skill to execute" },
            args: { type: "object", description: "Arguments to pass to the skill tool" },
          },
          required: ["skillName", "toolName"],
        },
      },
      {
        name: "skill-code-review",
        description: "Invoke code review skill for comprehensive code analysis",
        inputSchema: {
          type: "object",
          properties: {
            code: { type: "string", description: "Code to analyze" },
            language: { type: "string", description: "Programming language" },
            context: { type: "object", description: "Additional context" },
          },
          required: ["code"],
        },
      },
      {
        name: "skill-security-audit",
        description: "Invoke security audit skill for vulnerability scanning",
        inputSchema: {
          type: "object",
          properties: {
            files: { type: "array", items: { type: "string" }, description: "Files to audit" },
            severity: { type: "string", enum: ["low", "medium", "high", "critical"], description: "Minimum severity level" },
          },
          required: ["files"],
        },
      },
      {
        name: "skill-performance-optimization",
        description: "Invoke performance optimization skill for bottleneck analysis",
        inputSchema: {
          type: "object",
          properties: {
            code: { type: "string", description: "Code to analyze" },
            language: { type: "string", description: "Programming language" },
            metrics: { type: "array", items: { type: "string" }, description: "Performance metrics to analyze" },
          },
          required: ["code"],
        },
      },
      {
        name: "skill-testing-strategy",
        description: "Invoke testing strategy skill for test planning",
        inputSchema: {
          type: "object",
          properties: {
            code: { type: "string", description: "Code to analyze for testing" },
            existingTests: { type: "array", items: { type: "string" }, description: "Existing test files" },
            requirements: { type: "object", description: "Testing requirements and constraints" },
          },
          required: ["code"],
        },
      },
      {
        name: "skill-project-analysis",
        description: "Invoke project analysis skill for codebase insights",
        inputSchema: {
          type: "object",
          properties: {
            scope: { type: "string", enum: ["full", "directory", "file"], description: "Analysis scope" },
            analysis: { type: "array", items: { type: "string" }, description: "Types of analysis to perform" },
          },
        },
      },
      {
        name: "skill-database-design",
        description: "Invoke database design skill for schema design and query optimization",
        inputSchema: {
          type: "object",
          properties: {
            schema: { type: "string", description: "Database schema or entities" },
            databaseType: { type: "string", enum: ["postgresql", "mysql", "mongodb", "dynamodb"], description: "Target database type" },
          },
          required: ["schema"],
        },
      },
      {
        name: "skill-devops-deployment",
        description: "Invoke DevOps deployment skill for CI/CD and infrastructure",
        inputSchema: {
          type: "object",
          properties: {
            projectType: { type: "string", description: "Type of project" },
            cloudProvider: { type: "string", enum: ["aws", "gcp", "azure"], description: "Target cloud provider" },
          },
          required: ["projectType"],
        },
      },
      {
        name: "skill-api-design",
        description: "Invoke API design skill for REST/GraphQL endpoints",
        inputSchema: {
          type: "object",
          properties: {
            resources: { type: "array", items: { type: "string" }, description: "API resources" },
            style: { type: "string", enum: ["rest", "graphql"], description: "API style" },
          },
          required: ["resources"],
        },
      },
      {
        name: "skill-ui-ux-design",
        description: "Invoke UI/UX design skill for component design",
        inputSchema: {
          type: "object",
          properties: {
            component: { type: "string", description: "Component to design" },
            framework: { type: "string", enum: ["react", "vue", "angular", "svelte"], description: "Target framework" },
          },
          required: ["component"],
        },
      },
      {
        name: "skill-documentation-generation",
        description: "Invoke documentation skill for API docs and README",
        inputSchema: {
          type: "object",
          properties: {
            type: { type: "string", enum: ["api", "readme", "guide"], description: "Documentation type" },
            code: { type: "string", description: "Code to document" },
          },
          required: ["type"],
        },
      },
      {
        name: "skill-storyteller",
        description: "Invoke storyteller skill for writing reflections, sagas, and journeys",
        inputSchema: {
          type: "object",
          properties: {
            storyType: { type: "string", enum: ["reflection", "saga", "journey", "narrative"], description: "Type of story to write" },
            title: { type: "string", description: "Title for the story" },
            context: { type: "object", description: "Context including commits, changes, metadata" },
            framework: { type: "string", enum: ["three_act_structure", "hero_journey", "spiral"], description: "Storytelling framework to use" },
          },
          required: ["storyType"],
        },
      },
    ];
    this.handlers = {
      "list-skills": async (args) => this.handleListSkills(args as unknown as ListSkillsArgs),
      "invoke-skill": async (args) => this.handleInvokeSkill(args as unknown as InvokeSkillArgs),
      "skill-code-review": async (args) => this.handleSkillCodeReview(args as unknown as CodeReviewArgs),
      "skill-security-audit": async (args) => this.handleSkillSecurityAudit(args as unknown as SecurityAuditArgs),
      "skill-performance-optimization": async (args) => this.handleSkillPerformanceOptimization(args as unknown as PerformanceOptimizationArgs),
      "skill-testing-strategy": async (args) => this.handleSkillTestingStrategy(args as unknown as TestingStrategyArgs),
      "skill-project-analysis": async (args) => this.handleSkillProjectAnalysis(args as unknown as ProjectAnalysisArgs),
      "skill-database-design": async (args) => this.handleSkillDatabaseDesign(args as unknown as DatabaseDesignArgs),
      "skill-devops-deployment": async (args) => this.handleSkillDevopsDeployment(args as unknown as DevopsDeploymentArgs),
      "skill-api-design": async (args) => this.handleSkillApiDesign(args as unknown as ApiDesignArgs),
      "skill-ui-ux-design": async (args) => this.handleSkillUiUxDesign(args as unknown as UiUxDesignArgs),
      "skill-documentation-generation": async (args) => this.handleSkillDocumentationGeneration(args as unknown as DocumentationGenerationArgs),
      "skill-storyteller": async (args) => this.handleSkillStoryteller(args as unknown as StorytellerArgs),
    };
    this.setupToolHandlers();
    pluginRegistry.registerToolPlugin({
      name: "xray/skill-invocation",
      callTool: async (toolName, args) => {
        const handler = this.handlers[toolName];
        if (!handler) throw new Error(`Unknown tool: ${toolName}`);
        return handler(args);
      },
    });
  }

  private skillMetrics: Map<string, { success: number; failure: number; avgDuration: number }> = new Map();

  /**
   * Record skill invocation outcome for adaptive learning
   */
  private recordSkillOutcome(
    originalSkill: string,
    resolvedSkill: string,
    toolName: string,
    duration: number,
    result?: unknown,
    error?: string,
  ): void {
    const key = `${resolvedSkill}:${toolName}`;
    const existing = this.skillMetrics.get(key) || { success: 0, failure: 0, avgDuration: 0 };

    const totalInvocations = existing.success + existing.failure;
    const newAvgDuration = totalInvocations > 0
      ? (existing.avgDuration * totalInvocations + duration) / (totalInvocations + 1)
      : duration;

    if (error) {
      existing.failure++;
    } else {
      existing.success++;
      existing.avgDuration = newAvgDuration;
    }

    this.skillMetrics.set(key, existing);

    // Log for persistence (simplified - in production would write to analytics)
    if (existing.failure > 3 && (existing.failure / (existing.success + existing.failure)) > 0.5) {
      frameworkLogger.log(
        "skill-invocation",
        "low-performing-skill",
        "warning",
        { skill: resolvedSkill, tool: toolName, failureRate: (existing.failure / (existing.success + existing.failure)).toFixed(2) }
      );
    }
  }

  private async handleListSkills(args: ListSkillsArgs) {
    const { category = "all" } = args;

    const coreSkills = [
      "code-review", "security-audit", "performance-optimization",
      "testing-strategy", "researcher", "framework-help",
    ];
    const registrySkills = [
      "code-reviewer", "architect", "refactorer",
      "security-auditor", "code-reviewer", "testing-lead",
      "strategist", "skill-invocation",
    ];
    const knowledgeSkills = [
      "architecture-patterns", "strategist", "tech-writer",
      "seo-consultant", "content-creator", "growth-strategist",
      "bug-triage-specialist", "log-monitor",
      "mobile-development", "git-workflow", "session-management",
      "code-analyzer", "refactoring-strategies", "project-analysis",
      "database-design", "devops-deployment",
      "api-design", "ui-ux-design", "database-engineer",
    ];

    let skills: string[];
    switch (category) {
      case "core":
        skills = coreSkills;
        break;
      case "registry":
        skills = registrySkills;
        break;
      case "knowledge":
        skills = knowledgeSkills;
        break;
      default:
        skills = [...coreSkills, ...registrySkills, ...knowledgeSkills];
    }

    const lines = [
      `Available Skills (${skills.length}):`,
      "",
      ...skills.sort().map(s => `  - ${s}`),
    ];

    return { content: [{ type: "text", text: lines.join("\n") }] };
  }

  /**
   * Dispatch a skill tool call: prefer in-process pluginRegistry, fall back to external MCP process.
   */
  private async callSkillTool(skillName: string, toolName: string, args: Record<string, unknown>): Promise<unknown> {
    if (pluginRegistry.hasToolPlugin(skillName)) {
      return pluginRegistry.callSkillTool(skillName, toolName, args);
    }
    return mcpClientManager.callServerTool(skillName, toolName, args);
  }

  private async handleInvokeSkill(args: InvokeSkillArgs) {
    const { skillName, toolName, args: toolArgs = {} } = args;

    const skillAliases: Record<string, string> = {
      "architect": "architecture-patterns",
      "architect-tools": "architect",
      "backend-engineer": "api-design",
      "code-reviewer": "code-review",
      "database-engineer": "database-design",
      "devops-engineer": "devops-deployment",
      "mobile-developer": "mobile-development",
      "performance-engineer": "performance-optimization",
      "security-auditor": "security-audit",
      "testing-lead": "testing-strategy",
      "tech-writer": "documentation-generation",
      "frontend-ui-ux-engineer": "ui-ux-design",
      "frontend-engineer": "project-analysis",
    };

    const resolvedSkill = skillAliases[skillName] || skillName;

    const availableServers = [
      "code-review", "security-audit", "performance-optimization",
      "testing-strategy", "researcher", "skill-invocation",
      "framework-help", "session-management", "code-analyzer",
      "code-reviewer", "architect", "bug-triage-specialist", "log-monitor",
      "security-auditor", "refactorer",
      "growth-strategist", "strategist", "devops-deployment",
      "database-design", "tech-writer", "documentation-generation",
      "mobile-development", "seo-consultant",
      "git-workflow", "content-creator", "ui-ux-design",
      "multimodal-looker", "refactoring-strategies",
      "project-analysis",
      "architecture-patterns",
    ];

    if (!availableServers.includes(resolvedSkill)) {
      return {
        content: [
          {
            type: "text",
            text: `Skill "${skillName}" not found. Available skills: ${availableServers.join(", ")}`,
          },
        ],
        isError: true,
      };
    }

    try {
      // Track skill usage for adaptive learning
      const skillStartTime = Date.now();

      const result = await this.callSkillTool(resolvedSkill, toolName, toolArgs);

      // Record outcome for adaptive learning (success = no error)
      const duration = Date.now() - skillStartTime;
      this.recordSkillOutcome(skillName, resolvedSkill, toolName, duration, result);

      return {
        content: [
          {
            type: "text",
            text: `Skill ${skillName} invoked successfully with tool ${toolName}`,
          },
          {
            type: "text",
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      // Record failure for adaptive learning
      this.recordSkillOutcome(skillName, resolvedSkill, toolName, 0, null, error instanceof Error ? error.message : String(error));

      return {
        content: [
          {
            type: "text",
            text: `Error invoking skill "${skillName}": ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  }

  private async handleSkillCodeReview(args: CodeReviewArgs) {
    const result = await this.callSkillTool(
      "code-review",
      "analyze_code_quality",
      args as unknown as Record<string, unknown>,
    );

    return {
      content: [
        {
          type: "text",
          text: "Code review analysis completed:",
        },
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }

  private async handleSkillSecurityAudit(args: SecurityAuditArgs) {
    const result = await this.callSkillTool(
      "security-audit",
      "scan_vulnerabilities",
      args as unknown as Record<string, unknown>,
    );

    return {
      content: [
        {
          type: "text",
          text: "Security audit completed:",
        },
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }

  private async handleSkillPerformanceOptimization(args: PerformanceOptimizationArgs) {
    const result = await this.callSkillTool(
      "performance-optimization",
      "analyze_performance",
      args as unknown as Record<string, unknown>,
    );

    return {
      content: [
        {
          type: "text",
          text: "Performance analysis completed:",
        },
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }

  private async handleSkillTestingStrategy(args: TestingStrategyArgs) {
    const result = await this.callSkillTool(
      "testing-strategy",
      "analyze_test_coverage",
      args as unknown as Record<string, unknown>,
    );

    return {
      content: [
        {
          type: "text",
          text: "Testing strategy analysis completed:",
        },
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }

  private async handleSkillProjectAnalysis(args: ProjectAnalysisArgs) {
    const result = await this.callSkillTool(
      "researcher",
      "analyze-project-health",
      args as unknown as Record<string, unknown>,
    );

    return {
      content: [
        {
          type: "text",
          text: "Project analysis completed:",
        },
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }

  private async handleSkillDatabaseDesign(args: DatabaseDesignArgs) {
    const result = await this.callSkillTool(
      "database-design",
      "schema_analysis",
      args as unknown as Record<string, unknown>,
    );

    return {
      content: [
        {
          type: "text",
          text: "Database design analysis completed:",
        },
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }

  private async handleSkillDevopsDeployment(args: DevopsDeploymentArgs) {
    const result = await this.callSkillTool(
      "devops-deployment",
      "pipeline_generation",
      args as unknown as Record<string, unknown>,
    );

    return {
      content: [
        {
          type: "text",
          text: "DevOps deployment configuration completed:",
        },
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }

  private async handleSkillApiDesign(args: ApiDesignArgs) {
    const result = await this.callSkillTool(
      "api-design",
      "endpoint_design",
      args as unknown as Record<string, unknown>,
    );

    return {
      content: [
        {
          type: "text",
          text: "API design completed:",
        },
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }

  private async handleSkillUiUxDesign(args: UiUxDesignArgs) {
    const result = await this.callSkillTool(
      "ui-ux-design",
      "design_component",
      args as unknown as Record<string, unknown>,
    );

    return {
      content: [
        {
          type: "text",
          text: "UI/UX design completed:",
        },
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }

  private async handleSkillDocumentationGeneration(args: DocumentationGenerationArgs) {
    const result = await this.callSkillTool(
      "documentation-generation",
      "generate_documentation",
      args as unknown as Record<string, unknown>,
    );

    return {
      content: [
        {
          type: "text",
          text: "Documentation generation completed:",
        },
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }

  private async handleSkillStoryteller(args: StorytellerArgs) {
    const { storyType, title, context, framework } = args;
    const result = await this.callSkillTool(
      "storyteller",
      `write_${storyType}`,
      { title, context, framework } as Record<string, unknown>,
    );

    return {
      content: [
        {
          type: "text",
          text: `Storyteller ${storyType} completed:`,
        },
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }

  /**
   * Run as HTTP server using Streamable HTTP transport (for Grok CLI compatibility).
   */
  async runHttp(port: number = parseInt(process.env.MCP_PORT ?? "3200", 10)): Promise<void> {
    const app = createMcpExpressApp();
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
    });

    await this.server.connect(transport as any);

    app.post("/mcp", async (req: any, res: any) => {
      try {
        await transport.handleRequest(req, res, req.body);
      } catch (error) {
        frameworkLogger.log("skill-invocation", "http-handler-error", "error", { error: String(error) });
        if (!res.headersSent) {
          res.status(500).json({ jsonrpc: "2.0", error: { code: -32603, message: "Internal error" }, id: null });
        }
      }
    });

    app.get("/health", (_req: any, res: any) => {
      res.json({ status: "ok", server: "skill-invocation" });
    });

    app.listen(port, () => {
      frameworkLogger.log("skill-invocation", "http-listening", "info", { port });
    });

    process.on("SIGINT", () => { transport.close(); process.exit(0); });
    process.on("SIGTERM", () => { transport.close(); process.exit(0); });
  }
}

// Start the server if this file is run directly
const entryPoint = path.resolve(process.argv[1] ?? "");
if (entryPoint && fileURLToPath(import.meta.url) === entryPoint) {
  // If --port or MCP_PORT is set, use HTTP transport (for Grok CLI compatibility)
  const cliPort = process.argv.find((a) => a.startsWith("--port="))?.split("=")[1];
  const port = parseInt(cliPort ?? process.env.MCP_PORT ?? "", 10);

  if (!isNaN(port)) {
    const server = new SkillInvocationServer();
    server.runHttp(port).catch((error) => {
      frameworkLogger.log("skill-invocation", "http-startup-error", "error", { error: String(error) });
      process.exit(1);
    });
  } else {
    const server = new SkillInvocationServer();
    server.run("skill-invocation").catch((error) => {
      frameworkLogger.log("skill-invocation", "fatal-startup-error", "error", { error: String(error) });
      process.exit(1);
    });
  }
}

export { SkillInvocationServer };
