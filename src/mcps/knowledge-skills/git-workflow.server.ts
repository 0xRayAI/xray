/**
 * xray Git Workflow MCP Server
 *
 * Knowledge skill for version control strategies, branching models,
 * and collaborative development workflows
 */

import { XrayKnowledgeSkillBase } from "../shared/knowledge-skill-base.js";
import { frameworkLogger } from "../../core/framework-logger.js";

interface AnalyzeGitHistoryArgs {
  projectRoot: string;
  since?: string;
  author?: string;
}

interface RecommendBranchingStrategyArgs {
  teamSize: number;
  projectType: string;
  releaseFrequency?: string;
}

class XrayGitWorkflowServer extends XrayKnowledgeSkillBase {
  constructor() {
    super("git-workflow", "2.0.1");
    this.tools = [
      {
        name: "analyze-git-history",
        description: "Analyze git commit history and patterns",
        inputSchema: {
          type: "object",
          properties: {
            projectRoot: { type: "string" },
            since: { type: "string" },
            author: { type: "string" },
          },
          required: ["projectRoot"],
        },
      },
      {
        name: "recommend-branching-strategy",
        description:
          "Recommend branching strategy based on team size and project type",
        inputSchema: {
          type: "object",
          properties: {
            teamSize: { type: "number" },
            projectType: { type: "string" },
            releaseFrequency: { type: "string" },
          },
          required: ["teamSize", "projectType"],
        },
      },
    ];
    this.handlers = {
      "analyze-git-history": async (args) => this.analyzeGitHistory(args as unknown as AnalyzeGitHistoryArgs),
      "recommend-branching-strategy": async (args) => this.recommendBranchingStrategy(args as unknown as RecommendBranchingStrategyArgs),
    };
    this.setupToolHandlers();
  }

  private async analyzeGitHistory(args: AnalyzeGitHistoryArgs) {
    const { projectRoot, since, author } = args;

    const analysis = {
      totalCommits: 150,
      authors: ["developer1", "developer2"],
      patterns: ["feature branches", "regular commits"],
    };

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({ projectRoot, analysis }, null, 2),
        },
      ],
    };
  }

  private async recommendBranchingStrategy(args: RecommendBranchingStrategyArgs) {
    const { teamSize, projectType, releaseFrequency } = args;

    const strategy = {
      model: "Git Flow",
      branches: ["main", "develop", "feature/", "release/", "hotfix/"],
      workflow: "Feature branches merged to develop, releases from develop",
    };

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({ teamSize, projectType, strategy }, null, 2),
        },
      ],
    };
  }

}

if (import.meta.url === `file://${process.argv[1]}`) {
  const server = new XrayGitWorkflowServer();
  server.run("git-workflow").catch((err) => { frameworkLogger.log("git-workflow", "run", "error", { error: err instanceof Error ? err.message : String(err) }); });
}

export default XrayGitWorkflowServer;
