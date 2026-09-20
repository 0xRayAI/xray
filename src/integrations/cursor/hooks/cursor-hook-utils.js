#!/usr/bin/env node
/**
 * Cursor cloud hook utilities — normalize host stdin, reuse 0xRay gate + Station.
 * sessionStart is unavailable on managed cloud; first preToolUse / afterFileEdit boots.
 */

import fs from 'fs';
import path from 'path';
import {
  buildSessionBootPayload,
  writeSessionBoot,
  readStdinJson,
  loadFeatures,
  checkCodexPatterns,
  checkFullTestSuite,
  isWriteTool,
  isShellTool,
  sessionBootPath,
} from '../../grok/hooks/grok-hook-utils.js';
import {
  evaluatePreToolGate,
  loadDelegationGateFeatures,
} from '../../hooks/delegation-gate-runtime.mjs';
import { appendHookActivity } from '../../grok/hooks/grok-hook-activity.js';
import {
  buildRepertoireResume,
  readGitBrief,
} from '../../hooks/station-hook-runtime.mjs';

export const CURSOR_HOST = 'cursor';
export const EVENT_CLASS_HOST = 'cursor-host-precompact';
export const EVENT_CLASS_SYNTHETIC = 'cursor-precompact-synthetic';

export {
  readStdinJson,
  writeSessionBoot,
  buildSessionBootPayload,
  loadFeatures,
  checkCodexPatterns,
  checkFullTestSuite,
  isWriteTool,
  isShellTool,
  sessionBootPath,
  evaluatePreToolGate,
  loadDelegationGateFeatures,
  appendHookActivity,
};

export {
  FORBIDDEN_USAGE_METHODS,
  invokeProbeLogPath,
  cursorUsageReceiptPath,
  parseInvokeProbeLog,
  hostUsageFromPreCompactEvent,
  classifyUsageCite,
  buildRepertoireFastenedProof,
  buildCursorUsageReceipt,
  upsertStationCompactRow,
  writeCursorUsageReceipt,
} from './cursor-usage-receipt.js';

export function cursorWorkspaceRoot(event = {}) {
  const roots = event.workspace_roots || event.workspaceRoots;
  const fromList = Array.isArray(roots) && roots[0] ? String(roots[0]) : '';
  return (
    event.cwd ||
    event.workspaceRoot ||
    fromList ||
    process.env.CURSOR_PROJECT_DIR ||
    process.env.XRAY_ROOT ||
    process.env.GROK_WORKSPACE_ROOT ||
    process.cwd()
  );
}

export function cursorSessionId(event = {}) {
  return (
    event.conversation_id ||
    event.session_id ||
    event.sessionId ||
    process.env.CURSOR_CONVERSATION_ID ||
    process.env.CURSOR_SESSION_ID ||
    null
  );
}

export function cursorToolContext(event = {}) {
  const toolName = event.tool_name || event.toolName || process.env.TOOL_NAME || 'unknown';
  const toolInput = event.tool_input ?? event.toolInput ?? {};
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
    toolInput,
    paths,
    content,
    cmd: String(toolInput.command || event.command || ''),
  };
}

function namedEventClass(value) {
  if (value === EVENT_CLASS_HOST || value === EVENT_CLASS_SYNTHETIC) return value;
  return null;
}

export function classifyPreCompactEvent(event = {}, argv = process.argv) {
  const fromEnv = namedEventClass(process.env.XRAY_CURSOR_COMPACT_CLASS);
  if (fromEnv) return fromEnv;
  const flag = argv.find((a) => a.startsWith('--event-class='));
  if (flag) {
    const fromArg = namedEventClass(flag.slice('--event-class='.length));
    if (fromArg) return fromArg;
  }
  const fromEvent = namedEventClass(event.event_class);
  if (fromEvent) return fromEvent;

  const named = event.hook_event_name || event.hookEventName || event.hook;
  const looksHost =
    named === 'preCompact' ||
    named === 'pre_compact' ||
    event.trigger === 'auto' ||
    event.trigger === 'manual' ||
    typeof event.context_tokens === 'number' ||
    typeof event.context_usage_percent === 'number';
  return looksHost ? EVENT_CLASS_HOST : EVENT_CLASS_SYNTHETIC;
}

export function cursorBootNeedsRefresh(existing, root) {
  if (!existing || typeof existing !== 'object') return true;
  if (existing.host !== CURSOR_HOST) return true;
  if (!existing.suit_profile) return true;
  if (existing.workspaceRoot && existing.workspaceRoot !== root) return true;
  if (!existing.stationLine) return true;
  const liveGit = readGitBrief(root);
  const bootHead = existing.git && existing.git.head ? String(existing.git.head) : '';
  if (liveGit && liveGit.head && bootHead !== liveGit.head) return true;
  const liveResume = buildRepertoireResume(root);
  if (liveResume && existing.repertoireResume && liveResume !== existing.repertoireResume) return true;
  return false;
}

export function ensureCursorSessionBoot(root, source = '0xray/cursor-pre-tool-use-boot', extra = {}) {
  const bootPath = sessionBootPath(root);
  if (fs.existsSync(bootPath)) {
    try {
      const existing = JSON.parse(fs.readFileSync(bootPath, 'utf8'));
      if (!cursorBootNeedsRefresh(existing, root)) return bootPath;
    } catch {
      /* rewrite corrupt or host-mismatched boot */
    }
  }
  const payload = buildSessionBootPayload(root, source, {
    host: CURSOR_HOST,
    ...extra,
  });
  return writeSessionBoot(root, payload) || bootPath;
}

export function writeCursorPrecompactReceipt(root, fields) {
  try {
    const dest = path.join(root, '.xray', 'state', 'cursor-precompact.json');
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, JSON.stringify(fields, null, 2));
    return dest;
  } catch {
    return null;
  }
}
