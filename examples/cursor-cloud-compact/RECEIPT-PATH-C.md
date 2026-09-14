# RECEIPT-PATH-C — COMPACT-BEN-001

Isolated Station-seed compact survival on Cursor cloud. Protocol SSOT: SEED → WORK → COMPACT → QUIZ → FORWARD → RECEIPT E1–E6.

| | |
|--|--|
| Ticket | COMPACT-BEN-001 |
| Seed | 42 |
| Open cloud (never relaunch) | `bc-DEADBEEF` |
| Durable | keep-me-ben-001 |
| Unfinished marker | `examples/cursor-cloud-compact/UNFINISHED.txt` |
| Branch | `cursor/cursor-cloud-adapter-2bdf` @ `f5cc0e2b0` |
| Adapter PR | https://github.com/0xRayAI/xray/pull/45 |
| Compact `event_class` | `cursor-precompact-synthetic` |

Managed Cursor cloud did **not** fire host `preCompact` (and `sessionStart` is unavailable). Compact step invoked `src/integrations/cursor/hooks/pre-compact.js` with Cursor-shaped stdin plus `--event-class=cursor-precompact-synthetic`. That is the honest fallback, not `cursor-host-precompact`.

## E1 Seed

Live card planted from `examples/cursor-cloud-compact/STATION.seed.md` → `.xray/state/STATION.md` (gitignored projection). In-repo seed is the committed SSOT.

Present before WORK:

- Ticket: COMPACT-BEN-001
- Seed: 42
- Open cloud: bc-DEADBEEF
- Durable: keep-me-ben-001
- Unfinished path: examples/cursor-cloud-compact/UNFINISHED.txt (`UNFINISHED.txt` on disk)

## E2 Work

```
$ echo hook-probe-ben-001
hook-probe-ben-001
```

Cursor-shaped `preToolUse` for the same command:

```
{"tool_name":"Shell","tool_input":{"command":"echo hook-probe-ben-001"},"cwd":"/workspace","conversation_id":"bc-DEADBEEF"}
→ {"permission":"allow"}
```

## E3 Compact

Stdin (Cursor `preCompact` shape) piped to `pre-compact.js --event-class=cursor-precompact-synthetic`.

Stdout:

```
{"user_message":"0xRay Station written. Read .xray/state/STATION.md — do not cold-start. event_class=cursor-precompact-synthetic"}
```

`.xray/state/cursor-precompact.json`:

```
event_class: cursor-precompact-synthetic
hookEvent: pre_compact
sessionId: bc-DEADBEEF
timestamp: 2026-09-14T19:16:06.261Z
```

`session-boot.json` `event_class` matches. Host class was **not** claimed.

## E4 Merge (not wipe)

After compact, custom keys still present **once**:

- Ticket: COMPACT-BEN-001
- Seed: 42
- Open cloud: bc-DEADBEEF
- Unfinished path: examples/cursor-cloud-compact/UNFINISHED.txt
- `## Durable` keep-me-ben-001
- `## Seed` Never relaunch bc-DEADBEEF

Stock heat updated: `Host: cursor (frontier)`, git `cursor/cursor-cloud-adapter-2bdf@f5cc0e2b0`, `Working: last pre_compact`. Intent on the live boot was empty (seed lived on the markdown card, not a prior `session-boot.json`); merge still kept ticket/seed/cloud/durable.

## E5 Quiz (from disk, no cold-start)

Read `.xray/state/STATION.md` + `UNFINISHED.txt` after compact:

| Question | Answer on disk |
|----------|----------------|
| Ticket? | COMPACT-BEN-001 |
| Seed? | 42 |
| Open cloud? | bc-DEADBEEF — never relaunch |
| Durable? | keep-me-ben-001 |
| Unfinished? | examples/cursor-cloud-compact/UNFINISHED.txt still on disk |
| What next? | Continue this card. Do not relaunch. Do not cold-start. |

## E6 Forward

Same ticket, same seed, same `bc-DEADBEEF` (not relaunched). Work continued on this cloud: receipt + adapter tests + PR #45. Successor Reads the card.

## Unit proof

`npx vitest run src/__tests__/unit/cursor-hooks.test.ts` — 7/7 pass (allow / deny / synthetic class / host class / Station merge).
