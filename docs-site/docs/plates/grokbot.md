---
title: Grok Bot
sidebar_label: Grok Bot
plate_type: domain model
---

# Grok Bot

Give your bots a house: shared rules, one board for the work, and memory that sticks.

```
  ┌──────────────────────────────┐     ┌──────────────────────────────┐     ┌──────────────────────────────┐
  │ SUIT · 0xray                 │ ─── │ HOUSE · grok-bot             │ ─── │ WAVEBOARD · grok-bot         │
  ├──────────────────────────────┤     ├──────────────────────────────┤     ├──────────────────────────────┤
  │ · rules on every step        │     │ · one folder, six headings   │     │ · open cards                 │
  │ · hooks into your AI tools   │     │ · who owns what              │     │ · one card, one owner        │
  │ · wear on, unwear off        │     │ · what needs asking first    │     │ · done means proof           │
  └──────────────────────────────┘     └──────────────────────────────┘     └──────────────────────────────┘
                  │                                    │                                    │               
                  │                                    │                                    │               
  ┌──────────────────────────────┐     ┌──────────────────────────────┐     ┌──────────────────────────────┐
  │ MEMORY · 0xray (repertoire)  │     │ DOCTOR · grok-bot            │     │ ATTENTION · grok-bot         │
  ├──────────────────────────────┤     ├──────────────────────────────┤     ├──────────────────────────────┤
  │ · lessons as named rules     │     │ · checks the house           │     │ · only what needs you        │
  │ · handed back on the job     │     │ · fails on leftover examples │     │ · ask-first items wait here  │
  │ · ships in the suit          │     │ · says House: PASS when set  │     │ · read right after the board │
  └──────────────────────────────┘     └──────────────────────────────┘     └──────────────────────────────┘
                  │                                    │                                    │               
                  └────────────────────────────────────┼────────────────────────────────────┘               
                                       ┌───────────────┴──────────────┐                                     
                                       │ STATION · 0xray              │                                     
                                       ├──────────────────────────────┤                                     
                                       │ · the pickup card            │                                     
                                       │ · read first on every wake   │                                     
                                       │ · then board, then memory    │                                     
                                       └──────────────────────────────┘                                     
                                                                                                            
  code links: suit → memory, house → doctor, memory → station. Other lines show reading order only.         
```

When `LIVE_URL` is unset, the board is hand-kept `house/WAVEBOARD.md`. When `LIVE_URL` is set, the fleet's board, seat inboxes and wake webhooks run on [Bifrost](./bifrost.md) at https://bifrost.0xray.dev (`GET /cards`). Each seat runs the station skill first. Docs are https://docs.0xray.dev/.

That `LIVE_URL` sentence is `house/live/docs/board.md:9` and `grok-bot/LEXICON.md:38`. The kit version is `grok-bot/package.json:3`.

stamped · 0xray 4.1.5 · @0xray/grok-bot 0.1.11
