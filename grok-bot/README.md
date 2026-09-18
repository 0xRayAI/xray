# @0xray/grok-bot


## Start here

Read [`ops/OPS-CATALOG.md`](ops/OPS-CATALOG.md) for operating docs and the bot-talk catalog.
Complete setup path for **Grok Bot agents** on the 0xRay mill.

Agents: read `llms.txt` → `AGENTS.md` → run skills in `SKILLS.md` (**one suit per key agent**).  
Humans: same files.

## Install
```bash
npm i @0xray/grok-bot
npx @0xray/grok-bot
```

## Seat doctor (prove plant)
From an agent project root:

```bash
npx @0xray/grok-bot doctor
npx @0xray/grok-bot ready          # same command
npx @0xray/grok-bot doctor --json
```

**Plain:** this checks that mill + inspect are fastened on *this* seat, says whether Repertoire and Open Wallet (`~/.ows`) are present, then prints what to do next for hangar shops and Clearing (402 / USDC on Base). It does not mill-plant Clearing into 0xRay. Product MCP name is `clearing`, never `xray-clearing`.

## Path (per agent)
1. **Suit** — mill + inspect (`fasten-suit-per-agent`)  
2. **Identity** — Groover register → mint → pin (`groover-factory-parity`) when needed  
3. **Pay** — OWS wallet + Base USDC (`setup-ows-pay`)  
4. **Hangar** — plant shops (`plant-hangar-shops`)  

## Plant pins (monitor / adjust)
- `0xray@4.0.15` · `@0xray/foundry@0.1.12`  
- Live URLs in `llms.txt`  

This package orchestrates. It does not vendor the whole OS.

## Fleet ops
Coordinator procedures remain under `ops/` (review levels, clouds, friend test).
