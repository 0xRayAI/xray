# Killer feature (one) — Cursor Cloud real-usage compact receipt

## Name

**Real-usage compact receipt** — replace fake FILL (chars÷4) with a mill-grade receipt that cites only host / Cloud MCP / dashboard fields, counts host `preCompact` from invoke-probe, and stamps Repertoire heat on Station.

## Why this one

HOST-FIRE #4 (`examples/cursor-cloud-compact/RECEIPT-HOST-PRECOMPACT-4.md`) already ruled out bind/freshness. The leftover “usage” was UTF-8 bytes ÷ 4 against a docs-example 128k window — explicitly **not** a host meter. The next lever written there: **do not run another blind FILL**.

KILLER-DUAL ticket SSOT: *real tokens + real work A/B (replace fake FILL)*. Cloud MCP `run-info` gives model (`cursor-grok-4.6-high`) and bc-id; `get-events` this run is identity only. Host `context_tokens` / `context_window_size` exist on `preCompact` stdin. This host later fired: tokens then window (256000 on fire 3). A receipt that **forbids FILL** and **allows honest MISS** is the organ. Station must print the host window number, not a ticket `windowCite`.

A/B real work (this run, not FILL waves):

| Lane | Work |
|------|------|
| **A** | Landscape digest of xray + Clearing + Groover/hangar + grok-bot + ZigZag/Dynamo/Chrono (this directory) |
| **B** | Ship the receipt organ + tests + PR |

## What shipped (no new MCP / skill — Codex 69)

Rewire of the existing Cursor adapter:

- `parseInvokeProbeLog` — `event=preCompact` count; Y/N without hand-invoke
- `classifyUsageCite` — host numeric fields or MCP/dashboard identity; FILL / `chars÷4` / `fillBytes` → `ok: false`
- `writeCursorUsageReceipt` — `.xray/state/cursor-usage-receipt.json` + Station `Compact:` / `Usage:` rows
- `pre-compact.js` writes the receipt from **host stdin** when the hook actually fires

## Why not the other candidates

- Another 500k FILL: forbidden by ticket and by HOST-FIRE #4 next lever.
- Paying hangar extract: needs OWS/`~/.ows`; this cloud has none; Clearing is a **product** MCP, not mill flesh.
- ZigZag wallet in xray: keys must not enter the model; Clearing constraints say stay off the rail.
- Fake `preCompact` invoke: ticket says log fire Y/N honestly.
