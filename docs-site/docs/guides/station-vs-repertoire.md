---
sidebar_label: Station vs Repertoire 0.1
---

# Station vs Repertoire 0.1

**Station is survive-the-cut. Repertoire is judgment + growing named intelligence when worn. They are not the same job.** Do not pin `@0xray/repertoire@0.1.8` to remember a ticket, a cloud id, or a wiped chat.

If Repertoire is **not** installed, `STATION.md` **is** the memory. Heat it this wake. NOTES hold the deep cut. Compact survival does not wait for dest.

The three pieces already exist (bookmark · index · mind). They do not meet on wake. That join is [Memory wake](./memory-wake.md) — `applyStationHeat`, not a new organ.

## Three organs

| Organ | Job | Not |
|---|---|---|
| **Station** | After compact or host change, Read `.xray/state/STATION.md`. Ticket, cloud id, Durable/Seed, “never relaunch.” | A diary of PRs, logs, or Bedrock |
| **Repertoire 0.1** | Named invariants → trap detect, complexity boost, agent pick, `MEMORY_ROUTING:` | Session continuity |
| **Groover 0.1** | Agent registry (PoA, DID, mint) plus a **field** that consults and feeds Repertoire | The brain, and not the session card |

Groover 0.1 is a producer/consumer of the judgment loop. It is not a second copy of Repertoire 0.1.

## Versions (Repertoire)

Same organ from **0.1.0** through **0.1.8**. 0.1.8 is not a different product.

| Tag | What it is |
|---|---|
| **0.1.0** (2026-06-18) | Judgment engine already shipped: ingest, pipeline, meta-inference, feedback, MCP, `MemoryRoutingProvider`. Tarball seed: **8** trap primitives (`attestation-as-map` already at hundreds of observations). |
| **0.1.8** (2026-06-20) | Same loop. **145-signal** prod brain in the package (0.1.7), plus `enrich` / dryRun / prune / health, synthesis checkpoint, suit verify. |
| **0.2.0** (2026-09-01) | Factory seed cut to **8** names. No Groover/Bedrock dump in the npm seed. Hydrate a **project-local** copy under `.xray/state/repertoire/`. Routing hooks remain; the living 145-signal brain does not ship in the tarball. |

Do not put the 145/188 dump back in the factory seed. Do not paste it onto `STATION.md`.

## What 4.0 wears

- **Continuity:** Station. Grok **Reads** the card (does not inject). Compact heat rewrites stock fields and keeps unknown keys + `## Durable` / `## Seed`.
- **Routing seed:** vendored `@0xray/repertoire@0.2.5` (factory seed plus overlays). Worn mill reads `.xray/state/repertoire/curated_signals.json`, not the tarball. Optional. Station is the memory when it is off.
- **Do not pin 0.1.8** for a normal mill install. The 0.1 *job* (judgment) is still real when a field emits enriched JSONL (`matched_primitives` + `match_confidence`) **and** 0xRay actually routes (`analyze-complexity` / thinDispatch / researcher). Then grow the **project-local** copy. That is not Station.

Frontier hosts often skip intake (spawn **warns**, does not deny). Then the judgment loop stays idle even if Repertoire is fastened. That is expected, not a missing Station plant.

## Do not

- Treat Repertoire as the successor card.
- Stuff Bedrock names or activity-log FILL into the factory seed.
- Thicken `STATION.md` with synthesis reports or JSONL.
- Confuse Groover’s in-memory challenge sessions with Station (they die on registry restart).
- Treat same-bc plus a re-fed summary as proof the conversation survived as a mind. Chat may lose early turns. Disk must not lose the ticket. Mill-absence (host did not invent `STATION.md`) is still PASS for mill-control. Killer-dual: `examples/killer-dual/HOST-VS-MILL.md`.

## Memory pipelines (one system)

Four layers, one job: survive the cut and grow intelligence. Chat is not a store.

```
MEMORY OS
├── Station.md          ALWAYS. Pickup ticket. THE memory if dest is off.
├── NOTES.md            Deep cut Station is too thin to hold.
├── OP-PROC             How we work. Hooks + dest names. Not pasted on Station.
├── Repertoire dest     OPTIONAL. Named intelligence when worn.
└── Kernel diary        GATHER. session-*.json, activity.log, workflows.
```

### Gather / store / retrieve

```
GATHER                         STORE                         RETRIEVE
──────                         ─────                         ────────
preToolUse / afterFileEdit  →  session-boot.json          →  Read STATION.md
preCompact (often misses)   →  STATION.md                 →  same bc, do not cold-start
lead heat (this wake)       →  repertoire-working.json    →  opProcNames if dest on
storyteller / commits       →  docs/inference/session-*   →  XraySessionIngester
kernel patterns / routing   →  logs/framework/*           →  health / ingest
analyze-complexity          →  dest curated_signals.json  →  getTaskConfidence
task done                   →  ingestFeedback             →  enrichTasks
spoken twice                →  LEAD-CADENCE / skill       →  wear, do not re-ask
deep cut this job           →  NOTES.md                   →  second Read after compact
```

### Active wake (intelligence is live)

