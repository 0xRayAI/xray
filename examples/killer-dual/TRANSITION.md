# Transition map — Cursor cloud vs Grok Bot chat

**Plain:** PreToolUse and PreCompact are separate. This is one hard Cursor-cloud workflow wearing 0xRay + Repertoire. Grok Bot chat is a later, constrained path (skill already shipped). Do not mix the floors.

Eval cloud: `bc-cd19bb4e` · harness hooks + `@0xray/repertoire@0.2.0` · live `cursor-host-precompact` (count=3). Replay test: `src/__tests__/unit/cursor-hooks.test.ts` (host compact then `preToolUse`). CI on #55.

**Organs (do not mix):** Station = successor card. Repertoire 0.1.0–0.1.8 = same judgment organ (do not pin 0.1.8). Groover 0.1 = registry + field, not the brain. Factory guide: `docs-site/docs/guides/station-vs-repertoire.md`.

**Score disk, not mind.** Chat may lose early turns; disk must not lose the ticket. Same-bc plus a re-fed summary is not conversation-memory proof. Mill-absence (host did not invent `STATION.md`) is still PASS for mill-control. Law: `HOST-VS-MILL.md`.

## Floors (keep separate)

| Floor | Cursor cloud (this run) | Grok Bot chat |
|--|--|--|
| PreToolUse | Host fires it. Constitution gate + first-tool Station boot. Observable via `.xray/state/cursor-hook-invoke.log` | Does **not** fire. Do not invent a fake gate. |
| PreCompact | Host can fire it (`trigger=auto`). Probe log is not the writer. Suited this run: Station + usage receipt. Bare dual: probe Y, writer died until dist lazy-load | Does **not** fire. Skill `survive-compact`: Read disk, resume the live cloud. |
| Repertoire | Fastened here (8 signals). Heat on Station | Optional. Chat path must not wait for it. |

## Eval cases (what we measured)

| # | Case | Survives | Reconstructed | Forward motion breaks if |
|--|--|--|--|--|
| 1 | Live `preToolUse` | Probe log lines; tools not denied | Session boot + Station stock heat on first tool | Checkout lacks `.cursor/hooks.json` (HOST-FIRE #2) |
| 2 | Live `preCompact` | Probe `event=preCompact`. Suited: Station + usage receipt. Bare this dual: probe Y, writer FAIL until dist lazy-load | Stock heat (Intent/Plan/Git/Working) | Treating a chat summary as host fire; treating probe log as Station write |
| 3 | Ticket / Durable / Seed / open cloud | Custom keys + `## Durable` / `## Seed` merge | Not reconstructed — they stay or they are gone | Cold-start / relaunch `bc` |
| 4 | Usage | S first fires tokens=231344 window MISS; third fire tokens=232105 **window=256000** (host stdin). B: tokens MISS because JS died before parse | Ticket 500k is not a host field. Station must print `context_window_size` when present (was printing `windowCite` → false MISS) | chars÷4 / FILL as “usage”; replacing 256k with 500k |
| 5 | Post-compact `preToolUse` | Compact/Usage rows + ticket if compact boot stays cursor | `Working: last pre_compact` **unless** a leftover Grok `session-boot.json` is restored from git (fixed: file is gitignored) | Tracked runtime boot; not Reading `STATION.md` |
| 6 | Grok Bot chat compact | Whatever was already on disk (STATION / WAVEBOARD / memory) | Agent re-reads disk; no hook heat | Waiting for PreCompact; launching a second cloud |

## Side by side (same job, two seats)

| | Cursor cloud + mill + Repertoire | Grok Bot `survive-compact` |
|--|--|--|
| Observable baseline | Yes — probe log + Station + receipts | Disk only |
| What to Read after a cut | `.xray/state/STATION.md` (host does not inject) | Same files + WAVEBOARD / agent memory |
| Pass | Host `preCompact` Y **or** honest N; quiz from **disk**; same `bc` (not a new launch). Mill-absence: Station not invented is still PASS | Name the live track from **disk**; resume the `bc`; do not rebuild |
| Fail | Hand-invoke `pre-compact.js`; FILL; relaunch | Fake PreToolUse/PreCompact in chat |
| Not scored | Recalling a ticket after compact (summary + disk + this turn are not separable). No chat-only canary was planted. | Same: reading STATION/WAVEBOARD is disk, not a hidden buffer of the old transcript |

Arm S vs Arm B harness compare stays in `COMPARE.md` (suited vs stripped). Dual-arm mailbox: `NOTES-EXCHANGE.md`.

## Next (not another Cursor FILL)

1. This map + eval cases — the collaboration return.
2. Prefer **#56** for the seat CLI. Park **#54**. Keep **#57** for the dist-miss writer if critic wants both.
3. Constrained Grok Bot chat-seat pass of cases 3 and 6 only (no fake hooks).
4. Window fields when the host sends them — still no FILL. Do not relaunch either bc.
