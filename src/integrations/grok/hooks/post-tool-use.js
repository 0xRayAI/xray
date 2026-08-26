#!/usr/bin/env node
/**
 * Grok PostToolUse — auto-chain observability + consult receipt gate on Task spawn.
 * Passive hook: stdout ignored by Grok; side effects only.
 */

import {
  extractToolContext,
  isOrchestrateToolEvent,
  isSubagentTool,
  isWriteTool,
  loadFeatures,
  readStdinJson,
  resolveSessionId,
  workspaceRoot,
} from './grok-hook-utils.js';
import { appendHookActivity } from './grok-hook-activity.js';
import {
  evaluatePostToolSpawn,
  isOrchestrateToolEvent as gateIsOrchestrateToolEvent,
} from '../../hooks/delegation-gate-runtime.mjs';
import { recordRoutingOutcome, runGrokPostprocessorLight } from '../../hooks/pipeline-hook-runtime.mjs';

function extractToolOutput(event) {
  return (
    event.toolOutput ??
    event.toolResult ??
    event.result ??
    event.output ??
    event.tool_output ??
    null
  );
}

async function main() {
  const root = workspaceRoot();
  try {
    const event = await readStdinJson();
    const eventRoot = event.workspaceRoot || event.cwd || root;
    const sessionId = resolveSessionId(event);
    const { toolName, toolInput } = extractToolContext(event);

    if (isOrchestrateToolEvent(toolName, toolInput) || gateIsOrchestrateToolEvent(toolName, toolInput)) {
      appendHookActivity(eventRoot, 'grok-post-tool-use', 'auto-chain-pending', 'info', {
        tool: toolName,
        sessionId,
        note: 'orchestrate-task completed — pending-delegations.json written by task-handler',
      });
      try {
        recordRoutingOutcome(eventRoot, {
          tool: toolName,
          agent: toolInput?.subagent_type ?? toolInput?.agent ?? 'orchestrate-task',
          planTodoId: toolInput?.planTodoId ?? null,
          sessionId,
        });
      } catch {
        /* non-blocking */
      }
    }

    const features = loadFeatures(eventRoot);
    if (features.grok_postprocessor_light === true && isWriteTool(toolName)) {
      try {
        const paths = [
          toolInput?.path,
          toolInput?.filePath,
          toolInput?.file_path,
        ].filter(Boolean);
        runGrokPostprocessorLight(eventRoot, { tool: toolName, paths });
      } catch {
        /* non-blocking */
      }
    }

    if (isSubagentTool(toolName)) {
      const spawnResult = evaluatePostToolSpawn(toolName, toolInput, eventRoot, {
        toolOutput: extractToolOutput(event),
        sessionId,
      });

      if (spawnResult.satisfied.length > 0 || spawnResult.expectedTodoId) {
        appendHookActivity(eventRoot, 'grok-post-tool-use', 'auto-chain-cleared', 'success', {
          tool: toolName,
          satisfied: spawnResult.satisfied.map((d) => d.id),
          clearedAll: spawnResult.clearedAll,
          planTodoId: spawnResult.expectedTodoId ?? null,
          receiptRecorded: spawnResult.receiptRecorded ?? false,
          todoCompleted: spawnResult.todoCompleted ?? false,
        });
      }
      try {
        recordRoutingOutcome(eventRoot, {
          tool: toolName,
          agent: toolInput?.subagent_type ?? toolInput?.agent ?? 'subagent',
          planTodoId: toolInput?.planTodoId ?? spawnResult.expectedTodoId ?? null,
          sessionId,
        });
      } catch {
        /* non-blocking */
      }
    }

    process.exit(0);
  } catch (err) {
    appendHookActivity(root, 'grok-post-tool-use', 'hook-error', 'error', {
      error: err.message,
    });
    process.exit(0);
  }
}

main();