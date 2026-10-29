---
name: Survive compact
description: >-
  use this after a long chat wake, context summary, or before coding — re-read
  durable station/board/memory and resume clouds so compaction does not nuke
  intent or duplicate work
---
# Survive compact

**Job:** re-read disk and resume the live track after the host summarizes or trims the thread. Chat may lose early turns. Disk must not lose the ticket. Same-bc plus a re-fed summary is not proof the old context window survived as a mind.

Grok Bot chat **does not** fire 0xRay `PreCompact` / Repertoire hooks. Do not wait for them. This skill is the chat-seat path.

After a summary, a wake, or a gate, run station Full. The read list is [Station boot](../../OP-PROC.md#station-boot). When `LIVE_URL` is set, the board is Bifrost (`GET /cards`). When `LIVE_URL` is unset, the board is `house/WAVEBOARD.md`.

After a nudge or a summary, `--prompt` is step 1 before any ack. [Station nudge](../../OP-PROC.md#station-nudge).

## When
- After a long thread, a rolled-up history, or any “I feel blank” wake
- Before launching a cloud, opening a PR track, or rewriting something that might already exist
- When picking up a teammate’s ship mid-flight

## Steps (every material wake)
1. Run [Station boot](../../OP-PROC.md#station-boot) at Full depth. Name the live track in one line: intent, open PR or cloud id, next beat, and what is already built.
2. **Clouds:** same problem, PR, or ship resumes that `bc-…`. A new outcome is the only launch. Never duplicate a live track.
3. **Code / docs:** read live `AGENTS.md`, `SKILLS.md`, and `llms.txt`, and the repo path you are about to touch, before inventing a parallel stack.
4. **Write forward** when something material changed: the way out is [Station boot](../../OP-PROC.md#station-boot). Chat alone is not survival.

## Do not
- Bolt full Repertoire MCP onto every chat seat as theater
- Invent a fake PreToolUse / PreCompact floor inside Grok Bot chat
- Relaunch a second cloud on an open track
- Rebuild a suit, kit, or feature that STATION or the board already shows done
- Read `ops/WAVEBOARD.md`. That path is the old board migrate moves. The live board is Bifrost when `LIVE_URL` is set.

## CLI seats (optional)
If the Grok CLI plugin host fires `PreCompact` / `PostCompact`, Repertoire and `STATION.md` heat for you. Still read `STATION.md` after compact. The host does not inject it.

## Lean wake (Dist↔grok 2026-09-14)
Cheap resume. Do not reload the world. Disk truth first. Executors return short summaries. Do not paste their full context back into the parent. Keep this skill's wording stable so the host can cache the prompt. A group thread is not STATION: groups share one chat; park silent seats; survival state lives on disk.

## Done when
You can state intent, live track ids, and what not to redo, from disk, before the next tool call. That is disk survival, not a claim that pre-compact chat turns are still in context.
