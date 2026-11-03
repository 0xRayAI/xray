---
title: Fleet routing
sidebar_label: Fleet routing
plate_type: pipeline
---

# Fleet routing

The autonomous pipeline: who writes inbox lines, who ranks them, who wakes a seat, who acks. Sibling of [Routing](./routing.md) (task -> agent). Inbox ordering is the ranker inside the Arch1 inbox, not its own tree.

```
╔══════════════════════════════════════════════════════════════════════════════════════════════╗
║ 0xRAY · ROUTING                                        [ 07 · ALL AUTONOMOUS MANAGERS (15) ] ║
╠══════════════════════════════════════════════════════════════════════════════════════════════╣
║ IF                            │ THEN                              │ NEXT                     ║
╟──────────────────────────────────────────────────────────────────────────────────────────────╢
║ A collector/live_collect.py   │ GH events -> /inbox lines         │ writer                   ║
║ B remind-railway, deploy_hold │ tick lines per seat; hold deploys │ writer/gate              ║
║ C governor.mjs (tripwire)     │ fingerprint -> stall wake, nudge  │ waker                    ║
║ D nudge ladder L1/L2/L3       │ card beat -> owner -> Blaze       │ waker                    ║
║ E wave-schedule.mjs           │ wave closed -> plan card, cron    │ writer                   ║
║ F station-tick.mjs            │ weekday station reminder /60s     │ writer                   ║
║ G POST /inbox + handoff.mjs   │ ingest packet; missed-handoff chk │ writer/audit             ║
║ H inbox-queue.mjs RANKER      │ one head per seat (⊆ Arch1 inbox) │ ranker                   ║
║ I wake-gate.mjs               │ pick ONE seat; cap/hr; ->forge    │ waker #815               ║
║ J arch1-launch.mjs            │ cloud launch; default OFF         │ waker (off)              ║
║ K pr-batch + chat-doorbell    │ run_end/ci_pass flush; ring chat  │ waker                    ║
║ L ci-clear / ci-credit        │ auto-ack ci_fail on green; who    │ acker                    ║
║ M inbox-watch.sh/WAKE-ROUTINE │ token -> claim -> head -> exit    │ consumer                 ║
║ N wear/wake-token stamp       │ stamp on start/tag wake           │ stamp #809/810           ║
║ O OP-PROC/station/exit-gate   │ rulebook + filing gate            │ gate #812                ║
╟──────────────────────────────────────────────────────────────────────────────────────────────╢
║ FAIL CLOSED: no GitHub record = not work; one claim per seat; one head per card              ║
║ SYNC WITH:   all share ONE inbox store (worktrack append-only) + ONE claim                   ║
║ SSOT:        house/live/app/*.mjs, feed/, tools/inbox-watch.sh, OP-PROC.md                   ║
╚══════════════════════════════════════════════════════════════════════════════════════════════╝
```

```
╔══════════════════════════════════════════════════════════════════════════════════════════════╗
║ 0xRAY · ROUTING                                                      [ OVERVIEW · WHO WINS ] ║
╠══════════════════════════════════════════════════════════════════════════════════════════════╣
║ IF                            │ THEN                              │ NEXT                     ║
╟──────────────────────────────────────────────────────────────────────────────────────────────╢
║ GitHub event (issue/PR/cmt)   │ collector -> inbox line           │ 01 observer              ║
║ Board still for trip window   │ governor stall wake / coord       │ 02 tripwire              ║
║ Line lands on arch1 queue     │ queueView picks ONE head          │ 03 arch1 inbox           ║
║ Wake token / webhook          │ watcher prints head, claim        │ 04 wake script           ║
║ Any seat turn                 │ OP-PROC rules: packet+wake        │ 05 opproc                ║
║ Critic ready / ci_pass        │ chat doorbell rings owner         │ 06 doorbell              ║
║ CONFLICT: ready vs anything   │ ready (rank 0) wins               │ fix #813: newest         ║
║ CONFLICT: tip vs issue_open   │ issue_open leads rank 1           │ #811 kept                ║
║ CONFLICT: wake vs live claim  │ first claim wins, rest quiet      │ EXIT trap frees          ║
║ CONFLICT: trip vs nudge       │ one per window; nudge on card     │ governor                 ║
╟──────────────────────────────────────────────────────────────────────────────────────────────╢
║ FAIL CLOSED: no GitHub record = not work; no new head = no wake                              ║
║ SYNC WITH:   all six share ONE inbox + ONE claim per seat                                    ║
║ SSOT:        OP-PROC.md #two-loops #tripwire; inbox-queue.mjs                                ║
╚══════════════════════════════════════════════════════════════════════════════════════════════╝
```

