import * as fs from "fs";
import * as path from "path";
import { ProposalApplier } from "../execution/proposal-applier.js";
import { invokeAgent } from "./inference-agent-invoker.js";
import { frameworkLogger } from "../core/framework-logger.js";
import type { InferenceProposal, AgentInvoker } from "./inference-cycle.js";

function extractTargetFiles(evidence: string[]): string[] {
  const filePattern = /[a-zA-Z0-9/_-]+\.(ts|js|mjs|json|yml|yaml)/g;
  const files = new Set<string>();

  for (const item of evidence) {
    const matches = item.matchAll(filePattern);
    for (const match of matches) {
      const f = match[0];
      if (f.startsWith("src/") || f.startsWith("dist/") || f.startsWith(".opencode/")) {
        files.add(f);
      }
    }
  }

  return [...files];
}

async function researcherReview(
  p: InferenceProposal,
  prUrl: string,
  projectRoot: string,
  agentInvoker: AgentInvoker | null,
): Promise<"go" | "no-go" | "modify"> {
  const prompt = `You are a researcher agent reviewing a PR for proposal: "${p.title}".

PR URL: ${prUrl}

Proposal Type: ${p.type}
Description: ${p.description}
Evidence: ${p.evidence.slice(0, 5).join("; ")}

Your job: Review the actual codebase to verify this proposal makes sense. Search the code to confirm:
1. Does the problem described actually exist in the codebase?
2. Is the proposed solution appropriate?
3. Are there any missed edge cases?

Respond with EXACTLY one of:
- GO (proposal is valid, approve)
- NO-GO (proposal is invalid, reject)
- MODIFY: <specific changes needed>`;

  try {
    const result = await invokeAgent("researcher", prompt, projectRoot, agentInvoker);

    const output = result.toLowerCase();
    if (output.includes("no-go")) return "no-go";
    if (output.includes("modify")) return "modify";
    return "go";
  } catch (err) {
    frameworkLogger.log("inference-cycle", "researcher-review-failed", "warning", { error: String(err) });
    return "go";
  }
}

async function applyCodeChange(
  p: InferenceProposal,
  projectRoot: string,
  agentInvoker: AgentInvoker | null,
): Promise<boolean> {
  const targetFiles = extractTargetFiles(p.evidence);

  const prompt = [
    `Apply approved inference proposal`,
    ``,
    `Type: ${p.type}`,
    `Title: ${p.title}`,
    `Description: ${p.description}`,
    targetFiles.length > 0 ? `Target files: ${targetFiles.join(", ")}` : "No specific target files identified",
    `Evidence: ${p.evidence.slice(0, 5).join("; ")}`,
    `Confidence: ${(p.confidence * 100).toFixed(0)}%`,
    ``,
    `1. Read the relevant source files`,
    `2. Apply the ${p.type} described above`,
    `3. Make minimal, surgical changes`,
    `4. If the change is unsafe or unclear, skip and explain`,
  ].join("\n");

  frameworkLogger.log("inference-cycle", "apply-invoking-agent", "info", {
    proposalId: p.id,
    proposalType: p.type,
    targetFiles,
  });

  try {
    let agentName = p.type === "refactor" ? "refactorer" : "code-reviewer";

    if (process.env.XRAY_FORCE_MCP_GOVERNANCE === 'true') {
      agentName = p.type === "refactor" ? "refactoring-strategies" : "code-review";
    }

    await invokeAgent(agentName, prompt, projectRoot, agentInvoker);
    return true;
  } catch (err) {
    frameworkLogger.log("inference-cycle", "apply-agent-failed", "warning", {
      proposalId: p.id,
      error: String(err),
    });
    return false;
  }
}

