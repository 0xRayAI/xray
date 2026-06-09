/**
 * 0xRay Architect Tools MCP Server
 *
 * Converts architect-tools.ts functions into MCP server tools
 * Provides contextual analysis capabilities via MCP protocol
 */

import * as fs from "fs";
import * as path from "path";
import { frameworkLogger } from "../core/framework-logger.js";
import {
  contextAnalysis as architectContextAnalysis,
  codebaseStructure as architectCodebaseStructure,
  dependencyAnalysis as architectDependencyAnalysis,
  architectureAssessment as architectArchitectureAssessment,
} from "../architect/architect-tools.js";
import { XrayKnowledgeSkillBase } from "./shared/knowledge-skill-base.js";

interface DirectoryNode {
  name: string;
  path: string;
  type: "directory";
  children: Array<DirectoryNode | FileNode | { truncated: boolean } | { error: string }>,
}

interface FileNode {
  name: string;
  type: "file";
  extension: string;
}

class XrayArchitectToolsServer extends XrayKnowledgeSkillBase {

  constructor() {
    super("architect-tools", "2.0.1");
    this.tools = [
      {
        name: "context-analysis",
        description:
          "Perform comprehensive codebase intelligence gathering including structure analysis, dependency mapping, and architectural pattern recognition",
        inputSchema: {
          type: "object",
          properties: {
            projectRoot: {
              type: "string",
              description: "Root directory of the project to analyze",
            },
            depth: {
              type: "string",
              enum: ["overview", "detailed", "comprehensive"],
              default: "detailed",
              description: "Analysis depth level",
            },
            includeFiles: {
              type: "array",
              items: { type: "string" },
              description: "Specific files to include in analysis",
            },
          },
          required: ["projectRoot"],
        },
      },
      {
        name: "codebase-structure",
        description:
          "Analyze file organization, module distribution, and directory hierarchy with optional metrics",
        inputSchema: {
          type: "object",
          properties: {
            projectRoot: {
              type: "string",
              description: "Root directory of the project",
            },
            includeMetrics: {
              type: "boolean",
              default: true,
              description: "Include detailed metrics",
            },
            maxDepth: {
              type: "number",
              default: 10,
              description: "Maximum directory depth to analyze",
            },
          },
          required: ["projectRoot"],
        },
      },
      {
        name: "dependency-analysis",
        description:
          "Map component dependencies, identify coupling patterns, and assess architectural relationships",
        inputSchema: {
          type: "object",
          properties: {
            projectRoot: {
              type: "string",
              description: "Root directory of the project",
            },
            focusAreas: {
              type: "array",
              items: { type: "string" },
              description: "Specific areas to focus dependency analysis on",
            },
            includeGraphs: {
              type: "boolean",
              default: true,
              description: "Include dependency graphs in output",
            },
          },
          required: ["projectRoot"],
        },
      },
      {
        name: "architecture-assessment",
        description:
          "Evaluate overall architectural health with scores, issues, and improvement recommendations",
        inputSchema: {
          type: "object",
          properties: {
            projectRoot: {
              type: "string",
              description: "Root directory of the project",
            },
            assessmentType: {
              type: "string",
              enum: ["quick", "comprehensive"],
              default: "comprehensive",
              description: "Type of assessment to perform",
            },
            focusMetrics: {
              type: "array",
              items: {
                type: "string",
                enum: [
                  "complexity",
                  "coupling",
                  "cohesion",
                  "testability",
                  "scalability",
                ],
              },
              description: "Specific metrics to focus assessment on",
            },
          },
          required: ["projectRoot"],
        },
      },
    ];
    this.handlers = {
      "context-analysis": async (args) => this.contextAnalysis(args as Record<string, unknown> | undefined),
      "codebase-structure": async (args) => this.codebaseStructure(args as Record<string, unknown> | undefined),
      "dependency-analysis": async (args) => this.dependencyAnalysis(args as Record<string, unknown> | undefined),
      "architecture-assessment": async (args) => this.architectureAssessment(args as Record<string, unknown> | undefined),
    };
    this.setupToolHandlers();
    frameworkLogger.log("mcps/architect-tools", "init", "info", { message: "0xRay Architect Tools MCP Server initialized" });
  }

  // Tool implementations — delegates to real architect-tools library

  private async contextAnalysis(args: Record<string, unknown> | undefined) {
    const projectRoot = (args?.projectRoot as string) || "";
    const depth = (args?.depth as "overview" | "detailed" | "comprehensive") || "detailed";
    const includeFiles = args?.includeFiles as string[] | undefined;

    frameworkLogger.log("mcps/architect-tools", "context-analysis", "info", { projectRoot });

    const result = await architectContextAnalysis(projectRoot, includeFiles, depth);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }

  private async codebaseStructure(args: Record<string, unknown> | undefined) {
    const projectRoot = (args?.projectRoot as string) || "";
    const includeMetrics = (args?.includeMetrics as boolean) ?? true;

    frameworkLogger.log("mcps/architect-tools", "codebase-structure", "info", { projectRoot });

    const result = await architectCodebaseStructure(projectRoot, includeMetrics);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }

  private async dependencyAnalysis(args: Record<string, unknown> | undefined) {
    const projectRoot = (args?.projectRoot as string) || "";
    const focusAreas = args?.focusAreas as string[] | undefined;

    frameworkLogger.log("mcps/architect-tools", "dependency-analysis", "info", { projectRoot });

    const result = await architectDependencyAnalysis(projectRoot, focusAreas);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }

  private async architectureAssessment(args: Record<string, unknown> | undefined) {
    const projectRoot = (args?.projectRoot as string) || "";
    const assessmentType = (args?.assessmentType as "quick" | "comprehensive") || "comprehensive";

    frameworkLogger.log("mcps/architect-tools", "architecture-assessment", "info", { projectRoot });

    const result = await architectArchitectureAssessment(projectRoot, assessmentType);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const server = new XrayArchitectToolsServer();
  server.run("architect-tools").catch((error) => frameworkLogger.log("mcps/architect-tools", "run", "error", { error: String(error) }));
}

export default XrayArchitectToolsServer;
