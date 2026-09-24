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

async function loadPlates() {
  const { existsSync } = await import('node:fs');
  const { dirname, join } = await import('node:path');
  const { fileURLToPath, pathToFileURL } = await import('node:url');
  const here = dirname(fileURLToPath(import.meta.url));
  const candidates = [
    join(here, '../../hooks/plates.cjs'),
    join(here, '../../../integrations/hooks/plates.cjs'),
  ];
  const found = candidates.find((candidate) => existsSync(candidate));
  if (!found) return null;
  const loaded = await import(pathToFileURL(found).href);
  if (typeof loaded.recallPlate === 'function') return loaded;
  if (loaded.default && typeof loaded.default.recallPlate === 'function') return loaded.default;
  return null;
}

async function memoryRoutingModule() {
  const { existsSync } = await import('node:fs');
  const { dirname, join } = await import('node:path');
  const { fileURLToPath, pathToFileURL } = await import('node:url');
  const here = dirname(fileURLToPath(import.meta.url));
  const candidates = [
    join(here, '../../../memory-routing/index.js'),
    join(here, '../../../../dist/memory-routing/index.js'),
  ];
  const found = candidates.find((candidate) => existsSync(candidate));
  if (!found) throw new Error('memory-routing module missing');
  return pathToFileURL(found).href;
}

async function lessonSpeechForIntent(root, intent) {
  if (!intent) return [];
  try {
    const { readFileSync, existsSync } = await import('node:fs');
    const { join } = await import('node:path');
    const { loadMemoryRoutingProvider } = await import(await memoryRoutingModule());
    let routing = { enabled: false, provider: 'null' };
    const featuresPath = join(root, '.xray', 'features.json');
    if (existsSync(featuresPath)) {
      try {
        routing = JSON.parse(readFileSync(featuresPath, 'utf8')).memory_routing || routing;
      } catch {
        /* leftover default */
      }
    }
    const provider = await loadMemoryRoutingProvider(routing, root);
    if (!provider || provider.id === 'null' || typeof provider.buildRoutingContext !== 'function') {
      return [];
    }
    const context = provider.buildRoutingContext(String(intent));
    const matched = new Set(Array.isArray(context.matchedSignals) ? context.matchedSignals : []);
    const lines = [];
    for (const lesson of context.lessons || []) {
      if (!matched.has(lesson.name)) continue;
      for (const line of lesson.lines || []) {
        const text = String(line.text || '').trim().slice(0, 400);
        if (text.length === 0) continue;
        lines.push(`${lesson.name}: ${text}`);
        if (lines.length >= 4) return lines;
      }
    }
    return lines;
  } catch {
    return [];
  }
}

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
    let plates = null;
    let plateBody = '';
    try {
      plates = await loadPlates();
    } catch {
      plates = null;
    }
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
      if (plates) {
        try {
          const named = plates.recallPlate(payload.intent || intent || '');
          if (named) {
            plates.stampPlateIfMissing(root, named.id);
            if (!plateBody) plateBody = `\n\n${String(named.body || '').trim()}`;
          }
        } catch {
          /* plate stamp is observational */
        }
      }
    }
    appendHookActivity(eventRoot, 'cursor-pre-compact', 'station-written', 'success', {
      bootPath,
      receiptPath,
      usagePath,
      event_class: eventClass,
      stationLine,
    });
    const lessonLines = await lessonSpeechForIntent(eventRoot, intent);
    const lessonNote = lessonLines.length > 0 ? ` Lessons: ${lessonLines.join(' | ')}` : '';
    console.log(
      JSON.stringify({
        user_message:
          `0xRay Station written. Read .xray/state/STATION.md — do not cold-start. event_class=${eventClass}${lessonNote}${plateBody}`,
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
