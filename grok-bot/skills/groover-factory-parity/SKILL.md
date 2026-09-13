---
name: Groover factory parity
description: >-
  use this when registering a Grok Bot seat with Groover, minting an 0xray-suit
  via /suit or mint_suit, pinning ERC-8004, or closing factory parity
  (register→mint→pin→shops)
---
# Groover factory parity (register → mint → pin → shops)

Canonical product path: https://website-production-c0da.up.railway.app/suit

## Hard rules (live 2026-09-13)

1. **Same MCP host** for register and mint: `https://registry-production-e2c4.up.railway.app/mcp`
2. **Persist Ed25519 secret** before register (`--pubkey` / `--secret-key`)
3. **Mint bind:** `groover-mint:v1|{did}|{pack}|{to.toLowerCase()}|{issuedAtMs}`
4. **Dynamo-gate mint (MANDATORY for live mint + 8004 mirror):** loop `govern_with_solar` + `persistToChain: true` until PASS (not storm); citation = containerId hex. Live mint/mirror fail closed without citation. PoA register still pre-Dynamo. Emergency only: `DYNAMO_MINT_REQUIRED=false`.
5. **GRVR v5 live:** `0x045B35480F289F8f83F53345A0f367875958957a` — accepts **full 64-hex registry DID** (and legacy 16-hex). Mint the full DID. Truncation was a v4-only workaround — obsolete.
6. **dryRun ≠ live**
7. **Pin our agentId** — never demo `86025`. Enable `MIRROR_8004_ENABLED=true`, register on `0x8004A169…`, then hangar `/v1/pin?agentId=`

## Proven
- Full DID remint tokenId 1 · Level 3 · tx `0x3d81ad93b4e6e37b79f338c1dd6fbb99c680a59cd345423a9d415671ee236ec1`

## Proven pin (2026-09-13)
- `MIRROR_8004_ENABLED=true` on Railway registry
- ERC-8004 agentId **86556** · register `0x4c47…` · setURI `0xac93…`
- Hangar pin paid · paymentId `899c0cb3-0c2a-4e7f-acfd-3b2e73e2c0bf` · settle `0xd694…`
- Receipt: `ops/HANGAR-PIN-86556.md`
- agentURI may start on gist; promote to `website/static/identity/registration/grvr-<tokenId>-v2.json` then `setAgentURI`
