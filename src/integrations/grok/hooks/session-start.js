#!/usr/bin/env node
/**
 * Grok SessionStart / UserPromptSubmit — writes session-boot.json + activity.log.
 * Stdout is ignored by Grok for these events; side effects are the suit contract.
 */

import {
  buildSessionBootPayload,
  clearPendingDelegationsForSessionChange,
  ensureSessionBoot,
  readStdinJson,
  resolveSessionId,
  workspaceRoot,
  writeSessionBoot,
} from './grok-hook-utils.js';
import { appendHookActivity } from './grok-hook-activity.js';
import { recordSynthesisTurnSlice } from '../../hooks/synthesis-hook-runtime.mjs';

function resolveHookEvent(event) {
  if (process.env.GROK_HOOK_EVENT) return process.env.GROK_HOOK_EVENT;
  const flag = process.argv.find((a) => a.startsWith('--hook-event='));
  if (flag) return flag.slice('--hook-event='.length);
  if (
    event.prompt != null ||
    event.userMessage != null ||
    event.user_prompt != null ||
    event.hook === 'UserPromptSubmit'
  ) {
    return 'user_prompt_submit';
  }
  return 'session_start';
}

async function main() {
  const root = workspaceRoot();
  try {
    const event = await readStdinJson();
    const HOOK_EVENT = resolveHookEvent(event);
    const eventRoot = event.workspaceRoot || event.cwd || root;
    const sessionId = resolveSessionId(event);
    if (HOOK_EVENT === 'user_prompt_submit' && sessionId) {
      recordSynthesisTurnSlice(eventRoot, sessionId);
    }
    if (clearPendingDelegationsForSessionChange(sessionId, eventRoot)) {
      appendHookActivity(eventRoot, 'grok-session-start', 'stale-pending-cleared', 'info', {
        sessionId,
      });
    }
    const source =
      HOOK_EVENT === 'user_prompt_submit'
        ? '0xray/grok-user-prompt-submit'
        : '0xray/grok-session-start';

    const payload = buildSessionBootPayload(eventRoot, source, {
      hookEvent: HOOK_EVENT,
      sessionId: event.sessionId || process.env.GROK_SESSION_ID || null,
    });

    const bootPath = writeSessionBoot(eventRoot, payload) || ensureSessionBoot(eventRoot, source);

    appendHookActivity(eventRoot, 'grok-session-start', 'session-boot-written', 'success', {
      bootPath,
      hookEvent: HOOK_EVENT,
      lead_dev_mode: payload.lead_dev_mode,
    });

    console.log(JSON.stringify(payload));
    process.exit(0);
  } catch (err) {
    appendHookActivity(root, 'grok-session-start', 'session-boot-error', 'error', {
      error: err.message,
      hookEvent: HOOK_EVENT,
    });
    process.exit(0);
  }
}

main();