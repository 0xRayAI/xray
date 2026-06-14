import { beforeToolHook, afterToolHook } from "../../integrations/enforcement-gate.js";
import { frameworkLogger } from "../../core/framework-logger.js";
import { mcpClientManager } from "../../mcps/mcp-client.js";

interface EnforceOptions {
  phase: string;
  tool?: string;
  args?: string;
  result?: string;
  error?: string;
  files?: string;
  code?: string;
  focusAreas?: string;
}

export async function enforceCommand(options: EnforceOptions) {
  const phase = options.phase || "health";
  let parsedArgs: Record<string, unknown> | null = null;
  if (options.args) {
    try { parsedArgs = JSON.parse(options.args); } catch { parsedArgs = {}; }
  }

  try {
    switch (phase) {
      case "pre": {
        const result = await beforeToolHook(options.tool || "unknown", parsedArgs);
        process.stdout.write(JSON.stringify(result) + "\n");
        break;
      }
      case "post": {
        let parsedResult: unknown = null;
        if (options.result) {
          try { parsedResult = JSON.parse(options.result); } catch {}
        }
        const result = await afterToolHook(
          options.tool || "unknown",
          parsedArgs,
          parsedResult,
          options.error || null,
        );
        process.stdout.write(JSON.stringify(result) + "\n");
        break;
      }
      case "validate": {
        let files: string[] = [];
        if (options.files) {
          try { files = JSON.parse(options.files); } catch {}
        }
        const result = await mcpClientManager.callServerTool("enforcer", "run-pre-commit-validation", { files, operation: "commit" });
        process.stdout.write(JSON.stringify(result) + "\n");
        break;
      }
      case "codex-check": {
        let focusAreas: string[] = [];
        if (options.focusAreas) {
          try { focusAreas = JSON.parse(options.focusAreas); } catch {}
        }
        const result = await mcpClientManager.callServerTool("enforcer", "codex-enforcement", {
          operation: "write",
          newCode: options.code || "",
          focusAreas,
        });
        process.stdout.write(JSON.stringify(result) + "\n");
        break;
      }
      case "health": {
        const result = await mcpClientManager.callServerTool("enforcer", "get-enforcement-status", {});
        process.stdout.write(JSON.stringify(result) + "\n");
        break;
      }
      default:
        process.stderr.write(`Unknown phase: ${phase}\n`);
        process.exit(1);
    }
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    await frameworkLogger.log("enforce-command", "execution-error", "error", { phase, error: errMsg });
    const fallback = { status: "error", phase, error: errMsg };
    process.stdout.write(JSON.stringify(fallback) + "\n");
  }
}
