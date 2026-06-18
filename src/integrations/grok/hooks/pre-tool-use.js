#!/usr/bin/env node
/**
 * Grok CLI PreToolUse — ironclad OS gate
 * Contract: stdin JSON → stdout {"decision":"allow"} | {"decision":"deny","reason":"..."}
 */

import {
  checkCodexPatterns,
  checkFullTestSuite,
  checkSubagentGate,
  checkSurfaceArea,
  ensureSessionBoot,
  isShellTool,
  isWriteTool,
  loadFeatures,
  readStdinJson,
  workspaceRoot,
} from './grok-hook-utils.js';
import { appendHookActivity } from './grok-hook-activity.js';

function finish(root, decision, reason, hint, toolName) {
  const out = { decision };
  if (reason) out.reason = reason;
  if (hint) out.hint = hint;
  console.log(JSON.stringify(out));
  appendHookActivity(root, 'grok-pre-tool-use', decision, decision === 'deny' ? 'error' : 'info', {
    tool: toolName,
    reason: reason || hint || null,
    livePath: true,
  });
  process.exit(0);
}

async function main() {
  const root = workspaceRoot();
  let toolName = 'unknown';

  try {
    const event = await readStdinJson();
    const eventRoot = event.workspaceRoot || event.cwd || root;
    ensureSessionBoot(eventRoot, '0xray/grok-pre-tool-use-boot');

    const features = loadFeatures();
    const ctx = extractFromEvent(event);
    toolName = ctx.toolName;
    const { paths, content, cmd } = ctx;

    const subagentBlock = checkSubagentGate(toolName, features);
    if (subagentBlock) finish(eventRoot, 'deny', subagentBlock, null, toolName);

    if (features.no_new_surface && isWriteTool(toolName) && paths.length) {
      const surfaceBlock = checkSurfaceArea(paths, eventRoot);
      if (surfaceBlock) finish(eventRoot, 'deny', surfaceBlock, null, toolName);
    }

    if (isWriteTool(toolName) && content) {
      const codexBlock = checkCodexPatterns(content);
      if (codexBlock) finish(eventRoot, 'deny', codexBlock, null, toolName);
    }

    if (isShellTool(toolName) && cmd) {
      const destructive =
        /\brm\s+-rf\s+\/\b|\bmkfs\b|\bdd\s+if=|:()\s*\{\s*:\|&\s*\}\s*;:/i.test(cmd);
      if (destructive) finish(eventRoot, 'deny', 'Blocked destructive shell command', null, toolName);

      const testHint = checkFullTestSuite(cmd, features);
      if (testHint) finish(eventRoot, 'allow', null, testHint, toolName);
    }

    finish(eventRoot, 'allow', null, null, toolName);
  } catch (err) {
    appendHookActivity(root, 'grok-pre-tool-use', 'hook-error', 'error', {
      tool: toolName,
      error: err.message,
    });
    finish(root, 'allow', null, null, toolName);
  }
}

function extractFromEvent(event) {
  const toolName = event.toolName || process.env.TOOL_NAME || 'unknown';
  const toolInput = event.toolInput ?? {};
  const paths = [];
  let content = '';

  if (toolInput.path) paths.push(String(toolInput.path));
  if (toolInput.file_path) paths.push(String(toolInput.file_path));
  if (toolInput.target_notebook) paths.push(String(toolInput.target_notebook));
  if (Array.isArray(toolInput.paths)) paths.push(...toolInput.paths.map(String));

  if (toolInput.new_string) content += String(toolInput.new_string);
  if (toolInput.contents) content += String(toolInput.contents);
  if (toolInput.command) content += String(toolInput.command);
  if (toolInput.prompt) content += String(toolInput.prompt);

  return {
    toolName,
    paths,
    content,
    cmd: String(toolInput.command || ''),
  };
}

main();