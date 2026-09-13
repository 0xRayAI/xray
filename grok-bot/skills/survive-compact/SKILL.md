---
name: Survive compact
description: >-
  use this after a long chat wake, context summary, or before coding — re-read
  durable station/board/memory and resume clouds so compaction does not nuke
  intent or duplicate work
---
# Survive compact

**Job:** keep mind and work alive when the host summarizes or trims the thread. Disk truth beats chat memory.

Grok Bot chat **does not** fire 0xRay `PreCompact` / Repertoire hooks. Do not wait for them. This skill is the chat-seat path.

## When
- After a long thread, a rolled-up history, or any “I feel blank” wake
- Before launching a cloud, opening a PR track, or rewriting something that might already exist
- When picking up a teammate’s ship mid-flight

## Steps (every material wake)
1. **Read durable state** (whichever exists for this seat):
   - Project: `.xray/state/STATION.md`, `.xray/state/session-boot.json`, `.xray/state/repertoire-working.json`
   - Fleet: `ops/WAVEBOARD.md`, `ops/ATTENTION_STATE.md`
   - Agent memory (profile + recent log) — do not re-ask what is already stored
2. **Name the live track** in one line: intent · open PR/cloud id · next beat · “already built / do not rebuild”
3. **Clouds:** same problem/PR/ship → **resume** that `bc-…`. New outcome only → launch. Never duplicate a live track.
4. **Code / docs:** read live `AGENTS.md` / `SKILLS.md` / `llms.txt` (and the repo path you are about to touch) before inventing a parallel stack or second implementation.
5. **Write forward** if something material changed: update STATION or WAVEBOARD (short), and agent memory for lasting facts. Chat alone is not survival.

## Do not
- Bolt full Repertoire MCP onto every chat seat as theater
- Invent a fake PreToolUse / PreCompact floor inside Grok Bot chat
- Relaunch a second cloud on an open track
- Rebuild a suit, kit, or feature that STATION/board already shows done

## CLI seats (optional)
If the Grok CLI plugin host fires `PreCompact` / `PostCompact`, Repertoire + `STATION.md` heat for you — still **Read STATION.md** after compact; the host does not inject it.

## Done when
You can state intent, live track ids, and what not to redo — from disk — before the next tool call.
