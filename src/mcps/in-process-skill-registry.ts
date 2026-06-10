import { XrayCodeReviewServer } from "./knowledge-skills/code-review.server.js";
import { XraySecurityAuditServer } from "./knowledge-skills/security-audit.server.js";
import { XrayLibrarianServer } from "./researcher.server.js";
import { pluginRegistry } from "../nucleus/plugin-registry.js";
import { frameworkLogger } from "../core/framework-logger.js";

interface AnalyzeProposalArgs {
  proposalTitle?: string;
  proposalDescription?: string;
  evidence?: string[];
  proposalType?: string;
}

export interface MCPToolResult {
  content?: Array<{ type: string; text: string }>;
}

interface AnalyzeProposalResult {
  content: Array<{ type: string; text: string }>;
}

interface InProcessSkillHandler {
  analyzeProposal(args: AnalyzeProposalArgs): Promise<AnalyzeProposalResult>;
}

const instances = new Map<string, InProcessSkillHandler>();

function getCodeReview(): InProcessSkillHandler {
  if (!instances.has("code-review")) {
    const server = new XrayCodeReviewServer();
    instances.set("code-review", {
      analyzeProposal: (args) => server.analyzeProposal(args) as Promise<AnalyzeProposalResult>,
    });
  }
  return instances.get("code-review")!;
}

function getSecurityAudit(): InProcessSkillHandler {
  if (!instances.has("security-audit")) {
    const server = new XraySecurityAuditServer();
    instances.set("security-audit", {
      analyzeProposal: (args) => server.analyzeProposal(args) as Promise<AnalyzeProposalResult>,
    });
  }
  return instances.get("security-audit")!;
}

function getResearcher(): InProcessSkillHandler {
  if (!instances.has("researcher")) {
    const server = new XrayLibrarianServer();
    instances.set("researcher", {
      analyzeProposal: (args) => server.analyzeProposal(args) as Promise<AnalyzeProposalResult>,
    });
  }
  return instances.get("researcher")!;
}

const registry: Record<string, () => InProcessSkillHandler> = {
  "code-review": getCodeReview,
  "security-audit": getSecurityAudit,
  "researcher": getResearcher,
};

export async function callInProcessSkill(
  serverName: string,
  toolName: string,
  args: Record<string, unknown>,
): Promise<AnalyzeProposalResult> {
  // Phase 2D: try pluginRegistry first for any registered tool plugin
  if (pluginRegistry.hasToolPlugin(serverName)) {
    try {
      const result = await pluginRegistry.callSkillTool(serverName, toolName, args);
      return result as AnalyzeProposalResult;
    } catch {
      frameworkLogger.log('in-process-skill-registry', 'plugin-fallback', 'info', {
        server: serverName,
        tool: toolName,
        message: 'Plugin dispatch failed, falling back to in-process handler',
      });
    }
  }

  const factory = registry[serverName];
  if (!factory) {
    throw new Error(`No in-process handler registered for server: ${serverName}`);
  }
  if (toolName !== "analyze_proposal") {
    const supported = Object.keys(registry).join(", ");
    throw new Error(`In-process skill registry only supports "analyze_proposal" for servers: ${supported}. Got "${toolName}"`);
  }
  const handler = factory();
  return handler.analyzeProposal(args as AnalyzeProposalArgs);
}

export type { AnalyzeProposalArgs, AnalyzeProposalResult };
