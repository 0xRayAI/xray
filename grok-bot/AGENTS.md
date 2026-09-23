# AGENTS.md — @0xray/grok-bot

You are setting up **Grok Bot agents** on the 0xRay factory OS.

## Goal
For **each key agent** (coordinator, implementer, reviewer, Dist, …):

1. Fasten its **own suit** (mill + inspect) 
2. Register / mint / pin identity (Groover) when it needs a DID 
3. Set up **OWS pay** if it will call paid shops 
4. Plant **hangar** shops if it uses the hangar economy 

Do **not** share one suit across all agents on a machine if you can avoid it. Multiplicity is the point.

## Prove this seat
From the agent project root: `npx @0xray/grok-bot doctor` (alias `ready`). PASS means mill + inspect are fastened. The same printout lists hangar (`npx groover-hangar`) and Clearing next steps (402, `~/.ows`, ZigZag). Do not mill-plant Clearing into 0xRay.

## Order (complete path)
Follow `SKILLS.md` in this order **per agent**:

| Step | Skill | What |
|------|-------|------|
| A | `fasten-suit-per-agent` | Project root + mint + inspect proof |
| B | `groover-factory-parity` | Register → Dynamo citation → mint → ERC-8004 → pin (when identity needed) |
| C | `setup-ows-pay` | Local OWS wallet + fund USDC on Base + how to settle 402s |
| D | `plant-hangar-shops` | `npx groover-hangar` + catalog (`GET /v1/catalog` / `list_hangars`) + call a shop |

Humans: same path; start at `README.md`.

## Rules
- Chat “done” is not proof — keep inventory, inspect `ok`, txs, curls.
- Friend test any public copy (`ops/GIBBERISH-CHECK.md`).
- Coordinator routes; implementer executes; do not ask the coordinator to mint/deploy for you.
- This package **orchestrates**. It does not replace `0xray` or Groover.

## Adjust from plant (monitor)
Current verified pins (change if live plant moves):
- Suit: `0xray` (current npm) · mill nested in the tarball (`npx @0xray/foundry`)
- Registry MCP + website URLs — see `llms.txt`
- Hangar: `npx groover-hangar` · catalog is Clearing `GET /v1/catalog` (Groover DID + pin, plus solar + live shop). Groover MCP `list_hangars` reads it. Settle USDC on Base.
- OWS: keys in `~/.ows` · see Open Wallet docs

If a URL or version fails, update this kit — do not invent a parallel stack.

## PreToolUse on Grok Bot (observe)
Cold-seat proof: `ops/GROK-HOOK-PROOF.md`.

- Fasten **does** plant Grok plugin `PreToolUse` / `PostToolUse` hooks and the gate script runs.
- Grok Bot **chat** is not that plugin host — do not invent a fake PreToolUse floor in the assistant.
- Where the Grok CLI plugin loads `hooks.json`, A-hooks are live; elsewhere rely on skills + Strict review + mill gates.

## Survive compaction (Grok Bot chat)
The host may summarize or trim a long thread. 0xRay compact hooks (PreCompact) and Repertoire do **not** run in this chat — do not wait for them.

Use skill `survive-compact`: read on-disk notes (STATION / WAVEBOARD / stored memory), name the live track, **resume** the existing cloud, and do not rebuild what disk already shows done. Chat may lose early turns; disk must not lose the ticket. Do not treat a re-fed summary as proof the old context window survived.

Repertoire is preferred on a worn 0xray seat. Do not bolt full Repertoire MCP onto every Grok Bot chat as theater — this chat does not fire 0xRay hooks.

## Op proc index

Start at [`ops/OPS-CATALOG.md`](ops/OPS-CATALOG.md). Friend-test: `ops/GIBBERISH-CHECK.md`. Lanes: `ops/SYNAPTICAL-LANES.md`. Lexicon: `ops/dist/brand/LEXICON.md`.