async function applyGuard(
  p: InferenceProposal,
  projectRoot: string,
  agentInvoker: AgentInvoker | null,
): Promise<boolean> {
  const prompt = [
    `Add guard/validation for the following issue:`,
    ``,
    `Title: ${p.title}`,
    `Description: ${p.description}`,
    `Evidence: ${p.evidence.join("; ")}`,
    `Confidence: ${(p.confidence * 100).toFixed(0)}%`,
    ``,
    `1. Read the relevant source files`,
    `2. Add the missing guard, validation, or edge case handling`,
    `3. If this is a codex rule, add the term to .xray/codex.json`,
    `4. Make minimal, surgical changes`,
  ].join("\n");

  try {
    const agentName = process.env.XRAY_FORCE_MCP_GOVERNANCE === 'true'
      ? "code-review"
      : "code-reviewer";
    await invokeAgent(agentName, prompt, projectRoot, agentInvoker);
    return true;
  } catch (err) {
    frameworkLogger.log("inference-cycle", "apply-guard-failed", "warning", {
      proposalId: p.id,
      error: String(err),
    });
    const guardPath = path.join(projectRoot, "docs", "guards", `${p.title.replace(/[^a-z0-9]/gi, "-")}.md`);
    fs.mkdirSync(path.dirname(guardPath), { recursive: true });
    fs.writeFileSync(guardPath, `# Guard: ${p.title}\n\n${p.description}\n\n## Evidence\n${p.evidence.join("\n")}`);
    return true;
  }
}

async function applyAutomation(
  p: InferenceProposal,
  projectRoot: string,
  agentInvoker: AgentInvoker | null,
): Promise<boolean> {
  const prompt = [
    `Design automation for the following manual process:`,
    ``,
    `Title: ${p.title}`,
    `Description: ${p.description}`,
    `Evidence: ${p.evidence.join("; ")}`,
    `Confidence: ${(p.confidence * 100).toFixed(0)}%`,
    ``,
    `1. Read the relevant source files`,
    `2. Design the automation (script, processor, or config change)`,
    `3. Implement it if straightforward, otherwise describe the design`,
  ].join("\n");

  try {
    const agentName = process.env.XRAY_FORCE_MCP_GOVERNANCE === 'true'
      ? "architecture-patterns"
      : "architect";
    await invokeAgent(agentName, prompt, projectRoot, agentInvoker);
    return true;
  } catch (err) {
    frameworkLogger.log("inference-cycle", "apply-automation-failed", "warning", {
      proposalId: p.id,
      error: String(err),
    });
    const automationPath = path.join(projectRoot, "docs", "automation-proposals.md");
    const entry = `\n## ${p.title}\n\n${p.description}\n\n**Evidence:** ${p.evidence.join(", ")}\n`;
    fs.mkdirSync(path.dirname(automationPath), { recursive: true });
    fs.appendFileSync(automationPath, entry);
    return true;
  }
}

async function applyProposalWork(
  p: InferenceProposal,
  projectRoot: string,
  agentInvoker: AgentInvoker | null,
): Promise<boolean> {
  if (p.type === "fix" || p.type === "refactor") {
    return applyCodeChange(p, projectRoot, agentInvoker);
  }
  if (p.type === "guard") {
    return applyGuard(p, projectRoot, agentInvoker);
  }
  if (p.type === "automate") {
    return applyAutomation(p, projectRoot, agentInvoker);
  }
  return false;
}

export async function applyProposals(
  proposals: InferenceProposal[],
  projectRoot: string,
  agentInvoker: AgentInvoker | null,
  options: { skipResearcherReview?: boolean },
): Promise<void> {
  const applier = new ProposalApplier(
    projectRoot,
    async (p) => applyProposalWork(p, projectRoot, agentInvoker),
    async (p, prUrl) => {
      if (options.skipResearcherReview) return "go";
      return researcherReview(p, prUrl, projectRoot, agentInvoker);
    },
  );
  const results = await applier.applyProposals(proposals);
  for (const r of results) {
    const p = proposals.find(pr => pr.id === r.proposalId);
    if (p) p.status = r.success ? "applied" : "failed";
  }
}
