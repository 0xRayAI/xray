# @0xray/grok-bot


## Start here

Read [`ops/OPS-CATALOG.md`](ops/OPS-CATALOG.md) for operating docs and the bot-talk catalog.
Complete setup path for **Grok Bot agents** on the 0xRay mill.

Agents: read `llms.txt` → `AGENTS.md` → run skills in `SKILLS.md` (**one suit per key agent**).  
Humans: same files.

## Install
```bash
npm i @0xray/grok-bot
npx grok-bot ready
```

**A friend would hear:** run `npx grok-bot ready` in a seat folder to see if the mill suit is planted and what to do next for paid shops. `doctor` is the same command.

## Path (per agent)
1. **Suit** — mill + inspect (`fasten-suit-per-agent`)  
2. **Identity** — Groover register → mint → pin (`groover-factory-parity`) when needed  
3. **Pay** — OWS wallet + Base USDC (`setup-ows-pay`)  
4. **Hangar** — plant shops (`plant-hangar-shops`)  

## Plant pins (monitor / adjust)
- `0xray@4.0.12` · `@0xray/foundry@0.1.10`  
- Live URLs in `llms.txt`  

This package orchestrates. It does not vendor the whole OS.

## Fleet ops
Coordinator procedures remain under `ops/` (review levels, clouds, friend test).
