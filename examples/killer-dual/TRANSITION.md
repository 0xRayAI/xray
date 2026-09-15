# Transition map — Cursor cloud vs Grok Bot chat

**Plain:** PreToolUse and PreCompact are separate. This is one hard Cursor-cloud workflow wearing 0xRay + Repertoire. Grok Bot chat is a later, constrained path (skill already shipped). Do not mix the floors.

Eval cloud: `bc-cd19bb4e` · harness hooks + `@0xray/repertoire@0.2.0` · first live `cursor-host-precompact` (count=2). Replay test: `src/__tests__/unit/cursor-hooks.test.ts` (host compact then `preToolUse`). CI on #55 green.

## Floors (keep separate)

| Floor | Cursor cloud (this run) | Grok Bot chat |
|--|--|--|
| PreToolUse | Host fires it. Constitution gate + first-tool Station boot. Observable via `.xray/state/cursor-hook-invoke.log` | Does **not** fire. Do not invent a fake gate. |
| PreCompact | Host can fire it (`trigger=auto`). Writes Station + usage receipt | Does **not** fire. Skill `survive-compact`: Read disk, resume the live cloud. |
| Repertoire | Fastened here (8 signals). Heat on Station | Optional. Chat path must not wait for it. |

## Eval cases (what we measured)

| # | Case | Survives | Reconstructed | Forward motion breaks if |
|--|--|--|--|--|
| 1 | Live `preToolUse` | Probe log lines; tools not denied | Session boot + Station stock heat on first tool | Checkout lacks `.cursor/hooks.json` (HOST-FIRE #2) |
| 2 | Live `preCompact` | Probe `event=preCompact`. Suited: Station + usage receipt. Bare this dual: probe Y, writer FAIL until dist lazy-load | Stock heat (Intent/Plan/Git/Working) | Treating a chat summary as host fire; treating probe log as Station write |
| 4 | Usage | Host stdin `context_tokens=231344` on S (writer lived) | Window **MISS**. B: tokens MISS because JS died before parse — not because the host omitted them | chars÷4 / FILL as “usage” |
| 3 | Ticket / Durable / Seed / open cloud | Custom keys + `## Durable` / `## Seed` merge | Not reconstructed — they stay or they are gone | Cold-start / relaunch `bc` |
| 4 | Usage | Host stdin `context_tokens=231344` this run | Window size still **MISS**; Cloud MCP has no token counter | chars÷4 / FILL as “usage” |
| 5 | Post-compact `preToolUse` | Compact/Usage rows + ticket if compact boot stays cursor | `Working: last pre_compact` **unless** a leftover Grok `session-boot.json` is restored from git (fixed: file is gitignored) | Tracked runtime boot; not Reading `STATION.md` |
| 6 | Grok Bot chat compact | Whatever was already on disk (STATION / WAVEBOARD / memory) | Agent re-reads disk; no hook heat | Waiting for PreCompact; launching a second cloud |

## Side by side (same job, two seats)

| | Cursor cloud + mill + Repertoire | Grok Bot `survive-compact` |
|--|--|--|
| Observable baseline | Yes — probe log + Station + receipts | Disk only |
| What to Read after a cut | `.xray/state/STATION.md` (host does not inject) | Same files + WAVEBOARD / agent memory |
| Pass | Host `preCompact` Y **or** honest N; quiz from disk; continue the card | Name the live track; resume the `bc`; do not rebuild |
| Fail | Hand-invoke `pre-compact.js`; FILL; relaunch | Fake PreToolUse/PreCompact in chat |

Arm S vs Arm B harness compare stays in `COMPARE.md` (suited vs stripped). Dual-arm mailbox: `NOTES-EXCHANGE.md`.

## Next (not another Cursor FILL)

1. This map + eval cases — the collaboration return.
2. Prefer **#56** for the seat CLI. Park **#54**. Keep **#57** for the dist-miss writer if critic wants both.
3. Constrained Grok Bot chat-seat pass of cases 3 and 6 only (no fake hooks).
4. Window fields when the host sends them — still no FILL. Do not relaunch either bc.
