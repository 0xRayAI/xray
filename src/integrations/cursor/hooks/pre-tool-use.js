#!/usr/bin/env node
/**
 * Cursor preToolUse — 0xRay constitution gate.
 * Contract: stdin JSON → stdout {"permission":"allow"|"deny"}
 * Does not rely on sessionStart (unavailable on managed cloud).
 */

import {
  appendHookActivity,
  checkCodexPatterns,
  checkFullTestSuite,
  cursorSessionId,
  cursorToolContext,
  cursorWorkspaceRoot,
  ensureCursorSessionBoot,
  evaluatePreToolGate,
  isShellTool,
  isWriteTool,
  loadDelegationGateFeatures,
  loadFeatures,
  readStdinJson,
} from './cursor-hook-utils.js';

function finish(root, permission, reason, hint, toolName, extra = {}) {
  const out = { permission };
  if (reason) {
    out.user_message = reason;
    out.agent_message = reason;
  }
  if (hint && permission === 'allow') {
    out.user_message = hint;
  }
  console.log(JSON.stringify(out));
  appendHookActivity(root, 'cursor-pre-tool-use', permission, permission === 'deny' ? 'error' : 'info', {
    tool: toolName,
    reason: reason || hint || null,
    gate: extra.gate || null,
    livePath: true,
  });
  process.exit(0);
}

async function main() {
  const fallbackRoot = cursorWorkspaceRoot();
  let toolName = 'unknown';

  try {
    const event = await readStdinJson();
    const eventRoot = cursorWorkspaceRoot(event);
    ensureCursorSessionBoot(eventRoot, '0xray/cursor-pre-tool-use-boot', {
      sessionId: cursorSessionId(event),
    });

    const features = loadFeatures(eventRoot);
    const gateFeatures = loadDelegationGateFeatures(eventRoot, 'cursor');
    const ctx = cursorToolContext(event);
    toolName = ctx.toolName;
    const { content, cmd, toolInput } = ctx;
    const sessionId = cursorSessionId(event);

    const gateBlock = evaluatePreToolGate(toolName, toolInput, {
      projectRoot: eventRoot,
      sessionId,
      features: gateFeatures,
      host: 'cursor',
    });
    if (!gateBlock.allow) {
      finish(eventRoot, 'deny', gateBlock.reason, gateBlock.hint, toolName, { gate: gateBlock.gate });
    }

    if (isWriteTool(toolName) && content) {
      const extraBlock = checkCodexPatterns(content, { terms: [11, 29] });
      if (extraBlock) finish(eventRoot, 'deny', extraBlock, null, toolName);
    }

    if (isShellTool(toolName) && cmd) {
      const testHint = checkFullTestSuite(cmd, features);
      if (testHint) finish(eventRoot, 'allow', null, testHint, toolName);
    }

    if (gateBlock.reason) {
      finish(eventRoot, 'allow', gateBlock.reason, gateBlock.hint, toolName, {
        gate: gateBlock.gate,
        warn: true,
      });
    }

    finish(eventRoot, 'allow', null, null, toolName);
  } catch (err) {
    appendHookActivity(fallbackRoot, 'cursor-pre-tool-use', 'hook-error', 'error', {
      tool: toolName,
      error: err.message,
    });
    finish(
      fallbackRoot,
      'deny',
      `preToolUse hook error — blocked for safety: ${err.message}`,
      null,
      toolName,
      { gate: 'hook-error' },
    );
  }
}

main();