```
╔══════════════════════════════════════════════════════════════════════════════════════════════╗
║ 0xRAY · ROUTING                                        [ 01 · RAILWAY OBSERVER / COLLECTOR ] ║
╠══════════════════════════════════════════════════════════════════════════════════════════════╣
║ IF                            │ THEN                              │ NEXT                     ║
╟──────────────────────────────────────────────────────────────────────────────────────────────╢
║ @mention on issue/PR/comment  │ collector writes inbox line       │ target seat wakes        ║
║ New PR head / CI result       │ ci_inbox: ci_pass|ci_fail line    │ doorbell / worker        ║
║ Railway remind tick           │ 1 short line per core seat        │ seat runs station        ║
║ Same event seen twice         │ id dedup, added:0                 │ no 2nd wake              ║
║ Deploy status change          │ deploy_status line                │ owner seat               ║
╟──────────────────────────────────────────────────────────────────────────────────────────────╢
║ FAIL CLOSED: bad login in @mention -> no line (bifrost init --check)                         ║
║ SYNC WITH:   03 inbox (feeds it), 05 opproc (outer loop), 06 doorbell                        ║
║ SSOT:        feed/live_collect.py, inbox_pass.py, remind-railway.mjs                         ║
╚══════════════════════════════════════════════════════════════════════════════════════════════╝
```

```
╔══════════════════════════════════════════════════════════════════════════════════════════════╗
║ 0xRAY · ROUTING                                                    [ 02 · TRIPWIRE / WATCH ] ║
╠══════════════════════════════════════════════════════════════════════════════════════════════╣
║ IF                            │ THEN                              │ NEXT                     ║
╟──────────────────────────────────────────────────────────────────────────────────────────────╢
║ Nothing moved for TRIP_MS     │ wake each seat w/ open work       │ seat acts on card        ║
║ Board empty, burn < 75%       │ wake coordinator to pull          │ new card                 ║
║ Board empty, burn >= 75%      │ stay quiet, wake no seat          │ wait                     ║
║ Live card no beat             │ nudge L1 -> L2 -> L3              │ owner, then Blaze        ║
║ Real wave closed              │ 1 'plan next wave' card           │ Mon 09:00 CT cron        ║
║ card start_after future       │ parked: no nudge/trip             │ server wakes at time     ║
╟──────────────────────────────────────────────────────────────────────────────────────────────╢
║ FAIL CLOSED: once per window; muted/parked seats never woken                                 ║
║ SYNC WITH:   03 inbox (nudge rank 3), 04 wake (claim), 05 opproc                             ║
║ SSOT:        governor.mjs:16,39; wave-schedule.mjs; OP-PROC #tripwire                        ║
╚══════════════════════════════════════════════════════════════════════════════════════════════╝
```

```
╔══════════════════════════════════════════════════════════════════════════════════════════════╗
║ 0xRAY · ROUTING                                                [ 03 · ARCH1 INBOX + RANKER ] ║
╠══════════════════════════════════════════════════════════════════════════════════════════════╣
║ IF                            │ THEN                              │ NEXT                     ║
╟──────────────────────────────────────────────────────────────────────────────────────────────╢
║ RANKER = ordering subsystem   │ inbox-queue.mjs ranked()+pick()   │ not a 6th tree           ║
║ rank 0 ready/merge packet     │ pick() byAge = OLDEST first       │ BUG #813/bf#39           ║
║ rank 1 priority P0/P1/hotfix  │ byMotion (seat) / byAge           │ after ready              ║
║ rank 1 issue_open rest        │ newestFirst, cap wip              │ #811 kept                ║
║ tip comment, card shed        │ rank 2 (shedTip)                  │ after priority           ║
║ handoff on non-PR card        │ zombie -> rank 2                  │ ack by hand              ║
║ nudge / station               │ rank 3 / rank 4                   │ last                     ║
║ ci_fail head turns green      │ ci-clear auto-acks                │ only auto-ack            ║
║ re-tip same sha               │ added:0, CLI still SendToAgent    │ BUG #814                 ║
║ acked ready, same sha         │ re-POST added:0; stays hidden     │ #849 pr_comment tip      ║
╟──────────────────────────────────────────────────────────────────────────────────────────────╢
║ FAIL CLOSED: stale ready/merge never auto-sheds -> must --ack <id>                           ║
║ FAIL CLOSED: acked ready same sha stays hidden; pr_comment tip still rings (#849)            ║
║ SYNC WITH:   01 feeds, 04 prints head, 05 kinds, 09 ci-clear                                 ║
║ SSOT:        house/live/app/inbox-queue.mjs:93-141, ci-clear.mjs                             ║
╚══════════════════════════════════════════════════════════════════════════════════════════════╝
```

