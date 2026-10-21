---
title: Fleet
sidebar_label: Fleet
plate_type: pipeline
---

# Fleet

Inference · External Governance · Autonomous Engine.

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│ INPUT LAYER                                                                                      │
│                                                                                                  │
│ ┌─────────────────────────┐ ┌─────────────────────────┐     ┌─────────────────────────┐          │
│ │ Blaze                   │ │ GitHub                  │     │ Bifrost board           │          │
│ │ owner, capital gate     │ │ one issue or PR per task│     │ cards and inbox         │          │
│ │ money, credentials      │ │ CI stays on the card    │     │ wave timing             │          │
│ │ deletes, publishing     │ │                         │     │ wakes the owning seat   │          │
│ │ production and taste    │ │                         │     │                         │          │
│ └────────────┬────────────┘ └────────────┬────────────┘     └────────────┬────────────┘          │
│              └───────────────────────────┴────────────────┼──────────────┘                       │
└───────────────────────────────────────────────────────────┼──────────────────────────────────────┘
                                                            v                                       
┌───────────────────────────────────────────────────────────┼──────────────────────────────────────┐
│ SIDE FEED                                                 │                                      │
│                                                           │                                      │
│ ┌─────────────────────────┐ ┌─────────────────────────┐   │ ┌─────────────────────────┐          │
│ │ mill                    │ │ sound                   │   │ │ Nibbler                 │          │
│ │ build, test, deploy     │ │ owns audio              │   │ │ feed scout              │          │
│ │ plant in the suit       │ │                         │   │ │                         │          │
│ │ mill+inspect stays      │ │                         │   │ │ parked seat             │          │
│ │                         │ │                         │   │ │                         │          │
│ └────────────┬────────────┘ └────────────┬────────────┘   │ └────────────┬────────────┘          │
│              └───────────────────────────┴────────────────┼──────────────┘                       │
│                                                           │                                      │
└───────────────────────────────────────────────────────────┼──────────────────────────────────────┘
                                                            v                                       
┌───────────────────────────────────────────────────────────┼──────────────────────────────────────┐
│ PROCESSING LAYER                                          │                                      │
│                                                           │                                      │
│                                                           v                                      │
│   ┌───────────────────────────────────────────────────────┬──────────────────────────────────┐   │
│   │ blinky                                                                                   │   │
│   │ CoS                                                                                      │   │
│   │ plans the next wave                                                                      │   │
│   │ carded on Bifrost                                                                        │   │
│   │ does not assign dev work                                                                 │   │
│   └───────────────────────────────────────────────────────┬──────────────────────────────────┘   │
│                                                           v                                      │
│   ┌───────────────────────────────────────────────────────┬──────────────────────────────────┐   │
│   │ forge                                                                                    │   │
│   │ eng primary                                                                              │   │
│   │ publisher / merge seat                                                                   │   │
│   │ launches the cloud agent                                                                 │   │
│   │ merges as forge0x1                                                                       │   │
│   └───────────────────────────────────────────────────────┬──────────────────────────────────┘   │
│                                                           v                                      │
│   ┌───────────────────────────────────────────────────────┬──────────────────────────────────┐   │
│   │ Cursor cloud agent                                                                       │   │
│   │ writes the code and tests                                                                │   │
│   │ wears the suit first                                                                     │   │
│   │ pushes the branch only                                                                   │   │
│   │                                                                                          │   │
│   └───────────────────────────────────────────────────────┬──────────────────────────────────┘   │
│                                                           v                                      │
│   ┌───────────────────────────────────────────────────────┬──────────────────────────────────┐   │
│   │ critic                                                                                   │   │
│   │ reviewer                                                                                 │   │
│   │ writes PASS or FAIL                                                                      │   │
│   │ cites the section                                                                        │   │
│   │ never merges                                                                             │   │
│   └───────────────────────────────────────────────────────┬──────────────────────────────────┘   │
│                                                           v                                      │
│   ┌───────────────────────────────────────────────────────┬──────────────────────────────────┐   │
│   │ arch1                                                                                    │   │
│   │ outside the fleet                                                                        │   │
│   │ deep review and yes                                                                      │   │
│   │ locks the release cycle                                                                  │   │
│   │ ask at @arch10x                                                                          │   │
│   └───────────────────────────────────────────────────────┬──────────────────────────────────┘   │
└───────────────────────────────────────────────────────────┼──────────────────────────────────────┘
                                                            v                                       
