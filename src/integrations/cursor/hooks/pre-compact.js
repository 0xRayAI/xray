#!/usr/bin/env node
/**
 * Cursor preCompact — Station writer. Observational; cannot block compaction.
 * Host fire → event_class: cursor-host-precompact
 * Manual/script invoke → pass --event-class=cursor-precompact-synthetic
 */

import {
  appendHookActivity,
  buildSessionBootPayload,
  classifyPreCompactEvent,
  cursorGenerationId,
  cursorHeatRoots,
  cursorSessionId,
  cursorWorkspaceRoot,
  readStdinJson,
  writeCursorPrecompactReceipt,
  writeSessionBoot,
} from './cursor-hook-utils.js';
import {
  hostUsageFromPreCompactEvent,
  writeCursorUsageReceipt,
} from './cursor-usage-receipt.js';

function extractIntent(event) {
  return (
    event.prompt ||
    event.userMessage ||
    event.user_prompt ||
    event.compactContext ||
    event.user_message ||
    null
  );
}

async function main() {
  const fallbackRoot = cursorWorkspaceRoot();
  let eventClass = 'cursor-precompact-synthetic';
  try {
    const event = await readStdinJson();
    eventClass = classifyPreCompactEvent(event);
    const eventRoot = cursorWorkspaceRoot(event);
    const sessionId = cursorSessionId(event);
    const generationId = cursorGenerationId(event);
    const intent = extractIntent(event);
    let bootPath = null;
    let receiptPath = null;
    let usagePath = null;
    let stationLine = null;
    for (const root of cursorHeatRoots(event)) {
      const payload = buildSessionBootPayload(root, '0xray/cursor-compact', {
        host: 'cursor',
        hookEvent: 'pre_compact',
        event_class: eventClass,
        sessionId,
        ...(intent ? { intent } : {}),
      });
      bootPath = writeSessionBoot(root, payload);
      stationLine = payload.stationLine;
      receiptPath = writeCursorPrecompactReceipt(root, {
        event_class: eventClass,
        hookEvent: 'pre_compact',
        trigger: event.trigger || 'synthetic',
        sessionId,
        conversation_id: sessionId,
        generation_id: generationId,
        is_first_compaction:
          typeof event.is_first_compaction === 'boolean' ? event.is_first_compaction : null,
        message_count: typeof event.message_count === 'number' ? event.message_count : null,
        messages_to_compact:
          typeof event.messages_to_compact === 'number' ? event.messages_to_compact : null,
        bootPath,
        timestamp: new Date().toISOString(),
      });
      usagePath = writeCursorUsageReceipt(root, {
        eventClass,
        sessionId,
        usage: hostUsageFromPreCompactEvent(event),
      });
    }
    appendHookActivity(eventRoot, 'cursor-pre-compact', 'station-written', 'success', {
      bootPath,
      receiptPath,
      usagePath,
      event_class: eventClass,
      stationLine,
    });
    console.log(
      JSON.stringify({
        user_message:
          `0xRay Station written. Read .xray/state/STATION.md — do not cold-start. event_class=${eventClass}`,
      }),
    );
    process.exit(0);
  } catch (err) {
    appendHookActivity(fallbackRoot, 'cursor-pre-compact', 'station-error', 'error', {
      error: err.message,
      event_class: eventClass,
    });
    console.log(JSON.stringify({ user_message: '0xRay Station write failed; Read STATION.md if present.' }));
    process.exit(0);
  }
}

main();
