# Memory wake — METAVERSE-BRAIN-003

Station stays a ticket. This page is the join. Not a new organ.

Chat dies. Bookmark, index, and mind already exist. They do not meet on wake. That is the memory issue.

## Thesis

`applyStationHeat` is the hippocampus. It already runs on every floor that boots. Vendor ships `@0xray/repertoire@0.2.5` (seed + stack + subject overlays). Heat copies those onto the project list. Turn Repertoire off and Station stays the memory. No new MCP. No new `SKILL.md`.

## Three areas → pieces that already exist

| Area | Job | Already there | Broken join |
|---|---|---|---|
| **Bookmark** | Survive as a role | `STATION.md` ← `session-boot.json` ← `applyStationHeat` | Intent stays a ship receipt. Match first-wins on the same Intent. |
| **Index** | Named long-term store | dest + factory/stack/subject overlays + `MemoryRoutingProvider` + `ingestFeedback` | Heat never hydrates. This mill dest can sit at 40 with zero `repo-*`. `readOpProcNames` dumps every dest name. |
| **Mind** | This-wake thought + traces | NOTES pickup · `session-*.json` · `heatKernelDiary` · `XraySessionIngester` · survive-compact Reads | Capture is Cursor HEAD-move only. Ingest runs when `RepertoireService` constructs — hooks do not construct it. `repertoire-working.json` goes stale. Bodies stop at Station. |

Groover is not the producer. Do not pin 0.1.8. Do not dump 145. Do not paste OP-PROC onto Station.

## The integration

Rewire `applyStationHeat` (and only that). Existing call sites stay:

- Cursor `preToolUse` / `afterFileEdit` / `preCompact`
- Grok `session-start` / `pre-tool-use`
- Hermes `session-start` (via `buildSessionBootPayload`)
- OpenClaw first `preToolUse`
- OpenCode injects Station after heat has written it

```
applyStationHeat(root, host, extra, existing)
  1. hydrateWritableSignals(dest)     index present on THIS mill
  2. maybeCaptureSession(root)        lift off Cursor-only into this runtime
  3. maybeIngestWake(root)            existing match/ingest helpers; debounce
  4. pickup = readNotesPickup(root)   first **Pickup line:** in NOTES, ≤240
  5. matchText = intent + pickup + latest session approaches
  6. matchedSignals = getTaskConfidence(matchText)
  7. opProcNames = reloadOpProc()     factory ∪ stack only
  8. persist repertoire-working       { pickup, subjectHits, opProcNames, destCount }
  9. Station projection stays thin    Intent / Working ≤4 / Unfinished path
```

`cursorBootNeedsRefresh` already refreshes when `repertoireResume` count changes. Hydrate first, then the count moves, then heat rewrites. Do not add a hook.

Hold without thickening the Grok exo: do not inject dest into the system prompt. survive-compact already Reads Station → NOTES → working. One line on the existing hot-swap paragraph: unfinished path is the second Read; working json is the third if dest is on. That is a rewire of `AGENTS-consumer.md` / `LEAD-CADENCE.md` / `survive-compact/SKILL.md`, not a new skill.

## Done when

- After compact on Cursor: Station Read → NOTES pickup equals `working.pickup`; xray dest has the subject `repo-*` map; `getTaskConfidence("x402")` hits `repo-clearing`
- After Grok session-start: same working file; a `session-*.json` can appear without Cursor
- `reloadOpProc` names ≠ all dest names
- Dummy / same critic: wake without a command novel and state the pickup from disk
- Tests cover hydrate-on-heat, pickup attach, opProc filter

## Not this

Do not republish `0xray@4.0.17` or `@0xray/repertoire@0.2.5` until a new D. Hangars stay hangars. Railway ask-first.
