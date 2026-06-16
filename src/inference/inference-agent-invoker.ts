import { frameworkLogger } from "../core/framework-logger.js";
import { invokeViaOpencode as invokeOpencodeFromEngine } from "../execution/opencode-cli-invoker.js";
import type { AgentInvoker } from "./inference-cycle.js";

const MCP_TIMEOUT_MS = 8000;

export async function invokeAgent(
  agentName: string,
  prompt: string,
  projectRoot: string,
  agentInvoker?: AgentInvoker | null,
): Promise<string> {
  frameworkLogger.log("inference-cycle", "invoke-agent-internal", "info", {
    agentName,
    promptLength: prompt.length,
  });

  try {
    const { mcpClientManager } = await import("../mcps/mcp-client.js");
    const result = await Promise.race([
      mcpClientManager.callServerTool("orchestrator", "orchestrate-task", {
        description: prompt,
        tasks: [{
          id: `task-${Date.now()}`,
          description: prompt,
          type: agentName,
          priority: "high",
        }],
        executionMode: "sequential",
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`Orchestrator MCP timed out after ${MCP_TIMEOUT_MS}ms`)), MCP_TIMEOUT_MS)
      ),
    ]);
    const content = (result as { content?: Array<{ text?: string }> }).content;
    let responseText = "";
    if (content && Array.isArray(content)) {
      responseText = content.map((c: { text?: string }) => c.text ?? "").join("");
    } else {
      responseText = JSON.stringify(result);
    }
    const isPureMcp = process.env.XRAY_FORCE_MCP_GOVERNANCE === 'true';

    const hasRealContent = /PROPOSAL:\s*\d+/i.test(responseText) ||
                           /DECISION:\s*(approve|reject|abstain)/i.test(responseText) ||
                           /Agent Outputs \(real MCP responses\):/i.test(responseText);

    if (hasRealContent || isPureMcp) {
      if (isPureMcp && !hasRealContent) {
        frameworkLogger.log("inference-cycle", "pure-mcp-orchestrator-response", "info", {
          agentName,
          responsePreview: responseText.substring(0, 300),
        });
      }
      return responseText;
    }

    frameworkLogger.log("inference-cycle", "mcp-no-useful-content", "info", {
      agentName,
      responsePreview: responseText.substring(0, 200),
    });
  } catch (mcpError) {
    frameworkLogger.log("inference-cycle", "mcp-invocation-failed", "info", {
      agentName,
      error: String(mcpError),
    });
  }

  if (agentInvoker) {
    frameworkLogger.log("inference-cycle", "invoke-via-callback", "info", { agentName });
    return agentInvoker(agentName, prompt);
  }

  if (process.env.XRAY_FORCE_MCP_GOVERNANCE === 'true') {
    throw new Error(`[PURE MCP] Orchestrator returned no usable response for agent "${agentName}" and OpenCode fallback is disabled`);
  }

  return invokeViaOpencode(agentName, prompt, projectRoot);
}

export async function invokeViaOpencode(
  agentName: string,
  prompt: string,
  projectRoot: string,
): Promise<string> {
  return invokeOpencodeFromEngine(agentName, prompt, projectRoot);
}
