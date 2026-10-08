#!/usr/bin/env node
/**
 * Grok SessionStart / UserPromptSubmit / PreCompact / PostCompact.
 * Compact prints nothing. Station heat is session-boot.json + STATION.md.
 */

import {
  buildSessionBootPayload,
  clearPendingDelegationsForSessionChange,
  ensureSessionBoot,
  readStdinJson,
  resolveGrokHookEvent,
  resolveSessionId,
  normalizeWorkspaceRoot,
  workspaceRoot,
  writeSessionBoot,
} from './grok-hook-utils.js';
import { appendHookActivity } from './grok-hook-activity.js';
import { recordSynthesisTurnSlice } from '../../hooks/synthesis-hook-runtime.mjs';
import { archiveStaleLeadDevPlan } from '../../hooks/plan-hook-runtime.mjs';
import {
  maybeRunReflectionStub,
  scheduleAutonomousReportingMarker,
  runInferenceImprovementLight,
} from '../../hooks/pipeline-hook-runtime.mjs';
import { maintainLens } from '../../hooks/goggles-pipeline.mjs';
import { readSavedFreshness, refreshFreshness } from '../../../nucleus/work-freshness.mjs';

function extractIntent(event) {
  return event.prompt || event.userMessage || event.user_prompt || event.compactContext || null;
}

async function loadStationProvider(root) {
  const { loadMemoryRoutingProvider } = await import('../../../memory-routing/index.js');
  const { readFileSync, existsSync } = await import('node:fs');
  const { join } = await import('node:path');
  let routing = { enabled: false, provider: 'null' };
  const featuresPath = join(root, '.xray', 'features.json');
  if (existsSync(featuresPath)) {
    try {
      routing = JSON.parse(readFileSync(featuresPath, 'utf8')).memory_routing || routing;
    } catch {
      /* leftover default */
    }
  }
  return loadMemoryRoutingProvider(routing, root);
}

async function matchStationSignals(root, intent) {
  if (!intent) return [];
  try {
    const provider = await loadStationProvider(root);
    if (!provider || provider.id === 'null' || typeof provider.getTaskConfidence !== 'function') {
      return [];
    }
    const conf = provider.getTaskConfidence({
      id: 'station',
      description: String(intent),
      type: 'station',
    });
    const names = Array.isArray(conf.matchedSignals) ? conf.matchedSignals : [];
    const safe = [];
    for (const signalName of names) {
      const name = String(signalName || '').trim();
      if (!name || name.toLowerCase().startsWith('bedrock-')) continue;
      safe.push(name);
      if (safe.length >= 4) break;
    }
    return safe;
  } catch {
    return [];
  }
}

const COMPACT_EVENTS = new Set(['pre_compact', 'post_compact']);

async function ingestStationFeedback(root, sessionId, hookEvent, matchedSignals) {
  if (!COMPACT_EVENTS.has(hookEvent) || !matchedSignals.length) return;
  try {
    const provider = await loadStationProvider(root);
    if (!provider || typeof provider.ingestFeedback !== 'function') return;
    provider.ingestFeedback({
      timestamp: new Date().toISOString(),
      sessionId: sessionId || 'station',
      taskId: `station-${hookEvent}`,
      assignedAgent: 'station',
      memorySignals: matchedSignals,
      complexity: 0,
      success: true,
      durationMs: 0,
    });
  } catch {
    /* working-state file is the session memory; registry ingest is best-effort */
  }
}

async function main() {
  const root = workspaceRoot();
  let HOOK_EVENT = 'session_start';
  try {
    const event = await readStdinJson();
    HOOK_EVENT = resolveGrokHookEvent(event);
    const eventRoot = normalizeWorkspaceRoot(event.workspaceRoot || event.cwd || root);
    const sessionId = resolveSessionId(event);
    if (HOOK_EVENT === 'user_prompt_submit' && sessionId) {
      recordSynthesisTurnSlice(eventRoot, sessionId);
    }
    if (clearPendingDelegationsForSessionChange(sessionId, eventRoot)) {
      appendHookActivity(eventRoot, 'grok-session-start', 'stale-pending-cleared', 'info', {
        sessionId,
      });
    }

    try {
      const archived = archiveStaleLeadDevPlan(eventRoot);
      if (archived.archived) {
        appendHookActivity(eventRoot, 'grok-session-start', 'stale-plan-archived', 'info', {
          archivePath: archived.archivePath,
          reason: archived.reason,
        });
      }
    } catch {
      /* non-blocking */
    }
    const source =
      HOOK_EVENT === 'user_prompt_submit'
        ? '0xray/grok-user-prompt-submit'
        : HOOK_EVENT === 'pre_compact' || HOOK_EVENT === 'post_compact'
          ? '0xray/grok-compact'
          : '0xray/grok-session-start';

    const intent = extractIntent(event);
    const compact = COMPACT_EVENTS.has(HOOK_EVENT);
    // The compact payload is the whole conversation. Do not match it and do not print it.
    const matchedSignals =
      compact || HOOK_EVENT === 'user_prompt_submit' ? [] : await matchStationSignals(eventRoot, intent);
    let freshnessLine = null;
    if (!compact) {
      try {
        freshnessLine = HOOK_EVENT === 'session_start'
          ? refreshFreshness(eventRoot).freshnessLine
          : readSavedFreshness(eventRoot);
      } catch {
        freshnessLine = null;
      }
    }
    const payload = buildSessionBootPayload(eventRoot, source, {
      hookEvent: HOOK_EVENT,
      sessionId: event.sessionId || process.env.GROK_SESSION_ID || null,
      ...(!compact && intent ? { intent, cardText: intent } : {}),
      ...(matchedSignals.length ? { matchedSignals } : {}),
      ...(freshnessLine ? { freshnessLine } : {}),
    });

    const bootPath = writeSessionBoot(eventRoot, payload) || ensureSessionBoot(eventRoot, source);
    await ingestStationFeedback(eventRoot, sessionId, HOOK_EVENT, matchedSignals);

    appendHookActivity(eventRoot, 'grok-session-start', 'session-boot-written', 'success', {
      bootPath,
      hookEvent: HOOK_EVENT,
      lead_dev_mode: payload.lead_dev_mode,
      repertoireResume: payload.repertoireResume,
      stationLine: payload.stationLine,
      hotSwap: payload.hotSwap || null,
    });

    try {
      scheduleAutonomousReportingMarker(eventRoot);
      if (HOOK_EVENT === 'pre_compact' || HOOK_EVENT === 'post_compact') {
        maintainLens(eventRoot);
      }
      if (HOOK_EVENT === 'session_start') {
        maybeRunReflectionStub(eventRoot);
        runInferenceImprovementLight(eventRoot);
      }
    } catch {
      /* non-blocking pipeline facets */
    }

    if (!compact) process.stdout.write(`${JSON.stringify(payload)}\n`);
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