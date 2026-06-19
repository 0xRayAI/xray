#!/usr/bin/env node
/**
 * Grok PostToolUse — auto-chain observability + targeted clear on Task spawn.
 * Passive hook: stdout ignored by Grok; side effects only.
 */

import {
  extractToolContext,
  isOrchestrateToolEvent,
  isSubagentTool,
  readStdinJson,
  resolveSessionId,
  satisfyDelegationsFromToolInput,
  validateSpawnMatchesTodo,
  updatePlanTodoStatusInPlace,
  workspaceRoot,
} from './grok-hook-utils.js';
import { appendHookActivity } from './grok-hook-activity.js';

async function main() {
  const root = workspaceRoot();
  try {
    const event = await readStdinJson();
    const eventRoot = event.workspaceRoot || event.cwd || root;
    const sessionId = resolveSessionId(event);
    const { toolName, toolInput } = extractToolContext(event);

    if (isOrchestrateToolEvent(toolName, toolInput)) {
      appendHookActivity(eventRoot, 'grok-post-tool-use', 'auto-chain-pending', 'info', {
        tool: toolName,
        sessionId,
        note: 'orchestrate-task completed — pending-delegations.json written by task-handler',
      });
    }

    if (isSubagentTool(toolName)) {
      const spawnCheck = validateSpawnMatchesTodo(toolInput, eventRoot);
      if (spawnCheck.valid && spawnCheck.expectedTodoId) {
        updatePlanTodoStatusInPlace(spawnCheck.expectedTodoId, 'in_progress', eventRoot);
      }

      const result = satisfyDelegationsFromToolInput(toolInput, eventRoot);
      if (result.satisfied.length > 0) {
        appendHookActivity(eventRoot, 'grok-post-tool-use', 'auto-chain-cleared', 'success', {
          tool: toolName,
          satisfied: result.satisfied.map((d) => d.id),
          clearedAll: result.clearedAll,
          planTodoId: spawnCheck.expectedTodoId ?? null,
        });
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