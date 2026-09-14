#!/usr/bin/env node
/**
 * Cursor afterFileEdit — boot Station when sessionStart did not fire.
 * Observational; file already written.
 */

import {
  appendHookActivity,
  cursorSessionId,
  cursorWorkspaceRoot,
  ensureCursorSessionBoot,
  readStdinJson,
} from './cursor-hook-utils.js';

async function main() {
  const fallbackRoot = cursorWorkspaceRoot();
  try {
    const event = await readStdinJson();
    const eventRoot = cursorWorkspaceRoot(event);
    const bootPath = ensureCursorSessionBoot(eventRoot, '0xray/cursor-after-file-edit-boot', {
      sessionId: cursorSessionId(event),
    });
    appendHookActivity(eventRoot, 'cursor-after-file-edit', 'session-boot', 'info', {
      bootPath,
      file: event.file_path || event.path || null,
    });
    console.log(JSON.stringify({}));
    process.exit(0);
  } catch (err) {
    appendHookActivity(fallbackRoot, 'cursor-after-file-edit', 'hook-error', 'error', {
      error: err.message,
    });
    console.log(JSON.stringify({}));
    process.exit(0);
  }
}

main();