┌───────────────────────────────────────────────────────────┼──────────────────────────────────────┐
│ OUTPUT LAYER                                              │                                      │
│                                                           v                                      │
│ ┌─────────────────────────┐ ┌─────────────────────────┐     ┌─────────────────────────┐          │
│ │ npm release             │ │ Distribution            │     │ live board              │          │
│ │ 0xray 4.1.3             │ │ herald posts CoS words  │     │ bifrost.0xray.dev       │          │
│ │ annotated tag           │ │ after Blaze go          │     │ cards via GET /cards    │          │
│ │ GitHub Release          │ │ magnet owns listings    │     │                         │          │
│ │ owner or explicit GO    │ │                         │     │                         │          │
│ └─────────────────────────┘ └─────────────────────────┘     └─────────────────────────┘          │
│                                                                                                  │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
  Inference · External Governance · Autonomous Engine. Modules plug in.                             
```

Blaze is the owner (`house/HOUSE.md:4`, `house/HOUSE.md:6`). He owns money, credentials, deletes, publishing, production, and taste (`house/OP-PROC.md:44`). Capital is that gate for spend, credentials, and destructive acts (`grok-bot/LEXICON.md:48`).

GitHub is where the work lives: one issue or pull request per task (`grok-bot/OP-PROC.md:6`). CI stays on the card and is not board traffic (`grok-bot/OP-PROC.md:15`).

Bifrost keeps the board, the inbox routing, and the wave timing (`house/OP-PROC.md:45`). A card with a start time wakes the owning seat (`grok-bot/OP-PROC.md:9`).

blinky is CoS. He plans the next wave at each close, and that plan is carded on Bifrost (`house/OP-PROC.md:14`, `house/OP-PROC.md:45`). CoS does not assign dev work (`house/OP-PROC.md:12`).

forge is eng primary on this roster (`house/live/feed/fleet-roster.json:9`) and the publisher/merge seat (`house/OP-PROC.md:36`). He launches the cloud agent (`house/OP-PROC.md:37`) and merges only as the seat App forge0x1 (`house/OP-PROC.md:38`).

The Cursor cloud agent writes the code and the tests, wears the suit first, and pushes the branch only (`grok-bot/OP-PROC.md:53`). The board row is fed by the Cursor webhook (`grok-bot/LEXICON.md:45`).

critic is the reviewer (`house/live/feed/fleet-roster.json:8`). He writes PASS or FAIL, cites the section, and never merges (`house/OP-PROC.md:41`).

arch1 is outside the fleet (`house/OP-PROC.md:47`, `house/live/feed/fleet-roster.json:10`). A gated pull waits for his deep review and yes (`house/OP-PROC.md:39`). He locks the release-cycle words (`house/OP-PROC.md:70`). An ask to him is a comment that @-mentions @arch10x (`house/OP-PROC.md:47`).

mill is the build, test, and deploy plant inside the suit (`grok-bot/LEXICON.md:17`). The mill seat is retired, and the mill+inspect plant stays (`grok-bot/ops/cards/COS-NARROW-ROLE-PACKET.md:26`). The hire gate still fastens that plant (`house/OP-PROC.md:49`).

sound owns audio (`house/OP-PROC.md:43`).

Nibbler is the feed scout (`house/live/app/public/live.js:21`). The roster parks that seat (`house/live/feed/fleet-roster.json:5`).

An npm release is done when the annotated tag is pushed and the GitHub Release exists. The human owner publishes it, or gives an explicit GO (`grok-bot/OP-PROC.md:56`). The version on this stamp is 4.1.3 (`package.json:3`). The next publish is a patch (`docs-site/docs/architecture/v4-now.md:17`).

Distribution is the plane (`grok-bot/ops/SEATS.md:88`, `grok-bot/templates/house/ROLE-MAP.md:17`). herald posts only after Blaze's go, and only the words CoS handed over (`house/OP-PROC.md:42`). magnet owns listings (`house/OP-PROC.md:43`).

The public board is https://bifrost.0xray.dev (`grok-bot/OP-PROC.md:17`). When `LIVE_URL` is set, open cards are Bifrost `GET /cards` (`grok-bot/OP-PROC.md:47`).

The core is the three subsystems named above (`AGENTS.md:9`, `AGENTS.md:23`, `AGENTS.md:24`, `AGENTS.md:25`). A module is an organ plugged into the suit (`grok-bot/LEXICON.md:62`).

stamped · 0xray 4.1.3