```
USER / TOOL
    │
    ├─[t0] preToolUse ──► ensureCursorSessionBoot
    │                       ├─ cursorBootNeedsRefresh? (HEAD / dest count / Hold npm)
    │                       ├─ applyStationHeat
    │                       │     ├─ clip Intent (≤240)
    │                       │     ├─ Git branch@head
    │                       │     ├─ Repertoire: on — N  |  not installed
    │                       │     └─ Working ≤4 matched names
    │                       ├─ session-boot.json          (SSOT)
    │                       ├─ STATION.md                 (projection)
    │                       └─ repertoire-working.json    (opProcNames if dest)
    │
    ├─[t1] work ──► kernel gather (best-effort, often COLD)
    │                 ├─ session-capture → docs/inference/session-*.json
    │                 ├─ activity.log / routing-outcomes / pattern-metrics
    │                 └─ .xray/inference/workflow-*.json
    │
    ├─[t2] afterFileEdit ──► same heat if metal moved
    │
    ├─[t3] intake (frontier: optional) ──► analyze-complexity
    │                 ├─ enrichTasks / getTaskConfidence   (dest ON)
    │                 └─ skip if dest OFF — Station still holds the ticket
    │
    └─[t4] task close ──► ingestFeedback → dest observations (dest ON only)
```

### Compact moment (timing)

```
CONTEXT WINDOW ████████████████░░░░  filling
                    │
                    ├─ SHOULD fire  preCompact ──► write Station + receipt
                    │                 (host often SKIPS this)
                    │
                    ▼
              COMPACT  (chat dies)
                    │
                    ▼
              POST  Read disk. Do not reconstruct from summary.
```

`preCompact` is observational. It cannot block. Conversation compact on this host often leaves **no** `cursor-precompact.json`. Survival is heat **during** the wake (t0/t2/lead), not a prayer at t-compact.

### Post compact (retrieve)

```
NEW WINDOW
    │
    ├─1─ Read STATION.md
    │      ├─ Repertoire: not installed ──► Station + NOTES ARE the mind. STOP looking for dest.
    │      └─ Repertoire: on — N        ──► ticket first, then dest.
    │
    ├─2─ Read NOTES (unfinished path on the card)
    │
    ├─3─ Read COMPACT-SURVIVAL (who / seats)
    │
    ├─4─ IF dest ON
    │      ├─ reloadOpProc()              factory ∪ overlay names
    │      ├─ repertoire-working.opProcNames
    │      └─ getTaskConfidence(compact language)
    │
    └─5─ Resume same bc / same critic. Do not cold-start.
```

### No Repertoire (Station is the memory)

```
npm install 0xray          (no @0xray/repertoire)
        │
        ▼
postinstall → installAllBridges
        ├─ AGENTS.md / .xray / .mcp.json / four bridges + Cursor hooks
        └─ memory_routing stays off
        │
        ▼
WAKE
        ├─ heat STATION.md every material move
        ├─ write NOTES if the cut is deeper than 240 chars
        └─ dest path does not exist — do not invent it
        │
        ▼
COMPACT
        └─ Read Station → NOTES → continue. That is enough.
```

### Onboarding (collection starts here)

```
FRESH CLONE / FRESH INSTALL
    │
    ├─ npm i 0xray
    │     └─ postinstall.cjs → installAllBridges
    │           ├─ deploy .xray (codex, features, config)
    │           ├─ .mcp.json (7 servers)
    │           ├─ OpenCode / Grok / Hermes / OpenClaw
    │           └─ Cursor last-mile (.cursor/hooks.json → dist hooks)
    │
    ├─ optional  npm i @0xray/repertoire
    │     └─ hydrateWritableSignals
    │           ├─ copy factory 8 → .xray/state/repertoire/curated_signals.json
    │           ├─ merge stack-overlay (OP-PROC names)
    │           └─ features.json memory_routing.signalsPath → dest
    │
    └─ first preToolUse
          ├─ mill-absence? write Station from empty
          ├─ Intent often "(none yet)" — Cursor stdin has no prompt
          └─ lead / second heat must write the real Intent

UPGRADE of an existing mill
    │
    ├─ npm i 0xray@latest          (do not redeploy hangar tarball)
    ├─ dest already there          (hydrate merges overlay, does not wipe)
    └─ cursorBootNeedsRefresh if HEAD / dest count / Durable Hold npm diverged
```

### Kernel collection (what actually writes)

```
KERNEL DIARY                         WHO WRITES                         DEST READS?
docs/inference/session-*.json        Cursor heat on HEAD move + capture YES (XraySessionIngester)
.xray/inference/workflow-*.json      inference workflow                 discover dir; needs session-*
logs/framework/activity.log          frameworkLogger                    not dest (diary only)
logs/framework/routing-outcomes.json orchestrator                       not dest
logs/framework/pattern-metrics.json  kernel-patterns / adaptive         not dest
session-boot.json / STATION.md       hooks + lead heat                  pickup, not dest
```

Session ingest is **cold** until `session-*.json` exists. Overlay names are OP-PROC, not product-domain memory. Groover JSONL is not the producer.

## Related

- [Repertoire](./repertoire.md) — 0.2 wear, MCP, provider contract
- [Memory routing](./memory-routing.md) — orchestrator wiring
- [4.0 now](../architecture/v4-now.md) — Station handoff
- [Grok guide](../architecture/GROK_GUIDE.md) — Read the card

