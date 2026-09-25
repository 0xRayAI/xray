# @0xray/grok-bot


## Start here

**Read first:** [`OP-PROC.md`](OP-PROC.md) — the one-page operating procedure.

Board: [`house/WAVEBOARD.md`](house/WAVEBOARD.md) and [`house/ATTENTION_STATE.md`](house/ATTENTION_STATE.md). If those files are missing, use [`templates/house/`](templates/house/) (skill `setup-house`).
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
- `0xray` (current npm) · mill nested in the tarball (`npx @0xray/foundry`)
- Live URLs in `llms.txt`  

This package orchestrates. It does not vendor the whole OS.

## Fleet ops
Read `house/` first (this team's board and rules). If `house/` is missing, use `templates/house/`. Longer notes under `ops/` stay in the git repo and are not in the npm package.
