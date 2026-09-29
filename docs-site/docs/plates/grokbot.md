---
title: Grok Bot
sidebar_label: Grok Bot
plate_type: domain model
---

# Grok Bot

A domain model plate for the grok-bot host pack. It is the house, board, attention, and doctor on the suit. It is not a kit. The kits are Repertoire, Goggles, Dynamo, and Clearing.

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

stamped · 0xray 4.0.30 · @0xray/grok-bot 0.1.8