```
╔══════════════════════════════════════════════════════════════════════════════════════════════╗
║ 0xRAY · ROUTING                                                    [ 04 · BOTS WAKE SCRIPT ] ║
╠══════════════════════════════════════════════════════════════════════════════════════════════╣
║ IF                            │ THEN                              │ NEXT                     ║
╟──────────────────────────────────────────────────────────────────────────────────────────────╢
║ new token in inbox-wake/<seat>│ reprint head once                 │ --turn start --tag wake  ║
║ poll prints work              │ claim seat; 2nd wake quiet        │ handle line              ║
║ line is repeat (--repeat 0)   │ ack, no cloud launch              │ next line                ║
║ new head                      │ full boot read (STATION/NOTES)    │ work, --remember         ║
║ handoff owed (not CoS)        │ live-inbox --handoff + 1:1        │ target seat              ║
║ shell exits (any way)         │ exit-gate; turn end; release      │ EXIT trap                ║
╟──────────────────────────────────────────────────────────────────────────────────────────────╢
║ FAIL CLOSED: named bug w/o repo#n fails turn (exit-gate, #812)                               ║
║ SYNC WITH:   03 (reads head), 05 (rules), 02 (stall wakes land here)                         ║
║ SSOT:        tools/inbox-watch.sh:9-12,250; WAKE-ROUTINE.md steps 0-7                        ║
╚══════════════════════════════════════════════════════════════════════════════════════════════╝
```

```
╔══════════════════════════════════════════════════════════════════════════════════════════════╗
║ 0xRAY · ROUTING                                                 [ 05 · OP-PROC (TWO LOOPS) ] ║
╠══════════════════════════════════════════════════════════════════════════════════════════════╣
║ IF                            │ THEN                              │ NEXT                     ║
╟──────────────────────────────────────────────────────────────────────────────────────────────╢
║ reach outside fleet           │ @mention real login on GitHub     │ collector -> inbox       ║
║ reach inside fleet            │ 1:1 DM pointing at issue/PR       │ seat wakes               ║
║ handoff                       │ packet (live-inbox) + wake        │ no room posts            ║
║ bug / fallout noticed         │ GH issue same turn                │ card                     ║
║ no card id                    │ no cloud launch/resume            │ card first               ║
║ CoS seat                      │ no handoffs; plan/burn/Dist only  │ coord                    ║
╟──────────────────────────────────────────────────────────────────────────────────────────────╢
║ FAIL CLOSED: DM without GitHub record is not work                                            ║
║ SYNC WITH:   ALL: it is the rulebook 01-04 + 06 implement                                    ║
║ SSOT:        grok-bot/OP-PROC.md L6 #two-loops, #card, #tripwire                             ║
╚══════════════════════════════════════════════════════════════════════════════════════════════╝
```

```
╔══════════════════════════════════════════════════════════════════════════════════════════════╗
║ 0xRAY · ROUTING                                             [ 06 · CHAT DOORBELL / CI_PASS ] ║
╠══════════════════════════════════════════════════════════════════════════════════════════════╣
║ IF                            │ THEN                              │ NEXT                     ║
╟──────────────────────────────────────────────────────────────────────────────────────────────╢
║ critic ready / green head     │ POST owner chat (seat msg)        │ critic chat resumes      ║
║ run_end or ci_pass            │ flush ONE batch line              │ worker / critic          ║
║ pending check                 │ wait, no red                      │ re-poll                  ║
║ cloud resume URL              │ refused, never fetched            │ owner chat only          ║
╟──────────────────────────────────────────────────────────────────────────────────────────────╢
║ FAIL CLOSED: one critic verdict per head; one critic agent per PR                            ║
║ SYNC WITH:   01 (ci lines), 04 (webhook wake), 03 (ready rank 0)                             ║
║ SSOT:        house/live/app/chat-doorbell.mjs; WAKE-ROUTINE step 4                           ║
╚══════════════════════════════════════════════════════════════════════════════════════════════╝
```

```
╔══════════════════════════════════════════════════════════════════════════════════════════════╗
║ 0xRAY · ROUTING                                        [ 08 · NAMES (TIP / DOORBELL / WAKE) ]║
╠══════════════════════════════════════════════════════════════════════════════════════════════╣
║ IF                            │ THEN                              │ NEXT                     ║
╟──────────────────────────────────────────────────────────────────────────────────────────────╢
║ tip (code)                    │ TIP_TYPES GH comment/review       │ not the lexicon tip      ║
║ doorbell                      │ chat-doorbell seat_message        │ next-parent door         ║
║ queue kind ready              │ the head doorbell                 │ rank 0 handoff           ║
║ wake                          │ offerLines -> wake-gate hook      │ tripwire / launch        ║
║ --remember / --repeat         │ local cursor only                 │ not the queue            ║
║ acked ready same sha          │ acks.json hides that id           │ #849 added:0             ║
║ pr_comment after that         │ still a tip ring                  │ separate ingress         ║
╟──────────────────────────────────────────────────────────────────────────────────────────────╢
║ FAIL CLOSED: tip, doorbell, and wake are three rings; remember is not the block              ║
║ SYNC WITH:   03 (#849 ack-hide vs #814 CLI print), 06 chat-doorbell                          ║
║ SSOT: inbox-queue TIP_TYPES; chat-doorbell.mjs; wake-gate.mjs; server postSeatLines          ║
╚══════════════════════════════════════════════════════════════════════════════════════════════╝
```
