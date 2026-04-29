import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import { mcpClientManager } from "../mcp-client.js";
import { frameworkLogger } from "../../core/framework-logger.js";

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

class SkillInvocationServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: "strray/skill-invocation", version: "1.22.37",
      },
      {
        capabilities: {
          tools: {},
        },
      },
    );

    this.setupToolHandlers();
  }

  private setupToolHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: "list-skills",
            description: "List all available skills with descriptions",
            inputSchema: {
              type: "object",
              properties: {
                category: {
                  type: "string",
                  enum: ["all", "core", "registry", "knowledge"],
                  description: "Filter by category",
                },
              },
            },
          },
          {
            name: "invoke-skill",
            description:
              "Generic skill invocation tool for calling any MCP skill server",
            inputSchema: {
              type: "object",
              properties: {
                skillName: {
                  type: "string",
                  description: "Name of the skill to invoke (use list-skills to see available)",
                },
                toolName: {
                  type: "string",
                  description: "Name of the tool within the skill to execute",
                },
                args: {
                  type: "object",
                  description: "Arguments to pass to the skill tool",
                },
              },
              required: ["skillName", "toolName"],
            },
          },
          {
            name: "skill-code-review",
            description:
              "Invoke code review skill for comprehensive code analysis",
            inputSchema: {
              type: "object",
              properties: {
                code: { type: "string", description: "Code to analyze" },
                language: {
                  type: "string",
                  description: "Programming language",
                },
                context: { type: "object", description: "Additional context" },
              },
              required: ["code"],
            },
          },
          {
            name: "skill-security-audit",
            description:
              "Invoke security audit skill for vulnerability scanning",
            inputSchema: {
              type: "object",
              properties: {
                files: {
                  type: "array",
                  items: { type: "string" },
                  description: "Files to audit",
                },
                severity: {
                  type: "string",
                  enum: ["low", "medium", "high", "critical"],
                  description: "Minimum severity level",
                },
              },
              required: ["files"],
            },
          },
          {
            name: "skill-performance-optimization",
            description:
              "Invoke performance optimization skill for bottleneck analysis",
            inputSchema: {
              type: "object",
              properties: {
                code: { type: "string", description: "Code to analyze" },
                language: {
                  type: "string",
                  description: "Programming language",
                },
                metrics: {
                  type: "array",
                  items: { type: "string" },
                  description: "Performance metrics to analyze",
                },
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
                code: {
                  type: "string",
                  description: "Code to analyze for testing",
                },
                existingTests: {
                  type: "array",
                  items: { type: "string" },
                  description: "Existing test files",
                },
                requirements: {
                  type: "object",
                  description: "Testing requirements and constraints",
                },
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
                scope: {
                  type: "string",
                  enum: ["full", "directory", "file"],
                  description: "Analysis scope",
                },
                analysis: {
                  type: "array",
                  items: { type: "string" },
                  description: "Types of analysis to perform",
                },
              },
            },
          },
          {
            name: "skill-database-design",
            description:
              "Invoke database design skill for schema design and query optimization",
            inputSchema: {
              type: "object",
              properties: {
                schema: {
                  type: "string",
                  description: "Database schema or entities",
                },
                databaseType: {
                  type: "string",
                  enum: ["postgresql", "mysql", "mongodb", "dynamodb"],
                  description: "Target database type",
                },
              },
              required: ["schema"],
            },
          },
          {
            name: "skill-devops-deployment",
            description:
              "Invoke DevOps deployment skill for CI/CD and infrastructure",
            inputSchema: {
              type: "object",
              properties: {
                projectType: { type: "string", description: "Type of project" },
                cloudProvider: {
                  type: "string",
                  enum: ["aws", "gcp", "azure"],
                  description: "Target cloud provider",
                },
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
                resources: {
                  type: "array",
                  items: { type: "string" },
                  description: "API resources",
                },
                style: {
                  type: "string",
                  enum: ["rest", "graphql"],
                  description: "API style",
                },
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
                component: {
                  type: "string",
                  description: "Component to design",
                },
                framework: {
                  type: "string",
                  enum: ["react", "vue", "angular", "svelte"],
                  description: "Target framework",
                },
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
                type: {
                  type: "string",
                  enum: ["api", "readme", "guide"],
                  description: "Documentation type",
                },
                code: { type: "string", description: "Code to document" },
              },
              required: ["type"],
            },
          },
          {
            name: "skill-storyteller",
            description:
              "Invoke storyteller skill for writing reflections, sagas, and journeys",
            inputSchema: {
              type: "object",
              properties: {
                storyType: {
                  type: "string",
                  enum: ["reflection", "saga", "journey", "narrative"],
                  description: "Type of story to write",
                },
                title: { type: "string", description: "Title for the story" },
                context: {
                  type: "object",
                  description: "Context including commits, changes, metadata",
                },
                framework: {
                  type: "string",
                  enum: ["three_act_structure", "hero_journey", "spiral"],
                  description: "Storytelling framework to use",
                },
              },
              required: ["storyType"],
            },
          },
        ],
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case "list-skills":
            return await this.handleListSkills(args as unknown as ListSkillsArgs);
          case "invoke-skill":
            return await this.handleInvokeSkill(args as unknown as InvokeSkillArgs);
          case "skill-code-review":
            return await this.handleSkillCodeReview(args as unknown as CodeReviewArgs);
          case "skill-security-audit":
            return await this.handleSkillSecurityAudit(args as unknown as SecurityAuditArgs);
          case "skill-performance-optimization":
            return await this.handleSkillPerformanceOptimization(args as unknown as PerformanceOptimizationArgs);
          case "skill-testing-strategy":
            return await this.handleSkillTestingStrategy(args as unknown as TestingStrategyArgs);
          case "skill-project-analysis":
            return await this.handleSkillProjectAnalysis(args as unknown as ProjectAnalysisArgs);
          case "skill-database-design":
            return await this.handleSkillDatabaseDesign(args as unknown as DatabaseDesignArgs);
          case "skill-devops-deployment":
            return await this.handleSkillDevopsDeployment(args as unknown as DevopsDeploymentArgs);
          case "skill-api-design":
            return await this.handleSkillApiDesign(args as unknown as ApiDesignArgs);
          case "skill-ui-ux-design":
            return await this.handleSkillUiUxDesign(args as unknown as UiUxDesignArgs);
          case "skill-documentation-generation":
            return await this.handleSkillDocumentationGeneration(args as unknown as DocumentationGenerationArgs);
          case "skill-storyteller":
            return await this.handleSkillStoryteller(args as unknown as StorytellerArgs);
          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `Unknown tool: ${name}`,
            );
        }
      } catch (error) {
        throw new McpError(
          ErrorCode.InternalError,
          `Tool execution failed: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
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
      "enforcer", "orchestrator", "architect", "refactorer",
      "security-auditor", "code-reviewer", "testing-lead",
      "estimation-validator", "skill-invocation",
    ];
    const knowledgeSkills = [
      "architecture-patterns", "strategist", "tech-writer",
      "seo-consultant", "content-creator", "growth-strategist",
      "bug-triage-specialist", "log-monitor",
      "mobile-development", "git-workflow", "session-management",
      "code-analyzer", "refactoring-strategies", "project-analysis",
      "testing-best-practices", "database-design", "devops-deployment",
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
      "enforcer", "orchestrator", "estimation-validator",
      "architect", "bug-triage-specialist", "log-monitor",
      "code-reviewer", "security-auditor", "refactorer",
      "growth-strategist", "strategist", "devops-deployment",
      "database-design", "tech-writer", "documentation-generation",
      "mobile-development", "seo-consultant",
      "git-workflow", "content-creator", "ui-ux-design",
      "multimodal-looker", "refactoring-strategies",
      "project-analysis", "testing-best-practices",
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

      const result = await mcpClientManager.callServerTool(
        resolvedSkill,
        toolName,
        toolArgs,
      );

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
    const result = await mcpClientManager.callServerTool(
      "code-review",
      "analyze_code_quality",
      args,
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
    const result = await mcpClientManager.callServerTool(
      "security-audit",
      "scan_vulnerabilities",
      args,
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
    const result = await mcpClientManager.callServerTool(
      "performance-optimization",
      "analyze_performance",
      args,
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
    const result = await mcpClientManager.callServerTool(
      "testing-strategy",
      "analyze_test_coverage",
      args,
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
    const result = await mcpClientManager.callServerTool(
      "researcher",
      "analyze-project-health",
      args,
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
    const result = await mcpClientManager.callServerTool(
      "database-design",
      "schema_analysis",
      args,
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
    const result = await mcpClientManager.callServerTool(
      "devops-deployment",
      "pipeline_generation",
      args,
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
    const result = await mcpClientManager.callServerTool(
      "api-design",
      "endpoint_design",
      args,
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
    const result = await mcpClientManager.callServerTool(
      "ui-ux-design",
      "design_component",
      args,
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
    const result = await mcpClientManager.callServerTool(
      "documentation-generation",
      "generate_documentation",
      args,
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
    const result = await mcpClientManager.callServerTool(
      "storyteller",
      `write_${storyType}`,
      { title, context, framework },
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

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
  }
}

// Start the server if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const server = new SkillInvocationServer();
  server.run().catch(() => {});
}

export { SkillInvocationServer };
