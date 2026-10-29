#!/usr/bin/env node
/**
 * Grok CLI PreToolUse — ironclad OS gate
 * Contract: stdin JSON → stdout {"decision":"allow"} | {"decision":"deny","reason":"..."}
 */

import {
  evaluatePreToolGate,
  loadDelegationGateFeatures,
} from '../../hooks/delegation-gate-runtime.mjs';
import { notifyBifrost, subagentMark } from '../../hooks/bifrost-send.mjs';
import {
  checkCodexPatterns,
  checkFullTestSuite,
  ensureSessionBoot,
  isShellTool,
  isSubagentTool,
  isWriteTool,
  loadFeatures,
  normalizeWorkspaceRoot,
  readStdinJson,
  resolveSessionId,
  workspaceRoot,
} from './grok-hook-utils.js';
import { appendHookActivity } from './grok-hook-activity.js';
import { lensBeforeResearch } from '../../hooks/goggles-pipeline.mjs';
import { repertoireDecisionFields, repertoireRoute } from '../../hooks/pre-tool-speak.mjs';

export { repertoireDecisionFields };

async function reportSeat(root, toolName, toolInput) {
  try {
    if (isSubagentTool(toolName)) {
      await notifyBifrost({
        root,
        phase: 'subagent',
        action: 'start',
        tag: subagentMark(toolName, toolInput),
        env: process.env,
      });
    }
    await notifyBifrost({ root, phase: 'work', text: '', env: process.env });
  } catch {
    /* a quiet board must not stop the hook */
  }
}

async function finish(root, decision, reason, hint, toolName, extra = {}, work) {
  if (decision === 'allow' && work) await reportSeat(work.root, toolName, work.input);
  const out = { decision, ...extra };
  if (reason) out.reason = reason;
  if (hint) out.hint = hint;
  console.log(JSON.stringify(out));
  appendHookActivity(root, 'grok-pre-tool-use', decision, decision === 'deny' ? 'error' : 'info', {
    tool: toolName,
    reason: reason || hint || null,
    gate: extra.gate || null,
    agent: extra.agent || null,
    livePath: true,
  });
  process.exit(0);
}

async function main() {
  const root = workspaceRoot();
  let toolName = 'unknown';

  try {
    const event = await readStdinJson();
    const eventRoot = normalizeWorkspaceRoot(event.workspaceRoot || event.cwd || root);
    ensureSessionBoot(eventRoot, '0xray/grok-pre-tool-use-boot');

    const features = loadFeatures(eventRoot);
    const gateFeatures = loadDelegationGateFeatures(eventRoot, 'grok');
    const ctx = extractFromEvent(event);
    toolName = ctx.toolName;
    const { content, cmd, toolInput } = ctx;
    const sessionId = resolveSessionId(event);

    const gateBlock = evaluatePreToolGate(toolName, toolInput, {
      projectRoot: eventRoot,
      sessionId,
      features: gateFeatures,
      host: 'grok',
    });
    const seatWork = { root: eventRoot, input: toolInput };
    if (!gateBlock.allow) {
      await finish(
        eventRoot,
        'deny',
        gateBlock.reason,
        gateBlock.hint,
        toolName,
        { gate: gateBlock.gate },
      );
    }

    // Constitution (11/29/69 + destructive shell) is in evaluatePreToolGate.
    // Grok extra: Codex 2/7 (TODO/FIXME/STUB, console.log).
    if (isWriteTool(toolName) && content) {
      const extraBlock = checkCodexPatterns(content, { terms: [2, 7] });
      if (extraBlock) await finish(eventRoot, 'deny', extraBlock, null, toolName);
    }

    const spoken = [cmd, content, toolInput.pattern, toolInput.query, toolInput.glob, ...(ctx.paths || [])].filter(Boolean).join('\n');
    const lensStop = lensBeforeResearch(eventRoot, toolName, spoken);
    if (lensStop?.decision === 'deny') {
      await finish(eventRoot, 'deny', lensStop.reason, null, toolName, { gate: lensStop.gate });
    }
    if (lensStop?.decision === 'allow' && lensStop.reason) {
      await finish(eventRoot, 'allow', lensStop.reason, lensStop.reason, toolName, { gate: lensStop.gate }, seatWork);
    }

    const route = repertoireRoute([toolName, cmd, content].filter(Boolean).join(' '));

    if (isShellTool(toolName) && cmd) {
      const testHint = checkFullTestSuite(cmd, features);
      if (testHint) await finish(eventRoot, 'allow', null, testHint, toolName, route || {}, seatWork);
    }

    if (gateBlock.reason) {
      await finish(
        eventRoot,
        'allow',
        gateBlock.reason,
        gateBlock.hint,
        toolName,
        { gate: gateBlock.gate, warn: true, ...(route || {}) },
        seatWork,
      );
    }

    await finish(eventRoot, 'allow', null, null, toolName, route || {}, seatWork);
  } catch (err) {
    appendHookActivity(root, 'grok-pre-tool-use', 'hook-error', 'error', {
      tool: toolName,
      error: err.message,
    });
    await finish(
      root,
      'deny',
      `PreToolUse hook error — blocked for safety: ${err.message}`,
      null,
      toolName,
      { gate: 'hook-error' },
    );
  }
}

function extractFromEvent(event) {
  const toolName = event.toolName || process.env.TOOL_NAME || 'unknown';
  const toolInput = event.toolInput ?? event.tool_input ?? {};
  const paths = [];
  let content = '';

  if (toolInput.path) paths.push(String(toolInput.path));
  if (toolInput.file_path) paths.push(String(toolInput.file_path));
  if (toolInput.target_file) paths.push(String(toolInput.target_file));
  if (toolInput.target_notebook) paths.push(String(toolInput.target_notebook));
  if (Array.isArray(toolInput.paths)) paths.push(...toolInput.paths.map(String));

  if (toolInput.new_string) content += String(toolInput.new_string);
  if (toolInput.contents) content += String(toolInput.contents);
  if (toolInput.command) content += String(toolInput.command);
  if (toolInput.prompt) content += String(toolInput.prompt);

  return {
    toolName,
    toolInput,
    paths,
    content,
    cmd: String(toolInput.command || ''),
  };
}

const launchedAsCli = Boolean(process.argv[1] && process.argv[1].endsWith('pre-tool-use.js'));
if (launchedAsCli) {
  main();
}